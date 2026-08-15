import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-brand-primary text-white font-medium hover:bg-brand-hover shadow-xs border border-brand-primary/80',
        secondary: 'bg-bg-elevated text-text-primary border border-border/60 hover:bg-bg-surface-hover hover:border-border shadow-xs',
        ghost: 'bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
        outline: 'border border-border/60 bg-bg-surface hover:bg-bg-elevated hover:text-text-primary text-text-secondary shadow-xs',
        danger: 'bg-status-danger text-white hover:bg-status-danger/90 shadow-xs border border-status-danger',
        destructive: 'bg-status-danger text-white hover:bg-status-danger/90 shadow-xs border border-status-danger',
      },
      size: {
        default: 'h-9 px-4 py-2 text-xs',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-5 text-sm',
        icon: 'h-8 w-8',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
