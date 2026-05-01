'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword');
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    setError('');

    try {
      await authClient.forgetPassword({
        email: data.email,
        redirectTo: `/${locale}/reset-password`,
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-[400px] text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pos/10 text-pos mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight text-white mb-3">Check your inbox</h1>
        <p className="text-ink-3 mb-8">{t('success')}</p>
        <button
          onClick={() => router.push(`/${locale}/sign-in`)}
          className="w-full h-11 rounded-xl hairline hover:bg-white/[0.03] text-white font-medium text-[14px] flex items-center justify-center gap-2 transition"
        >
          <ArrowLeft size={18} /> {t('backToSignIn')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-white">{t('title')}</h1>
        <p className="text-ink-3 mt-2">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-neg/10 border border-neg/20 text-neg text-[13px] animate-shake">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-ink-3 ml-1">{t('emailLabel')}</label>
          <div className="relative">
            <Mail className={cn("absolute left-3 top-1/2 -translate-y-1/2 transition-colors", errors.email ? "text-neg" : "text-ink-4")} size={18} />
            <input
              {...register('email')}
              type="email"
              className={cn(
                "w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.03] border text-[14px] text-white focus:outline-none focus:bg-white/[0.05] transition",
                errors.email ? "border-neg/50" : "border-white/10 focus:border-accent/50"
              )}
              placeholder="name@company.com"
            />
          </div>
          {errors.email && <p className="text-[11px] text-neg ml-1 mt-1">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 mt-2 rounded-xl bg-gradient-to-b from-[oklch(0.78_0.16_245)] to-[oklch(0.62_0.20_250)] text-obsidian-0 font-medium text-[14px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition disabled:opacity-50 disabled:scale-100"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            t('submit')
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button
          onClick={() => router.push(`/${locale}/sign-in`)}
          className="text-[13px] text-ink-3 hover:text-white transition flex items-center gap-2 mx-auto"
        >
          <ArrowLeft size={16} /> {t('backToSignIn')}
        </button>
      </div>
    </div>
  );
}
