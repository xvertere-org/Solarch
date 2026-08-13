import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  trend?: string
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, trend, className }) => {
  return (
    <Card className={cn("bg-[#150d08] border-[#3a2214] shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#c9a894]">{title}</p>
          {icon && <div className="p-2.5 rounded-lg bg-[#1f140d] border border-[#3a2214] text-[#ff5a1f]">{icon}</div>}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <h3 className="text-3xl font-bold font-display tracking-tight text-[#fdf3ec]">{value}</h3>
          {trend && <span className="text-xs text-[#10b981] font-medium">{trend}</span>}
        </div>
        {description && <p className="text-xs text-[#8b6d5b] mt-1.5">{description}</p>}
      </CardContent>
    </Card>
  )
}
