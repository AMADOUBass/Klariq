'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Calendar, 
  Download, 
  FileText, 
  Loader2,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface TaxReport {
  period: { start: string; end: string };
  gst: { collected: number; paid: number; net: number };
  qst: { collected: number; paid: number; net: number };
  totalNetTax: number;
  generatedAt: string;
}

export default function TaxReportPage() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const [report, setReport] = useState<TaxReport | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Default to current quarter
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - (d.getMonth() % 3));
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<TaxReport>(`/tax/report?startDate=${startDate}&endDate=${endDate}`);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const fmt = (n: number) => {
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { 
      style: "currency", 
      currency: "CAD" 
    }).format(n);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Rapport de Taxes (TPS/TVQ)</h1>
          <p className="text-ink-3 text-sm mt-1">Générez vos chiffres pour vos déclarations gouvernementales.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass rounded-lg px-3 py-1.5 border border-white/[0.08]">
            <Calendar size={14} className="text-ink-4" />
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent border-none text-[13px] text-white focus:ring-0 p-0 w-28 [color-scheme:dark]" 
            />
            <ArrowRight size={12} className="text-ink-4" />
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent border-none text-[13px] text-white focus:ring-0 p-0 w-28 [color-scheme:dark]" 
            />
          </div>
          <button 
            onClick={fetchReport}
            className="h-9 px-4 rounded-lg bg-accent text-white text-[13px] font-medium hover:bg-accent/90 transition shadow-sm"
          >
            Mettre à jour
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : report ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary Cards */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GST Card */}
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-5 bg-white/[0.02] hairline-b flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white">TPS (Fédéral)</span>
                  <div className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold">5%</div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-ink-3">Taxes collectées</span>
                    <span className="text-lg font-medium text-white">{fmt(report.gst.collected)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-ink-3">Taxes payées (CTI)</span>
                    <span className="text-lg font-medium text-white">{fmt(report.gst.paid)}</span>
                  </div>
                  <div className="pt-4 hairline-t flex justify-between items-end">
                    <span className="text-sm font-semibold text-white">Net TPS à verser</span>
                    <span className={cn(
                      "text-xl font-bold font-num",
                      report.gst.net >= 0 ? "text-white" : "text-pos"
                    )}>
                      {fmt(report.gst.net)}
                    </span>
                  </div>
                </div>
              </div>

              {/* QST Card */}
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-5 bg-white/[0.02] hairline-b flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white">TVQ (Québec)</span>
                  <div className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold">9.975%</div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-ink-3">Taxes collectées</span>
                    <span className="text-lg font-medium text-white">{fmt(report.qst.collected)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-ink-3">Taxes payées (RTI)</span>
                    <span className="text-lg font-medium text-white">{fmt(report.qst.paid)}</span>
                  </div>
                  <div className="pt-4 hairline-t flex justify-between items-end">
                    <span className="text-sm font-semibold text-white">Net TVQ à verser</span>
                    <span className={cn(
                      "text-xl font-bold font-num",
                      report.qst.net >= 0 ? "text-white" : "text-pos"
                    )}>
                      {fmt(report.qst.net)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="glass rounded-2xl p-8 relative overflow-hidden border-accent/20">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <TrendingUp size={120} className="text-accent" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-ink-3 text-[12px] uppercase tracking-[0.2em] font-bold mb-1">Montant Net Total</h3>
                  <div className="text-4xl font-bold text-white font-num tracking-tight">
                    {fmt(report.totalNetTax)}
                  </div>
                  <p className="text-ink-4 text-sm mt-2 flex items-center gap-2">
                    <AlertCircle size={14} />
                    {report.totalNetTax >= 0 
                      ? "Montant à verser aux autorités fiscales." 
                      : "Crédit de taxe à récupérer."}
                  </p>
                </div>
                <button className="h-11 px-6 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition flex items-center gap-2">
                  <Download size={18} />
                  Exporter pour mon comptable
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Instructions/Help */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                Comment déclarer ?
              </h4>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center text-[10px] text-white">1</div>
                  <p className="text-[13px] text-ink-3">Connectez-vous à **Mon Dossier Entreprise** (ARC) ou **Clic Revenu** (Québec).</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center text-[10px] text-white">2</div>
                  <p className="text-[13px] text-ink-3">Utilisez le montant **TPS Collectée** pour la ligne 103 et **TPS Payée (CTI)** pour la ligne 108.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center text-[10px] text-white">3</div>
                  <p className="text-[13px] text-ink-3">Faites de même pour la TVQ sur votre formulaire provincial.</p>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.05] bg-white/[0.01]">
              <p className="text-[12px] text-ink-4 leading-relaxed italic">
                Note : Klariq génère ces rapports à partir des écritures de journal validées. Assurez-vous que toutes vos factures de la période sont bien postées.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-ink-3">Aucune donnée trouvée pour cette période.</p>
        </div>
      )}
    </div>
  );
}
