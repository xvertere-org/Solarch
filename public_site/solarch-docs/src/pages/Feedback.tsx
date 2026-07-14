import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { MessageSquareText, Send, CheckCircle } from 'lucide-react'
import Footer from '../components/Footer'
import { useState } from 'react'

export default function Feedback() {
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const name = data.get('name') || 'Anonymous'
    const project = data.get('project') || ''
    const message = data.get('message') || ''
    const rating = data.get('rating') || '5'

    const body = `Feedback from ${name}\nProject: ${project}\nRating: ${rating}/5\n\n${message}`
    window.open(
      `https://github.com/Jay-Suryawansh7/solarch/issues/new?title=Feedback: ${project}&body=${encodeURIComponent(body)}`,
      '_blank'
    )
    setSent(true)
  }

  return (
    <>
      <Helmet>
        <title>Feedback — Solarch</title>
        <meta name="description" content="Share your feedback or report about building with Solarch." />
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
                <MessageSquareText className="h-3 w-3 text-primary" />
                We value your input
              </span>
              <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-theme sm:text-5xl">
                Share Your Feedback
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-lg text-theme-tertiary">
                Built something with Solarch? Tell us about your experience, report a bug, or suggest an improvement.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          {sent ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl border border-theme bg-theme-surface p-12 text-center"
            >
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h2 className="font-heading text-xl font-semibold text-theme mb-2">Thank you!</h2>
              <p className="text-theme-tertiary text-sm">
                Your feedback has been submitted. We appreciate your help making Solarch better.
              </p>
            </motion.div>
          ) : (
            <motion.form
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              onSubmit={handleSubmit}
              className="rounded-2xl border border-theme bg-theme-surface p-8 sm:p-12 space-y-6"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-theme-secondary mb-1.5">
                  Your Name <span className="text-theme-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Jane Doe"
                  className="w-full rounded-xl border border-theme bg-theme-muted px-4 py-2.5 text-sm text-theme placeholder:text-theme-muted outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="project" className="block text-sm font-medium text-theme-secondary mb-1.5">
                  Project Name <span className="text-theme-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  id="project"
                  name="project"
                  placeholder="My Awesome App"
                  className="w-full rounded-xl border border-theme bg-theme-muted px-4 py-2.5 text-sm text-theme placeholder:text-theme-muted outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="rating" className="block text-sm font-medium text-theme-secondary mb-1.5">
                  How would you rate your experience?
                </label>
                <select
                  id="rating"
                  name="rating"
                  className="w-full rounded-xl border border-theme bg-theme-muted px-4 py-2.5 text-sm text-theme outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="5">5 — Excellent</option>
                  <option value="4">4 — Good</option>
                  <option value="3">3 — Average</option>
                  <option value="2">2 — Below Average</option>
                  <option value="1">1 — Poor</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-theme-secondary mb-1.5">
                  Your Feedback <span className="text-theme-muted">(required)</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  placeholder="Tell us what you built, what worked well, or what could be improved..."
                  className="w-full rounded-xl border border-theme bg-theme-muted px-4 py-2.5 text-sm text-theme placeholder:text-theme-muted outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary resize-y"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110"
              >
                <Send className="h-4 w-4" />
                Submit Feedback
              </button>

              <p className="text-xs text-theme-muted pt-2">
                Your feedback will be submitted as a GitHub issue. A GitHub account is required.
              </p>
            </motion.form>
          )}
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Footer />
        </div>
      </div>
    </>
  )
}
