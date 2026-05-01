'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { KPICard } from '@/components/dashboard/kpi-card';
import { CashChart } from '@/components/dashboard/cash-chart';
import { AgingChart } from '@/components/dashboard/aging-chart';
import { PLSummary } from '@/components/dashboard/pl-summary';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { authClient } from '@/lib/auth-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { data: session } = authClient.useSession();
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || 'YTD';

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: activeOrg } = (authClient as any).useActiveOrganization();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Fetch Dashboard Summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['dashboard-summary', activeOrg?.id, period],
    queryFn: async () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const data = await (apiFetch(`/reporting/dashboard/summary?period=${period}`, {
        headers: {
          'X-Organization-Id': activeOrg?.id,
        },
      }) as any);
      /* eslint-enable @typescript-eslint/no-explicit-any */
      return data;
    },
    enabled: !!activeOrg?.id,
  });

  if (isSummaryLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center animate-pulse">
            <div className="w-5 h-5 rounded-full bg-accent animate-ping" />
          </div>
          <span className="text-[13px] font-medium tracking-widest uppercase text-ink-4">
            Loading Data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight">{t('welcome')}</h1>
        <p className="text-ink-3 mt-1 text-[15px]">{t('welcomeSub')}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KPICard
          label={t('kpi.cash')}
          value={new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(
            summary?.kpis.cash || 0,
          )}
          sub="+ $0 vs. last month"
          delta="+0%"
          spark={[0, 0, 0, summary?.kpis.cash || 0]}
          accent="var(--color-accent)"
        />
        <KPICard
          label={t('kpi.ar')}
          value={new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(
            summary?.kpis.ar || 0,
          )}
          sub="Unpaid invoices"
          delta="+0%"
          spark={[0, 0, 0, summary?.kpis.ar || 0]}
          sparkColor="oklch(0.74 0.16 245)"
        />
        <KPICard
          label={t('kpi.ap')}
          value={new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(
            summary?.kpis.ap || 0,
          )}
          sub="Bills due"
          delta="+0%"
          deltaDir="down"
          spark={[0, 0, 0, summary?.kpis.ap || 0]}
          sparkColor="oklch(0.70 0.20 22)"
        />
        <KPICard
          label={t('kpi.runway')}
          value={
            (summary?.kpis.netProfit || 0) >= 0
              ? 'Infinite'
              : `${Math.abs((summary?.kpis.cash || 0) / (summary?.kpis.netProfit || 1)).toFixed(1)} months`
          }
          sub="Based on burn rate"
          delta="+0m"
          spark={[0, 0, 0, 1]}
          sparkColor="oklch(0.78 0.16 162)"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left/Middle Column */}
        <div className="xl:col-span-2 space-y-6">
          <CashChart lang={locale} data={summary?.plMonthly} currentCash={summary?.kpis.cash} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AgingChart
              title={t('arTitle')}
              total={summary?.kpis.ar || 0}
              totalLabel={t('kpi.ar')}
              lang={locale}
              data={[
                {
                  key: 'current',
                  label: t('buckets.current'),
                  value: summary?.aging.ar.current || 0,
                  count: 0,
                },
                {
                  key: 'b30',
                  label: t('buckets.b30'),
                  value: summary?.aging.ar.b30 || 0,
                  count: 0,
                },
                {
                  key: 'b60',
                  label: t('buckets.b60'),
                  value: summary?.aging.ar.b60 || 0,
                  count: 0,
                },
                {
                  key: 'b90',
                  label: t('buckets.b90'),
                  value: summary?.aging.ar.b90 || 0,
                  count: 0,
                },
                {
                  key: 'b90p',
                  label: t('buckets.b90p'),
                  value: summary?.aging.ar.b90p || 0,
                  count: 0,
                },
              ]}
            />
            <AgingChart
              title={t('apTitle')}
              total={summary?.kpis.ap || 0}
              totalLabel={t('kpi.ap')}
              lang={locale}
              tone="warm"
              data={[
                {
                  key: 'current',
                  label: t('buckets.current'),
                  value: summary?.aging.ap.current || 0,
                  count: 0,
                },
                {
                  key: 'b30',
                  label: t('buckets.b30'),
                  value: summary?.aging.ap.b30 || 0,
                  count: 0,
                },
                {
                  key: 'b60',
                  label: t('buckets.b60'),
                  value: summary?.aging.ap.b60 || 0,
                  count: 0,
                },
                {
                  key: 'b90',
                  label: t('buckets.b90'),
                  value: summary?.aging.ap.b90 || 0,
                  count: 0,
                },
                {
                  key: 'b90p',
                  label: t('buckets.b90p'),
                  value: summary?.aging.ap.b90p || 0,
                  count: 0,
                },
              ]}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <PLSummary lang={locale} data={summary?.plMonthly} />
          <ActivityFeed lang={locale} data={summary?.recentActivity} />
        </div>
      </div>
    </div>
  );
}
