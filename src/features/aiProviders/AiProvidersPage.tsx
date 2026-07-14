import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AmpcodeSection,
  ClaudeSection,
  CodexSection,
  GeminiSection,
  OpenAISection,
  VertexSection,
  ProviderNav,
  useProviderRecentRequests,
} from '@/components/providers';
import {
  getOpenAIProviderRecentStatusData,
  getOpenAIProviderTotalStats,
  getProviderConfigKey,
  getProviderRecentStatusData,
  getProviderTotalStats,
  hasDisableAllModelsRule,
  withDisableAllModelsRule,
  withoutDisableAllModelsRule,
} from '@/components/providers/utils';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { IconPlus, IconSlidersHorizontal } from '@/components/ui/icons';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { ampcodeApi, providersApi } from '@/services/api';
import { useAuthStore, useConfigStore, useNotificationStore, useThemeStore } from '@/stores';
import { statusBarDataFromRecentRequests } from '@/utils/recentRequests';
import type { GeminiKeyConfig, OpenAIProviderConfig, ProviderKeyConfig } from '@/types';
import {
  AiProvidersUnifiedTable,
  type AiProviderListRow,
} from './AiProvidersUnifiedTable';
import styles from './AiProvidersPage.module.scss';

const maskProviderCredential = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
};

const getModelDetails = (models?: Array<{ name: string; alias?: string }>): string[] =>
  models?.map((model) => (model.alias ? `${model.name} (${model.alias})` : model.name)) ?? [];

