import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

function BrokenSpoon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bowl */}
      <ellipse cx="45" cy="50" rx="22" ry="28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {/* Crack in bowl */}
      <path d="M38 38 L48 48 M42 56 L52 46" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Handle */}
      <path d="M65 50 L95 30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      {/* Broken end */}
      <path d="M93 32 L98 27 M95 34 L100 29" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Sparkles / error indicators */}
      <circle cx="30" cy="25" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="85" cy="70" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="70" cy="85" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  )
}

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Solarch — Page Not Found</title>
        <meta name="description" content="The page you are looking for does not exist." />
      </Helmet>
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <BrokenSpoon className="mx-auto mb-8 h-24 w-24 text-primary/60" />

        <h1 className="mb-3 font-heading text-6xl font-bold text-theme">404</h1>
        <p className="mb-2 text-lg text-theme-secondary">Page not found</p>
        <p className="mb-8 text-sm text-theme-tertiary">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link
          to="/docs/getting-started/quick-start"
          className="btn-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to docs
        </Link>
      </motion.div>
    </div>
    </>
  )
}
