'use client';

import React, { useEffect } from 'react';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function OnboardingPage() {
  const router = useRouter();
  const locale = useLocale();
  
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: orgs, isPending } = (authClient as any).useListOrganizations();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  useEffect(() => {
    if (!isPending && orgs && orgs.length > 0) {
      router.push(`/${locale}/dashboard`);
    }
  }, [orgs, isPending, router, locale]);

  if (isPending || (orgs && orgs.length > 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-obsidian-0 text-white">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center animate-pulse">
          <div className="w-5 h-5 rounded-full bg-accent animate-ping" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-obsidian-0 relative overflow-hidden py-20">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[oklch(0.74_0.16_245)] blur-[140px] opacity-[0.06]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[oklch(0.55_0.20_260)] blur-[140px] opacity-[0.04]" />
      
      <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{ 
          backgroundImage: `radial-gradient(var(--color-line) 1px, transparent 1px)`, 
          backgroundSize: '40px 40px' 
        }} 
      />

      <div className="relative z-10 w-full flex justify-center px-4">
        <OnboardingWizard />
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[11px] text-ink-4 tracking-widest uppercase font-mono">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        Klariq Onboarding v1.0
      </div>
    </div>
  );
}
