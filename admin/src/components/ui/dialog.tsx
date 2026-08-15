import * as React from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => {},
})

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onOpenChange(false)
    }
    if (open) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOpenChange])

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogContent({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  const { open, onOpenChange } = React.useContext(DialogContext)
  const dialogRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (open) {
      setTimeout(() => dialogRef.current?.focus(), 0)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Card Content Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-lg rounded-xl border border-border/80 bg-bg-surface p-6 shadow-2xl z-10 text-text-primary outline-none duration-200 animate-in fade-in-0 zoom-in-95',
          className
        )}
      >
        {children}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-md p-1 text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary cursor-pointer"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>
      </div>
    </div>,
    document.body
  )
}

export function DialogHeader({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-left', className)}>
      {children}
    </div>
  )
}

export function DialogTitle({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <h2 className={cn('font-display font-semibold text-lg text-text-primary leading-none tracking-tight m-0', className)}>
      {children}
    </h2>
  )
}

export function DialogDescription({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn('font-sans text-xs text-text-secondary leading-relaxed mt-1', className)}>
      {children}
    </p>
  )
}

export function DialogFooter({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-border/60', className)}>
      {children}
    </div>
  )
}

export function DialogClose({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
      aria-label="Close dialog"
    >
      <X size={16} />
    </button>
  )
}
