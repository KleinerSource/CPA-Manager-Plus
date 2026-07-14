import { IconCheck, IconDollarSign, IconX } from '@/components/ui/icons';
import type { UseDashboardUsageSummaryReturn } from '@/features/dashboard/hooks/useDashboardUsageSummary';
import { formatUsd } from '@/utils/usage';
import { useTranslation } from 'react-i18next';

const formatCount = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value) ? '—' : value.toLocaleString();

const formatRate = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value) ? '—' : `${(value * 100).toFixed(1)}%`;

export function HeaderUsageSummary({
  usage,
}: {
  usage: Pick<
    UseDashboardUsageSummaryReturn,
    'enabled' | 'loading' | 'summary' | 'lastRefreshedAt' | 'error'
  >;
}) {
  const { t, i18n } = useTranslation();
  const { enabled, loading, summary, lastRefreshedAt, error } = usage;

  if (!enabled && !loading) {
    return null;
  }

  const today = summary?.today;
  const refreshedTitle = lastRefreshedAt
    ? t('dashboard.last_refreshed_at', {
        time: lastRefreshedAt.toLocaleTimeString(i18n.language),
      })
    : undefined;

  const metrics = [
    {
      key: 'success',
      label: t('dashboard.request_health_success'),
      value: formatCount(today?.success_calls),
      icon: <IconCheck size={13} />,
      tone: 'success',
    },
    {
      key: 'failure',
      label: t('dashboard.request_health_failure'),
      value: formatCount(today?.failure_calls),
      icon: <IconX size={13} />,
      tone: 'failure',
    },
    {
      key: 'rate',
      label: t('dashboard.success_rate'),
      value: formatRate(today?.success_rate),
      tone: 'rate',
    },
    {
      key: 'cost',
      label: t('dashboard.today_cost'),
      value: today ? formatUsd(today.total_cost) : '—',
      icon: <IconDollarSign size={13} />,
      tone: 'cost',
    },
  ];

  return (
    <div
      className="navbar-usage-summary"
      title={error || refreshedTitle || t('dashboard.today_overview_usage_service')}
      aria-label={t('dashboard.today_overview_usage_service')}
    >
      <span className="navbar-usage-title">{t('dashboard.today_requests')}</span>
      <div className="navbar-usage-metrics">
        {metrics.map((metric) => (
          <span
            className={`navbar-usage-metric navbar-usage-metric-${metric.tone}`}
            key={metric.key}
            title={`${metric.label}: ${metric.value}`}
          >
            {metric.icon}
            <span className="navbar-usage-metric-label">{metric.label}</span>
            <strong>{loading ? '...' : metric.value}</strong>
          </span>
        ))}
      </div>
      <span
        className={`navbar-usage-refresh-indicator ${loading ? 'is-loading' : ''}`}
        aria-hidden="true"
      />
    </div>
  );
}
