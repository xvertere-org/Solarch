import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Shield } from 'lucide-react'
import Footer from '../components/Footer'

const sections = [
  {
    title: '1. Information We Collect',
    content: 'Solarch is self-hosted software — we do not collect, store, or process any data on our servers. When you self-host Solarch, all data (including user accounts, records, files, and logs) stays entirely on your own infrastructure.\n\nIf you visit the documentation site or landing page, we may collect standard web analytics data (page views, browser type, referring site) to improve the experience.',
  },
  {
    title: '2. How We Use Information',
    content: 'Any analytics data collected is used solely to understand usage patterns and improve the project. We do not sell, rent, or share personal information with third parties.',
  },
  {
    title: '3. Data Storage & Security',
    content: 'When self-hosted, you are responsible for securing your own deployment. Solarch includes built-in security features — encryption at rest (SQLite), JWT-based authentication, rate limiting, and CORS controls — to help you protect your data.',
  },
  {
    title: '4. Cookies',
    content: 'The documentation site may use essential cookies for functionality (e.g., theme preferences). No tracking cookies are used.',
  },
  {
    title: '5. Third-Party Services',
    content: 'Solarch integrates with optional third-party services you explicitly configure: S3-compatible storage, SMTP email providers, and AI providers (OpenAI, Anthropic, Ollama). Data sent through these services is governed by their respective privacy policies.',
  },
  {
    title: '6. Open Source',
    content: 'Solarch is open source under the Apache-2.0 license. You can audit the code at any time on GitHub to verify our privacy commitments.',
  },
  {
    title: '7. Contact',
    content: 'If you have questions about this privacy policy, reach out via GitHub Discussions or open an issue on the repository.',
  },
]

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — Solarch</title>
        <meta name="description" content="Privacy Policy for Solarch — your data stays on your infrastructure." />
      </Helmet>

      <div className="min-h-screen bg-theme-body pt-14">
        <section className="relative overflow-hidden border-b border-theme">
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute -left-20 top-40 h-64 w-64 rounded-full bg-brand-cyan blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-theme bg-theme-muted px-3 py-1 text-xs font-medium text-theme-secondary">
                <Shield className="h-3 w-3 text-primary" />
                Your Data Matters
              </span>
              <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-theme sm:text-5xl">
                Privacy Policy
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-base text-theme-tertiary">
                Last updated: May 1, 2026
              </p>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-theme bg-theme-surface p-8 sm:p-12">
            {sections.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <h2 className="font-heading text-lg font-semibold text-theme mt-8 first:mt-0 mb-2">
                  {s.title}
                </h2>
                {s.content.split('\n\n').map((p, j) => (
                  <p key={j} className="text-sm text-theme-tertiary leading-relaxed mb-3 last:mb-0">
                    {p}
                  </p>
                ))}
              </motion.div>
            ))}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Footer />
        </div>
      </div>
    </>
  )
}
