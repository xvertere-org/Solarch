import { useState, useRef, useEffect } from 'react'
import { adminApi } from '../lib/admin-api'
import { Send, Bot, User, Sparkles, Plus, Trash2, X } from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

const DEFAULT_MESSAGES: Message[] = [
  {
    role: 'assistant',
    content:
      'Hello! I am your Solarch AI assistant. I can help you generate collections, write access rules, create seed data, and answer questions about your database.',
  },
]

export default function AIAssistant() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ai-chat-sessions") || "[]")
    } catch {
      return []
    }
  })

  const [currentChatId, setCurrentChatId] = useState("")
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const currentChat = sessions.find(chat => chat.id === currentChatId)
  const currentMessages = currentChat?.messages ?? DEFAULT_MESSAGES

  useEffect(() => {
    if (sessions.length === 0) {
      const firstChat: ChatSession = {
        id: crypto.randomUUID(),
        title: "New Chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: DEFAULT_MESSAGES,
      }

      setSessions([firstChat])
      setCurrentChatId(firstChat.id)
      return
    }

    if (!currentChatId) {
      setCurrentChatId(sessions[0].id)
    }
  }, [sessions, currentChatId])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem("ai-chat-sessions", JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")

    if (currentChat) {
      updateCurrentChat(chat => ({
        ...chat,
        updatedAt: Date.now(),
        title: chat.title === "New Chat" ? userMessage.substring(0, 30) : chat.title,
        messages: [
          ...chat.messages,
          { role: "user" as const, content: userMessage },
        ].slice(-100),
      }))
    }

    setLoading(true)

    try {
      const data = await adminApi.ai.chat(userMessage)
      if (currentChat) {
        updateCurrentChat(chat => ({
          ...chat,
          updatedAt: Date.now(),
          messages: [
            ...chat.messages,
            { role: "assistant" as const, content: data.reply || "No response" },
          ].slice(-100),
        }))
      }
    } catch (err: any) {
      if (currentChat) {
        updateCurrentChat(chat => ({
          ...chat,
          updatedAt: Date.now(),
          messages: [
            ...chat.messages,
            { role: "assistant" as const, content: `Error: ${err.message}` },
          ].slice(-100),
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  function createNewChat() {
    const chat: ChatSession = {
      id: crypto.randomUUID(),
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: DEFAULT_MESSAGES
    }
    setSessions((prev: ChatSession[]) => [chat, ...prev])
    setCurrentChatId(chat.id)
  }

  function deleteChat(id: string) {
    const updated = sessions.filter(chat => chat.id !== id)
    setSessions(updated)
    if (updated.length) {
      setCurrentChatId(updated[0].id)
    } else {
      createNewChat()
    }
  }

  function confirmClearAllChats() {
    localStorage.removeItem("ai-chat-sessions")
    const chat: ChatSession = {
      id: crypto.randomUUID(),
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: DEFAULT_MESSAGES,
    }
    setSessions([chat])
    setCurrentChatId(chat.id)
    setShowClearConfirm(false)
    toast.success('AI chat history cleared')
  }

  function updateCurrentChat(updater: (chat: ChatSession) => ChatSession) {
    setSessions(prev =>
      prev.map(chat => chat.id === currentChatId ? updater(chat) : chat)
    )
  }

  function quickAction(text: string) { setInput(text) }

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-6rem)]">
      <PageHeader
        title="AI Assistant"
        description="Interact with Solarch's AI assistant to write schema rules and generate data."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={createNewChat}>
              <Plus size={14} /> New Chat
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowClearConfirm(true)}>
              <Trash2 size={14} /> Clear All
            </Button>
          </div>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[...sessions]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(chat => (
            <div key={chat.id} className="flex items-center gap-1 shrink-0">
              <Button
                variant={chat.id === currentChatId ? "default" : "secondary"}
                size="sm"
                onClick={() => setCurrentChatId(chat.id)}
                className="max-w-[160px] truncate"
              >
                {chat.title}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--error)]"
                onClick={() => deleteChat(chat.id)}
                aria-label={`Delete chat session ${chat.title}`}
              >
                <X size={14} />
              </Button>
            </div>
          ))}
      </div>

      <div className="flex gap-2 overflow-x-auto py-1">
        {['Generate a blog collection', 'Write owner-only update rule', 'Seed 10 test users'].map(text => (
          <Button
            key={text}
            variant="outline"
            size="sm"
            className="text-xs bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--bg-border)] hover:text-white"
            onClick={() => quickAction(text)}
          >
            <Sparkles size={12} className="mr-1 text-[var(--cyan-spark)]" /> {text}
          </Button>
        ))}
      </div>

      <Card className="flex-1 bg-[var(--bg-surface)] border-[var(--bg-border)] flex flex-col overflow-hidden">
        <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
          {currentMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-[var(--blue-core)]/20 border border-[var(--blue-core)]/30 flex items-center justify-center text-[var(--blue-bright)] shrink-0">
                  <Bot size={16} />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[var(--blue-core)] text-white font-medium rounded-tr-none'
                    : 'bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--text-primary)] rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--bg-border)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] p-2">
              <Spinner className="w-4 h-4 text-[var(--blue-core)]" /> Solarch AI is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="p-4 border-t border-[var(--bg-border)] bg-[var(--bg-surface)]">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me anything about your Solarch database..."
              className="flex-1 bg-[var(--bg-elevated)] border-[var(--bg-border)]"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send size={16} />
            </Button>
          </form>
        </div>
      </Card>

      {/* Clear History AlertDialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-primary)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Clear AI Conversations</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to delete all AI chat history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowClearConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearAllChats}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
              Clear All Conversations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
