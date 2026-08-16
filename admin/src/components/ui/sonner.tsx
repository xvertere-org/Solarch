import * as React from 'react';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-bg-surface group-[.toaster]:text-text-primary group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-text-secondary',
          actionButton:
            'group-[.toast]:bg-brand-primary group-[.toast]:text-black group-[.toast]:font-semibold',
          cancelButton:
            'group-[.toast]:bg-bg-elevated group-[.toast]:text-text-secondary',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
