import * as React from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void
  value?: string
  children?: React.ReactNode
}

interface SelectContextType {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  labels: Record<string, React.ReactNode>
  registerLabel: (val: string, label: React.ReactNode) => void
}

const SelectContext = React.createContext<SelectContextType>({
  open: false,
  setOpen: () => {},
  labels: {},
  registerLabel: () => {},
})

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  children,
  className,
  disabled,
  ...props
}) => {
  const [open, setOpen] = React.useState(false)
  const [labels, setLabels] = React.useState<Record<string, React.ReactNode>>({})
  const containerRef = React.useRef<HTMLDivElement>(null)

  const registerLabel = React.useCallback((val: string, label: React.ReactNode) => {
    setLabels((prev) => (prev[val] === label ? prev : { ...prev, [val]: label }))
  }, [])

  // Close when clicking outside
  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const hasCompound = React.Children.toArray(children).some(
    (child: any) =>
      child?.type?.displayName === 'SelectTrigger' || child?.type?.displayName === 'SelectContent'
  )

  if (hasCompound) {
    return (
      <SelectContext.Provider value={{ value, onValueChange, open, setOpen, labels, registerLabel }}>
        <div ref={containerRef} className={cn('relative inline-block w-full text-left', className)}>
          {children}
        </div>
      </SelectContext.Provider>
    )
  }

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => {
        props.onChange?.(e)
        onValueChange?.(e.target.value)
      }}
      className={cn(
        'flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 py-1 text-xs text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, disabled, ...props }, ref) => {
  const { open, setOpen } = React.useContext(SelectContext)

  return (
    <button
      type="button"
      ref={ref}
      disabled={disabled}
      onClick={() => setOpen((prev) => !prev)}
      aria-expanded={open}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-border bg-bg-elevated px-3 py-1 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-colors',
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDown
        size={14}
        className={cn('text-text-muted shrink-0 transition-transform duration-200 ml-2', open && 'rotate-180 text-brand-primary')}
      />
    </button>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

export const SelectValue: React.FC<{ placeholder?: string; className?: string }> = ({
  placeholder,
  className,
}) => {
  const { value, labels } = React.useContext(SelectContext)
  const displayValue = value ? labels[value] ?? value : placeholder
  return (
    <span className={cn('block truncate', !value && 'text-text-muted', className)}>
      {displayValue}
    </span>
  )
}
SelectValue.displayName = 'SelectValue'

export const SelectContent: React.FC<{
  children?: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  const { open } = React.useContext(SelectContext)
  if (!open) return null

  return (
    <div
      role="listbox"
      className={cn(
        'absolute left-0 top-full mt-1.5 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-bg-surface p-1 shadow-2xl z-50 outline-none animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
    </div>
  )
}
SelectContent.displayName = 'SelectContent'

export const SelectItem: React.FC<{
  value: string
  children?: React.ReactNode
  className?: string
  disabled?: boolean
}> = ({ value, children, className, disabled }) => {
  const { value: selectedValue, onValueChange, setOpen, registerLabel } = React.useContext(SelectContext)
  const isSelected = selectedValue === value

  React.useEffect(() => {
    if (children) {
      registerLabel(value, children)
    }
  }, [value, children, registerLabel])

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => {
        if (disabled) return
        onValueChange?.(value)
        setOpen(false)
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center justify-between rounded px-2.5 py-2 text-xs text-text-primary transition-colors hover:bg-bg-surface-hover hover:text-brand-bright outline-none',
        isSelected && 'bg-bg-elevated text-brand-primary font-medium',
        disabled && 'pointer-events-none opacity-40',
        className
      )}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check size={14} className="text-brand-primary shrink-0 ml-2" />}
    </div>
  )
}
SelectItem.displayName = 'SelectItem'
