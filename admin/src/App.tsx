import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Collections from './pages/Collections'
import CollectionDetail from './pages/CollectionDetail'
import Records from './pages/Records'
import RecordDetail from './pages/RecordDetail'
import Settings from './pages/Settings'
import Logs from './pages/Logs'
import Backups from './pages/Backups'
import AIAssistant from './pages/AIAssistant'
import { api } from './api/client'

import { Toaster } from '@/components/ui/sonner'

function App() {
  const [auth, setAuth] = useState<{ token: string; admin: any } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('tb_admin_auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        api.setToken(parsed.token)
        setAuth(parsed)
      } catch {
        localStorage.removeItem('tb_admin_auth')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (data: { token: string; admin: any }) => {
    localStorage.setItem('tb_admin_auth', JSON.stringify(data))
    api.setToken(data.token)
    setAuth(data)
  }

  const handleLogout = () => {
    localStorage.removeItem('tb_admin_auth')
    api.setToken('')
    setAuth(null)
  }

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  if (!auth) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="bottom-right" theme="dark" />
      </>
    )
  }

  return (
    <BrowserRouter basename="/_/">
      <Layout onLogout={handleLogout} admin={auth.admin}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
          <Route path="/records/:collectionId" element={<Records />} />
          <Route path="/records/:collectionId/:recordId" element={<RecordDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/backups" element={<Backups />} />
          <Route path="/ai" element={<AIAssistant />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toaster position="bottom-right" theme="dark" />
    </BrowserRouter>
  )
}

export default App
