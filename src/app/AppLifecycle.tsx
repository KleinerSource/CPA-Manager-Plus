import { useEffect } from 'react';
import { useAuthStore, useLanguageStore, useThemeStore } from '@/stores';
import { apiClient } from '@/services/api/client';
import { resolveRuntimeApiBase } from '@/utils/connection';

export function AppLifecycle() {
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const apiBase = useAuthStore((state) => state.apiBase);
  const managementKey = useAuthStore((state) => state.managementKey);

  useEffect(() => {
    const runtimeApiBase = resolveRuntimeApiBase(apiBase);
    if (runtimeApiBase && runtimeApiBase !== apiBase) {
      useAuthStore.setState({ apiBase: runtimeApiBase });
    }
    apiClient.setConfig({ apiBase: runtimeApiBase || apiBase, managementKey });
  }, [apiBase, managementKey]);

  useEffect(() => {
    const cleanupTheme = initializeTheme();
    return cleanupTheme;
  }, [initializeTheme]);

  useEffect(() => {
    setLanguage(language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅用于首屏同步 i18n 语言

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}
