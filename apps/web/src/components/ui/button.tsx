'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | undefined;
  size?: 'sm' | 'md' | 'lg' | 'icon' | undefined;
  isLoading?: boolean | undefined;
  leftIcon?: React.ReactNode | undefined;
  rightIcon?: React.ReactNode | undefined;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent/90 border border-white/10',
      secondary: 'bg-white/5 text-white hover:bg-white/10 border border-white/10',
      ghost: 'bg-transparent text-ink-3 hover:text-white hover:bg-white/5',
      outline: 'bg-transparent border border-white/10 text-white hover:bg-white/5',
      danger: 'bg-neg/10 text-neg border border-neg/20 hover:bg-neg hover:text-white',
    };

    const sizes = {
      sm: 'h-8 px-3 text-[12px]',
      md: 'h-10 px-4 text-[13px]',
      lg: 'h-12 px-6 text-[14px]',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed gap-2',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 16} />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
