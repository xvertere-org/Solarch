import * as React from 'react'
import { cn } from '../../lib/utils'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode | React.ElementType
  title: string
  description?: React.ReactNode
  message?: React.ReactNode
  action?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, title, description, message, action, ...props }, ref) => {
    const renderedDescription = description || message

    const renderIcon = () => {
      if (!Icon) return null
      if (React.isValidElement(Icon)) {
        return Icon
      }
      if (typeof Icon === 'function' || typeof Icon === 'object') {
        const IconComponent = Icon as React.ElementType
        return <IconComponent size={24} />
      }
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-surface/30 p-8 text-center',
          className
        )}
        {...props}
      >
        {Icon && (
          <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated border border-border text-text-muted">
            {renderIcon()}
          </div>
        )}
        <h3 className="mb-1.5 text-base font-semibold text-text-primary font-display">{title}</h3>
        {renderedDescription && (
          <div className="mb-5 max-w-sm text-xs text-text-secondary leading-relaxed">
            {renderedDescription}
          </div>
        )}
        {action && <div>{action}</div>}
      </div>
    )
  }
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
