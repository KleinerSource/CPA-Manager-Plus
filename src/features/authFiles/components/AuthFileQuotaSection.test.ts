import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { getAuthFileQuotaErrorMessage } from './AuthFileQuotaSection';

const t = ((key: string) => {
  if (key === 'common.unknown_error') return '未知错误';
  if (key === 'common.quota_update_required') return '请更新 CPA 版本或检查更新';
  if (key === 'common.quota_check_credential') return '请检查凭证状态';
  return key;
}) as TFunction;

describe('getAuthFileQuotaErrorMessage', () => {
  it('保留额度刷新失败返回的错误内容', () => {
    expect(
      getAuthFileQuotaErrorMessage(t, { status: 'error', error: 'upstream failed', errorStatus: 500 })
    ).toBe('upstream failed');
  });

  it('根据状态码使用卡片模式的通用错误文案', () => {
    expect(getAuthFileQuotaErrorMessage(t, { status: 'error', error: 'not found', errorStatus: 404 })).toBe(
      '请更新 CPA 版本或检查更新'
    );
  });
});
