import * as React from 'react'
import { cn } from '../../lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex">
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 flex w-full">
        {children}
      </div>
    </div>
  )
}

export interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  side?: 'left' | 'right' | 'top' | 'bottom'
  className?: string
  dir?: string
  style?: React.CSSProperties
}

export function SheetContent({ children, side = 'left', className = '', ...props }: SheetContentProps) {
  const sideStyles = {
    left: 'inset-y-0 left-0 h-full w-3/4 max-w-xs border-r',
    right: 'inset-y-0 right-0 h-full w-3/4 max-w-xs border-l',
    top: 'inset-x-0 top-0 w-full h-auto border-b',
    bottom: 'inset-x-0 bottom-0 w-full h-auto border-t',
  }

  return (
    <div
      className={cn(
        'fixed bg-bg-surface border-border shadow-2xl p-0 transition ease-in-out z-50 overflow-y-auto text-text-primary',
        sideStyles[side],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left p-4', className)} {...props} />
  )
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-4', className)} {...props} />
  )
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-text-primary font-display', className)} {...props} />
  )
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-text-secondary', className)} {...props} />
  )
}
