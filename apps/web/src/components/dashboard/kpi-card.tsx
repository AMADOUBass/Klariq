'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SparklineProps {
  data: number[];
  color?: string | undefined;
  area?: boolean;
  height?: number;
}

export function Sparkline({ data, color = 'var(--color-accent)', area = true, height = 44 }: SparklineProps) {
  const w = 160;
  const h = height;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as [number, number];
  });
  
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const lastPt = pts[pts.length - 1];
  const firstPt = pts[0];
  const areaP = (lastPt && firstPt) 
    ? `${path} L${lastPt[0]},${h} L${firstPt[0]},${h} Z`
    : "";
  const id = React.useId();

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={areaP} fill={`url(#${id})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {lastPt && (
        <>
          <circle cx={lastPt[0]} cy={lastPt[1]} r="2.6" fill={color} />
          <circle cx={lastPt[0]} cy={lastPt[1]} r="6" fill={color} opacity="0.18" />
        </>
      )}
    </svg>
  );
}

interface KPIProps {
  label: string;
  value: string;
  sub: string;
  delta: string;
  deltaDir?: 'up' | 'down';
  spark: number[];
  sparkColor?: string | undefined;
  accent?: string;
}

export function KPICard({ label, value, sub, delta, deltaDir = 'up', spark, sparkColor, accent }: KPIProps) {
  const positive = deltaDir === 'up';

  return (
    <div className="glass rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden">
      {accent && (
        <span 
          className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-30"
          style={{ background: accent }}
        />
      )}
      <div className="flex items-center justify-between relative">
        <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3">{label}</div>
        <div 
          className="flex items-center gap-1.5 text-[11px] font-mono"
          style={{ color: positive ? 'var(--color-pos)' : 'var(--color-neg)' }}
        >
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{delta}</span>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3 relative">
        <div>
          <div className="font-num text-[30px] leading-none font-semibold tracking-tight">{value}</div>
          <div className="text-[11.5px] text-ink-3 mt-2">{sub}</div>
        </div>
        <Sparkline data={spark} color={sparkColor} />
      </div>
    </div>
  );
}
