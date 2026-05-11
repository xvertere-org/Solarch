'use client'

import { Button } from '@/components/ui/button'
import { ExternalLink, GitBranch, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-primary">Torque</Link>
          <div className="flex items-center gap-3">
            <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link href="/docs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
            <Link href="https://github.com/Jay-Suryawansh7/tspoonbase" target="_blank" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              GitHub <ExternalLink className="size-2.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Build AI agents with a <span className="text-primary">visual canvas</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          Torque is a drag-and-drop workflow editor for AI agent pipelines.
          Design complex agents visually with 48 node types, then export them as
          runnable TypeScript — no backend required.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button size="lg" className="gap-2">
              Open Canvas <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="https://github.com/Jay-Suryawansh7/tspoonbase" target="_blank">
            <Button variant="outline" size="lg" className="gap-2">
              <GitBranch className="size-4" /> GitHub
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: '48 Node Types', desc: 'Triggers, AI models, data operations, actions, logic gates, and output handlers — all drag-and-drop.' },
            { title: 'Multi-Handle Wiring', desc: 'Fine-grained connections with labeled ports. LLM nodes expose separate handles for prompt, memory, tools, and response.' },
            { title: 'TypeScript Export', desc: 'Export workflows as self-contained .ts files with an inline executor. Run with npx tsx, bun, or deno.' },
            { title: 'TspoonBase Sync', desc: 'Optionally connect your TspoonBase instance to push workflows directly to your backend for production execution.' },
            { title: 'Dark Theme', desc: 'Built with shadcn/ui and framer-motion. Beautiful dark theme out of the box with smooth animations.' },
            { title: 'No Backend Required', desc: 'Design and export locally. No signup, no server, no API keys needed to start building.' },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
              <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Torque — part of the TspoonBase ecosystem</span>
          <Link href="https://github.com/Jay-Suryawansh7/tspoonbase" target="_blank" className="hover:text-foreground transition-colors">
            GitHub
          </Link>
        </div>
      </footer>
    </div>
  )
}
