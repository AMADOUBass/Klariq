'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string | undefined;
  error?: string | undefined;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[12px] font-medium text-ink-3 ml-1 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            className={cn(
              'flex h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2 text-[13px] text-white transition-all',
              'focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-neg/50 focus:ring-neg/50 focus:border-neg/50',
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-4">
            <ChevronDown size={16} />
          </div>
        </div>
        {error && (
          <p className="text-[11px] text-neg ml-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
