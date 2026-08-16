import * as React from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '../../lib/utils';

export interface IconButtonProps extends Omit<ButtonProps, 'size'> {}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', ...props }, ref) => {
    return (
      <Button
        className={cn('shrink-0', className)}
        variant={variant}
        size="icon"
        ref={ref}
        {...props}
      />
    );
  }
);
IconButton.displayName = 'IconButton';

export { IconButton };
