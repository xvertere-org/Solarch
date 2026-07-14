import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Zap, Shield, Database, Sparkles } from 'lucide-react'

const stats = [
  { label: 'Production Ready', icon: Zap },
  { label: 'Developer First', icon: Sparkles },
  { label: 'Open Source', icon: Shield },
]

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      <div className="hero-orb" />
      <div className="hero-grid pointer-events-none absolute inset-0" />

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <span className="pill">
              <Sparkles className="h-3 w-3" />
              Built for Developers
            </span>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6 max-w-4xl font-heading text-5xl font-bold leading-tight tracking-tight text-theme md:text-6xl lg:text-7xl"
          >
            Faster prototypes.
            <br />
            <span className="text-primary text-glow">Ship sooner.</span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-10 max-w-2xl text-lg text-theme-secondary"
          >
            A TypeScript Backend-as-a-Service in a single package.
            SQLite, Express, WebSocket — Auth, Realtime, File Storage, AI Tools, Vector Search.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/docs/getting-started/quick-start"
              className="btn-primary"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/Jay-Suryawansh7/solarch"
              target="_blank"
              rel="noreferrer"
              className="btn-github"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-sm text-theme-secondary">
                <stat.icon className="h-4 w-4 text-primary" />
                {stat.label}
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3"
          >
            {[
              {
                icon: Zap,
                title: 'Type Safe',
                description: 'Generated types from your collections with zero config.',
              },
              {
                icon: Shield,
                title: 'Secure by Default',
                description: 'Auth, rules, and validations built in from day one.',
              },
              {
                icon: Database,
                title: 'Realtime',
                description: 'Subscribe to changes and keep your UI in sync.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-6 text-left"
              >
                <div className="feature-icon-box mb-4">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-heading font-semibold text-theme">
                  {feature.title}
                </h3>
                <p className="text-sm text-theme-tertiary">{feature.description}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
