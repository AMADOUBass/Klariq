'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locale = useLocale();
  const { data: session, isPending } = authClient.useSession();
  
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: activeOrg, isPending: isOrgPending } = (authClient as any).useActiveOrganization();
  const { data: orgs, isPending: isOrgsPending } = (authClient as any).useListOrganizations();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Global auth & tenancy guard for the dashboard segment
  React.useEffect(() => {
    if (isPending || isOrgPending || isOrgsPending) return;

    if (!session) {
      router.push(`/${locale}/sign-in`);
      return;
    }

    if (!activeOrg) {
      if (orgs && orgs.length > 0) {
        // Automatically activate the first organization if none is active
        // This handles the post-login scenario
        (authClient as any).organization.setActive({ organizationId: orgs[0].id }).then(() => {
          window.location.reload();
        });
      } else {
        router.push(`/${locale}/onboarding`);
      }
    } else {
      // Sync the active organization ID to localStorage for api-client.ts
      try {
        localStorage.setItem('better-auth.active-organization-id', activeOrg.id);
      } catch (e) {}
    }
  }, [session, activeOrg, orgs, isPending, isOrgPending, isOrgsPending, locale, router]);

  if (isPending || isOrgPending || isOrgsPending || (session && orgs?.length > 0 && !activeOrg)) {
    return (
      <div className="flex h-screen items-center justify-center bg-obsidian-0 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center animate-pulse">
            <div className="w-5 h-5 rounded-full bg-accent animate-ping" />
          </div>
          <span className="text-[13px] font-medium tracking-widest uppercase text-ink-4">Initializing Ledger...</span>
        </div>
      </div>
    );
  }

  // Once initialized, render the persistent shell
  return (
    <div className="flex h-screen overflow-hidden bg-obsidian-0 text-ink-1">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar />
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {children}
        </div>
      </main>
    </div>
  );
}
