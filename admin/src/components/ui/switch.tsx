import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      props.onClick?.(e);
      onCheckedChange?.(!checked);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      props.onKeyDown?.(e);
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onCheckedChange?.(!checked);
      }
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        ref={ref}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary focus-visible:ring-offset-1 focus-visible:ring-offset-bg-void disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-brand-primary' : 'bg-bg-elevated border-border',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none block h-3.5 w-3.5 rounded-full shadow-sm ring-0 transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-4 bg-white' : 'translate-x-0.5 bg-text-muted'
          )}
        />
      </button>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
