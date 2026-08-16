import { useState, useEffect, useRef } from 'react'
import { solarch } from '@/lib/solarch'
import { adminApi } from '@/lib/admin-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Eye,
  EyeOff,
  AlertCircle,
  User,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
} from 'lucide-react'
import { SolarchLogo } from '@/components/SolarchLogo'
import { cn } from '@/lib/utils'

interface LoginProps {
  onLogin?: (data: { token: string; admin: any }) => void
}

export default function Login({ onLogin }: LoginProps) {
  // Form input state
  const [identifier, setIdentifier] = useState('admin@example.com')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // UI state
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isInstaller, setIsInstaller] = useState(false)
  const [checking, setChecking] = useState(true)

  // Submitting guard ref to prevent duplicate concurrent submissions
  const isSubmittingRef = useRef(false)

  // Check if system requires initial superuser installation
  useEffect(() => {
    async function checkInstallation() {
      try {
        const res = await adminApi.installer.check()
        setIsInstaller(!res.installed)
      } catch (err: any) {
        console.error('Installer check error:', err)
        // If check fails with error, assume already installed or network issue
      } finally {
        setChecking(false)
      }
    }
    checkInstallation()
  }, [])

  // Handle standard superuser login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current || loading) return

    const trimmedIdentity = identifier.trim()
    if (!trimmedIdentity || !password) {
      setError('Please provide both username/email and password.')
      return
    }

    try {
      isSubmittingRef.current = true
      setLoading(true)
      setError(null)
      setIsRateLimited(false)

      const authData = await solarch.admins.authWithPassword(trimmedIdentity, password)

      if (onLogin && authData) {
        onLogin({ token: authData.token, admin: authData.admin })
      }
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.status === 429 || err.code === 429) {
        setIsRateLimited(true)
        setError('Too many failed attempts. Account temporarily locked. Please try again later.')
      } else {
        setError(err.message || 'Invalid username/email or password.')
      }
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }

  // Handle first-time superuser installation
  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current || loading) return

    const trimmedIdentity = identifier.trim()
    if (!trimmedIdentity || !password || !passwordConfirm) {
      setError('All fields are required.')
      return
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      isSubmittingRef.current = true
      setLoading(true)
      setError(null)

      await adminApi.installer.install({
        email: trimmedIdentity,
        username: trimmedIdentity,
        password,
        passwordConfirm,
      })

      // Automatically sign in the new superuser
      const authData = await solarch.admins.authWithPassword(trimmedIdentity, password)

      if (onLogin && authData) {
        onLogin({ token: authData.token, admin: authData.admin })
      }
    } catch (err: any) {
      console.error('Installer error:', err)
      setError(err.message || 'Failed to complete initial superuser setup.')
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-bg-void flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <SolarchLogo size={36} />
          <Spinner className="w-5 h-5 text-brand-primary" />
          <span className="text-xs text-text-muted font-mono">Initializing Solarch Admin...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-void flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[380px] space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2.5">
            <SolarchLogo size={32} />
            <span className="font-display font-bold text-2xl text-text-primary tracking-tight">
              Solarch
            </span>
          </div>
          <p className="text-xs text-text-secondary font-medium">
            {isInstaller ? 'Initial Platform Setup' : 'Admin Control Panel'}
          </p>
        </div>

        {/* Authentication Card */}
        <Card className="border border-border/70 bg-card rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-border/50 text-left">
            <CardTitle className="text-sm font-semibold font-display text-text-primary">
              {isInstaller ? 'Create Superuser Account' : 'Sign in to Dashboard'}
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary mt-1">
              {isInstaller
                ? 'Create the primary administrator credentials to initialize your database.'
                : 'Enter your administrator credentials to manage schemas and records.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-5">
            {/* Error / Rate Limit Alert */}
            {error && (
              <div
                role="alert"
                className={cn(
                  'mb-4 p-3 rounded-lg flex items-start gap-2.5 text-xs animate-in fade-in-0 duration-200',
                  isRateLimited
                    ? 'bg-status-danger/15 border border-status-danger/30 text-status-danger'
                    : 'bg-status-danger/10 border border-status-danger/25 text-status-danger'
                )}
              >
                {isRateLimited ? (
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {isInstaller ? (
              /* First-Time Setup Form */
              <form onSubmit={handleInstall} className="space-y-3.5" noValidate>
                {/* Username / Email Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="installer-identity" className="text-xs font-medium text-text-secondary">
                    Admin Email / Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
                    <Input
                      id="installer-identity"
                      name="identity"
                      type="text"
                      autoComplete="username"
                      autoFocus
                      required
                      disabled={loading}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin@example.com"
                      className="pl-9 h-9 text-xs"
                      aria-invalid={Boolean(error)}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="installer-password" className="text-xs font-medium text-text-secondary">
                    Superuser Password
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
                    <Input
                      id="installer-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="pl-9 pr-10 h-9 text-xs"
                      aria-invalid={Boolean(error)}
                    />
                    <button
                      type="button"
                      tabIndex={0}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-2.5 p-0.5 rounded text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="installer-confirm" className="text-xs font-medium text-text-secondary">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
                    <Input
                      id="installer-confirm"
                      name="passwordConfirm"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      disabled={loading}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Confirm your password"
                      className="pl-9 pr-10 h-9 text-xs"
                      aria-invalid={Boolean(error)}
                    />
                    <button
                      type="button"
                      tabIndex={0}
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      aria-label={showPasswordConfirm ? 'Hide confirmed password' : 'Show confirmed password'}
                      className="absolute right-2.5 top-2.5 p-0.5 rounded text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    >
                      {showPasswordConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <Button
                  type="submit"
                  variant="default"
                  disabled={loading}
                  className="w-full h-9 text-xs font-semibold mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="w-3.5 h-3.5" /> Initializing Superuser...
                    </span>
                  ) : (
                    'Create Superuser Account'
                  )}
                </Button>
              </form>
            ) : (
              /* Standard Admin Sign-In Form */
              <form onSubmit={handleLogin} className="space-y-3.5" noValidate>
                {/* Identifier Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin-identity" className="text-xs font-medium text-text-secondary">
                    Username or Email
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
                    <Input
                      id="admin-identity"
                      name="identity"
                      type="text"
                      autoComplete="username"
                      autoFocus
                      required
                      disabled={loading}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin@example.com"
                      className="pl-9 h-9 text-xs"
                      aria-invalid={Boolean(error)}
                    />
                  </div>
                </div>

                {/* Password Input with Visibility Toggle */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin-password" className="text-xs font-medium text-text-secondary">
                    Password
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
                    <Input
                      id="admin-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-9 pr-10 h-9 text-xs"
                      aria-invalid={Boolean(error)}
                    />
                    <button
                      type="button"
                      tabIndex={0}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-2.5 p-0.5 rounded text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <Button
                  type="submit"
                  variant="default"
                  disabled={loading}
                  className="w-full h-9 text-xs font-semibold mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="w-3.5 h-3.5" /> Signing In...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Security Context Footer */}
        <div className="flex items-center justify-center gap-2 text-center text-[11px] text-text-muted">
          <ShieldCheck size={13} className="text-brand-primary" />
          <span>Protected by Solarch administrator authentication & rate limiting.</span>
        </div>
      </div>
    </div>
  )
}
