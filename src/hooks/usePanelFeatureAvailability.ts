import { useEffect, useMemo, useState } from 'react';
import { usageServiceApi } from '@/services/api/usageService';
import { useAuthStore } from '@/stores';
import { detectApiBaseFromLocation, normalizeApiBase } from '@/utils/connection';

export type PanelFeatureUnavailableReason =
  | 'checking'
  | 'service_not_configured'
  | 'service_unavailable'
  | 'monitoring_disabled';

export interface PanelFeatureAvailability {
  checking: boolean;
  panelBase: string;
  serviceBase: string;
  serviceAvailable: boolean;
  requestMonitoringAvailable: boolean;
  modelPricesAvailable: boolean;
  reason: PanelFeatureUnavailableReason | '';
}

export function buildNativeRequestMonitoringAvailability({
  apiBase,
  panelBase,
  checking = false,
}: {
  apiBase: string;
  panelBase: string;
  checking?: boolean;
}): PanelFeatureAvailability {
  const serviceBase = normalizeApiBase(apiBase);
  return {
    checking,
    panelBase: normalizeApiBase(panelBase),
    serviceBase,
    serviceAvailable: Boolean(serviceBase),
    requestMonitoringAvailable: true,
    modelPricesAvailable: true,
    reason: '',
  };
}

export function buildUnavailableAvailability({
  apiBase,
  panelBase,
  checking = false,
  reason,
}: {
  apiBase: string;
  panelBase: string;
  checking?: boolean;
  reason: PanelFeatureUnavailableReason;
}): PanelFeatureAvailability {
  return {
    checking,
    panelBase: normalizeApiBase(panelBase),
    serviceBase: normalizeApiBase(apiBase),
    serviceAvailable: false,
    requestMonitoringAvailable: false,
    modelPricesAvailable: false,
    reason,
  };
}

type PanelFeatureAvailabilityRequestInput = {
  apiBase: string;
  managementKey: string;
  panelBase: string;
};

type PanelFeatureAvailabilityRequest = {
  key: string;
  promise: Promise<PanelFeatureAvailability>;
};

const initialAvailability: PanelFeatureAvailability = {
  checking: true,
  panelBase: '',
  serviceBase: '',
  serviceAvailable: false,
  requestMonitoringAvailable: false,
  modelPricesAvailable: false,
  reason: 'checking',
};

let cachedAvailabilityKey = '';
let cachedAvailability: PanelFeatureAvailability | null = null;
let inFlightAvailabilityRequest: PanelFeatureAvailabilityRequest | null = null;
let latestAvailabilityRequestKey = '';

const buildAvailabilityRequestKey = ({
  apiBase,
  managementKey,
  panelBase,
}: PanelFeatureAvailabilityRequestInput): string =>
  [normalizeApiBase(panelBase), normalizeApiBase(apiBase), managementKey].join('\u001f');

async function detectPanelFeatureAvailability({
  apiBase,
  managementKey,
  panelBase,
}: PanelFeatureAvailabilityRequestInput): Promise<PanelFeatureAvailability> {
  const normalizedApiBase = normalizeApiBase(apiBase);
  const normalizedPanelBase = normalizeApiBase(panelBase);
  if (!managementKey || !normalizedApiBase) {
    return buildUnavailableAvailability({
      apiBase: normalizedApiBase,
      panelBase: normalizedPanelBase,
      reason: 'service_not_configured',
    });
  }

  try {
    await usageServiceApi.getUsage(normalizedApiBase, managementKey);
    return buildNativeRequestMonitoringAvailability({
      apiBase: normalizedApiBase,
      panelBase: normalizedPanelBase,
    });
  } catch {
    return buildUnavailableAvailability({
      apiBase: normalizedApiBase,
      panelBase: normalizedPanelBase,
      reason: 'service_unavailable',
    });
  }
}

function requestPanelFeatureAvailability(
  input: PanelFeatureAvailabilityRequestInput
): { key: string; promise: Promise<PanelFeatureAvailability> } {
  const key = buildAvailabilityRequestKey(input);
  if (cachedAvailabilityKey === key && cachedAvailability) {
    return { key, promise: Promise.resolve(cachedAvailability) };
  }
  if (inFlightAvailabilityRequest?.key === key) {
    return inFlightAvailabilityRequest;
  }

  latestAvailabilityRequestKey = key;
  const promise = detectPanelFeatureAvailability(input).then((availability) => {
    if (latestAvailabilityRequestKey === key) {
      cachedAvailabilityKey = key;
      cachedAvailability = availability;
    }
    return availability;
  });
  inFlightAvailabilityRequest = { key, promise };
  promise.finally(() => {
    if (inFlightAvailabilityRequest?.key === key) {
      inFlightAvailabilityRequest = null;
    }
  });
  return inFlightAvailabilityRequest;
}

export function usePanelFeatureAvailability(): PanelFeatureAvailability {
  const apiBase = useAuthStore((state) => state.apiBase);
  const managementKey = useAuthStore((state) => state.managementKey);
  const panelBase = useMemo(() => detectApiBaseFromLocation(), []);
  const requestInput = useMemo(
    () => ({
      apiBase,
      managementKey,
      panelBase,
    }),
    [apiBase, managementKey, panelBase]
  );
  const requestKey = useMemo(() => buildAvailabilityRequestKey(requestInput), [requestInput]);
  const [state, setState] = useState<PanelFeatureAvailability>(() =>
    cachedAvailabilityKey === requestKey && cachedAvailability
      ? cachedAvailability
      : initialAvailability
  );

  useEffect(() => {
    let cancelled = false;
    const hasCachedAvailability = cachedAvailabilityKey === requestKey && cachedAvailability;
    if (!hasCachedAvailability) {
      queueMicrotask(() => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          checking: true,
          panelBase: normalizeApiBase(panelBase),
          serviceBase: normalizeApiBase(apiBase),
          reason: 'checking',
        }));
      });
    }

    const request = requestPanelFeatureAvailability(requestInput);
    request.promise.then((availability) => {
      if (cancelled || request.key !== requestKey) return;
      setState(availability);
    });

    return () => {
      cancelled = true;
    };
  }, [apiBase, panelBase, requestInput, requestKey]);

  return state;
}
