import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import type { AuthFileItem } from '@/types';
import type { UsageHeaderSnapshot } from '@/services/api/usageService';
import {
  buildObservedCodexQuotaState,
  buildUsageHeaderSnapshotLookup,
  getUsageHeaderSnapshotForAuthFile,
  isUsageHeaderQuotaSnapshotExpired,
} from './usageHeaderSnapshots';

const translate = ((key: string) => key) as TFunction;

const snapshot: UsageHeaderSnapshot = {
  event_hash: 'event-1',
  timestamp_ms: 1_700_000_000_000,
  auth_file_snapshot: 'codex.json',
  auth_index: 'auth-1',
  response_metadata: {
    quota: {
      plan_type: 'plus',
      rate_limit_reached_type: 'primary',
      primary: {
        used_percent: 42,
        reset_at_ms: 1_700_000_060_000,
        window_minutes: 300,
      },
      secondary: {
        used_percent: 10,
        reset_at_ms: 1_700_000_120_000,
        window_minutes: 10_080,
      },
    },
  },
};

describe('usageHeaderSnapshots', () => {
  it('matches snapshots by auth file and auth index', () => {
    const file = { name: 'codex.json', auth_index: 'auth-1' } as AuthFileItem;
    const lookup = buildUsageHeaderSnapshotLookup([snapshot]);
    expect(getUsageHeaderSnapshotForAuthFile(lookup, file)).toBe(snapshot);
  });

  it('builds a displayable Codex quota state from stored headers', () => {
    const quota = buildObservedCodexQuotaState(snapshot, translate);
    expect(quota).toMatchObject({
      status: 'success',
      planType: 'plus',
      observedFromUsageHeaders: true,
      observedAtMs: snapshot.timestamp_ms,
    });
    expect(quota?.windows.map((window) => window.usedPercent)).toEqual([42, 10]);
  });

  it('expires when the reached quota window reset time has passed', () => {
    expect(isUsageHeaderQuotaSnapshotExpired(snapshot, 1_700_000_059_999)).toBe(false);
    expect(isUsageHeaderQuotaSnapshotExpired(snapshot, 1_700_000_060_001)).toBe(true);
  });
});
