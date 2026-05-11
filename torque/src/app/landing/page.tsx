'use client'

import { Button } from '@/components/ui/button'
import { ExternalLink, GitBranch, ArrowRight, Zap, Workflow, Braces, Server, Moon, Unplug } from 'lucide-react'
import Link from 'next/link'

const features = [
  { icon: <Zap className="size-5" />, title: '48 Node Types', desc: 'Triggers, AI models, data operations, actions, logic gates, and output handlers — all drag-and-drop.' },
  { icon: <Workflow className="size-5" />, title: 'Multi-Handle Wiring', desc: 'Fine-grained connections with labeled ports. LLM nodes expose separate handles for prompt, memory, tools, and response.' },
  { icon: <Braces className="size-5" />, title: 'TypeScript Export', desc: 'Export workflows as self-contained .ts files with an inline executor. Run with npx tsx, bun, or deno — no framework required.' },
  { icon: <Server className="size-5" />, title: 'TspoonBase Sync', desc: 'Optionally connect your TspoonBase instance to push workflows directly to your backend for production execution and API endpoints.' },
  { icon: <Moon className="size-5" />, title: 'Dark Theme', desc: 'Built with shadcn/ui and framer-motion. Beautiful dark theme out of the box with smooth spring animations.' },
  { icon: <Unplug className="size-5" />, title: 'No Backend Required', desc: 'Design and export locally. No signup, no server, no API keys needed to start building agents.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/canvas" className="text-sm font-bold text-primary">Torque</Link>
          <div className="flex items-center gap-3">
            <Link href="/landing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="/canvas" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Canvas</Link>
            <Link href="/settings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Settings</Link>
            <Link href="https://github.com/Jay-Suryawansh7/tspoonbase" target="_blank" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              GitHub <ExternalLink className="size-2.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium mb-6">
          <Zap className="size-3" /> Visual AI Agent Builder
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4 leading-tight">
          Build AI agents with a <br />
          <span className="text-primary">visual canvas</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          Torque is a drag-and-drop workflow editor for AI agent pipelines.
          Design complex agents visually with 48 node types, wire them with multi-handle connections,
          then export as runnable TypeScript.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/canvas">
            <Button size="lg" className="gap-2 h-11 px-6">
              Open Canvas <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="https://github.com/Jay-Suryawansh7/tspoonbase" target="_blank">
            <Button variant="outline" size="lg" className="gap-2 h-11 px-6">
              <GitBranch className="size-4" /> GitHub
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-2">Everything you need to build agents</h2>
          <p className="text-sm text-muted-foreground">No backend required. No API keys needed. Just drag, connect, and export.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:bg-primary/15 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="rounded-xl border border-border bg-card p-10">
          <h2 className="text-2xl font-bold mb-3">Start building in seconds</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            No signup required. Open the canvas and start designing your first agent workflow right now.
          </p>
          <Link href="/canvas">
            <Button size="lg" className="gap-2 h-11 px-8">
              Open Canvas <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Torque — part of the TspoonBase ecosystem</span>
          <div className="flex items-center gap-4">
            <Link href="/canvas" className="hover:text-foreground transition-colors">Canvas</Link>
            <Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link>
            <Link href="https://github.com/Jay-Suryawansh7/tspoonbase" target="_blank" className="hover:text-foreground transition-colors">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
