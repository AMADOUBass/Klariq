'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInInput } from '@/lib/validations';
import { toast } from 'sonner';

export function SignInForm() {
  const t = useTranslations('auth.signIn');
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInInput) => {
    setLoading(true);
    setError('');

    try {
      const res = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (res.error) {
        throw new Error(res.error.message || 'Invalid credentials');
      }

      toast.success(t('success') || 'Signed in successfully!');
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || t('error');
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[oklch(0.74_0.16_245)] to-[oklch(0.55_0.20_260)] shadow-lg mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4v16" /><path d="M5 12h7l6-8" /><path d="M12 12l6 8" />
          </svg>
        </div>
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[12px] font-medium text-ink-3">{t('passwordLabel')}</label>
            <a href="#" className="text-[12px] text-accent hover:text-accent-light transition">
              {t('forgotPassword')}
            </a>
          </div>
          <div className="relative">
            <Lock className={cn("absolute left-3 top-1/2 -translate-y-1/2 transition-colors", errors.password ? "text-neg" : "text-ink-4")} size={18} />
            <input
              {...register('password')}
              type="password"
              className={cn(
                "w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.03] border text-[14px] text-white focus:outline-none focus:bg-white/[0.05] transition",
                errors.password ? "border-neg/50" : "border-white/10 focus:border-accent/50"
              )}
              placeholder="••••••••"
            />
          </div>
          {errors.password && <p className="text-[11px] text-neg ml-1 mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 mt-2 rounded-xl bg-gradient-to-b from-[oklch(0.78_0.16_245)] to-[oklch(0.62_0.20_250)] text-obsidian-0 font-medium text-[14px] flex items-center justify-center gap-2 shadow-[0_8px_20px_-6px_rgba(80,140,255,0.5)] active:scale-[0.98] transition disabled:opacity-50 disabled:scale-100"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              {t('submit')} <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-[13px] text-ink-3">
          {t('noAccount')}{' '}
          <button
            onClick={() => router.push(`/${locale}/sign-up`)}
            className="text-accent font-medium hover:text-accent-light transition"
          >
            {t('signUpLink')}
          </button>
        </p>
      </div>
    </div>
  );
}
