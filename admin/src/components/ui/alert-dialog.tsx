import * as React from 'react'
import { Button } from './button'
import { cn } from '../../lib/utils'

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      <div 
        role="alertdialog"
        aria-modal="true"
        className="relative bg-bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md p-6 z-10 overflow-hidden text-text-primary"
      >
        {children}
      </div>
    </div>
  )
}

export function AlertDialogContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-4', className)}>{children}</div>
}

export function AlertDialogHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-2', className)}>{children}</div>
}

export function AlertDialogTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-base font-semibold text-text-primary m-0 font-display', className)}>{children}</h2>
}

export function AlertDialogDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-xs text-text-secondary leading-relaxed', className)}>{children}</p>
}

export function AlertDialogFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex justify-end gap-3 pt-4 border-t border-border', className)}>{children}</div>
}

export function AlertDialogCancel({ onClick, children = 'Cancel', className = '' }: { onClick?: () => void; children?: React.ReactNode; className?: string }) {
  return (
    <Button variant="outline" onClick={onClick} className={className}>
      {children}
    </Button>
  )
}

export function AlertDialogAction({ onClick, children = 'Continue', className = '', variant = 'danger' }: { onClick?: () => void; children?: React.ReactNode; className?: string; variant?: any }) {
  return (
    <Button variant={variant === 'destructive' ? 'danger' : variant} onClick={onClick} className={className}>
      {children}
    </Button>
  )
}
