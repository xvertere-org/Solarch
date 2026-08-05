import { useState, useRef, useEffect } from 'react'
import { api } from '../api/client'
import { Send, Bot, User, Sparkles } from 'lucide-react'

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
      'Hello! I am your Solarch AI assistant. I can help you generate collections, write access rules, create seed data, and answer questions about your database',
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
  const currentChat =
    sessions.find(chat => chat.id === currentChatId)
  const currentMessages =
    currentChat?.messages ?? DEFAULT_MESSAGES;
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

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save all chat sessions
  useEffect(() => {
    localStorage.setItem(
      "ai-chat-sessions",
      JSON.stringify(sessions)
    );
  }, [sessions]);

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
        title:
          chat.title === "New Chat"
            ? userMessage.substring(0, 30)
            : chat.title,
        messages: [
          ...chat.messages,
          {
            role: "user" as const,
            content: userMessage,
          },
        ].slice(-100),
      }))
    }


    setLoading(true)

    try {
      const data = await api.post("/api/ai/chat", {
        message: userMessage,
      })

      if (currentChat) {
        updateCurrentChat(chat => ({
          ...chat,
          updatedAt: Date.now(),
          messages: [
            ...chat.messages,
            {
              role: "assistant" as const,
              content: data.reply || "No response",
            },
          ].slice(-100),
        }))
      } else {
        console.warn("No active chat")
      }
    } catch (err: any) {
      if (currentChat) {
        updateCurrentChat(chat => ({
          ...chat,
          updatedAt: Date.now(),
          messages: [
            ...chat.messages,
            {
              role: "assistant" as const,
              content: `Error: ${err.message}`,
            },
          ].slice(-100),
        }))
      } else {
        console.error(err)
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

    const updated = sessions.filter(
      chat => chat.id !== id
    )

    setSessions(updated)

    if (updated.length) {

      setCurrentChatId(updated[0].id)

    } else {

      createNewChat()

    }

  }
  function clearAllChats() {

    const ok = window.confirm(
      "Delete all AI conversations?"
    )

    if (!ok) return

    localStorage.removeItem(
      "ai-chat-sessions"
    )

    const chat: ChatSession = {
      id: crypto.randomUUID(),
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: DEFAULT_MESSAGES,
    }

    setSessions([chat])

    setCurrentChatId(chat.id)

  }
  function updateCurrentChat(
    updater: (chat: ChatSession) => ChatSession
  ) {
    setSessions(prev =>
      prev.map(chat =>
        chat.id === currentChatId
          ? updater(chat)
          : chat
      )
    )
  }


  function quickAction(text: string) { setInput(text) }

  return (
    <div className="chat-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12

        }}
      >

        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: 0
          }}
        >

          <Sparkles
            size={18}
            style={{
              color: "var(--blue-bright)"
            }}
          />

          AI Assistant

        </h2>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={createNewChat}
          >
            + New Chat
          </button>

          <button
            className="btn btn-danger btn-sm"
            onClick={clearAllChats}
          >
            Clear All
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          marginBottom: 12
        }}
      >

        {

          [...sessions]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(chat => (

              <div
                key={chat.id}
                style={{
                  display: "flex",
                  gap: 4
                }}
              >

                <button

                  className={
                    chat.id === currentChatId
                      ?

                      "btn btn-primary btn-sm"

                      :

                      "btn btn-secondary btn-sm"

                  }

                  onClick={() =>

                    setCurrentChatId(chat.id)

                  }

                >

                  {

                    chat.title

                  }

                </button>

                <button

                  className="btn btn-danger btn-sm"

                  onClick={() =>

                    deleteChat(chat.id)

                  }

                >

                  ×

                </button>

              </div>
            ))
        }
      </div>
      <div className="quick-actions">
        {['Generate a blog collection', 'Write owner-only update rule', 'Seed 10 test users'].map(text => (
          <button key={text} className="btn btn-ghost btn-sm" onClick={() => quickAction(text)}>{text}</button>
        ))}
      </div>

      <div className="chat-messages">
        {currentMessages.map((msg, i) => (
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
