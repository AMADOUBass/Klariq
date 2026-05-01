'use client';

import React from 'react';

interface AgingData {
  key: string;
  label: string;
  value: number;
  count: number;
}

interface AgingChartProps {
  title: string;
  total: number;
  totalLabel: string;
  lang: string;
  data: AgingData[];
  tone?: 'accent' | 'warm';
}

export function AgingChart({ title, total, totalLabel, lang, data, tone = 'accent' }: AgingChartProps) {
  const sum = data.reduce((s, d) => s + d.value, 0);
  
  const tones = {
    accent: ["oklch(0.78 0.16 245)", "oklch(0.70 0.16 245)", "oklch(0.62 0.16 245)", "oklch(0.54 0.16 245)", "oklch(0.48 0.16 245)"],
    warm: ["oklch(0.85 0.13 80)", "oklch(0.78 0.16 60)", "oklch(0.72 0.18 40)", "oklch(0.66 0.20 25)", "oklch(0.60 0.22 20)"],
  };
  const palette = tones[tone];

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
          <div className="text-[14px] font-medium">{title}</div>
          <div className="text-[12px] text-ink-3 mt-1">{totalLabel}</div>
        </div>
        <div className="text-right">
          <div className="font-num text-[22px] font-semibold tracking-tight">{fmtMoney(total)}</div>
          <div className="font-mono text-[11px] text-ink-3 mt-1">{fmt(data.reduce((s, d) => s + d.count, 0))} {lang === "fr" ? "factures" : "invoices"}</div>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="mt-5 h-2 w-full rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.04)" }}>
        {data.map((d, i) => (
          <div key={d.key} style={{ width: `${(d.value / sum) * 100}%`, background: palette[i] }} />
        ))}
      </div>

      {/* Legend Buckets */}
      <div className="mt-5 grid grid-cols-5 gap-2">
        {data.map((d, i) => (
          <div key={d.key} className="rounded-lg px-2.5 py-2.5 hairline bg-white/[0.012]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: palette[i] }} />
              <span className="text-[10.5px] text-ink-3 font-mono uppercase tracking-wider">{d.label}</span>
            </div>
            <div className="font-num text-[14px] font-medium mt-2 leading-none">{fmtMoney(d.value)}</div>
            <div className="font-mono text-[10px] text-ink-4 mt-1.5">{d.count} · {((d.value / sum) * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
