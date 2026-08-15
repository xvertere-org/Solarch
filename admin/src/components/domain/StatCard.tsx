import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  trend?: string
  badge?: string
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  description,
  trend,
  badge,
  className,
}) => {
  return (
    <Card
      className={cn(
        'bg-card border-border hover:border-border-strong transition-colors rounded-xl shadow-none',
        className
      )}
    >
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">{title}</p>
          {icon && (
            <div className="p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shrink-0">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-text-primary">
            {value}
          </h3>
          {trend && <span className="text-xs text-status-success font-medium">{trend}</span>}
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-success/15 text-status-success border border-status-success/30 font-medium">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-text-muted mt-1.5">{description}</p>}
      </CardContent>
    </Card>
  )
}
