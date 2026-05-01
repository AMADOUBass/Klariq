import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'strong' | 'outline' | undefined;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'glass', ...props }, ref) => {
    const variants = {
      glass: 'glass border-white/[0.05]',
      strong: 'glass-strong border-white/10',
      outline: 'bg-transparent border border-white/10',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl border transition-all duration-300', variants[variant], className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };
