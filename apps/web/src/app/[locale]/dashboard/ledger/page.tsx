'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export default function LedgerPage() {
  const t = useTranslations('nav');
  
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight">{t('ledger')}</h1>
        <p className="text-ink-3 mt-1 text-[15px]">General Ledger and chart of accounts.</p>
      </div>
      
      <div className="flex-1 glass rounded-xl flex items-center justify-center text-ink-3">
        <div className="text-center">
          <p className="text-[14px] font-medium text-ink-2">Ledger module coming soon</p>
          <p className="text-[12px] mt-1">This page is under development.</p>
        </div>
      </div>
    </div>
  );
}
