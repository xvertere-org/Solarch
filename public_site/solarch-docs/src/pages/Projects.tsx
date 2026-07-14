import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Construction } from 'lucide-react'
import Footer from '../components/Footer'

export default function Projects() {
  return (
    <>
      <Helmet>
        <title>Projects — Solarch</title>
        <meta
          name="description"
          content="Real-world projects built with Solarch — coming soon."
        />
      </Helmet>

      <div className="min-h-screen bg-theme-body pt-14">
        <section className="relative overflow-hidden border-b border-theme">
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary blur-3xl" />
            <div className="absolute -left-20 top-40 h-64 w-64 rounded-full bg-accent blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h1 className="font-heading text-4xl font-bold tracking-tight text-theme sm:text-5xl">
                Built with Solarch
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-theme-tertiary">
                Real-world projects stress-testing every capability — auth, realtime, AI, vector
                search, file storage, and more.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-theme bg-theme-surface p-16 text-center"
          >
            <Construction className="mx-auto h-12 w-12 text-theme-muted mb-4" />
            <h2 className="font-heading text-2xl font-semibold text-theme mb-2">Coming Soon</h2>
            <p className="text-theme-tertiary text-sm max-w-md mx-auto">
              We're curating real-world projects built with Solarch. Check back soon for guides, tutorials, and open-source examples.
            </p>
          </motion.div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Footer />
        </div>
      </div>
    </>
  )
}
