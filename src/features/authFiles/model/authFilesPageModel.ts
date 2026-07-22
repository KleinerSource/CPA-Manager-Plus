import type { TFunction } from 'i18next';
import type {
  AntigravityQuotaState,
  AuthFileItem,
  ClaudeQuotaState,
  CodexQuotaState,
  CodexQuotaWindow,
  GeminiCliQuotaState,
  KimiQuotaState,
  KiroQuotaState,
  XaiQuotaState,
} from '@/types';
import {
  formatKimiResetHint,
  formatQuotaResetTime,
  formatUnixSeconds,
  normalizePlanType,
  resolveCodexChatgptAccountId,
  resolveCodexPlanType,
} from '@/utils/quota';
import {
  getTypeLabel,
  normalizeProviderKey,
  parsePriorityValue,
  type QuotaProviderType,
} from '@/features/authFiles/constants';

export const easePower3Out = (progress: number) => 1 - (1 - progress) ** 4;
export const easePower2In = (progress: number) => progress ** 3;
export const BATCH_BAR_BASE_TRANSFORM = 'translateX(-50%)';
export const BATCH_BAR_HIDDEN_TRANSFORM = 'translateX(-50%) translateY(56px)';
export const DEFAULT_REGULAR_PAGE_SIZE = 9;
export const DEFAULT_COMPACT_PAGE_SIZE = 12;

const escapeWildcardSearchSegment = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildWildcardSearch = (value: string): RegExp | null => {
  if (!value.includes('*')) return null;
  const pattern = value.split('*').map(escapeWildcardSearchSegment).join('.*');
  return new RegExp(pattern, 'i');
};

const PREMIUM_CODEX_PLAN_TYPES = new Set(['pro', 'prolite', 'pro-lite', 'pro_lite']);
const CODEX_FIVE_HOUR_WINDOW_SECONDS = 18_000;
const CODEX_WEEKLY_WINDOW_SECONDS = 604_800;
const CODEX_MONTHLY_WINDOW_SECONDS = 2_592_000;
const UNKNOWN_AUTH_INDEX_KEY = '-';

export const AUTH_FILES_CODEX_STATUS_FILTERS = [
  'all',
  // Legacy URL/query value. The Auth Files UI now presents 401 as "needs reauth".
  'http_401',
  'reauth',
  'five_hour_limited',
  'weekly_limited',
  'monthly_limited',
  'disabled_with_reset',
] as const;

export const AUTH_FILES_PROBLEM_TYPE_FILTERS = ['all', '400', '401', '403', 'other'] as const;

export type AuthFilesCodexStatusFilter = (typeof AUTH_FILES_CODEX_STATUS_FILTERS)[number];
export type AuthFilesProblemTypeFilter = (typeof AUTH_FILES_PROBLEM_TYPE_FILTERS)[number];
export type AuthFileCodexStatusBadgeTone = 'danger' | 'warning' | 'info';
export type AuthFileCodexStatusBadgeKind =
  | 'reauth'
  | 'five_hour_limited'
  | 'weekly_limited'
  | 'monthly_limited'
  | 'disabled_with_reset';

export type AuthFileCodexStatusBadge = {
  kind: AuthFileCodexStatusBadgeKind;
  tone: AuthFileCodexStatusBadgeTone;
  labelKey: string;
  defaultLabel: string;
  titleKey?: string;
  defaultTitle?: string;
  labelParams?: Record<string, string | number>;
};

export type AuthFileCodexStatusSummary = {
  isCodex: boolean;
  isHttp401: boolean;
  needsReauth: boolean;
  isFiveHourLimited: boolean;
  isWeeklyLimited: boolean;
  isMonthlyLimited: boolean;
  hasDisabledRecoveryReset: boolean;
  fiveHourResetLabel: string | null;
  weeklyResetLabel: string | null;
  monthlyResetLabel: string | null;
  recoveryResetLabel: string | null;
  fiveHourUsedPercent: number | null;
  weeklyUsedPercent: number | null;
  monthlyUsedPercent: number | null;
  badges: AuthFileCodexStatusBadge[];
};

