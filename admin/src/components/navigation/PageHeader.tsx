import React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  actions,
  className,
}) => {
  const renderedActions = action || actions

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary font-display leading-tight">
          {title}
        </h1>
        {description && (
          <div className="text-sm text-text-secondary mt-0.5 leading-normal">
            {description}
          </div>
        )}
      </div>
      {renderedActions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {renderedActions}
        </div>
      )}
    </div>
  )
}
