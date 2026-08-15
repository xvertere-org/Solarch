import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { useAuth } from './hooks/useAuth'

import { Toaster } from '@/components/ui/sonner'

function App() {
  const { admin, isValid, loading, logout } = useAuth()

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  if (!isValid || !admin) {
    return (
      <>
        <Login />
        <Toaster position="bottom-right" theme="dark" />
      </>
    )
  }

  return (
    <BrowserRouter basename="/_/">
      <Layout onLogout={logout} admin={admin}>
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
