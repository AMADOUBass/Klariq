'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, FileText, ReceiptText, Landmark, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ActivityItem {
  id: string;
  type: 'je' | 'ar' | 'ap' | 'bank';
  title: string;
  meta: string;
  amount: number;
  status: 'posted' | 'sent' | 'approved' | 'reconciled' | 'review';
  time: string;
  flag: boolean;
}

interface ActivityProps {
  lang: string;
  data?: ActivityItem[];
}

export function ActivityFeed({ lang, data = [] }: ActivityProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [filterType, setFilterType] = React.useState<ActivityItem['type'] | 'all'>('all');
  
  const rawItems: ActivityItem[] = data.length > 0 ? data : [
    { id: "SYS", type: "je", title: "No activity yet", meta: "System", amount: 0, status: "posted", time: "Now", flag: false }
  ];

  const items = rawItems.filter(item => filterType === 'all' || item.type === filterType);

  const getStatusTag = (s: ActivityItem['status']) => {
    const map = {
      posted: { fr: "Comptabilisé", en: "Posted", color: "text-ink-2", bg: "bg-white/[0.05]" },
      sent: { fr: "Envoyée", en: "Sent", color: "text-accent", bg: "bg-accent-soft" },
      approved: { fr: "Approuvée", en: "Approved", color: "text-pos", bg: "bg-pos-soft" },
      reconciled: { fr: "Rapprochée", en: "Reconciled", color: "text-pos", bg: "bg-pos-soft" },
      review: { fr: "À valider", en: "Review", color: "text-warn", bg: "bg-warn/14" },
    };
    const it = map[s];
    return (
      <span className={cn("font-mono text-[10px] px-2 py-0.5 rounded-md", it.color, it.bg)}>
        {lang === "fr" ? it.fr : it.en}
      </span>
    );
  };

  const getTypeIcon = (ty: ActivityItem['type']) => {
    switch (ty) {
      case 'je': return <BookOpen size={16} className="text-ink-2" />;
      case 'ar': return <FileText size={16} className="text-accent" />;
      case 'ap': return <ReceiptText size={16} className="text-ink-2" />;
      case 'bank': return <Landmark size={16} className="text-pos" />;
    }
  };

  const fmtMoneyDecimal = (n: number) => {
    return new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  return (
    <div className="glass rounded-xl p-5 flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[14px] font-medium">{t('activityTitle')}</div>
            <span className="font-mono text-[10px] text-ink-3 px-1.5 py-0.5 rounded-md hairline">
              12 {lang === "fr" ? "nouvelles" : "new"}
            </span>
          </div>
          <div className="text-[12px] text-ink-3 mt-1">{t('activitySub')}</div>
        </div>
        <button 
          onClick={() => {
            const types: ('all'|'je'|'ar'|'ap'|'bank')[] = ['all', 'je', 'ar', 'ap', 'bank'];
            const currentIndex = types.indexOf(filterType as any);
            const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % types.length;
            const next = types[nextIndex] as 'all'|'je'|'ar'|'ap'|'bank';
            setFilterType(next);
            toast.success(`Filter applied: ${next.toUpperCase()}`);
          }}
          className={cn(
            "hairline rounded-md px-2.5 h-7 text-[11px] flex items-center gap-1.5 transition",
            filterType !== 'all' ? "bg-white/[0.08] text-white" : "text-ink-2 hover:text-white hover:bg-white/[0.04]"
          )}
        >
          <Filter size={14} /> {filterType !== 'all' ? filterType.toUpperCase() : (lang === "fr" ? "Filtrer" : "Filter")}
        </button>
      </div>

      <div className="hairline-t mt-3 -mx-5">
        {items.map((it, i) => (
          <div key={it.id} className={cn(
            "px-5 py-3 flex items-center gap-3 transition hover:bg-white/[0.02]",
            i !== items.length - 1 && "hairline-b"
          )}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center hairline shrink-0 bg-white/[0.018]">
              {getTypeIcon(it.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium truncate">{it.title}</span>
                {it.flag && <span className="w-1.5 h-1.5 rounded-full bg-warn" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[10.5px] text-ink-4">{it.id}</span>
                <span className="text-ink-4">·</span>
                <span className="text-[11.5px] text-ink-3 truncate">{it.meta}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={cn(
                "font-num text-[13px] font-medium",
                it.amount >= 0 ? "text-pos" : "text-ink-1"
              )}>
                {it.amount >= 0 ? "+" : ""}{fmtMoneyDecimal(it.amount)}
              </div>
              <div className="mt-1 flex items-center gap-2 justify-end">
                <span className="text-[11px] text-ink-4 font-mono">{it.time}</span>
                {getStatusTag(it.status)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button 
        onClick={() => {
          toast.loading('Loading transactions...');
          router.push(`/${lang}/dashboard/transactions`);
        }}
        className="mt-4 text-[12px] text-ink-3 hover:text-white transition text-center w-full py-2 rounded-lg hover:bg-white/[0.02]"
      >
        {lang === "fr" ? "Voir toute l'activité" : "View all activity"}
      </button>
    </div>
  );
}
