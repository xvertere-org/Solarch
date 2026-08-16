import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

type Listener = (toasts: ToastMessage[]) => void

// Singleton state
let toasts: ToastMessage[] = []
const listeners: Set<Listener> = new Set()

function emit() {
  listeners.forEach(l => l([...toasts]))
}

export function toast(type: ToastType, message: string) {
  const id = Math.random().toString(36).substring(2, 9)
  toasts = [...toasts, { id, type, message }]
  emit()
  
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    emit()
  }, 4000)
}

export function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id)
  emit()
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    setCurrentToasts(toasts)
    const listener = (t: ToastMessage[]) => setCurrentToasts(t)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  if (currentToasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none" aria-live="polite">
      {currentToasts.map(t => (
        <div 
          key={t.id} 
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-md shadow-lg border border-border animate-in slide-in-from-bottom-5 fade-in duration-200 bg-bg-surface
            ${t.type === 'success' ? 'border-status-success/30' : ''}
            ${t.type === 'error' ? 'border-status-danger/30' : ''}
            ${t.type === 'warning' ? 'border-status-warning/30' : ''}
          `}
        >
          <div className="shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle2 className="text-status-success" size={18} />}
            {t.type === 'error' && <XCircle className="text-status-danger" size={18} />}
            {t.type === 'warning' && <AlertCircle className="text-status-warning" size={18} />}
          </div>
          <p className="flex-1 font-sans text-xs text-text-primary m-0 pr-2">{t.message}</p>
          <button 
            onClick={() => removeToast(t.id)}
            className="shrink-0 p-1 -m-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