export const getCodexTableQuotaWindows = (
  quota: CodexQuotaState | undefined,
  codexStatus: AuthFileCodexStatusSummary
): CodexQuotaWindow[] => {
  if (quota?.windows.length) return quota.windows;

  return [
    {
      id: 'five-hour',
      label: '',
      labelKey: 'auth_files.table_quota_five_hour',
      usedPercent: codexStatus.fiveHourUsedPercent,
      resetLabel: codexStatus.fiveHourResetLabel ?? '-',
      limitWindowSeconds: CODEX_FIVE_HOUR_WINDOW_SECONDS,
    },
    {
      id: 'weekly',
      label: '',
      labelKey: 'auth_files.table_quota_weekly',
      usedPercent: codexStatus.weeklyUsedPercent,
      resetLabel: codexStatus.weeklyResetLabel ?? '-',
      limitWindowSeconds: CODEX_WEEKLY_WINDOW_SECONDS,
    },
    {
      id: 'monthly',
      label: '',
      labelKey: 'codex_quota.monthly_window',
      usedPercent: codexStatus.monthlyUsedPercent,
      resetLabel: codexStatus.monthlyResetLabel ?? '-',
      limitWindowSeconds: CODEX_MONTHLY_WINDOW_SECONDS,
    },
  ].filter((window) => window.usedPercent !== null || window.resetLabel !== '-');
};

export type AuthFileTableQuotaItem = {
  id: string;
  label: string;
  percent: number | null;
  resetLabel: string;
  detailLabel?: string | null;
};

export const getAntigravityTableQuotaItems = (
  quota: AntigravityQuotaState | undefined
): AuthFileTableQuotaItem[] =>
  (quota?.groups ?? []).map((group) => ({
    id: group.id,
    label: group.label,
    percent: Math.round(Math.max(0, Math.min(1, group.remainingFraction)) * 100),
    resetLabel: formatQuotaResetTime(group.resetTime),
  }));

const clampRemainingPercent = (value: number | null): number | null =>
  value === null ? null : Math.max(0, Math.min(100, Math.round(value)));

const remainingFromUsedPercent = (usedPercent: number | null): number | null =>
  usedPercent === null ? null : clampRemainingPercent(100 - usedPercent);

const formatXaiCurrency = (value: number | null): string =>
  value === null ? '--' : `$${(value / 100).toFixed(2)}`;

