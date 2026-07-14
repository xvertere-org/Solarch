import { useState, useEffect } from 'react'
import { api } from '../api/client'

interface LoginProps {
  onLogin: (data: { token: string; admin: any }) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isInstaller, setIsInstaller] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => { checkInstaller() }, [])

  const checkInstaller = async () => {
    try {
      const res = await api.get('/api/installer/check')
      setIsInstaller(!res.installed)
    } catch { setIsInstaller(true) }
    finally { setChecking(false) }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const data = await api.post('/api/admins/auth-with-password', { identity: email, password })
      onLogin(data)
    } catch (err: any) { setError(err.message || 'Login failed') }
    finally { setLoading(false) }
  }

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== passwordConfirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await api.post('/api/installer', { email, password, passwordConfirm })
      const data = await api.post('/api/admins/auth-with-password', { identity: email, password })
      onLogin(data)
    } catch (err: any) { setError(err.message || 'Installation failed') }
    finally { setLoading(false) }
  }

  if (checking) {
    return (
      <div className="login-page">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-orb" />
      <div className="login-card">
        <div className="login-logo">
          <img src="/solarch-logo.png" alt="Solarch" />
          <span>Solarch</span>
        </div>

        {isInstaller ? (
          <>
            <div className="login-title">
              <h1>Welcome to Solarch</h1>
              <p>Create your admin account to get started</p>
            </div>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleInstall}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" required minLength={6} />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Confirm your password" required minLength={6} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '10px 24px', fontSize: 14 }}>
                {loading ? 'Creating Account...' : 'Create Admin Account'}
              </button>
            </form>
            <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              This will create your first superuser account with full admin access.
            </p>
          </>
        ) : (
          <>
            <div className="login-title">
              <h1>Sign In</h1>
              <p>Admin Dashboard</p>
            </div>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;" required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '10px 24px', fontSize: 14 }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
