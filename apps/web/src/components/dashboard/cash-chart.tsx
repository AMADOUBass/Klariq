'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface CashChartProps {
  lang: string;
  data?: { month: string; revenue: number; expenses: number }[];
  currentCash?: number;
}

export function CashChart({ lang, data = [], currentCash = 0 }: CashChartProps) {
  const t = useTranslations('dashboard');
  
  // Map data to series (simplified: cumulative or just use points)
  // For now, we show the last 4 data points + current
  const series = data.map(d => (d.revenue - d.expenses) / 1000); // Net movement
  if (series.length === 0) series.push(0, 0, 0, currentCash / 1000);
  
  const weeks = data.map(d => d.month);
  const projected = [series[series.length - 1], (series[series.length - 1] || 0) * 1.05]; 
  const allData = [...series, ...projected.slice(1)].filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const min = allData.length > 0 ? Math.min(...allData) : 0;
  const max = allData.length > 0 ? Math.max(...allData) : 1000;
  const range = max - min || 1000; // Prevent div by zero
  
  const W = 720, H = 240, padL = 44, padR = 12, padT = 12, padB = 28;
  const xs = allData.length || 1;
  const xAt = (i: number) => {
    if (xs <= 1) return padL + (W - padL - padR) / 2;
    return padL + (i / (xs - 1)) * (W - padL - padR);
  };
  const yAt = (v: number) => {
    const val = typeof v === 'number' ? v : 0;
    return padT + (1 - (val - min) / range) * (H - padT - padB);
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const seriesPts = series.map((v, i) => [xAt(i), yAt(v as any)]);
  const projPts = projected.map((v, i) => [xAt(series.length - 1 + i), yAt(v as any)]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const linePath = seriesPts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const projPath = projPts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const lastPoint = seriesPts[seriesPts.length - 1];
  const firstPoint = seriesPts[0];
  const areaPath = (lastPoint && firstPoint) 
    ? `${linePath} L${lastPoint[0]},${H - padB} L${firstPoint[0]},${H - padB} Z`
    : "";

  const yTicks = [min, (min + max) / 2, max];

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
          <div className="flex items-center gap-2.5">
            <div className="text-[14px] font-medium">{t('cashTitle')}</div>
            <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-ink-3">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              {t('live')}
            </span>
          </div>
          <div className="text-[12px] text-ink-3 mt-1">{t('cashSub')}</div>
        </div>
        <div className="text-right">
          <div className="font-num text-[26px] font-semibold tracking-tight">{fmtMoney(currentCash)}</div>
          <div className="font-mono text-[11px] text-pos mt-1">+{fmt(0)} · +0% {t('delta.vs')}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-5 text-[11px] text-ink-3">
        <span className="flex items-center gap-2"><span className="w-3 h-[2px] bg-accent" />{lang === "fr" ? "Solde réel" : "Actual balance"}</span>
        <span className="flex items-center gap-2"><span className="w-3 border-t border-dashed border-accent" />{lang === "fr" ? "Projection 4 sem." : "4-week projection"}</span>
        <span className="flex items-center gap-2"><span className="w-3 h-[2px] bg-ink-4" />{lang === "fr" ? "Seuil cible" : "Target floor"}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cashArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Horizontal grid */}
        {yTicks.map((v, i) => (
          <g key={`${v}-${i}`}>
            <line x1={padL} x2={W - padR} y1={yAt(v)} y2={yAt(v)} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
            <text x={padL - 8} y={yAt(v) + 3} fill="var(--color-ink-4)" fontSize="9.5" textAnchor="end" fontFamily="JetBrains Mono">
              {(v / 1000).toFixed(1)}k
            </text>
          </g>
        ))}
        {/* Target floor */}
        <line x1={padL} x2={W - padR} y1={yAt(3300)} y2={yAt(3300)} stroke="var(--color-ink-4)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

        <path d={areaPath} fill="url(#cashArea)" />
        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d={projPath} fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" opacity="0.7" />

        {seriesPts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2" fill="var(--color-obsidian-0)" stroke="var(--color-accent)" strokeWidth="1.2" />
        ))}
        {lastPoint && (
          <>
            {/* Highlighted last actual */}
            <circle cx={lastPoint[0]} cy={lastPoint[1]} r="9" fill="var(--color-accent)" opacity="0.18" />
            <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3.5" fill="var(--color-accent)" />
          </>
        )}

        {/* X-axis labels */}
        {weeks.map((w, i) => (
          <text key={w} x={xAt(i)} y={H - 8} fill="var(--color-ink-4)" fontSize="9.5" textAnchor="middle" fontFamily="JetBrains Mono">{w}</text>
        ))}
      </svg>
    </div>
  );
}
