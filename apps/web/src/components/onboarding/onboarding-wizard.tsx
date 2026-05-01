'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Building2, Landmark, Calendar, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema, type OnboardingInput } from '@/lib/validations';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

type Step = 'entity' | 'tax' | 'fiscal' | 'complete';

export function OnboardingWizard() {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>('entity');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      province: 'QC',
      taxFrequency: 'quarterly',
      fiscalYearStart: '2026-01-01',
      currency: 'CAD',
    },
  });

  const formData = watch();

  const handleNext = async () => {
    // 1. Validate current step
    let fieldsToValidate: (keyof OnboardingInput)[] = [];
    if (step === 'entity') fieldsToValidate = ['name', 'legalName', 'address', 'city', 'province', 'postalCode'];
    else if (step === 'tax') fieldsToValidate = ['gstNumber', 'qstNumber', 'taxFrequency'];
    else if (step === 'fiscal') fieldsToValidate = ['fiscalYearStart', 'currency'];

    const isValid = await trigger(fieldsToValidate);
    if (!isValid) {
      toast.error(t('messages.validationError'));
      return;
    }

    if (step === 'entity') setStep('tax');
    else if (step === 'tax') setStep('fiscal');
    else if (step === 'fiscal') {
      await handleSubmit(onSubmit)();
    }
  };

  const onSubmit = async (data: OnboardingInput) => {
    setLoading(true);
    const tLoading = toast.loading(t('messages.creating'));
    try {
      // 1. Create the organization in Better-Auth
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const { data: org, error } = await (authClient as any).organization.create({
        name: data.name,
        slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */

      if (error) throw new Error(error.message);

      // 2. Synchronize with our API (Phase 2 company record)
      await apiFetch('/tenancy/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': org.id,
        },
        body: JSON.stringify({
          name: data.name,
          legalName: data.legalName,
          taxNumberGst: data.gstNumber,
          taxNumberQst: data.qstNumber,
          fiscalYearStart: data.fiscalYearStart,
          baseCurrency: data.currency,
        }),
      });
      
      // 3. Set as active organization
      await (authClient as any).organization.setActive({
        organizationId: org.id,
      });

      toast.success(t('messages.success'), { id: tLoading });
      setStep('complete');
    } catch (err: any) {
      console.error(err);
      const isAlreadyExists = err.message?.toLowerCase().includes('already exists');
      toast.error(isAlreadyExists ? t('errors.alreadyExists') : t('messages.error'), { id: tLoading });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 'entity', label: t('steps.entity'), icon: Building2 },
    { id: 'tax', label: t('steps.tax'), icon: Landmark },
    { id: 'fiscal', label: t('steps.fiscal'), icon: Calendar },
  ];

  return (
    <div className="w-full max-w-[640px] animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Progress Bar */}
      {step !== 'complete' && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const active = step === s.id;
              const completed = steps.findIndex(x => x.id === step) > i;
              
              return (
                <div key={s.id} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 hairline",
                    active ? "bg-accent text-obsidian-0 shadow-[0_0_20px_rgba(80,140,255,0.4)] border-accent" : 
                    completed ? "bg-pos/20 text-pos border-pos/30" : "bg-white/[0.03] text-ink-4"
                  )}>
                    {completed ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium tracking-wider uppercase transition-colors duration-500",
                    active ? "text-white" : "text-ink-4"
                  )}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-[1px] bg-white/[0.06] w-full relative -mt-[41px] -z-0">
            <div 
              className="h-full bg-accent transition-all duration-700"
              style={{ width: `${(steps.findIndex(x => x.id === step) / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-8 hairline border-white/[0.05]">
        {step === 'entity' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-white">{t('entity.title')}</h2>
              <p className="text-ink-3 mt-1.5">{t('subtitle')}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink-3 ml-1">{t('entity.nameLabel')}</label>
                <input
                  {...register('name')}
                  type="text"
                  className={cn(
                    "w-full h-11 px-4 rounded-xl bg-white/[0.03] border text-[14px] text-white focus:outline-none transition",
                    errors.name ? "border-neg/50" : "border-white/10 focus:border-accent/50"
                  )}
                  placeholder="Nordvale Holdings"
                />
                {errors.name && <p className="text-[11px] text-neg ml-1">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink-3 ml-1">{t('entity.legalNameLabel')}</label>
                <input
                  {...register('legalName')}
                  type="text"
                  className={cn(
                    "w-full h-11 px-4 rounded-xl bg-white/[0.03] border text-[14px] text-white focus:outline-none transition",
                    errors.legalName ? "border-neg/50" : "border-white/10 focus:border-accent/50"
                  )}
                  placeholder="9402-4412 Québec Inc."
                />
                {errors.legalName && <p className="text-[11px] text-neg ml-1">{errors.legalName.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-3 ml-1">{t('entity.addressLabel')}</label>
              <input
                {...register('address')}
                type="text"
                className={cn(
                  "w-full h-11 px-4 rounded-xl bg-white/[0.03] border text-[14px] text-white focus:outline-none transition",
                  errors.address ? "border-neg/50" : "border-white/10 focus:border-accent/50"
                )}
                placeholder="1234 Rue de la Montagne"
              />
              {errors.address && <p className="text-[11px] text-neg ml-1">{errors.address.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink-3 ml-1">{t('entity.cityLabel')}</label>
                <input
                  {...register('city')}
                  type="text"
                  className={cn(
                    "w-full h-11 px-4 rounded-xl bg-white/[0.03] border text-[14px] text-white focus:outline-none transition",
                    errors.city ? "border-neg/50" : "border-white/10 focus:border-accent/50"
                  )}
                  placeholder="Montréal"
                />
                {errors.city && <p className="text-[11px] text-neg ml-1">{errors.city.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink-3 ml-1">{t('entity.provinceLabel')}</label>
                <select
                  {...register('province')}
                  className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-[14px] text-white focus:outline-none focus:border-accent/50 transition appearance-none"
                >
                  <option value="QC">Québec</option>
                  <option value="ON">Ontario</option>
                  <option value="BC">British Columbia</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink-3 ml-1">{t('entity.postalCodeLabel')}</label>
                <input
                  {...register('postalCode')}
                  type="text"
                  className={cn(
                    "w-full h-11 px-4 rounded-xl bg-white/[0.03] border text-[14px] text-white focus:outline-none transition",
                    errors.postalCode ? "border-neg/50" : "border-white/10 focus:border-accent/50"
                  )}
                  placeholder="H3G 1Z1"
                />
                {errors.postalCode && <p className="text-[11px] text-neg ml-1">{errors.postalCode.message}</p>}
              </div>
            </div>
          </div>
        )}

        {step === 'tax' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-white">{t('tax.title')}</h2>
              <p className="text-ink-3 mt-1.5">{t('tax.subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink-3 ml-1">{t('tax.gstLabel')}</label>
                <input
                  {...register('gstNumber')}
                  type="text"
                  className={cn(
                    "w-full h-11 px-4 rounded-xl bg-white/[0.03] border text-[14px] text-white focus:outline-none transition",
                    errors.gstNumber ? "border-neg/50" : "border-white/10 focus:border-accent/50"
                  )}
                  placeholder="123456789 RT 0001"
                />
                {errors.gstNumber && <p className="text-[11px] text-neg ml-1">{errors.gstNumber.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink-3 ml-1">{t('tax.qstLabel')}</label>
                <input
                  {...register('qstNumber')}
                  type="text"
                  className={cn(
                    "w-full h-11 px-4 rounded-xl bg-white/[0.03] border text-[14px] text-white focus:outline-none transition",
                    errors.qstNumber ? "border-neg/50" : "border-white/10 focus:border-accent/50"
                  )}
                  placeholder="1023456789 TQ 0001"
                />
                {errors.qstNumber && <p className="text-[11px] text-neg ml-1">{errors.qstNumber.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-3 ml-1">{t('tax.frequencyLabel')}</label>
              <div className="grid grid-cols-3 gap-2">
                {['monthly', 'quarterly', 'annually'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      /* eslint-disable @typescript-eslint/no-explicit-any */
                      setValue('taxFrequency', f as any);
                      /* eslint-enable @typescript-eslint/no-explicit-any */
                    }}
                    className={cn(
                      "h-11 rounded-xl text-[13px] font-medium transition hairline",
                      formData.taxFrequency === f ? "bg-white/[0.08] text-white border-white/20" : "bg-white/[0.02] text-ink-3 border-transparent hover:bg-white/[0.04]"
                    )}
                  >
                    {t(`tax.freq.${f as "monthly" | "quarterly" | "annually"}`)}
                  </button>
                ))}
              </div>
              {errors.taxFrequency && <p className="text-[11px] text-neg ml-1">{errors.taxFrequency.message}</p>}
            </div>
          </div>
        )}

        {step === 'fiscal' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight text-white">{t('fiscal.title')}</h2>
              <p className="text-ink-3 mt-1.5">{t('subtitle')}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-3 ml-1">{t('fiscal.yearStartLabel')}</label>
              <input
                {...register('fiscalYearStart')}
                type="date"
                className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-[14px] text-white focus:outline-none focus:border-accent/50 transition [color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-3 ml-1">{t('fiscal.currencyLabel')}</label>
              <select
                {...register('currency')}
                className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-[14px] text-white focus:outline-none focus:border-accent/50 transition appearance-none"
              >
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="py-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-700">
            <div className="w-20 h-20 rounded-full bg-pos/10 text-pos flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(34,197,94,0.15)]">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-white">{t('complete.title')}</h2>
            <p className="text-ink-3 mt-2 text-[16px] max-w-[320px] mx-auto leading-relaxed">
              {t('complete.subtitle')}
            </p>
            <button
              onClick={() => router.push(`/${locale}/dashboard`)}
              className="mt-12 h-12 px-10 rounded-xl bg-gradient-to-b from-[oklch(0.78_0.16_245)] to-[oklch(0.62_0.20_250)] text-obsidian-0 font-semibold text-[15px] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition"
            >
              {t('complete.finish')}
            </button>
          </div>
        )}

        {step !== 'complete' && (
          <div className="mt-10 flex items-center justify-end">
            <button
              onClick={handleNext}
              disabled={loading}
              className="h-12 px-8 rounded-xl bg-gradient-to-b from-[oklch(0.78_0.16_245)] to-[oklch(0.62_0.20_250)] text-obsidian-0 font-semibold text-[14px] flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:scale-100"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {t(`${step}.next` as "entity.next" | "tax.next" | "fiscal.next")} <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
