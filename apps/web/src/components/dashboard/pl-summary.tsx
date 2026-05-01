'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PLSummaryProps {
  lang: string;
  data?: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
}

export function PLSummary({ lang, data = [] }: PLSummaryProps) {
  const t = useTranslations('dashboard');
  
  const months = data.map(d => d.month);
  const rev = data.map(d => d.revenue / 1000); // Scale to 'k'
  const exp = data.map(d => d.expenses / 1000);

  const totalRev = data.reduce((s, d) => s + d.revenue, 0);
  const totalExp = data.reduce((s, d) => s + d.expenses, 0);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const lines = [
    { k: "revenue", v: totalRev, delta: "+0%", dir: "up", indent: 0, weight: "medium", subtle: false },
    { k: "opex", v: -totalExp, delta: "+0%", dir: "down", indent: 1, weight: "normal", subtle: false },
  ] as any;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const net = totalRev - totalExp;
  const max = Math.max(...rev, ...exp, 1);

  const fmt = (n: number) => {
    return new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { maximumFractionDigits: 0 }).format(n);
  };
  
  const fmtMoney = (n: number) => {
    return new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
  };

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[14px] font-medium">{t('plTitle')}</div>
          <div className="text-[12px] text-ink-3 mt-1">{t('plSub')}</div>
        </div>
        <button className="hairline rounded-md px-2.5 h-7 text-[11px] flex items-center gap-1.5 text-ink-2 hover:text-white hover:border-white/10 transition">
          <Download size={14} /> {t('export')}
        </button>
      </div>

      {/* Combined Bars */}
      <div className="mt-5 grid grid-cols-4 gap-3 h-[148px]">
        {months.map((m, i) => (
          <div key={m} className="flex flex-col justify-end items-center gap-1.5">
            <div className="w-full flex items-end gap-1 h-full">
              <div 
                className="flex-1 rounded-t-sm relative bg-gradient-to-b from-[oklch(0.78_0.16_245)] to-[oklch(0.55_0.20_260)]"
                style={{ height: `${((rev[i] ?? 0) / max) * 100}%` }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[9.5px] text-ink-2 whitespace-nowrap">
                  {fmt(rev[i] ?? 0)}k
                </span>
              </div>
              <div 
                className="flex-1 rounded-t-sm bg-gradient-to-b from-white/[0.18] to-white/[0.05]"
                style={{ height: `${((exp[i] ?? 0) / max) * 100}%` }}
              />
            </div>
            <div className="font-mono text-[10px] text-ink-4 uppercase tracking-wider">
              {m}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-2 text-[10.5px] text-ink-3">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-accent" />{t('revenue')}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/[0.18]" />{lang === "fr" ? "Charges" : "Expenses"}</span>
      </div>

      {/* Line Items */}
      <div className="mt-5 hairline-t pt-3 space-y-1">
        {/* eslint-disable @typescript-eslint/no-explicit-any */}
        {lines.map((l: any) => (
          <div 
            key={l.k}
            className={cn(
              "flex items-center justify-between py-1.5 px-2 -mx-2 rounded-md transition hover:bg-white/[0.02]",
              l.subtle && "bg-white/[0.018]"
            )}
          >
            <div 
              className={cn(
                "text-[12.5px]",
                l.weight === "medium" ? "font-medium text-white" : "text-ink-2"
              )}
              style={{ paddingLeft: l.indent ? 14 : 0 }}
            >
              {t(l.k as any)}
            </div>
            <div className="flex items-center gap-4">
              <span className={cn("font-mono text-[10.5px]", l.dir === "up" ? "text-pos" : "text-ink-3")}>
                {l.delta}
              </span>
              <span className={cn("font-num text-[12.5px]", l.weight === "medium" ? "text-white font-medium" : "text-ink-2")}>
                {fmtMoney(l.v)}
              </span>
            </div>
          </div>
        ))}
        {/* eslint-enable @typescript-eslint/no-explicit-any */}
        <div className="hairline-t mt-2 pt-3 flex items-center justify-between px-2 -mx-2">
          <div className="text-[13px] font-semibold tracking-tight">{t('netIncome')}</div>
          <div className="flex items-center gap-3">
            <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-pos-soft text-pos">
              +18.2%
            </span>
            <span className="font-num text-[18px] font-semibold tracking-tight">{fmtMoney(net)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
