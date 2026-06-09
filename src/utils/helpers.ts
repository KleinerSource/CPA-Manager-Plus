/**
 * 通用辅助函数。
 */

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const getErrorMessage = (error: unknown, fallback = ''): string => {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error || fallback;
  if (isRecord(error) && typeof error.message === 'string') return error.message || fallback;
  return fallback;
};
