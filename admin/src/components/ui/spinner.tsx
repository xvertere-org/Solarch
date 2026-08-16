import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number | string;
}

export function Spinner({ className, size = 18, ...props }: SpinnerProps) {
  return (
    <span className={cn('inline-flex items-center justify-center animate-spin text-brand-primary', className)} {...props}>
      <Loader2 size={size} />
    </span>
  );
}
