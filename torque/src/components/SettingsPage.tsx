'use client'

import { useState } from 'react'
import { useTspoonbaseStore } from '@/lib/tspoonbase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Link2, Link2Off, AlertCircle, CheckCircle2, Loader2, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { connection, connect, disconnect, clearError } = useTspoonbaseStore()
  const [url, setUrl] = useState(connection.url || 'http://localhost:8090')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showForm, setShowForm] = useState(!connection.connected)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    await connect(url, email, password)
    if (useTspoonbaseStore.getState().connection.connected) {
      setShowForm(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon-xs">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>TspoonBase Connection</CardTitle>
              {connection.connected && (
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
                  <CheckCircle2 className="size-2.5 mr-1" /> Connected
                </Badge>
              )}
            </div>
            <CardDescription>
              Connect to your TspoonBase instance to push workflows directly.
              Torque runs standalone — this is optional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connection.connected && !showForm ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-green-400" />
                  <span>Connected to <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">{connection.url}</code></span>
                </div>
                {connection.user && (
                  <p className="text-xs text-muted-foreground">
                    Authenticated as {connection.user.email}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { disconnect(); setShowForm(true) }}>
                    <Link2Off className="size-3 mr-1.5" /> Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Server URL</label>
                  <Input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="http://localhost:8090"
                    disabled={connection.connecting}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Superuser Email</label>
                  <Input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    disabled={connection.connecting}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={connection.connecting}
                    className="h-8 text-xs"
                  />
                </div>

                {connection.error && (
                  <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
                    <AlertCircle className="size-3.5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-300">{connection.error}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button type="submit" disabled={connection.connecting || !url || !email || !password} size="sm">
                    {connection.connecting ? (
                      <><Loader2 className="size-3 mr-1.5 animate-spin" /> Connecting...</>
                    ) : (
                      <><Link2 className="size-3 mr-1.5" /> Connect</>
                    )}
                  </Button>
                  {connection.connected && (
                    <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground/60 pt-2">
                  Need TspoonBase? <a href="https://github.com/Jay-Suryawansh7/tspoonbase" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View on GitHub <ExternalLink className="size-2.5 inline" /></a>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