export function AiProvidersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification, showConfirmation } = useNotificationStore();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);

  const config = useConfigStore((state) => state.config);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const updateConfigValue = useConfigStore((state) => state.updateConfigValue);
  const clearCache = useConfigStore((state) => state.clearCache);
  const isCacheValid = useConfigStore((state) => state.isCacheValid);

  const hasMounted = useRef(false);
  const [loading, setLoading] = useState(() => !isCacheValid());
  const [error, setError] = useState('');
  const [listMode, setListMode] = useState(false);
  const [addProviderModalOpen, setAddProviderModalOpen] = useState(false);

  const [geminiKeys, setGeminiKeys] = useState<GeminiKeyConfig[]>(
    () => config?.geminiApiKeys || []
  );
  const [codexConfigs, setCodexConfigs] = useState<ProviderKeyConfig[]>(
    () => config?.codexApiKeys || []
  );
  const [claudeConfigs, setClaudeConfigs] = useState<ProviderKeyConfig[]>(
    () => config?.claudeApiKeys || []
  );
  const [vertexConfigs, setVertexConfigs] = useState<ProviderKeyConfig[]>(
    () => config?.vertexApiKeys || []
  );
  const [openaiProviders, setOpenaiProviders] = useState<OpenAIProviderConfig[]>(
    () => config?.openaiCompatibility || []
  );

  const [configSwitchingKey, setConfigSwitchingKey] = useState<string | null>(null);

  const disableControls = connectionStatus !== 'connected';
  const isSwitching = Boolean(configSwitchingKey);

  const pageTransitionLayer = usePageTransitionLayer();
  const isCurrentLayer = pageTransitionLayer ? pageTransitionLayer.status === 'current' : true;

  const { usageByProvider, loadRecentRequests, refreshRecentRequests } = useProviderRecentRequests({
    enabled: isCurrentLayer,
  });

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return '';
  };

  const loadConfigs = useCallback(async () => {
    const hasValidCache = isCacheValid();
    if (!hasValidCache) {
      setLoading(true);
    }
    setError('');
    try {
      const [configResult, vertexResult, ampcodeResult, openaiResult] = await Promise.allSettled([
        fetchConfig(),
        providersApi.getVertexConfigs(),
        ampcodeApi.getAmpcode(),
        providersApi.getOpenAIProviders(),
      ]);

      if (configResult.status !== 'fulfilled') {
        throw configResult.reason;
      }

      const data = configResult.value;
      setGeminiKeys(data?.geminiApiKeys || []);
      setCodexConfigs(data?.codexApiKeys || []);
      setClaudeConfigs(data?.claudeApiKeys || []);
      setVertexConfigs(data?.vertexApiKeys || []);
      setOpenaiProviders(data?.openaiCompatibility || []);

      if (vertexResult.status === 'fulfilled') {
        setVertexConfigs(vertexResult.value || []);
        updateConfigValue('vertex-api-key', vertexResult.value || []);
        clearCache('vertex-api-key');
      }

      if (ampcodeResult.status === 'fulfilled') {
        updateConfigValue('ampcode', ampcodeResult.value);
        clearCache('ampcode');
      }

      if (openaiResult.status === 'fulfilled') {
        setOpenaiProviders(openaiResult.value || []);
        updateConfigValue('openai-compatibility', openaiResult.value || []);
        clearCache('openai-compatibility');
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err) || t('notification.refresh_failed');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clearCache, fetchConfig, isCacheValid, t, updateConfigValue]);

  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;
    loadConfigs();
  }, [loadConfigs]);

  useEffect(() => {
    if (!isCurrentLayer) return;
    void loadRecentRequests().catch(() => {});
  }, [isCurrentLayer, loadRecentRequests]);

  useEffect(() => {
    if (config?.geminiApiKeys) setGeminiKeys(config.geminiApiKeys);
    if (config?.codexApiKeys) setCodexConfigs(config.codexApiKeys);
    if (config?.claudeApiKeys) setClaudeConfigs(config.claudeApiKeys);
    if (config?.vertexApiKeys) setVertexConfigs(config.vertexApiKeys);
    if (config?.openaiCompatibility) setOpenaiProviders(config.openaiCompatibility);
  }, [
    config?.geminiApiKeys,
    config?.codexApiKeys,
    config?.claudeApiKeys,
    config?.vertexApiKeys,
    config?.openaiCompatibility,
  ]);

  const handleRecentRequestsRefresh = useCallback(async () => {
    await refreshRecentRequests();
  }, [refreshRecentRequests]);

  useHeaderRefresh(handleRecentRequestsRefresh, isCurrentLayer);

  const openEditor = useCallback(
    (path: string) => {
      navigate(path, { state: { fromAiProviders: true } });
    },
    [navigate]
  );

  const openProviderEditor = (provider: 'openai' | 'codex' | 'claude' | 'vertex' | 'gemini') => {
    setAddProviderModalOpen(false);
    openEditor('/ai-providers/' + provider + '/new');
  };

  const deleteGemini = async (index: number) => {
    const entry = geminiKeys[index];
    if (!entry) return;
    showConfirmation({
      title: t('ai_providers.gemini_delete_title', { defaultValue: 'Delete Gemini Key' }),
      message: t('ai_providers.gemini_delete_confirm'),
      variant: 'danger',
      confirmText: t('common.confirm'),
      onConfirm: async () => {
        try {
          await providersApi.deleteGeminiKey(entry.apiKey, entry.baseUrl);
          const next = geminiKeys.filter((_, idx) => idx !== index);
          setGeminiKeys(next);
          updateConfigValue('gemini-api-key', next);
          clearCache('gemini-api-key');
          showNotification(t('notification.gemini_key_deleted'), 'success');
        } catch (err: unknown) {
          const message = getErrorMessage(err);
          showNotification(`${t('notification.delete_failed')}: ${message}`, 'error');
        }
      },
    });
  };

  const setConfigEnabled = async (
    provider: 'gemini' | 'codex' | 'claude' | 'vertex',
    index: number,
    enabled: boolean
  ) => {
    if (provider === 'gemini') {
      const current = geminiKeys[index];
      if (!current) return;

      const switchingKey = `${provider}:${current.apiKey}`;
      setConfigSwitchingKey(switchingKey);

      const previousList = geminiKeys;
      const nextExcluded = enabled
        ? withoutDisableAllModelsRule(current.excludedModels)
        : withDisableAllModelsRule(current.excludedModels);
      const nextItem: GeminiKeyConfig = { ...current, excludedModels: nextExcluded };
      const nextList = previousList.map((item, idx) => (idx === index ? nextItem : item));

      setGeminiKeys(nextList);
      updateConfigValue('gemini-api-key', nextList);
      clearCache('gemini-api-key');

      try {
        await providersApi.saveGeminiKeys(nextList);
        showNotification(
          enabled ? t('notification.config_enabled') : t('notification.config_disabled'),
          'success'
        );
      } catch (err: unknown) {
        const message = getErrorMessage(err);
        setGeminiKeys(previousList);
        updateConfigValue('gemini-api-key', previousList);
        clearCache('gemini-api-key');
        showNotification(`${t('notification.update_failed')}: ${message}`, 'error');
      } finally {
        setConfigSwitchingKey(null);
      }
      return;
    }

    const source =
      provider === 'codex'
        ? codexConfigs
        : provider === 'claude'
          ? claudeConfigs
          : vertexConfigs;
    const current = source[index];
    if (!current) return;

    const switchingKey = `${provider}:${current.apiKey}`;
    setConfigSwitchingKey(switchingKey);

    const previousList = source;
    const nextExcluded = enabled
      ? withoutDisableAllModelsRule(current.excludedModels)
      : withDisableAllModelsRule(current.excludedModels);
    const nextItem: ProviderKeyConfig = { ...current, excludedModels: nextExcluded };
    const nextList = previousList.map((item, idx) => (idx === index ? nextItem : item));

    if (provider === 'codex') {
      setCodexConfigs(nextList);
      updateConfigValue('codex-api-key', nextList);
      clearCache('codex-api-key');
    } else if (provider === 'claude') {
      setClaudeConfigs(nextList);
      updateConfigValue('claude-api-key', nextList);
      clearCache('claude-api-key');
    } else {
      setVertexConfigs(nextList);
      updateConfigValue('vertex-api-key', nextList);
      clearCache('vertex-api-key');
    }

    try {
      if (provider === 'codex') {
        await providersApi.saveCodexConfigs(nextList);
      } else if (provider === 'claude') {
        await providersApi.saveClaudeConfigs(nextList);
      } else {
        await providersApi.saveVertexConfigs(nextList);
      }
      showNotification(
        enabled ? t('notification.config_enabled') : t('notification.config_disabled'),
        'success'
      );
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (provider === 'codex') {
        setCodexConfigs(previousList);
        updateConfigValue('codex-api-key', previousList);
        clearCache('codex-api-key');
      } else if (provider === 'claude') {
        setClaudeConfigs(previousList);
        updateConfigValue('claude-api-key', previousList);
        clearCache('claude-api-key');
      } else {
        setVertexConfigs(previousList);
        updateConfigValue('vertex-api-key', previousList);
        clearCache('vertex-api-key');
      }
      showNotification(`${t('notification.update_failed')}: ${message}`, 'error');
    } finally {
      setConfigSwitchingKey(null);
    }
  };

  const setOpenAIProviderEnabled = async (index: number, enabled: boolean) => {
    const current = openaiProviders[index];
    if (!current) return;

    const switchingKey = `openai:${current.name}:${index}`;
    setConfigSwitchingKey(switchingKey);

    const previousList = openaiProviders;
    const nextItem: OpenAIProviderConfig = { ...current, disabled: !enabled };
    const nextList = previousList.map((item, idx) => (idx === index ? nextItem : item));

    setOpenaiProviders(nextList);
    updateConfigValue('openai-compatibility', nextList);
    clearCache('openai-compatibility');

    try {
      await providersApi.updateOpenAIProviderDisabled(index, !enabled);
      showNotification(
        enabled ? t('notification.config_enabled') : t('notification.config_disabled'),
        'success'
      );
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setOpenaiProviders(previousList);
      updateConfigValue('openai-compatibility', previousList);
      clearCache('openai-compatibility');
      showNotification(`${t('notification.update_failed')}: ${message}`, 'error');
    } finally {
      setConfigSwitchingKey(null);
    }
  };

  const deleteProviderEntry = async (type: 'codex' | 'claude', index: number) => {
    const source = type === 'codex' ? codexConfigs : claudeConfigs;
    const entry = source[index];
    if (!entry) return;
    showConfirmation({
      title: t(`ai_providers.${type}_delete_title`, { defaultValue: `Delete ${type === 'codex' ? 'Codex' : 'Claude'} Config` }),
      message: t(`ai_providers.${type}_delete_confirm`),
      variant: 'danger',
      confirmText: t('common.confirm'),
      onConfirm: async () => {
        try {
          if (type === 'codex') {
            await providersApi.deleteCodexConfig(entry.apiKey, entry.baseUrl);
            const next = codexConfigs.filter((_, idx) => idx !== index);
            setCodexConfigs(next);
            updateConfigValue('codex-api-key', next);
            clearCache('codex-api-key');
            showNotification(t('notification.codex_config_deleted'), 'success');
          } else {
            await providersApi.deleteClaudeConfig(entry.apiKey, entry.baseUrl);
            const next = claudeConfigs.filter((_, idx) => idx !== index);
            setClaudeConfigs(next);
            updateConfigValue('claude-api-key', next);
            clearCache('claude-api-key');
            showNotification(t('notification.claude_config_deleted'), 'success');
          }
        } catch (err: unknown) {
          const message = getErrorMessage(err);
          showNotification(`${t('notification.delete_failed')}: ${message}`, 'error');
        }
      },
    });
  };

  const deleteVertex = async (index: number) => {
    const entry = vertexConfigs[index];
    if (!entry) return;
    showConfirmation({
      title: t('ai_providers.vertex_delete_title', { defaultValue: 'Delete Vertex Config' }),
      message: t('ai_providers.vertex_delete_confirm'),
      variant: 'danger',
      confirmText: t('common.confirm'),
      onConfirm: async () => {
        try {
          await providersApi.deleteVertexConfig(entry.apiKey, entry.baseUrl);
          const next = vertexConfigs.filter((_, idx) => idx !== index);
          setVertexConfigs(next);
          updateConfigValue('vertex-api-key', next);
          clearCache('vertex-api-key');
          showNotification(t('notification.vertex_config_deleted'), 'success');
        } catch (err: unknown) {
          const message = getErrorMessage(err);
          showNotification(`${t('notification.delete_failed')}: ${message}`, 'error');
        }
      },
    });
  };

  const deleteOpenai = async (index: number) => {
    const entry = openaiProviders[index];
    if (!entry) return;
    showConfirmation({
      title: t('ai_providers.openai_delete_title', { defaultValue: 'Delete OpenAI Provider' }),
      message: t('ai_providers.openai_delete_confirm'),
      variant: 'danger',
      confirmText: t('common.confirm'),
      onConfirm: async () => {
        try {
          await providersApi.deleteOpenAIProvider(entry.name);
          const next = openaiProviders.filter((_, idx) => idx !== index);
          setOpenaiProviders(next);
          updateConfigValue('openai-compatibility', next);
          clearCache('openai-compatibility');
          showNotification(t('notification.openai_provider_deleted'), 'success');
        } catch (err: unknown) {
          const message = getErrorMessage(err);
          showNotification(`${t('notification.delete_failed')}: ${message}`, 'error');
        }
      },
    });
  };

  const unifiedRows: AiProviderListRow[] = (() => {
    const rows: AiProviderListRow[] = [];

    geminiKeys.forEach((item, index) => {
      const stats = getProviderTotalStats(usageByProvider, 'gemini', item.apiKey, item.baseUrl);
      rows.push({
        id: `gemini:${getProviderConfigKey(item, index)}`,
        provider: t('ai_providers.provider_gemini'),
        name: t('ai_providers.gemini_item_title'),
        baseUrl: item.baseUrl || '',
        credential: t('ai_providers.unified_credentials_count', { count: item.apiKey ? 1 : 0 }),
        credentialDetails: item.apiKey ? [maskProviderCredential(item.apiKey)] : [],
        modelCount: item.models?.length ?? 0,
        modelDetails: getModelDetails(item.models),
        success: stats.success,
        failure: stats.failure,
        statusData: getProviderRecentStatusData(
          usageByProvider,
          'gemini',
          item.apiKey,
          item.baseUrl
        ),
        disabled: hasDisableAllModelsRule(item.excludedModels),
        canToggle: true,
        canDelete: true,
        onEdit: () => openEditor(`/ai-providers/gemini/${index}`),
        onDelete: () => void deleteGemini(index),
        onToggle: (enabled) => void setConfigEnabled('gemini', index, enabled),
      });
    });

    codexConfigs.forEach((item, index) => {
      const stats = getProviderTotalStats(usageByProvider, 'codex', item.apiKey, item.baseUrl);
      rows.push({
        id: `codex:${getProviderConfigKey(item, index)}`,
        provider: t('ai_providers.provider_codex'),
        name: item.name || t('ai_providers.codex_item_title'),
        baseUrl: item.baseUrl || '',
        credential: t('ai_providers.unified_credentials_count', { count: item.apiKey ? 1 : 0 }),
        credentialDetails: item.apiKey ? [maskProviderCredential(item.apiKey)] : [],
        modelCount: item.models?.length ?? 0,
        modelDetails: getModelDetails(item.models),
        success: stats.success,
        failure: stats.failure,
        statusData: getProviderRecentStatusData(
          usageByProvider,
          'codex',
          item.apiKey,
          item.baseUrl
        ),
        disabled: hasDisableAllModelsRule(item.excludedModels),
        canToggle: true,
        canDelete: true,
        onEdit: () => openEditor(`/ai-providers/codex/${index}`),
        onDelete: () => void deleteProviderEntry('codex', index),
        onToggle: (enabled) => void setConfigEnabled('codex', index, enabled),
      });
    });

    claudeConfigs.forEach((item, index) => {
      const stats = getProviderTotalStats(usageByProvider, 'claude', item.apiKey, item.baseUrl);
      rows.push({
        id: `claude:${getProviderConfigKey(item, index)}`,
        provider: t('ai_providers.provider_claude'),
        name: item.name || t('ai_providers.claude_item_title'),
        baseUrl: item.baseUrl || '',
        credential: t('ai_providers.unified_credentials_count', { count: item.apiKey ? 1 : 0 }),
        credentialDetails: item.apiKey ? [maskProviderCredential(item.apiKey)] : [],
        modelCount: item.models?.length ?? 0,
        modelDetails: getModelDetails(item.models),
        success: stats.success,
        failure: stats.failure,
        statusData: getProviderRecentStatusData(
          usageByProvider,
          'claude',
          item.apiKey,
          item.baseUrl
        ),
        disabled: hasDisableAllModelsRule(item.excludedModels),
        canToggle: true,
        canDelete: true,
        onEdit: () => openEditor(`/ai-providers/claude/${index}`),
        onDelete: () => void deleteProviderEntry('claude', index),
        onToggle: (enabled) => void setConfigEnabled('claude', index, enabled),
      });
    });

    vertexConfigs.forEach((item, index) => {
      const stats = getProviderTotalStats(usageByProvider, 'vertex', item.apiKey, item.baseUrl);
      rows.push({
        id: `vertex:${getProviderConfigKey(item, index)}`,
        provider: t('ai_providers.provider_vertex'),
        name: item.name || t('ai_providers.vertex_item_title'),
        baseUrl: item.baseUrl || '',
        credential: t('ai_providers.unified_credentials_count', { count: item.apiKey ? 1 : 0 }),
        credentialDetails: item.apiKey ? [maskProviderCredential(item.apiKey)] : [],
        modelCount: item.models?.length ?? 0,
        modelDetails: getModelDetails(item.models),
        success: stats.success,
        failure: stats.failure,
        statusData: getProviderRecentStatusData(
          usageByProvider,
          'vertex',
          item.apiKey,
          item.baseUrl
        ),
        disabled: hasDisableAllModelsRule(item.excludedModels),
        canToggle: true,
        canDelete: true,
        onEdit: () => openEditor(`/ai-providers/vertex/${index}`),
        onDelete: () => void deleteVertex(index),
        onToggle: (enabled) => void setConfigEnabled('vertex', index, enabled),
      });
    });

    openaiProviders.forEach((item, index) => {
      const stats = getOpenAIProviderTotalStats(item, usageByProvider);
      rows.push({
        id: `openai:${item.name}:${index}`,
        provider: t('ai_providers.provider_openai'),
        name: item.name,
        baseUrl: item.baseUrl,
        credential: t('ai_providers.unified_credentials_count', {
          count: item.apiKeyEntries?.length ?? 0,
        }),
        credentialDetails: item.apiKeyEntries?.map((entry) => maskProviderCredential(entry.apiKey)),
        modelCount: item.models?.length ?? 0,
        modelDetails: getModelDetails(item.models),
        success: stats.success,
        failure: stats.failure,
        statusData: getOpenAIProviderRecentStatusData(item, usageByProvider),
        disabled: item.disabled === true,
        canToggle: true,
        canDelete: true,
        onEdit: () => openEditor(`/ai-providers/openai/${index}`),
        onDelete: () => void deleteOpenai(index),
        onToggle: (enabled) => void setOpenAIProviderEnabled(index, enabled),
      });
    });

    if (config?.ampcode) {
      const ampcodeCredentialDetails = [
        ...(config.ampcode.upstreamApiKey
          ? [maskProviderCredential(config.ampcode.upstreamApiKey)]
          : []),
        ...(config.ampcode.upstreamApiKeys ?? []).map((entry) =>
          maskProviderCredential(entry.upstreamApiKey)
        ),
      ];
      rows.push({
        id: 'ampcode',
        provider: t('ai_providers.provider_ampcode'),
        name: t('ai_providers.ampcode_title'),
        baseUrl: config.ampcode.upstreamUrl || '',
        credential: t('ai_providers.unified_credentials_count', {
          count: ampcodeCredentialDetails.length,
        }),
        credentialDetails: ampcodeCredentialDetails,
        modelCount: config.ampcode.modelMappings?.length ?? 0,
        modelDetails: config.ampcode.modelMappings?.map(
          (mapping) => `${mapping.from} → ${mapping.to}`
        ),
        success: 0,
        failure: 0,
        statusData: statusBarDataFromRecentRequests([]),
        disabled: false,
        canToggle: false,
        canDelete: false,
        onEdit: () => openEditor('/ai-providers/ampcode'),
        onDelete: () => undefined,
      });
    }

    return rows;
  })();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {error && <div className="error-box">{error}</div>}

        <div
          className={styles.displayOptionsItem + (listMode ? ' ' + styles.listModeToolbar : '')}
        >
          {listMode && (
            <Button
              size="sm"
              onClick={() => setAddProviderModalOpen(true)}
              disabled={disableControls || loading}
            >
              <IconPlus size={15} />
              {t('ai_providers.add_provider')}
            </Button>
          )}
          <DropdownMenu
            ariaLabel={t('ai_providers.display_options_label')}
            triggerLabel={t('ai_providers.display_options_label')}
            triggerIcon={<IconSlidersHorizontal size={15} />}
            triggerClassName={styles.displayOptionsTrigger}
            items={[
              {
                key: 'display-options',
                label: t('ai_providers.display_options_label'),
                content: (
                  <div className={styles.displayOptionsMenu}>
                    <ToggleSwitch
                      checked={listMode}
                      onChange={setListMode}
                      ariaLabel={t('ai_providers.list_mode_label')}
                      label={t('ai_providers.list_mode_label')}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>

        {listMode ? (
          <AiProvidersUnifiedTable
            rows={unifiedRows}
            loading={loading}
            actionsDisabled={disableControls || loading || isSwitching}
          />
        ) : (
          <>
            <div id="provider-openai">
              <OpenAISection
                configs={openaiProviders}
                usageByProvider={usageByProvider}
                loading={loading}
                disableControls={disableControls}
                isSwitching={isSwitching}
                resolvedTheme={resolvedTheme}
                onAdd={() => openEditor('/ai-providers/openai/new')}
                onEdit={(index) => openEditor(`/ai-providers/openai/${index}`)}
                onDelete={deleteOpenai}
                onToggle={(index, enabled) => void setOpenAIProviderEnabled(index, enabled)}
              />
            </div>

            <div id="provider-codex">
              <CodexSection
                configs={codexConfigs}
                usageByProvider={usageByProvider}
                loading={loading}
                disableControls={disableControls}
                isSwitching={isSwitching}
                onAdd={() => openEditor('/ai-providers/codex/new')}
                onEdit={(index) => openEditor(`/ai-providers/codex/${index}`)}
                onDelete={(index) => void deleteProviderEntry('codex', index)}
                onToggle={(index, enabled) => void setConfigEnabled('codex', index, enabled)}
              />
            </div>

            <div id="provider-claude">
              <ClaudeSection
                configs={claudeConfigs}
                usageByProvider={usageByProvider}
                loading={loading}
                disableControls={disableControls}
                isSwitching={isSwitching}
                onAdd={() => openEditor('/ai-providers/claude/new')}
                onEdit={(index) => openEditor(`/ai-providers/claude/${index}`)}
                onDelete={(index) => void deleteProviderEntry('claude', index)}
                onToggle={(index, enabled) => void setConfigEnabled('claude', index, enabled)}
              />
            </div>

            <div id="provider-vertex">
              <VertexSection
                configs={vertexConfigs}
                usageByProvider={usageByProvider}
                loading={loading}
                disableControls={disableControls}
                isSwitching={isSwitching}
                onAdd={() => openEditor('/ai-providers/vertex/new')}
                onEdit={(index) => openEditor(`/ai-providers/vertex/${index}`)}
                onDelete={deleteVertex}
                onToggle={(index, enabled) => void setConfigEnabled('vertex', index, enabled)}
              />
            </div>

            <div id="provider-ampcode">
              <AmpcodeSection
                config={config?.ampcode}
                loading={loading}
                disableControls={disableControls}
                isSwitching={isSwitching}
                onEdit={() => openEditor('/ai-providers/ampcode')}
              />
            </div>

            <div id="provider-gemini">
              <GeminiSection
                configs={geminiKeys}
                usageByProvider={usageByProvider}
                loading={loading}
                disableControls={disableControls}
                isSwitching={isSwitching}
                onAdd={() => openEditor('/ai-providers/gemini/new')}
                onEdit={(index) => openEditor(`/ai-providers/gemini/${index}`)}
                onDelete={deleteGemini}
                onToggle={(index, enabled) => void setConfigEnabled('gemini', index, enabled)}
              />
            </div>
          </>
        )}
      </div>

      <Modal
        open={addProviderModalOpen}
        title={t('ai_providers.add_provider_title')}
        onClose={() => setAddProviderModalOpen(false)}
        width={520}
      >
        <div className={styles.providerTypeList}>
          {([
            ['openai', 'provider_openai'],
            ['codex', 'provider_codex'],
            ['claude', 'provider_claude'],
            ['vertex', 'provider_vertex'],
            ['gemini', 'provider_gemini'],
          ] as const).map(([provider, labelKey]) => (
            <Button
              key={provider}
              variant="secondary"
              className={styles.providerTypeButton}
              onClick={() => openProviderEditor(provider)}
              disabled={disableControls || loading}
            >
              {t('ai_providers.' + labelKey)}
            </Button>
          ))}
        </div>
      </Modal>

      {!listMode && <ProviderNav />}
    </div>
  );
}