export const getAuthFileTableQuotaItems = (
  quotaType: Exclude<QuotaProviderType, 'codex'>,
  quota: unknown,
  t: TFunction
): AuthFileTableQuotaItem[] => {
  if (quotaType === 'antigravity') {
    return getAntigravityTableQuotaItems(quota as AntigravityQuotaState | undefined);
  }

  if (quotaType === 'claude') {
    return ((quota as ClaudeQuotaState | undefined)?.windows ?? []).map((window) => ({
      id: window.id,
      label: window.labelKey ? t(window.labelKey) : window.label,
      percent: remainingFromUsedPercent(window.usedPercent),
      resetLabel: window.resetLabel,
    }));
  }

  if (quotaType === 'gemini-cli') {
    return ((quota as GeminiCliQuotaState | undefined)?.buckets ?? []).map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      percent:
        bucket.remainingFraction === null
          ? null
          : clampRemainingPercent(bucket.remainingFraction * 100),
      resetLabel: formatQuotaResetTime(bucket.resetTime),
      detailLabel:
        bucket.remainingAmount === null || bucket.remainingAmount === undefined
          ? null
          : t('gemini_cli_quota.remaining_amount', { count: bucket.remainingAmount }),
    }));
  }

  if (quotaType === 'kimi') {
    return ((quota as KimiQuotaState | undefined)?.rows ?? []).map((row) => ({
      id: row.id,
      label: row.labelKey
        ? t(row.labelKey, (row.labelParams ?? {}) as Record<string, string | number>)
        : (row.label ?? ''),
      percent:
        row.limit > 0
          ? clampRemainingPercent(((row.limit - row.used) / row.limit) * 100)
          : row.used > 0
            ? 0
            : null,
      resetLabel: formatKimiResetHint(t, row.resetHint) || '-',
      detailLabel: row.limit > 0 ? `${row.used} / ${row.limit}` : null,
    }));
  }

  if (quotaType === 'kiro') {
    const kiro = quota as KiroQuotaState | undefined;
    const items: AuthFileTableQuotaItem[] = [];
    if (kiro?.overageQuota) {
      const used = Math.max(0, kiro.overageQuota.currentOverages ?? 0);
      const limit = Math.max(0, kiro.overageQuota.cap ?? 0);
      const remaining = Math.max(0, limit - used);
      items.push({
        id: 'overage-usage',
        label: t('kiro_quota.overage_usage'),
        percent: limit > 0 ? clampRemainingPercent((remaining / limit) * 100) : null,
        resetLabel: '-',
        detailLabel: `${remaining.toFixed(1)} / ${limit || '-'}`,
      });
    }
    if (kiro?.baseQuota) {
      const remaining = Math.max(0, kiro.baseQuota.limit - kiro.baseQuota.used);
      items.push({
        id: 'base',
        label: t('kiro_quota.base_quota'),
        percent:
          kiro.baseQuota.limit > 0
            ? clampRemainingPercent((remaining / kiro.baseQuota.limit) * 100)
            : 0,
        resetLabel: formatUnixSeconds(kiro.baseQuota.resetTime),
        detailLabel: `${remaining.toFixed(1)} / ${kiro.baseQuota.limit}`,
      });
    }
    if (kiro?.freeTrialQuota) {
      const remaining = Math.max(0, kiro.freeTrialQuota.limit - kiro.freeTrialQuota.used);
      const active = kiro.freeTrialQuota.status.toUpperCase() === 'ACTIVE';
      items.push({
        id: 'trial',
        label: `${t('kiro_quota.free_trial')} (${t(
          active ? 'kiro_quota.trial_active' : 'kiro_quota.trial_expired'
        )})`,
        percent:
          kiro.freeTrialQuota.limit > 0
            ? clampRemainingPercent((remaining / kiro.freeTrialQuota.limit) * 100)
            : 0,
        resetLabel: formatUnixSeconds(kiro.freeTrialQuota.expiry),
        detailLabel: `${remaining.toFixed(1)} / ${kiro.freeTrialQuota.limit}`,
      });
    }
    return items;
  }

  const billing = (quota as XaiQuotaState | undefined)?.billing;
  if (!billing) return [];
  return [
    {
      id: 'monthly-limit',
      label: t('xai_quota.monthly_limit'),
      percent: remainingFromUsedPercent(billing.usedPercent),
      resetLabel: billing.billingPeriodEnd
        ? formatQuotaResetTime(billing.billingPeriodEnd)
        : t('xai_quota.reset_unknown'),
      detailLabel: t('xai_quota.usage_amount', {
        used: formatXaiCurrency(billing.usedCents),
        limit: formatXaiCurrency(billing.monthlyLimitCents),
      }),
    },
  ];
};

export type AuthFileCodexInspectionSnapshot = {
  fileName: string;
  authIndex?: string | number | null;
  statusCode?: number | string | null;
  action?: string | null;
  usedPercent?: number | string | null;
  isQuota?: boolean | null;
};

const CODEX_STATUS_FILTER_SET = new Set<AuthFilesCodexStatusFilter>(
  AUTH_FILES_CODEX_STATUS_FILTERS
);
const PROBLEM_TYPE_FILTER_SET = new Set<AuthFilesProblemTypeFilter>(
  AUTH_FILES_PROBLEM_TYPE_FILTERS
);

export const compareAuthFileName = (left: { name: string }, right: { name: string }) =>
  left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });

