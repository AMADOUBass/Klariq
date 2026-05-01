'use client';
import { useTranslations, useLocale } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('home');
  const locale = useLocale();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-obsidian-0 text-white relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[oklch(0.74_0.16_245)] blur-[120px] opacity-[0.05]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[oklch(0.55_0.20_260)] blur-[120px] opacity-[0.03]" />
      
      <div className="max-w-2xl text-center relative z-10">
        <div className="mb-8 inline-flex items-center rounded-full hairline px-4 py-1.5 text-[12px] font-mono tracking-wider uppercase text-accent bg-accent/5">
          <span className="mr-2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span>{t('badge')}</span>
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          {t('title')}
        </h1>

        <p className="mb-8 text-lg text-ink-3">
          {t('description')}
        </p>

        <div className="flex items-center justify-center gap-4 mb-12">
          <a 
            href={`/${locale}/sign-in`}
            className="h-11 px-6 rounded-xl bg-gradient-to-b from-[oklch(0.78_0.16_245)] to-[oklch(0.62_0.20_250)] text-obsidian-0 font-medium text-[14px] flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition"
          >
            Se connecter
          </a>
          <a 
            href={`/${locale}/sign-up`}
            className="h-11 px-6 rounded-xl hairline hover:bg-white/[0.03] text-white font-medium text-[14px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition"
          >
            Créer un compte
          </a>
        </div>

        <div className="grid grid-cols-2 gap-4 text-left text-sm">
          {(['api', 'auth', 'multitenancy', 'i18n'] as const).map((feature) => (
            <div key={feature} className="glass rounded-xl p-5 hairline border-white/[0.05]">
              <div className="font-medium text-white mb-1">{t(`features.${feature}.title`)}</div>
              <div className="text-ink-3 text-[13px] leading-relaxed">{t(`features.${feature}.description`)}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
