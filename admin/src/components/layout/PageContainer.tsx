import React from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className }) => {
  return (
    <div className={cn("px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto text-text-primary w-full", className)}>
      {children}
    </div>
  )
}
