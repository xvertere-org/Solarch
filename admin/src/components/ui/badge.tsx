import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary',
        brand: 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary',
        secondary: 'border-border bg-bg-elevated text-text-secondary',
        outline: 'border-border bg-transparent text-text-secondary',
        danger: 'border-status-danger/30 bg-status-danger/15 text-status-danger',
        destructive: 'border-status-danger/30 bg-status-danger/15 text-status-danger',
        success: 'border-status-success/30 bg-status-success/15 text-status-success',
        warning: 'border-status-warning/30 bg-status-warning/15 text-status-warning',
        info: 'border-status-info/30 bg-status-info/15 text-status-info',
        accent: 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