export const compareAuthFileDisabledLast = (left: AuthFileItem, right: AuthFileItem) => {
  const leftDisabled = left.disabled === true;
  const rightDisabled = right.disabled === true;
  if (leftDisabled === rightDisabled) return 0;
  return leftDisabled ? 1 : -1;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeAuthIndexKey = (value: unknown): string => {
  if (value === undefined || value === null) return UNKNOWN_AUTH_INDEX_KEY;
  const normalized = String(value).trim();
  return normalized || UNKNOWN_AUTH_INDEX_KEY;
};

const isCodexAuthFile = (file: AuthFileItem): boolean =>
  normalizeProviderKey(String(file.type ?? file.provider ?? '')) === 'codex';

const isKnownResetLabel = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== '-';
};

const normalizeWindowSeconds = (value: unknown): number | null => normalizeNumber(value);

const findCodexQuotaWindow = (
  quota: CodexQuotaState | undefined,
  preferredMatch: (window: CodexQuotaState['windows'][number]) => boolean,
  limitWindowSeconds: number
) => {
  const windows = quota?.windows ?? [];
  return (
    windows.find(preferredMatch) ??
    windows.find((window) => normalizeWindowSeconds(window.limitWindowSeconds) === limitWindowSeconds) ??
    null
  );
};

const findCodexFiveHourQuotaWindow = (quota?: CodexQuotaState) =>
  findCodexQuotaWindow(
    quota,
    (window) => window.id === 'five-hour' || window.labelKey === 'codex_quota.primary_window',
    CODEX_FIVE_HOUR_WINDOW_SECONDS
  );

const findCodexWeeklyQuotaWindow = (quota?: CodexQuotaState) =>
  findCodexQuotaWindow(
    quota,
    (window) => window.id === 'weekly' || window.labelKey === 'codex_quota.secondary_window',
    CODEX_WEEKLY_WINDOW_SECONDS
  );

const findCodexMonthlyQuotaWindow = (quota?: CodexQuotaState) =>
  findCodexQuotaWindow(
    quota,
    (window) => window.id === 'monthly' || window.labelKey === 'codex_quota.monthly_window',
    CODEX_MONTHLY_WINDOW_SECONDS
  );

export const normalizeAuthFilesCodexStatusFilter = (
  value: unknown
): AuthFilesCodexStatusFilter | null => {
  if (value === 'http_401') return 'reauth';
  return CODEX_STATUS_FILTER_SET.has(value as AuthFilesCodexStatusFilter)
    ? (value as AuthFilesCodexStatusFilter)
    : null;
};

export const normalizeAuthFilesProblemTypeFilter = (
  value: unknown
): AuthFilesProblemTypeFilter | null =>
  PROBLEM_TYPE_FILTER_SET.has(value as AuthFilesProblemTypeFilter)
    ? (value as AuthFilesProblemTypeFilter)
    : null;

export const getAuthFileProblemStatusCode = (file: AuthFileItem): number | null => {
  const statusCode = normalizeNumber(
    file.errorStatus ?? file['error_status'] ?? file.statusCode ?? file['status_code']
  );
  if (statusCode === null) return null;
  return Math.trunc(statusCode);
};

export const getAuthFileProblemTypeFilter = (file: AuthFileItem): AuthFilesProblemTypeFilter => {
  const statusCode = getAuthFileProblemStatusCode(file);
  if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
    return String(statusCode) as AuthFilesProblemTypeFilter;
  }
  return 'other';
};

export const authFileMatchesProblemTypeFilter = (
  file: AuthFileItem,
  filter: AuthFilesProblemTypeFilter
): boolean => filter === 'all' || getAuthFileProblemTypeFilter(file) === filter;

export const getAuthFileCodexInspectionKey = (fileName: string, authIndex?: unknown) =>
  `${fileName}::${normalizeAuthIndexKey(authIndex)}`;

export const getAuthFileCodexInspectionKeyForFile = (file: AuthFileItem) =>
  getAuthFileCodexInspectionKey(file.name, file.authIndex ?? file['auth_index']);

export const buildAuthFileCodexInspectionMap = (
  items: AuthFileCodexInspectionSnapshot[]
): Map<string, AuthFileCodexInspectionSnapshot> => {
  const map = new Map<string, AuthFileCodexInspectionSnapshot>();
  items.forEach((item) => {
    if (!item.fileName) return;
    map.set(getAuthFileCodexInspectionKey(item.fileName, item.authIndex), item);
  });
  return map;
};

export const getAuthFileCodexStatus = (
  file: AuthFileItem,
  quota?: CodexQuotaState,
  inspection?: AuthFileCodexInspectionSnapshot
): AuthFileCodexStatusSummary => {
  const isCodex = isCodexAuthFile(file);
  if (!isCodex) {
    return {
      isCodex: false,
      isHttp401: false,
      needsReauth: false,
      isFiveHourLimited: false,
      isWeeklyLimited: false,
      isMonthlyLimited: false,
      hasDisabledRecoveryReset: false,
      fiveHourResetLabel: null,
      weeklyResetLabel: null,
      monthlyResetLabel: null,
      recoveryResetLabel: null,
      fiveHourUsedPercent: null,
      weeklyUsedPercent: null,
      monthlyUsedPercent: null,
      badges: [],
    };
  }

  const fiveHourWindow = findCodexFiveHourQuotaWindow(quota);
  const weeklyWindow = findCodexWeeklyQuotaWindow(quota);
  const monthlyWindow = findCodexMonthlyQuotaWindow(quota);
  const fiveHourUsedPercent = normalizeNumber(fiveHourWindow?.usedPercent);
  const weeklyWindowUsedPercent = normalizeNumber(weeklyWindow?.usedPercent);
  const monthlyWindowUsedPercent = normalizeNumber(monthlyWindow?.usedPercent);
  const inspectionUsedPercent =
    inspection?.isQuota === true ? normalizeNumber(inspection?.usedPercent) : null;
  const monthlyUsedPercent =
    monthlyWindowUsedPercent ?? (monthlyWindow ? inspectionUsedPercent : null);
  const longWindowUsedPercent = weeklyWindowUsedPercent ?? monthlyUsedPercent;
  const weeklyUsedPercent =
    weeklyWindowUsedPercent ?? (!monthlyWindow ? inspectionUsedPercent : null);
  const fiveHourResetLabel = isKnownResetLabel(fiveHourWindow?.resetLabel)
    ? fiveHourWindow.resetLabel.trim()
    : null;
  const weeklyResetLabel = isKnownResetLabel(weeklyWindow?.resetLabel)
    ? weeklyWindow.resetLabel.trim()
    : null;
  const monthlyResetLabel = isKnownResetLabel(monthlyWindow?.resetLabel)
    ? monthlyWindow.resetLabel.trim()
    : null;
  const statusCode =
    normalizeNumber(inspection?.statusCode) ??
    normalizeNumber(
      file.errorStatus ?? file['error_status'] ?? file.statusCode ?? file['status_code']
    ) ??
    normalizeNumber(quota?.errorStatus);
  const action = typeof inspection?.action === 'string' ? inspection.action : '';
  const isHttp401 = statusCode === 401;
  const needsReauth = action === 'reauth' || isHttp401;
  const inspectionReachedQuota =
    inspection?.isQuota === true &&
    (action === 'disable' ||
      (longWindowUsedPercent !== null && longWindowUsedPercent >= 100) ||
      (file.disabled === true && action === 'keep'));
  const isWeeklyLimited =
    (weeklyUsedPercent !== null && weeklyUsedPercent >= 100) ||
    (inspectionReachedQuota && !monthlyWindow);
  const isMonthlyLimited =
    (monthlyUsedPercent !== null && monthlyUsedPercent >= 100) ||
    (inspectionReachedQuota && monthlyWindow !== null && !weeklyWindow);
  const isFiveHourLimited = fiveHourUsedPercent !== null && fiveHourUsedPercent >= 100;
  const recoveryResetLabel =
    (isMonthlyLimited && monthlyResetLabel) ||
    (isWeeklyLimited && weeklyResetLabel) ||
    (isFiveHourLimited && fiveHourResetLabel) ||
    null;
  const hasDisabledRecoveryReset = file.disabled === true && recoveryResetLabel !== null;
  const badges: AuthFileCodexStatusBadge[] = [];

  if (needsReauth) {
    badges.push({
      kind: 'reauth',
      tone: 'danger',
      labelKey: 'auth_files.codex_status_badge_reauth',
      defaultLabel: 'Needs reauth',
      titleKey: 'auth_files.codex_status_badge_reauth_title',
      defaultTitle: 'Latest Codex check returned 401 or suggested reauthorization.',
    });
  }

  if (isFiveHourLimited) {
    badges.push({
      kind: 'five_hour_limited',
      tone: 'warning',
      labelKey: 'auth_files.codex_status_badge_five_hour_limited',
      defaultLabel: '5h quota full',
      titleKey: 'auth_files.codex_status_badge_five_hour_limited_title',
      defaultTitle: 'The Codex 5-hour quota window is at or above the limit.',
    });
  }

  if (isWeeklyLimited) {
    badges.push({
      kind: 'weekly_limited',
      tone: 'warning',
      labelKey: 'auth_files.codex_status_badge_weekly_limited',
      defaultLabel: '7d quota full',
      titleKey: 'auth_files.codex_status_badge_weekly_limited_title',
      defaultTitle: 'The Codex 7-day quota window is at or above the limit.',
    });
  }

  if (isMonthlyLimited) {
    badges.push({
      kind: 'monthly_limited',
      tone: 'warning',
      labelKey: 'auth_files.codex_status_badge_monthly_limited',
      defaultLabel: 'Monthly quota full',
      titleKey: 'auth_files.codex_status_badge_monthly_limited_title',
      defaultTitle: 'The Codex monthly quota window is at or above the limit.',
    });
  }

  if (hasDisabledRecoveryReset && recoveryResetLabel) {
    badges.push({
      kind: 'disabled_with_reset',
      tone: 'info',
      labelKey: 'auth_files.codex_status_badge_disabled_reset',
      defaultLabel: `Restores ${recoveryResetLabel}`,
      titleKey: 'auth_files.codex_status_badge_disabled_reset_title',
      defaultTitle: `This disabled Codex account has a known quota recovery time: ${recoveryResetLabel}`,
      labelParams: { reset: recoveryResetLabel },
    });
  }

  return {
    isCodex,
    isHttp401,
    needsReauth,
    isFiveHourLimited,
    isWeeklyLimited,
    isMonthlyLimited,
    hasDisabledRecoveryReset,
    fiveHourResetLabel,
    weeklyResetLabel,
    monthlyResetLabel,
    recoveryResetLabel,
    fiveHourUsedPercent,
    weeklyUsedPercent,
    monthlyUsedPercent,
    badges,
  };
};

