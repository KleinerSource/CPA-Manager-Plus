/**
 * Quota cache that survives route switches.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { obfuscatedStorage } from '@/services/storage/secureStorage';
import type {
  AntigravityQuotaState,
  ClaudeQuotaState,
  CodexQuotaState,
  GeminiCliQuotaState,
  KiroQuotaState,
  KimiQuotaState,
  XaiQuotaState,
} from '@/types';

type QuotaUpdater<T> = T | ((prev: T) => T);

interface QuotaStoreState {
  cacheScope: string;
  antigravityQuota: Record<string, AntigravityQuotaState>;
  claudeQuota: Record<string, ClaudeQuotaState>;
  codexQuota: Record<string, CodexQuotaState>;
  geminiCliQuota: Record<string, GeminiCliQuotaState>;
  kiroQuota: Record<string, KiroQuotaState>;
  kimiQuota: Record<string, KimiQuotaState>;
  xaiQuota: Record<string, XaiQuotaState>;
  setAntigravityQuota: (updater: QuotaUpdater<Record<string, AntigravityQuotaState>>) => void;
  setClaudeQuota: (updater: QuotaUpdater<Record<string, ClaudeQuotaState>>) => void;
  setCodexQuota: (updater: QuotaUpdater<Record<string, CodexQuotaState>>) => void;
  setGeminiCliQuota: (updater: QuotaUpdater<Record<string, GeminiCliQuotaState>>) => void;
  setKiroQuota: (updater: QuotaUpdater<Record<string, KiroQuotaState>>) => void;
  setKimiQuota: (updater: QuotaUpdater<Record<string, KimiQuotaState>>) => void;
  setXaiQuota: (updater: QuotaUpdater<Record<string, XaiQuotaState>>) => void;
  activateQuotaCacheScope: (scope: string) => void;
  clearQuotaCache: () => void;
}

const resolveUpdater = <T,>(updater: QuotaUpdater<T>, prev: T): T => {
  if (typeof updater === 'function') {
    return (updater as (value: T) => T)(prev);
  }
  return updater;
};

const emptyQuotaState = {
  antigravityQuota: {},
  claudeQuota: {},
  codexQuota: {},
  geminiCliQuota: {},
  kiroQuota: {},
  kimiQuota: {},
  xaiQuota: {},
};

const persistSuccessfulQuota = <T extends { status: string }>(items: Record<string, T>) =>
  Object.fromEntries(
    Object.entries(items).filter(
      ([, item]) => item?.status === 'success' && !('observedFromUsageHeaders' in item)
    )
  ) as Record<string, T>;

export const useQuotaStore = create<QuotaStoreState>()(
  persist(
    (set) => ({
      cacheScope: '',
      ...emptyQuotaState,
      setAntigravityQuota: (updater) =>
        set((state) => ({ antigravityQuota: resolveUpdater(updater, state.antigravityQuota) })),
      setClaudeQuota: (updater) =>
        set((state) => ({ claudeQuota: resolveUpdater(updater, state.claudeQuota) })),
      setCodexQuota: (updater) =>
        set((state) => ({ codexQuota: resolveUpdater(updater, state.codexQuota) })),
      setGeminiCliQuota: (updater) =>
        set((state) => ({ geminiCliQuota: resolveUpdater(updater, state.geminiCliQuota) })),
      setKiroQuota: (updater) =>
        set((state) => ({ kiroQuota: resolveUpdater(updater, state.kiroQuota) })),
      setKimiQuota: (updater) =>
        set((state) => ({ kimiQuota: resolveUpdater(updater, state.kimiQuota) })),
      setXaiQuota: (updater) =>
        set((state) => ({ xaiQuota: resolveUpdater(updater, state.xaiQuota) })),
      activateQuotaCacheScope: (scope) =>
        set((state) => {
          const nextScope = scope.trim();
          return state.cacheScope === nextScope
            ? state
            : { ...state, cacheScope: nextScope, ...emptyQuotaState };
        }),
      clearQuotaCache: () => set((state) => ({ ...state, ...emptyQuotaState })),
    }),
    {
      name: 'cli-proxy-quota-cache',
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          if (typeof localStorage === 'undefined') return null;
          const data = obfuscatedStorage.getItem(name);
          return data ? JSON.stringify(data) : null;
        },
        setItem: (name, value) => {
          if (typeof localStorage !== 'undefined') obfuscatedStorage.setItem(name, JSON.parse(value));
        },
        removeItem: (name) => obfuscatedStorage.removeItem(name),
      })),
      partialize: (state) => ({
        cacheScope: state.cacheScope,
        antigravityQuota: persistSuccessfulQuota(state.antigravityQuota),
        claudeQuota: persistSuccessfulQuota(state.claudeQuota),
        codexQuota: persistSuccessfulQuota(state.codexQuota),
        geminiCliQuota: persistSuccessfulQuota(state.geminiCliQuota),
        kiroQuota: persistSuccessfulQuota(state.kiroQuota),
        kimiQuota: persistSuccessfulQuota(state.kimiQuota),
        xaiQuota: persistSuccessfulQuota(state.xaiQuota),
      }),
    }
  )
);
