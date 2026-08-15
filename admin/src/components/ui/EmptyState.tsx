import * as React from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-surface/30 p-8 text-center',
          className
        )}
        {...props}
      >
        {icon && (
          <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated border border-border text-text-muted">
            {icon}
          </div>
        )}
        <h3 className="mb-1.5 text-base font-semibold text-text-primary font-display">{title}</h3>
        {description && (
          <p className="mb-5 max-w-sm text-xs text-text-secondary leading-relaxed">{description}</p>
        )}
        {action && <div>{action}</div>}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';

export { EmptyState };
