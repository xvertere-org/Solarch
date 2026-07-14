import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Footer from '../components/Footer'

const faqs = [
  {
    q: 'What is Solarch?',
    a: 'Solarch is an open-source Backend-as-a-Service (BaaS) written in TypeScript. It provides SQLite, Express, WebSocket, authentication, file storage, AI tools, vector search, and an admin UI — all in a single npm package. No Docker, no microservices, no YAML.',
  },
  {
    q: 'How is this different from PocketBase?',
    a: 'While inspired by PocketBase, Solarch is built entirely in TypeScript with a Node.js runtime. This means you get native npm ecosystem access, TypeScript-first DX, easy customization through code, and no Go dependency. It also includes built-in AI tools, MFA/TOTP, and S3-compatible storage.',
  },
  {
    q: 'Do I need Docker or a database?',
    a: 'No. Solarch uses SQLite as its embedded database, so there\'s zero infrastructure to manage. Just run <code class="rounded bg-theme-surface px-1.5 py-0.5 text-sm text-brand-cyan font-mono">npx solarch serve</code> and you\'re running. For production, you can optionally connect S3 for file storage and configure SMTP for emails.',
  },
  {
    q: 'Can I use Solarch in production?',
    a: 'Absolutely. Solarch is designed for production use with built-in security features including Helmet, rate limiting, CORS configuration, JWT-based auth, SQL injection protection, and MFA/TOTP support.',
  },
  {
    q: 'How do I deploy Solarch?',
    a: 'Deploy it anywhere Node.js runs — VPS, Railway, Fly.io, Render, or your own server. Since it\'s a single process with SQLite, deployment is straightforward. For horizontal scaling, you can configure read replicas and S3 for file storage.',
  },
  {
    q: 'Is there a hosted/cloud version?',
    a: 'Not yet. Solarch is self-hosted and open source (Apache-2.0). You own your data completely. A cloud-hosted option is on the roadmap.',
  },
  {
    q: 'What AI providers are supported?',
    a: 'Solarch supports OpenAI, Anthropic, and Ollama for AI features including schema generation, rule generation, data seeding, and an interactive chat assistant.',
  },
  {
    q: 'How do I contribute?',
    a: 'Check out the <a href="https://github.com/Jay-Suryawansh7/solarch/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" class="text-primary underline transition-colors hover:text-brand-cyan">contributing guide</a> on GitHub. We welcome issues, pull requests, and discussions.',
  },
]

function FaqItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="border-b border-theme"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left text-base font-medium text-theme transition-colors hover:text-primary"
      >
        <span>{faq.q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-theme-muted transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-96 pb-5' : 'max-h-0'
        }`}
      >
        <p
          className="text-sm text-theme-tertiary leading-relaxed"
          dangerouslySetInnerHTML={{ __html: faq.a }}
        />
      </div>
    </motion.div>
  )
}

export default function FAQ() {
  return (
    <>
      <Helmet>
        <title>FAQ — Solarch</title>
        <meta name="description" content="Frequently asked questions about Solarch — the TypeScript backend-as-a-service." />
      </Helmet>

      <div className="min-h-screen bg-theme-body pt-14">
        <section className="relative overflow-hidden border-b border-theme">
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-theme bg-theme-muted px-3 py-1 text-xs font-medium text-theme-secondary">
                Got questions?
              </span>
              <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-theme sm:text-5xl">
                Frequently Asked Questions
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-lg text-theme-tertiary">
                Everything you need to know about Solarch.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          {faqs.map((faq, i) => (
            <FaqItem key={i} faq={faq} index={i} />
          ))}
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Footer />
        </div>
      </div>
    </>
  )
}
