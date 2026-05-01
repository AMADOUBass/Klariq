'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  FileText, 
  ReceiptText, 
  Landmark, 
  BookOpen, 
  BarChart3, 
  Percent, 
  Users, 
  UserRound, 
  ShieldCheck, 
  Settings,
  ChevronDown,
  Lock
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';
import { usePathname } from 'next/navigation';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
  dot?: boolean;
}

const NavItem = ({ icon, label, href, active, badge, dot }: NavItemProps) => (
  <Link
    href={href as any}
    aria-current={active ? 'page' : undefined}
    className={cn(
      'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition',
      active
        ? 'text-white bg-white/[0.04] border border-white/[0.06]'
        : 'text-ink-2 hover:text-white hover:bg-white/[0.025] border border-transparent'
    )}
  >
    <span className={cn(
      'transition',
      active ? 'text-white' : 'text-ink-3 group-hover:text-ink-1'
    )}>
      {icon}
    </span>
    <span className="flex-1 truncate">{label}</span>
    {badge && (
      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] text-ink-2 border border-white/[0.06]">
        {badge}
      </span>
    )}
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
  </Link>
);

const NavSection = ({ title }: { title: string }) => (
  <div className="px-3 pt-5 pb-2 text-[10px] tracking-[0.18em] uppercase text-ink-4 font-medium">
    {title}
  </div>
);

export function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: activeOrg } = (authClient as any).useActiveOrganization();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const initials = activeOrg?.name
    ? activeOrg.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const isActive = (path: string) => {
    // Exact match for dashboard home, otherwise prefix match
    if (path === '/dashboard') {
      return pathname.endsWith('/dashboard');
    }
    return pathname.includes(path);
  };

  return (
    <aside className="w-[248px] shrink-0 hairline-r flex flex-col bg-gradient-to-b from-white/[0.012] to-transparent" aria-label="Sidebar Navigation">
      {/* Brand */}
      <div className="px-5 h-[64px] flex items-center gap-3 hairline-b">
        <div className="relative w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[oklch(0.74_0.16_245)] to-[oklch(0.55_0.20_260)] shadow-[0_6px_18px_-6px_rgba(80,140,255,0.6),inset_0_1px_0_rgba(255,255,255,0.25)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4v16" /><path d="M5 12h7l6-8" /><path d="M12 12l6 8" />
          </svg>
        </div>
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight">Klariq</div>
          <div className="font-mono text-[10px] text-ink-3 mt-0.5">v4.12 · ledger</div>
        </div>
      </div>

      {/* Tenant Switcher */}
      <button className="mx-3 mt-3 px-3 py-2.5 rounded-lg flex items-center gap-3 hairline hover:bg-white/[0.025] transition text-left group">
        <div className="w-7 h-7 rounded-md flex items-center justify-center font-mono text-[11px] font-semibold bg-[oklch(0.30_0.04_250)] text-[oklch(0.92_0.04_250)] group-hover:scale-110 transition duration-500">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-ink-2 leading-none mb-1">{t('dashboard.tenant')}</div>
          <div className="text-[13px] font-medium truncate text-white">
            {activeOrg?.name || 'No Entity Selected'}
          </div>
        </div>
        <span className="text-ink-3"><ChevronDown size={14} /></span>
      </button>

      <nav className="flex-1 px-2 mt-2 overflow-y-auto">
        <NavSection title={t('nav.section_main')} />
        <div className="space-y-0.5">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label={t('nav.dashboard')} 
            href="/dashboard"
            active={isActive('/dashboard')}
          />
          <NavItem 
            icon={<ArrowLeftRight size={18} />} 
            label={t('nav.transactions')} 
            href="/dashboard/transactions"
            active={isActive('/dashboard/transactions')}
            badge="0" 
          />
          <NavItem 
            icon={<FileText size={18} />} 
            label={t('nav.invoicing')} 
            href="/dashboard/invoices"
            active={isActive('/dashboard/invoices')}
            dot 
          />
          <NavItem 
            icon={<ReceiptText size={18} />} 
            label={t('nav.bills')} 
            href="/dashboard/bills"
            active={isActive('/dashboard/bills')}
          />
          <NavItem 
            icon={<Landmark size={18} />} 
            label={t('nav.banking')} 
            href="/dashboard/banking"
            active={isActive('/dashboard/banking')}
          />
        </div>

        <NavSection title={t('nav.section_books')} />
        <div className="space-y-0.5">
          <NavItem icon={<BookOpen size={18} />} label={t('nav.ledger')} href="/dashboard/ledger" active={isActive('/dashboard/ledger')} />
          <NavItem icon={<BarChart3 size={18} />} label={t('nav.reports')} href="/dashboard/reports" active={isActive('/dashboard/reports')} />
          <NavItem icon={<Percent size={18} />} label={t('nav.taxes')} href="/dashboard/taxes" active={isActive('/dashboard/taxes')} />
        </div>

        <NavSection title={t('nav.section_admin')} />
        <div className="space-y-0.5">
          <NavItem icon={<Users size={18} />} label={t('nav.clients')} href="/dashboard/contacts" active={isActive('/dashboard/contacts')} />
          <NavItem icon={<UserRound size={18} />} label={t('nav.team')} href="/dashboard/team" active={isActive('/dashboard/team')} />
          <NavItem icon={<ShieldCheck size={18} />} label={t('nav.audit')} href="/dashboard/settings/audit" active={isActive('/dashboard/settings/audit')} />
          <NavItem icon={<Settings size={18} />} label={t('nav.settings')} href="/dashboard/settings" active={isActive('/dashboard/settings')} />
        </div>
      </nav>


      {/* Footer Card */}
      <div className="m-3 p-3 rounded-xl glass">
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          <span className="text-pos"><Lock size={12} /></span>
          <span>SOC 2 Type II</span>
          <span className="ml-auto font-mono text-[10px]">256-bit</span>
        </div>
        <div className="mt-2 text-[11px] text-ink-2 leading-snug">
          Immutable ledger · cryptographically signed entries.
        </div>
        
        <button 
          onClick={() => authClient.signOut()}
          className="mt-4 w-full h-8 rounded-lg hairline bg-white/[0.02] hover:bg-white/[0.05] text-[11px] text-ink-3 hover:text-white transition flex items-center justify-center gap-2"
        >
          {t('auth.signIn.submit') === 'Sign in' ? 'Log out' : 'Se déconnecter'}
        </button>
      </div>
    </aside>
  );
}