export const authFileMatchesCodexStatusFilter = (
  status: AuthFileCodexStatusSummary,
  filter: AuthFilesCodexStatusFilter
): boolean => {
  if (filter === 'all') return true;
  if (!status.isCodex) return false;
  if (filter === 'http_401') return status.isHttp401;
  if (filter === 'reauth') return status.needsReauth || status.isHttp401;
  if (filter === 'five_hour_limited') return status.isFiveHourLimited;
  if (filter === 'weekly_limited') return status.isWeeklyLimited;
  if (filter === 'monthly_limited') return status.isMonthlyLimited;
  if (filter === 'disabled_with_reset') return status.hasDisabledRecoveryReset;
  return true;
};

const getAuthFileCodexStatusSearchValues = (
  status: AuthFileCodexStatusSummary | undefined,
  t: TFunction
) =>
  status?.badges.flatMap((badge) => [
    badge.kind,
    badge.labelKey,
    badge.defaultLabel,
    t(badge.labelKey, { defaultValue: badge.defaultLabel, ...badge.labelParams }),
    badge.defaultTitle,
    badge.titleKey
      ? t(badge.titleKey, { defaultValue: badge.defaultTitle ?? badge.defaultLabel })
      : null,
  ]) ?? [];

const getAuthFileNoteValue = (file: AuthFileItem): string => {
  const raw = file.note ?? file['note'];
  if (raw === undefined || raw === null) return '';
  return String(raw).trim();
};

