import * as React from 'react';
import { cn } from '../../lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-xs font-medium text-text-secondary leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none block mb-1.5', className)}
      {...props}
    />
  )
);
Label.displayName = 'Label';
