import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DOCKER_CPA_BASE_URL,
  DEFAULT_LOCAL_CPA_BASE_URL,
  resolveDefaultCPAConnectionBase,
  resolveRuntimeApiBase,
} from './connection';

describe('resolveDefaultCPAConnectionBase', () => {
  it('uses the explicit environment default first', () => {
    expect(
      resolveDefaultCPAConnectionBase({
        hostedByUsageService: true,
        currentBase: 'http://panel.local:18317',
        envDefault: 'cpa.local:8317',
      })
    ).toBe('http://cpa.local:8317');
  });

  it('uses the Docker host default when the panel is hosted by Usage Service', () => {
    expect(
      resolveDefaultCPAConnectionBase({
        hostedByUsageService: true,
        currentBase: 'http://panel.local:18317',
        envDefault: '',
      })
    ).toBe(DEFAULT_DOCKER_CPA_BASE_URL);
  });

  it('keeps the current base for regular CPA-hosted panels', () => {
    expect(
      resolveDefaultCPAConnectionBase({
        hostedByUsageService: false,
        currentBase: 'http://cpa.local:8317/',
        envDefault: '',
      })
    ).toBe('http://cpa.local:8317');
  });
});

describe('resolveRuntimeApiBase', () => {
  it('repairs a persisted local frontend origin to the default CPA backend', () => {
    expect(
      resolveRuntimeApiBase('http://127.0.0.1:5173', {
        protocol: 'http:',
        hostname: '127.0.0.1',
        port: '5173',
      })
    ).toBe(DEFAULT_LOCAL_CPA_BASE_URL);
  });

  it('keeps explicit backend ports and non-local hosts unchanged', () => {
    expect(
      resolveRuntimeApiBase('http://127.0.0.1:9000', {
        protocol: 'http:',
        hostname: '127.0.0.1',
        port: '5173',
      })
    ).toBe('http://127.0.0.1:9000');

    expect(
      resolveRuntimeApiBase('http://api.local:8317', {
        protocol: 'http:',
        hostname: '127.0.0.1',
        port: '5173',
      })
    ).toBe('http://api.local:8317');
  });
});
