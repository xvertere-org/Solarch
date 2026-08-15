import { useState, useEffect } from 'react'
import { solarch } from '../lib/solarch'
import { adminApi } from '../lib/admin-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { SolarchLogo } from '@/components/SolarchLogo'

export default function Login() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('Password123!')
  const [passwordConfirm, setPasswordConfirm] = useState('Password123!')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isInstaller, setIsInstaller] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => { checkInstaller() }, [])

  const checkInstaller = async () => {
    try {
      const res = await adminApi.installer.check()
      setIsInstaller(!res.installed)
    } catch { setIsInstaller(true) }
    finally { setChecking(false) }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await solarch.admins.authWithPassword(email, password)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== passwordConfirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await adminApi.installer.install({ email, password, passwordConfirm })
      await solarch.admins.authWithPassword(email, password)
    } catch (err: any) {
      setError(err.message || 'Installation failed')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-void)]">
        <Spinner className="w-8 h-8 text-[var(--blue-core)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-void)] relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[var(--blue-core)]/10 rounded-full blur-3xl pointer-events-none" />
      <Card className="w-full max-w-md bg-[var(--bg-surface)]/90 border-[var(--bg-border)] backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <SolarchLogo className="w-10 h-10" />
            <span className="text-2xl font-bold font-display tracking-tight text-[var(--text-primary)]">Solarch</span>
          </div>
          <CardTitle className="text-2xl font-bold font-display">
            {isInstaller ? 'Welcome to Solarch' : 'Sign In'}
          </CardTitle>
          <CardDescription>
            {isInstaller ? 'Create your superuser account to get started' : 'Admin Dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-xs font-medium">
              {error}
            </div>
          )}

          {isInstaller ? (
            <form onSubmit={handleInstall} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirm Password</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Admin Account'}
              </Button>
              <p className="text-xs text-[var(--text-muted)] text-center pt-2">
                This will create your first superuser account with full admin access.
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
