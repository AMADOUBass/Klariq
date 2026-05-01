'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  description?: string | undefined;
  leftIcon?: React.ReactNode | undefined;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, description, leftIcon, type, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[12px] font-medium text-ink-3 ml-1 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 group-focus-within:text-accent transition-colors">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white transition-all',
              'placeholder:text-ink-5',
              'focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50 focus:bg-white/[0.05]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-10',
              error && 'border-neg/50 focus:ring-neg/50 focus:border-neg/50',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {description && !error && (
          <p className="text-[11px] text-ink-4 ml-1">{description}</p>
        )}
        {error && (
          <p className="text-[11px] text-neg ml-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
