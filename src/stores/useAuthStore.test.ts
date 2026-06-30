import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const createMemoryStorage = (): StorageLike => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

const apiClientSetConfig = vi.fn();
const fetchConfigMock = vi.fn();
const clearConfigCacheMock = vi.fn();
const clearModelsCacheMock = vi.fn();

vi.mock('@/services/api/client', () => ({
  apiClient: {
    setConfig: apiClientSetConfig,
  },
}));

vi.mock('./useConfigStore', () => ({
  useConfigStore: {
    getState: () => ({
      fetchConfig: fetchConfigMock,
      clearCache: clearConfigCacheMock,
    }),
  },
}));

vi.mock('./useModelsStore', () => ({
  useModelsStore: {
    getState: () => ({
      clearCache: clearModelsCacheMock,
    }),
  },
}));

describe('useAuthStore logout', () => {
  let storage: StorageLike;

  beforeEach(() => {
    vi.resetModules();
    apiClientSetConfig.mockClear();
    fetchConfigMock.mockReset();
    clearConfigCacheMock.mockClear();
    clearModelsCacheMock.mockClear();
    storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('resets api client credentials and clears session state', async () => {
    const { useAuthStore } = await import('./useAuthStore');
    useAuthStore.setState({
      isAuthenticated: true,
      apiBase: 'http://cpa.local:8317',
      managementKey: 'management-key',
      connectionStatus: 'connected',
    });
    storage.setItem('isLoggedIn', 'true');

    useAuthStore.getState().logout();

    expect(apiClientSetConfig).toHaveBeenCalledWith({ apiBase: '', managementKey: '' });
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: false,
      apiBase: '',
      managementKey: '',
      connectionStatus: 'disconnected',
    });
    expect(storage.getItem('isLoggedIn')).toBeNull();
  });
});

describe('useAuthStore login', () => {
  let storage: StorageLike;

  beforeEach(() => {
    vi.resetModules();
    apiClientSetConfig.mockClear();
    fetchConfigMock.mockReset();
    clearConfigCacheMock.mockClear();
    clearModelsCacheMock.mockClear();
    storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('keeps login failed when the current service rejects the management key', async () => {
    fetchConfigMock.mockRejectedValue(new Error('invalid management key'));

    const { useAuthStore } = await import('./useAuthStore');

    await expect(
      useAuthStore.getState().login({
        apiBase: 'http://cpa.local:8317',
        managementKey: 'bad-cpa-key',
        sessionMode: 'local',
      })
    ).rejects.toThrow('invalid management key');

    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: false,
      connectionStatus: 'error',
    });
  });
});
