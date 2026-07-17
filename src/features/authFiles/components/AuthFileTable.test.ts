import { describe, expect, it } from 'vitest';
import {
  getCodexTableQuotaWindows,
  type AuthFileCodexStatusSummary,
} from '@/features/authFiles/model/authFilesPageModel';
import type { CodexQuotaState } from '@/types/quota';

const emptyCodexStatus = {
  isCodex: true,
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
} satisfies AuthFileCodexStatusSummary;

describe('getCodexTableQuotaWindows', () => {
  it('保留卡片模式中的全部额度窗口，包括 720 小时额度', () => {
    const quota: CodexQuotaState = {
      status: 'success',
      planType: 'plus',
      windows: [
        {
          id: 'five-hour',
          label: '5 小时限额',
          labelKey: 'codex_quota.primary_window',
          usedPercent: 20,
          resetLabel: '1 小时后',
          limitWindowSeconds: 18_000,
        },
        {
          id: 'monthly',
          label: '月限额',
          labelKey: 'codex_quota.monthly_window',
          usedPercent: 40,
          resetLabel: '720 小时后',
          limitWindowSeconds: 2_592_000,
        },
      ],
    };

    expect(getCodexTableQuotaWindows(quota, emptyCodexStatus)).toEqual(quota.windows);
  });

  it('额度窗口尚未加载时保留状态摘要中的月度额度', () => {
    const status = {
      ...emptyCodexStatus,
      monthlyUsedPercent: 40,
      monthlyResetLabel: '720 小时后',
    } satisfies AuthFileCodexStatusSummary;

    expect(getCodexTableQuotaWindows(undefined, status)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'monthly',
          usedPercent: 40,
          resetLabel: '720 小时后',
        }),
      ])
    );
  });
});
