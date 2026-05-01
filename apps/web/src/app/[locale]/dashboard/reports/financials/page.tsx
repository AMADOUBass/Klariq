'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  TrendingUp, 
  Wallet, 
  Calendar,
  ChevronRight,
  ArrowRight,
  Loader2,
  PieChart,
  BarChart3,
  Download
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type ReportType = 'PL' | 'BS' | 'CF';

export default function FinancialReportsPage() {
  const locale = useLocale();
  const [activeReport, setActiveReport] = useState<ReportType>('PL');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const { data: activeOrg } = (authClient as any).useActiveOrganization();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(0); d.setDate(1); // Jan 1st
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      let endpoint = '';
      if (activeReport === 'PL') endpoint = `/accounting/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`;
      else if (activeReport === 'BS') endpoint = `/accounting/reports/balance-sheet?date=${endDate}`;
      else if (activeReport === 'CF') endpoint = `/accounting/reports/cash-flow?startDate=${startDate}&endDate=${endDate}`;
      
      const res = await apiFetch<any>(endpoint, {
        headers: { 'X-Organization-Id': activeOrg.id }
      });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport, activeOrg?.id]);

  const fmt = (n: number) => {
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { 
      style: "currency", 
      currency: "CAD" 
    }).format(n);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">États Financiers</h1>
          <p className="text-ink-3 text-sm mt-1">Consultez la santé financière de votre entreprise en temps réel.</p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          {[
            { id: 'PL', label: 'Pertes & Profits' },
            { id: 'BS', label: 'Bilan' },
            { id: 'CF', label: 'Flux de Trésorerie' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition",
                activeReport === tab.id ? "bg-accent text-white shadow-lg" : "text-ink-3 hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass p-4 rounded-2xl border-white/[0.05]">
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-ink-4" />
          <div className="flex items-center gap-2">
            {activeReport !== 'BS' ? (
              <>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-sm text-white focus:ring-0 p-0 w-28 [color-scheme:dark]" 
                />
                <ArrowRight size={14} className="text-ink-4" />
              </>
            ) : (
              <span className="text-sm text-ink-3 mr-2">Au :</span>
            )}
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent border-none text-sm text-white focus:ring-0 p-0 w-28 [color-scheme:dark]" 
            />
          </div>
        </div>
        
        <button 
          onClick={fetchReport}
          className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition"
        >
          Actualiser le rapport
        </button>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-accent" size={40} />
          <p className="text-ink-4 text-sm animate-pulse">Analyse du grand livre en cours...</p>
        </div>
      ) : data ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeReport === 'PL' && <ProfitLossView data={data} fmt={fmt} />}
          {activeReport === 'BS' && <BalanceSheetView data={data} fmt={fmt} />}
          {activeReport === 'CF' && <CashFlowView data={data} fmt={fmt} />}
        </div>
      ) : null}
    </div>
  );
}

