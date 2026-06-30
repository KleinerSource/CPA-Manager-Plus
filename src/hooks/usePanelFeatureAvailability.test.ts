import { act, createElement } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { usageServiceApi } from '@/services/api/usageService';
import { useAuthStore } from '@/stores';
import {
  buildNativeRequestMonitoringAvailability,
  buildUnavailableAvailability,
  usePanelFeatureAvailability,
} from './usePanelFeatureAvailability';

const createMemoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

describe('panel feature availability', () => {
  it('enables native usage and local model pricing from the current management API', () => {
    const availability = buildNativeRequestMonitoringAvailability({
      apiBase: 'http://cpa.local:8317',
      panelBase: 'http://panel.local:5173',
    });

    expect(availability.serviceBase).toBe('http://cpa.local:8317');
    expect(availability.serviceAvailable).toBe(true);
    expect(availability.requestMonitoringAvailable).toBe(true);
    expect(availability.modelPricesAvailable).toBe(true);
    expect(availability.reason).toBe('');
  });

  it('marks features unavailable when the management key is missing', () => {
    const availability = buildUnavailableAvailability({
      apiBase: 'http://cpa.local:8317',
      panelBase: 'http://panel.local:5173',
      reason: 'service_not_configured',
    });

    expect(availability.serviceBase).toBe('http://cpa.local:8317');
    expect(availability.serviceAvailable).toBe(false);
    expect(availability.requestMonitoringAvailable).toBe(false);
    expect(availability.modelPricesAvailable).toBe(false);
    expect(availability.reason).toBe('service_not_configured');
  });

  it('shares one feature detection request across concurrent hook consumers', async () => {
    const getUsageSpy = vi.spyOn(usageServiceApi, 'getUsage').mockResolvedValue({
      total_requests: 0,
      success_count: 0,
      failure_count: 0,
      total_tokens: 0,
      apis: {},
    });
    let renderer: ReactTestRenderer | null = null;
    vi.stubGlobal('window', {
      location: {
        protocol: 'http:',
        hostname: 'panel.local',
        host: 'panel.local:5174',
        port: '5174',
      },
    });
    vi.stubGlobal('navigator', { userAgent: 'vitest' });
    vi.stubGlobal('localStorage', createMemoryStorage());

    try {
      useAuthStore.setState({
        apiBase: 'http://cpa.local:8317',
        managementKey: 'management-key',
      });

      function HookConsumer() {
        usePanelFeatureAvailability();
        return null;
      }

      await act(async () => {
        renderer = create(
          createElement('div', null, createElement(HookConsumer), createElement(HookConsumer))
        );
      });

      expect(getUsageSpy).toHaveBeenCalledTimes(1);
      expect(getUsageSpy).toHaveBeenNthCalledWith(1, 'http://cpa.local:8317', 'management-key');
    } finally {
      act(() => {
        renderer?.unmount();
      });
      getUsageSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
