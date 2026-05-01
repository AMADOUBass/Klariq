'use client';

import React, { Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search, Bell, Plus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

function TopbarContent() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: activeOrg } = (authClient as any).useActiveOrganization();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const period = searchParams.get('period') || 'YTD';

  const setPeriod = (p: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', p);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    router.push(`${pathname}?${params.toString()}` as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
  };

  const handleLanguageToggle = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    router.push(newPath as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
  };

  const userInitials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const pathSegments = pathname.split('/').filter(Boolean).slice(1); // Skip locale

  return (
    <header 
      className="h-[64px] px-6 flex items-center gap-4 hairline-b sticky top-0 z-20 bg-obsidian-0/72 backdrop-blur-lg saturate-[140%]"
      aria-label="Top navigation"
    >
      <div>
        <div className="text-[10px] tracking-[0.18em] uppercase text-ink-4">{t('nav.dashboard')}</div>
        <div className="text-[14px] font-medium -mt-0.5 text-white flex items-center gap-1.5">
          {activeOrg?.name || 'Klariq'}
          {pathSegments.map((segment, index) => (
            <React.Fragment key={segment}>
              <span className="text-ink-4"><ChevronRight size={14} /></span>
              <span className={cn("capitalize", index === pathSegments.length - 1 ? "text-ink-2" : "text-ink-3")}>
                {segment.replace(/-/g, ' ')}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 flex justify-center">
        <button 
          aria-label="Search" 
          onClick={() => toast.info(t('dashboard.cmd') + ' coming soon')}
          className="w-[420px] h-9 px-3 hairline rounded-lg flex items-center gap-2 text-[13px] text-ink-3 hover:text-ink-1 hover:border-white/10 transition bg-white/[0.015]"
        >
          <Search size={16} />
          <span className="flex-1 text-left truncate">{t('dashboard.cmd')}</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] text-ink-2">
            {t('dashboard.shortcut')}
          </span>
        </button>
      </div>

      {/* Period Selector */}
      <div className="hairline rounded-lg p-0.5 flex items-center text-[11px]">
        {([
          ['MTD', t('dashboard.mtd')], 
          ['QTD', t('dashboard.qtd')], 
          ['YTD', t('dashboard.ytd')]
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setPeriod(k)}
            className={cn(
              'px-2.5 py-1 rounded-md transition',
              period === k ? 'bg-white/[0.06] text-white' : 'text-ink-3 hover:text-ink-1'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Language Toggle */}
      <div className="hairline rounded-lg p-0.5 flex items-center text-[11px] font-mono">
        {['en', 'fr'].map((lang) => (
          <button
            key={lang}
            onClick={() => handleLanguageToggle(lang)}
            className={cn(
              'px-2.5 py-1 rounded-md uppercase tracking-wider transition',
              locale === lang ? 'bg-white/[0.06] text-white' : 'text-ink-3 hover:text-ink-1'
            )}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="w-[1px] align-self-stretch bg-line mx-1" />

      <button 
        aria-label="Notifications" 
        onClick={() => toast.info('Notifications coming soon')}
        className="w-9 h-9 hairline rounded-lg flex items-center justify-center text-ink-2 hover:text-white hover:border-white/10 transition relative"
      >
        <Bell size={18} />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent" />
      </button>

      <button 
        aria-label="New entry"
        onClick={() => toast.info('New Entry modal coming soon')}
        className="h-9 px-3 rounded-lg text-[12.5px] font-medium flex items-center gap-2 transition bg-gradient-to-b from-[oklch(0.78_0.16_245)] to-[oklch(0.62_0.20_250)] text-obsidian-0 shadow-[0_6px_18px_-6px_rgba(80,140,255,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]"
      >
        <Plus size={18} /> {t('dashboard.newEntry')}
      </button>

      <div className="flex items-center gap-2 pl-1">
        <div className="w-8 h-8 rounded-full hairline overflow-hidden flex items-center justify-center font-mono text-[11px] font-semibold bg-[oklch(0.40_0.06_30)] text-[oklch(0.95_0.04_80)]">
          {userInitials}
        </div>
      </div>
    </header>
  );
}

export function Topbar() {
  return (
    <Suspense fallback={<header className="h-[64px] px-6 flex items-center gap-4 hairline-b sticky top-0 z-20 bg-obsidian-0/72 backdrop-blur-lg" />}>
      <TopbarContent />
    </Suspense>
  );
}
