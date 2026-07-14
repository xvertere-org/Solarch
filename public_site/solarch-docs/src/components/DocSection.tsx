import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface DocSectionProps {
  id: string
  title: string
  children: ReactNode
}

export default function DocSection({ id, title, children }: DocSectionProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4 }}
      className="mb-12 scroll-mt-24"
    >
      <h2 className="mb-4 font-heading text-2xl font-semibold text-theme">
        {title}
      </h2>
      <div className="prose prose-invert max-w-none prose-pre:bg-transparent prose-pre:p-0">
        {children}
      </div>
    </motion.section>
  )
}
