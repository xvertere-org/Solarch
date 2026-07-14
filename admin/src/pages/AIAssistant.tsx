import { useState, useRef, useEffect } from 'react'
import { api } from '../api/client'
import { Send, Bot, User, Sparkles } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Solarch AI assistant. I can help you generate collections, write access rules, create seed data, and answer questions about your database.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    try {
      const data = await api.post('/api/ai/chat', { message: userMessage })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'No response' }])
    } catch (err: any) { setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]) }
    finally { setLoading(false) }
  }

  function quickAction(text: string) { setInput(text) }

  return (
    <div className="chat-container">
      <h2 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={18} style={{ color: 'var(--blue-bright)' }} /> AI Assistant
      </h2>

      <div className="quick-actions">
        {['Generate a blog collection', 'Write owner-only update rule', 'Seed 10 test users'].map(text => (
          <button key={text} className="btn btn-ghost btn-sm" onClick={() => quickAction(text)}>{text}</button>
        ))}
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            <div className={`chat-avatar ${msg.role}`}>
              {msg.role === 'user' ? <User size={15} color="#fff" /> : <Bot size={15} />}
            </div>
            <div className={`chat-content ${msg.role}`}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>
            <span className="spinner" /> Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-row">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask me anything..." />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
