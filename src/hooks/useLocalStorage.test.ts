import { act, createElement } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLocalStorage } from './useLocalStorage';

const createMemoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useLocalStorage', () => {
  it('restores a persisted value after remounting', () => {
    const storage = createMemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });

    let currentValue = false;
    let setValue: ((value: boolean) => void) | undefined;
    let renderer: ReactTestRenderer | null = null;

    function Consumer() {
      const [value, updateValue] = useLocalStorage('ai-providers-list-mode', false);
      currentValue = value;
      setValue = updateValue;
      return null;
    }

    act(() => {
      renderer = create(createElement(Consumer));
    });

    expect(currentValue).toBe(false);
    expect(storage.getItem('ai-providers-list-mode')).toBeNull();

    act(() => {
      setValue?.(true);
    });

    expect(currentValue).toBe(true);
    expect(storage.getItem('ai-providers-list-mode')).toBe('true');

    act(() => {
      renderer?.unmount();
      renderer = create(createElement(Consumer));
    });

    expect(currentValue).toBe(true);
    (renderer as ReactTestRenderer | null)?.unmount();
  });
});
