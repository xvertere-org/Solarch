import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import {
  Globe,
  ExternalLink,
  Sparkles,
  Code2,
  Database,
  Layers,
  Zap,
  ArrowRight,
} from 'lucide-react'
import Footer from '../components/Footer'

function IconGithub({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function IconLinkedin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function IconTwitter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

const socials = [
  {
    name: 'GitHub',
    href: 'https://github.com/Jay-Suryawansh7',
    icon: IconGithub,
  },
  {
    name: 'LinkedIn',
    href: 'https://linkedin.com/in/jay-suryawanshi',
    icon: IconLinkedin,
  },
  {
    name: 'Twitter / X',
    href: 'https://twitter.com/JaySuryawanshi7',
    icon: IconTwitter,
  },
  {
    name: 'Instagram',
    href: 'https://instagram.com/jay.suryawanshi_7',
    icon: IconInstagram,
  },
  {
    name: 'Portfolio',
    href: 'https://cogneoverse-lab.web.app',
    icon: Globe,
  },
]

const techStack = [
  { name: 'React', icon: Code2 },
  { name: 'Node.js', icon: Zap },
  { name: 'TypeScript', icon: Code2 },
  { name: 'Python', icon: Code2 },
  { name: 'Flutter / Dart', icon: Code2 },
  { name: 'SQLite', icon: Database },
  { name: 'Electron', icon: Layers },
  { name: 'AWS', icon: Zap },
  { name: 'Express', icon: Code2 },
  { name: 'Figma', icon: Sparkles },
]

const npmPackages = [
  {
    name: 'solarch',
    version: 'v0.15.0',
    description: 'TypeScript backend-as-a-service with SQLite, auth, realtime, AI tools, and React Admin UI.',
    href: 'https://www.npmjs.com/package/solarch',
    tags: ['TypeScript', 'Backend', 'SQLite'],
  },
  {
    name: 'lockguard',
    version: 'v1.0.1',
    description: 'npm supply-chain security scanner — detects malicious postinstall hooks, CVEs, and lockfile changes.',
    href: 'https://www.npmjs.com/package/lockguard',
    tags: ['Security', 'CLI', 'npm'],
  },
  {
    name: 'trim-safe',
    version: 'v1.0.2',
    description: 'Safe drop-in replacement for the abandoned trim package. Fixed ReDoS vulnerability (CVE-2020-7753).',
    href: 'https://www.npmjs.com/package/trim-safe',
    tags: ['JavaScript', 'Security', 'Utility'],
  },
  {
    name: 'koolur',
    version: 'v1.0.3',
    description: 'Unified secure color library with pluggable output backends — zero runtime dependencies.',
    href: 'https://www.npmjs.com/package/koolur',
    tags: ['TypeScript', 'Terminal', 'Secure'],
  },
]

const projects = [
  {
    name: 'Solarch',
    description: 'TypeScript-native backend platform with AI tools, vector search, realtime APIs, and React Admin UI.',
    href: 'https://github.com/Jay-Suryawansh7/solarch',
    tags: ['TypeScript', 'SQLite', 'AI', 'Backend'],
  },
  {
    name: 'OpenComet',
    description: 'Open-source agentic browser with AI control. Electron desktop app + Python agent server.',
    href: 'https://github.com/Jay-Suryawansh7/OpenComet',
    tags: ['Electron', 'Python', 'AI', 'Browser'],
  },
  {
    name: 'Sudarshan (CIVIQ)',
    description: 'Community Intelligence & Volunteer Dispatch mobile app built with Flutter.',
    href: 'https://github.com/Jay-Suryawansh7/Sudarshan',
    tags: ['Flutter', 'Dart', 'Mobile', 'Community'],
  },
  {
    name: 'BrowserOS (exploringbrowser)',
    description: 'Contributing to the open-source agentic browser — alternative to ChatGPT Atlas, Perplexity Comet, Dia.',
    href: 'https://github.com/Jay-Suryawansh7/exploringbrowser',
    tags: ['Browser', 'AI', 'Open Source', 'Fork'],
  },
]

const githubStats = [
  { label: 'Public Repos', value: '28' },
  { label: 'Followers', value: '11' },
  { label: 'Following', value: '10' },
  { label: 'Location', value: 'Indore, MP, India' },
]

export default function About() {
  return (
    <>
      <Helmet>
        <title>About — Solarch</title>
        <meta
          name="description"
          content="Meet Jay Suryawanshi, founder of CogneoVerse and creator of Solarch."
        />
      </Helmet>

      <div className="min-h-screen bg-theme-body pt-14">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-theme">
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary blur-3xl" />
            <div className="absolute -left-20 top-40 h-64 w-64 rounded-full bg-brand-cyan blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="flex flex-col items-center gap-10 text-center lg:flex-row lg:text-left">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="shrink-0"
              >
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-brand-cyan text-4xl font-bold text-white shadow-xl ring-4 ring-theme-body">
                  JS
                </div>
              </motion.div>

              {/* Text */}
              <div className="flex-1">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-theme bg-theme-muted px-3 py-1 text-xs font-medium text-theme-secondary">
                    <Sparkles className="h-3 w-3 text-primary" />
                    CogneoVerse
                  </span>
                  <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-theme sm:text-5xl">
                    Jay Suryawanshi
                  </h1>
                  <p className="mt-3 text-lg text-theme-secondary">
                    Full-Stack Developer · AI/UX Designer · Product Manager
                  </p>
                  <p className="mt-4 max-w-2xl text-theme-tertiary">
                    Founder of <strong className="text-theme-secondary">CogneoVerse</strong>, a product studio building intelligent developer tools. 
                    Creator of <strong className="text-theme-secondary">Solarch</strong>, a TypeScript-native backend platform that brings AI, vector search, and realtime APIs to SQLite. 
                    Passionate about bridging design, AI, and systems engineering to craft products that feel magical.
                  </p>
                </motion.div>

                {/* Socials */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start"
                >
                  {socials.map((s) => (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-theme bg-theme-muted px-4 py-2 text-sm text-theme-secondary transition-all hover:border-theme-hover hover:bg-theme-surface hover:text-theme"
                    >
                      <s.icon className="h-4 w-4" />
                      {s.name}
                    </a>
                  ))}
                </motion.div>

                {/* GitHub Stats */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="mt-6 flex flex-wrap justify-center gap-4 lg:justify-start"
                >
                  {githubStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center gap-2 rounded-lg border border-theme bg-theme-muted px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold text-theme">{stat.value}</span>
                      <span className="text-theme-muted">{stat.label}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-heading text-2xl font-bold text-theme">Tech Stack</h2>
            <p className="mt-2 text-theme-tertiary">
              Languages, frameworks, and tools I use to build products at CogneoVerse.
            </p>
          </motion.div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {techStack.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-theme bg-theme-surface px-4 py-3 transition-colors hover:border-theme-hover"
              >
                <t.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-theme-secondary">{t.name}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* NPM Packages */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-heading text-2xl font-bold text-theme">NPM Packages</h2>
            <p className="mt-2 text-theme-tertiary">
              Published open-source packages used by the JavaScript/TypeScript community.
            </p>
          </motion.div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {npmPackages.map((pkg, i) => (
              <motion.a
                key={pkg.name}
                href={pkg.href}
                target="_blank"
                rel="noreferrer"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group relative flex flex-col rounded-2xl border border-theme bg-theme-surface p-6 transition-all hover:border-theme-hover hover:bg-theme-muted"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg font-semibold text-theme group-hover:text-primary transition-colors">
                      {pkg.name}
                    </h3>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {pkg.version}
                    </span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-theme-muted transition-colors group-hover:text-theme-secondary" />
                </div>
                <p className="mt-2 text-sm text-theme-tertiary">{pkg.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {pkg.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-theme bg-theme-muted px-2.5 py-0.5 text-[10px] font-medium text-theme-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.a>
            ))}
          </div>
        </section>

        {/* Featured Projects */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-heading text-2xl font-bold text-theme">Projects & Contributions</h2>
            <p className="mt-2 text-theme-tertiary">
              Open-source repositories and contributions from CogneoVerse.
            </p>
          </motion.div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {projects.map((p, i) => (
              <motion.a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noreferrer"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group relative flex flex-col rounded-2xl border border-theme bg-theme-surface p-6 transition-all hover:border-theme-hover hover:bg-theme-muted"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-heading text-lg font-semibold text-theme group-hover:text-primary transition-colors">
                    {p.name}
                  </h3>
                  <ExternalLink className="h-4 w-4 text-theme-muted transition-colors group-hover:text-theme-secondary" />
                </div>
                <p className="mt-2 text-sm text-theme-tertiary">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-theme bg-theme-muted px-2.5 py-0.5 text-[10px] font-medium text-theme-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.a>
            ))}
          </div>
        </section>

        {/* CogneoVerse CTA */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-theme bg-theme-surface px-6 py-12 text-center sm:px-12 sm:py-16"
          >
            <div className="absolute inset-0 opacity-[0.04]">
              <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="font-heading text-2xl font-bold text-theme sm:text-3xl">
                CogneoVerse
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-theme-tertiary">
                A product studio building the next generation of intelligent developer tools. 
                We believe AI should augment engineering, not replace it.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="https://github.com/Jay-Suryawansh7"
                  target="_blank"
                  rel="noreferrer"
                  className="                  inline-flex items-center gap-2 rounded-xl btn-primary px-6 py-2.5 text-sm font-medium"
                >
                  <IconGithub className="h-4 w-4" />
                  Follow on GitHub
                </a>
                <a
                  href="https://cogneoverse-lab.web.app"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-theme bg-theme-muted px-6 py-2.5 text-sm font-medium text-theme-secondary transition-all hover:border-theme-hover hover:bg-theme-surface hover:text-theme"
                >
                  Visit Portfolio
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Footer />
        </div>
      </div>
    </>
  )
}
