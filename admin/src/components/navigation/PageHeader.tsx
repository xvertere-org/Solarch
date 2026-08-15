import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, className }) => {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary font-display leading-tight">{title}</h1>
        {description && <p className="text-sm text-text-secondary mt-0.5 leading-normal">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
