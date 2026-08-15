import * as React from 'react';
import { cn } from '../../lib/utils';

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(
        'shrink-0 border-border',
        orientation === 'horizontal' ? 'h-[1px] w-full border-t' : 'h-full w-[1px] border-l',
        className
      )}
      {...props}
    />
  )
);
Divider.displayName = 'Divider';

export { Divider };