function CashFlowView({ data, fmt }: { data: any, fmt: (n: number) => string }) {
  return (
    <div className="space-y-8">
      <div className="glass rounded-2xl p-8 border-accent/20">
        <h3 className="text-ink-3 text-[12px] uppercase tracking-[0.2em] font-bold mb-6">Activités Opérationnelles (Méthode Indirecte)</h3>
        
        <div className="space-y-4 max-w-2xl">
          <div className="flex justify-between items-center py-2">
            <span className="text-white text-sm">Bénéfice Net</span>
            <span className="text-white font-num font-medium">{fmt(data.netIncome)}</span>
          </div>

          <div className="pl-4 space-y-2 hairline-l border-white/10">
            <div className="flex justify-between items-center py-1">
              <span className="text-ink-3 text-xs italic">Ajustement : Comptes clients (AR)</span>
              <span className={cn("text-xs font-num", data.adjustments.accountsReceivable >= 0 ? "text-pos" : "text-red-400")}>
                {fmt(data.adjustments.accountsReceivable)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-ink-3 text-xs italic">Ajustement : Comptes fournisseurs (AP)</span>
              <span className={cn("text-xs font-num", data.adjustments.accountsPayable >= 0 ? "text-pos" : "text-red-400")}>
                {fmt(data.adjustments.accountsPayable)}
              </span>
            </div>
          </div>

          <div className="pt-6 hairline-t flex justify-between items-center">
            <span className="text-white font-bold text-base">Flux de trésorerie net</span>
            <span className={cn(
              "text-2xl font-bold font-num",
              data.netCashFromOperating >= 0 ? "text-pos" : "text-red-400"
            )}>
              {fmt(data.netCashFromOperating)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-white/[0.05] bg-white/[0.01] max-w-2xl">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-white mb-2 flex items-center gap-2">
          💡 Comprendre le rapport
        </h4>
        <p className="text-[13px] text-ink-3 leading-relaxed">
          Ce rapport montre comment votre **Bénéfice Net** se traduit en argent réel. Un profit élevé peut être associé à un flux de trésorerie négatif si vos clients ne vous ont pas encore payé (augmentation des Comptes Clients).
        </p>
      </div>
    </div>
  );
}

function ProfitLossView({ data, fmt }: { data: any, fmt: (n: number) => string }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Revenus Totaux" value={fmt(data.totalRevenue)} icon={<BarChart3 className="text-blue-400" />} />
        <StatCard title="Dépenses Totales" value={fmt(data.totalExpenses)} icon={<PieChart className="text-purple-400" />} />
        <StatCard 
          title="Bénéfice Net" 
          value={fmt(data.netIncome)} 
          highlight 
          icon={<TrendingUp className={data.netIncome >= 0 ? "text-pos" : "text-red-400"} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <ReportSection title="Revenus" items={data.revenue} total={data.totalRevenue} color="blue" fmt={fmt} />
        <ReportSection title="Dépenses" items={data.expenses} total={data.totalExpenses} color="purple" fmt={fmt} />
      </div>
    </div>
  );
}

function BalanceSheetView({ data, fmt }: { data: any, fmt: (n: number) => string }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Actifs" value={fmt(data.totalAssets)} icon={<Wallet className="text-blue-400" />} />
        <StatCard title="Total Passifs" value={fmt(data.totalLiabilities)} icon={<ArrowRight className="text-orange-400" />} />
        <StatCard title="Capitaux Propres" value={fmt(data.totalEquity)} icon={<TrendingUp className="text-purple-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <ReportSection title="Actifs" items={data.assets} total={data.totalAssets} color="blue" fmt={fmt} />
        <ReportSection title="Passifs" items={data.liabilities} total={data.totalLiabilities} color="orange" fmt={fmt} />
        <ReportSection title="Capitaux Propres" items={data.equity} total={data.totalEquity} color="purple" fmt={fmt} />
      </div>
    </div>
  );
}

function ReportSection({ title, items, total, color, fmt }: any) {
  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-5 hairline-b bg-white/[0.02] flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-white">{title}</h3>
        <span className="text-xs font-num text-ink-3">{items.length} comptes</span>
      </div>
      <div className="p-2 flex-grow">
        <table className="w-full text-left">
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="py-3 px-4">
                  <div className="text-[13px] text-white font-medium">{item.name}</div>
                  <div className="text-[10px] text-ink-4 font-num uppercase tracking-wider">{item.code}</div>
                </td>
                <td className="py-3 px-4 text-right text-[13px] font-num text-ink-2 group-hover:text-white transition-colors">
                  {fmt(item.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-5 hairline-t bg-white/[0.01] flex justify-between items-center">
        <span className="text-sm font-semibold text-white">Total {title}</span>
        <span className={cn(
          "text-lg font-bold font-num",
          color === 'blue' ? "text-blue-400" : color === 'orange' ? "text-orange-400" : "text-purple-400"
        )}>
          {fmt(total)}
        </span>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, highlight }: any) {
  return (
    <div className={cn(
      "glass rounded-2xl p-6 relative overflow-hidden",
      highlight && "border-white/20 bg-white/[0.03]"
    )}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-ink-3 text-[11px] uppercase tracking-widest font-bold">{title}</span>
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          {React.cloneElement(icon, { size: 18 })}
        </div>
      </div>
      <div className="text-2xl font-bold text-white font-num tracking-tight leading-none">
        {value}
      </div>
    </div>
  );
}
