import * as React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  message: string
  action?: React.ReactNode
  onRetry?: () => void | Promise<void>
}

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ className, title = 'An error occurred', message, action, onRetry, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center',
          className
        )}
        {...props}
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20 text-status-danger">
          <AlertCircle size={20} />
        </div>
        <h4 className="mb-1 font-semibold text-text-primary text-sm font-display">{title}</h4>
        <p className="mb-4 text-xs text-text-secondary max-w-sm">{message}</p>
        {action ? (
          <div>{action}</div>
        ) : onRetry ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="text-xs h-8 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Try Again</span>
          </Button>
        ) : null}
      </div>
    )
  }
)
ErrorState.displayName = 'ErrorState'

export { ErrorState }
