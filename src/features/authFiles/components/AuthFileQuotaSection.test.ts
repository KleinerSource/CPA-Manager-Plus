import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { buildEmbeddedCodexQuota, selectEffectiveQuota } from './AuthFileQuotaSection';

const t = ((key: string) => key) as TFunction;

describe('buildEmbeddedCodexQuota', () => {
  it('将启动预热保存的 Codex 用量转换为可直接展示的额度', () => {
    const quota = buildEmbeddedCodexQuota(
      {
        name: 'codex-user.json',
        type: 'codex',
        codex_quota_updated_at_ms: 123456,
        codex_quota: {
          plan_type: 'plus',
          rate_limit: {
            primary_window: {
              used_percent: 35,
              limit_window_seconds: 18000,
              reset_after_seconds: 900,
            },
          },
          rate_limit_reset_credits: { available_count: 2 },
        },
      },
      t
    );

    expect(quota).toMatchObject({
      status: 'success',
      planType: 'plus',
      fetchedAtMs: 123456,
      rateLimitResetCreditsAvailableCount: 2,
    });
    expect(quota?.windows).toHaveLength(1);
    expect(quota?.windows[0]).toMatchObject({ id: 'five-hour', usedPercent: 35 });
  });

  it('没有 SQLite 快照时不伪造额度状态', () => {
    expect(buildEmbeddedCodexQuota({ name: 'codex-user.json', type: 'codex' }, t)).toBeUndefined();
  });

  it('将 429 响应头保存的已用 100% 额度保留为剩余 0% 的有效窗口', () => {
    const quota = buildEmbeddedCodexQuota(
      {
        name: 'codex-exhausted.json',
        type: 'codex',
        codex_quota_updated_at_ms: 123456,
        codex_quota: {
          plan_type: 'plus',
          rate_limit: {
            primary_window: {
              used_percent: 100,
              limit_window_seconds: 604800,
              reset_after_seconds: 3600,
            },
          },
        },
      },
      t
    );

    expect(quota?.windows).toHaveLength(1);
    expect(quota?.windows[0]).toMatchObject({ id: 'weekly', usedPercent: 100 });
  });
});

describe('selectEffectiveQuota', () => {
  it('使用时间更新的启动预热额度覆盖旧的页面缓存', () => {
    const cached = { status: 'success', fetchedAtMs: 1000 };
    const startup = { status: 'success', fetchedAtMs: 2000 };

    expect(selectEffectiveQuota(cached, startup)).toBe(startup);
  });

  it('保留时间更新的响应头额度', () => {
    const headers = { status: 'success', observedAtMs: 3000 };
    const startup = { status: 'success', fetchedAtMs: 2000 };

    expect(selectEffectiveQuota(headers, startup)).toBe(headers);
  });
});
