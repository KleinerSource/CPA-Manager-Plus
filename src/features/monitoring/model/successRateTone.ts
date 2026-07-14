export type MonitoringSuccessRateTone = 'rate90' | 'rate75' | 'rate50' | 'rate25';

export const getMonitoringSuccessRateTone = (rate: number): MonitoringSuccessRateTone => {
  if (rate >= 0.9) return 'rate90';
  if (rate >= 0.75) return 'rate75';
  if (rate >= 0.5) return 'rate50';
  return 'rate25';
};