export const compareAuthFileNote = (
  left: AuthFileItem,
  right: AuthFileItem,
  direction: 'asc' | 'desc'
) => {
  const leftNote = getAuthFileNoteValue(left);
  const rightNote = getAuthFileNoteValue(right);
  const leftKnown = leftNote.length > 0;
  const rightKnown = rightNote.length > 0;

  if (leftKnown || rightKnown) {
    if (!leftKnown) return 1;
    if (!rightKnown) return -1;
    const diff = leftNote.localeCompare(rightNote, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
    if (diff !== 0) return direction === 'asc' ? diff : -diff;
  }

  return compareAuthFileName(left, right);
};

export const compareAuthFilePriority = (
  left: AuthFileItem,
  right: AuthFileItem,
  direction: 'asc' | 'desc'
) => {
  const leftPriority = parsePriorityValue(left.priority ?? left['priority']);
  const rightPriority = parsePriorityValue(right.priority ?? right['priority']);
  const leftKnown = leftPriority !== undefined;
  const rightKnown = rightPriority !== undefined;

  if (leftKnown || rightKnown) {
    if (!leftKnown) return 1;
    if (!rightKnown) return -1;
    const leftValue = leftPriority ?? 0;
    const rightValue = rightPriority ?? 0;
    const diff = direction === 'desc' ? rightValue - leftValue : leftValue - rightValue;
    if (diff !== 0) return diff;
  }

  return compareAuthFileName(left, right);
};

export const stringifySearchValue = (value: unknown): string[] => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap(stringifySearchValue);
  if (typeof value === 'string') return value.trim() ? [value] : [];
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
  return [];
};

export const getAuthFileCodexPlanLabel = (
  planType: string | null | undefined,
  t: TFunction
): string | null => {
  const normalized = normalizePlanType(planType);
  if (!normalized) return null;
  if (normalized === 'pro') return t('codex_quota.plan_pro');
  if (PREMIUM_CODEX_PLAN_TYPES.has(normalized) && normalized !== 'pro') {
    return t('codex_quota.plan_prolite');
  }
  if (normalized === 'plus') return t('codex_quota.plan_plus');
  if (normalized === 'team') return t('codex_quota.plan_team');
  if (normalized === 'free') return t('codex_quota.plan_free');
  return planType || normalized;
};

export const getAuthFilePlanType = (
  file: AuthFileItem,
  quota?: CodexQuotaState
): string | null => quota?.planType ?? resolveCodexPlanType(file) ?? null;

export const getAuthFilePlanLabel = (
  file: AuthFileItem,
  t: TFunction,
  quota?: CodexQuotaState
): string | null => getAuthFileCodexPlanLabel(getAuthFilePlanType(file, quota), t);

export const getAuthFilePlanSortRank = (
  file: AuthFileItem,
  quota?: CodexQuotaState
): number | null => {
  const normalized = normalizePlanType(getAuthFilePlanType(file, quota));
  if (!normalized) return null;
  if (normalized === 'pro') return 50;
  if (PREMIUM_CODEX_PLAN_TYPES.has(normalized) && normalized !== 'pro') return 40;
  if (normalized === 'team') return 30;
  if (normalized === 'plus') return 20;
  if (normalized === 'free') return 10;
  return 0;
};

export const getAuthFileSearchValues = (
  file: AuthFileItem,
  t: TFunction,
  quota?: CodexQuotaState,
  codexStatus?: AuthFileCodexStatusSummary
) => {
  const planType = getAuthFilePlanType(file, quota);
  const planLabel = getAuthFileCodexPlanLabel(planType, t);
  const accountId = resolveCodexChatgptAccountId(file);
  const type = file.type || file.provider;

  return [
    file.name,
    file.type,
    file.provider,
    type ? getTypeLabel(t, String(type)) : null,
    file.authIndex,
    file['auth_index'],
    file.status,
    file.state,
    file.statusMessage,
    file['status_message'],
    file.error,
    file.errorStatus,
    file['error_status'],
    quota?.status,
    quota?.error,
    quota?.errorStatus,
    planType,
    planLabel,
    accountId,
    getAuthFileCodexStatusSearchValues(codexStatus, t),
  ];
};
