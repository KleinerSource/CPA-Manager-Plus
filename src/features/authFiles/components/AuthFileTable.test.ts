import { describe, expect, it } from 'vitest';
import {
  getAuthFileTableQuotaItems,
  getAntigravityTableQuotaItems,
  getCodexTableQuotaWindows,
  type AuthFileCodexStatusSummary,
} from '@/features/authFiles/model/authFilesPageModel';
import type { AntigravityQuotaState, CodexQuotaState } from '@/types/quota';

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

describe('getAntigravityTableQuotaItems', () => {
  it('保留一个凭证下的全部模型额度', () => {
    const quota: AntigravityQuotaState = {
      status: 'success',
      groups: [
        {
          id: 'claude',
          label: 'Claude 4.5',
          models: ['claude-sonnet-4-5'],
          remainingFraction: 0.82,
          resetTime: '2026-07-29T07:52:00.000Z',
        },
        {
          id: 'gemini',
          label: 'Gemini 2.5 Pro',
          models: ['gemini-2.5-pro'],
          remainingFraction: 1,
          resetTime: '2026-07-29T07:52:00.000Z',
        },
      ],
    };

    expect(getAntigravityTableQuotaItems(quota)).toEqual([
      expect.objectContaining({ id: 'claude', label: 'Claude 4.5', percent: 82 }),
      expect.objectContaining({ id: 'gemini', label: 'Gemini 2.5 Pro', percent: 100 }),
    ]);
  });
});

describe('getAuthFileTableQuotaItems', () => {
  const t = ((key: string, params?: Record<string, unknown>) =>
    params?.count === undefined ? key : `${key}:${params.count}`) as never;

  it('生成 Claude、Gemini CLI、Kimi、Kiro 和 xAI 的列表额度项', () => {
    expect(
      getAuthFileTableQuotaItems(
        'claude',
        {
          status: 'success',
          windows: [{ id: 'five-hour', label: '5h', usedPercent: 25, resetLabel: '18:00' }],
        },
        t
      )
    ).toEqual([expect.objectContaining({ id: 'five-hour', percent: 75 })]);

    expect(
      getAuthFileTableQuotaItems(
        'gemini-cli',
        {
          status: 'success',
          buckets: [
            {
              id: 'gemini-pro',
              label: 'Gemini Pro',
              remainingFraction: 0.6,
              remainingAmount: 12,
            },
          ],
        },
        t
      )
    ).toEqual([expect.objectContaining({ id: 'gemini-pro', percent: 60 })]);

    expect(
      getAuthFileTableQuotaItems(
        'kimi',
        { status: 'success', rows: [{ id: 'weekly', label: 'Weekly', used: 20, limit: 100 }] },
        t
      )
    ).toEqual([expect.objectContaining({ id: 'weekly', percent: 80 })]);

    expect(
      getAuthFileTableQuotaItems(
        'kiro',
        {
          status: 'success',
          baseQuota: { used: 25, limit: 100, resetTime: 1_785_304_320 },
          freeTrialQuota: null,
          overageQuota: null,
          subscriptionTitle: 'KIRO PRO+',
        },
        t
      )
    ).toEqual([expect.objectContaining({ id: 'base', percent: 75 })]);

    expect(
      getAuthFileTableQuotaItems(
        'xai',
        {
          status: 'success',
          billing: {
            usedPercent: 40,
            usedCents: 400,
            monthlyLimitCents: 1000,
            onDemandCapCents: null,
          },
        },
        t
      )
    ).toEqual([expect.objectContaining({ id: 'monthly-limit', percent: 60 })]);
  });
});
