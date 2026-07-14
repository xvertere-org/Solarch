import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export interface Project {
  slug: string
  name: string
  tagline: string
  description: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  features: { name: string; color: string }[]
  cover: React.ReactNode
}

const badgeColorMap: Record<string, string> = {
  teal: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  green: 'bg-green-500/10 text-green-500 border-green-500/20',
  red: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const difficultyColorMap: Record<string, string> = {
  Beginner: 'bg-green-500/10 text-green-500 border-green-500/20',
  Intermediate: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Advanced: 'bg-red-500/10 text-red-500 border-red-500/20',
}

interface ProjectCardProps {
  project: Project
  index: number
}

export default function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-theme bg-theme-surface transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Cover illustration */}
      <div className="relative h-44 w-full overflow-hidden border-b border-theme bg-theme-muted">
        <div className="absolute inset-0 opacity-60 transition-transform duration-500 group-hover:scale-105">
          {project.cover}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-theme-surface/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {project.features.map((f) => (
            <span
              key={f.name}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${badgeColorMap[f.color] ?? 'bg-theme-muted text-theme-secondary border-theme'}`}
            >
              {f.name}
            </span>
          ))}
        </div>

        <h3 className="font-heading text-lg font-semibold text-theme">
          {project.name}
        </h3>
        <p className="mt-1 text-xs text-primary font-medium">
          {project.tagline}
        </p>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-theme-tertiary">
          {project.description}
        </p>

        <div className="mt-auto flex items-center justify-between pt-5">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${difficultyColorMap[project.difficulty]}`}
          >
            {project.difficulty}
          </span>

          <Link
            to={`/projects/${project.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white"
          >
            View Guide
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
