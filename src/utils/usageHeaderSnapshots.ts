import type { TFunction } from 'i18next';
import type { UsageHeaderSnapshot, ResponseHeaderQuotaWindow } from '@/services/api/usageService';
import type { AuthFileItem } from '@/types';
import type { CodexQuotaState, CodexQuotaWindow } from '@/types/quota';

export type UsageHeaderSnapshotLookup = {
  byFileAuthIndex: Map<string, UsageHeaderSnapshot>;
  byFileName: Map<string, UsageHeaderSnapshot>;
};

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();
const authIndexOf = (file: AuthFileItem) => normalize(file['auth_index'] ?? file.authIndex);
const fileAuthKey = (fileName: unknown, authIndex: unknown) =>
  `${normalize(fileName)}::${normalize(authIndex)}`;

const setNewest = (
  map: Map<string, UsageHeaderSnapshot>,
  key: string,
  snapshot: UsageHeaderSnapshot
) => {
  if (!key || key === '::') return;
  const current = map.get(key);
  if (!current || snapshot.timestamp_ms > current.timestamp_ms) map.set(key, snapshot);
};

export const buildUsageHeaderSnapshotLookup = (
  snapshots: UsageHeaderSnapshot[] = []
): UsageHeaderSnapshotLookup => {
  const lookup: UsageHeaderSnapshotLookup = {
    byFileAuthIndex: new Map(),
    byFileName: new Map(),
  };
  snapshots.forEach((snapshot) => {
    const fileName = normalize(snapshot.auth_file_snapshot);
    const authIndex = normalize(snapshot.auth_index);
    if (fileName && authIndex) {
      setNewest(lookup.byFileAuthIndex, fileAuthKey(fileName, authIndex), snapshot);
    }
    if (fileName) setNewest(lookup.byFileName, fileName, snapshot);
  });
  return lookup;
};

export const getUsageHeaderSnapshotForAuthFile = (
  lookup: UsageHeaderSnapshotLookup,
  file: AuthFileItem
): UsageHeaderSnapshot | undefined => {
  const fileName = normalize(file.name);
  const authIndex = authIndexOf(file);
  if (fileName && authIndex) {
    return lookup.byFileAuthIndex.get(fileAuthKey(fileName, authIndex));
  }
  return fileName ? lookup.byFileName.get(fileName) : undefined;
};

const quotaWindows = (snapshot: UsageHeaderSnapshot) => {
  const quota = snapshot.response_metadata?.quota;
  return [quota?.primary, quota?.secondary].filter(
    (window): window is ResponseHeaderQuotaWindow => Boolean(window)
  );
};

export const isUsageHeaderQuotaSnapshotExpired = (
  snapshot: UsageHeaderSnapshot | undefined,
  nowMs = Date.now()
) => {
  if (!snapshot) return false;
  const quota = snapshot.response_metadata?.quota;
  if (!quota) return false;
  const reachedType = normalize(quota.rate_limit_reached_type);
  let windows: ResponseHeaderQuotaWindow[] = [];
  if (reachedType.includes('primary') || reachedType.includes('five_hour')) {
    if (quota.primary) windows = [quota.primary];
  } else if (reachedType.includes('secondary') || reachedType.includes('week')) {
    if (quota.secondary) windows = [quota.secondary];
  } else {
    windows = quotaWindows(snapshot).filter((window) => (window.used_percent ?? 0) >= 100);
  }
  const resetTimes = windows
    .map((window) => window.reset_at_ms ?? 0)
    .filter((value) => value > 0);
  return resetTimes.length > 0 && Math.max(...resetTimes) <= nowMs;
};

const quotaWindowLabel = (
  window: ResponseHeaderQuotaWindow,
  position: 'primary' | 'secondary',
  t: TFunction
) => {
  const minutes = window.window_minutes ?? 0;
  if (Math.abs(minutes - 300) < 1) return t('codex_quota.primary_window');
  if (Math.abs(minutes - 10_080) < 1) return t('codex_quota.secondary_window');
  if (minutes >= 28 * 24 * 60) return t('codex_quota.monthly_window');
  return position === 'primary'
    ? t('codex_quota.primary_window')
    : t('codex_quota.secondary_window');
};

const buildWindow = (
  window: ResponseHeaderQuotaWindow | undefined,
  position: 'primary' | 'secondary',
  t: TFunction
): CodexQuotaWindow | null => {
  if (!window) return null;
  const resetAtMs = window.reset_at_ms ?? 0;
  return {
    id: `usage-header-${position}`,
    label: quotaWindowLabel(window, position, t),
    usedPercent: window.used_percent ?? null,
    resetLabel: resetAtMs > 0 ? new Date(resetAtMs).toLocaleString() : '-',
    limitWindowSeconds:
      window.window_minutes && window.window_minutes > 0
        ? window.window_minutes * 60
        : null,
  };
};

export const buildObservedCodexQuotaState = (
  snapshot: UsageHeaderSnapshot | undefined,
  t: TFunction
): CodexQuotaState | undefined => {
  const quota = snapshot?.response_metadata?.quota;
  if (!snapshot || !quota) return undefined;
  const windows = [
    buildWindow(quota.primary, 'primary', t),
    buildWindow(quota.secondary, 'secondary', t),
  ].filter((window): window is CodexQuotaWindow => Boolean(window));
  if (windows.length === 0) return undefined;
  return {
    status: 'success',
    windows,
    planType: quota.plan_type ?? null,
    observedFromUsageHeaders: true,
    observedAtMs: snapshot.timestamp_ms,
  };
};
