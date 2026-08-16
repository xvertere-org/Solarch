import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, AISettings } from '@/lib/admin-api'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Code2,
  Database,
  Shield,
  Layers,
} from 'lucide-react'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isError?: boolean
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
}

const STORAGE_KEY = 'solarch_ai_sessions'

export default function AIAssistant() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions.length > 0 ? sessions[0].id : 'default'
  })

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [aiConfig, setAiConfig] = useState<AISettings | null>(null)
  const [checkingConfig, setCheckingConfig] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch current AI settings to verify availability
  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await adminApi.settings.get()
        setAiConfig(settings.ai || { enabled: false, provider: 'none', apiKey: '', model: '', baseURL: '', temperature: 0.7, maxTokens: 2000 })
      } catch (err: any) {
        console.error('Failed to load AI settings:', err)
      } finally {
        setCheckingConfig(false)
      }
    }
    loadSettings()
  }, [])

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    } catch (e) {
      console.error('Failed to persist AI sessions:', e)
    }
  }, [sessions])

  // Get active session messages
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || null
  }, [sessions, activeSessionId])

  const currentMessages = useMemo(() => {
    return activeSession?.messages || []
  }, [activeSession])

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [input])

  const createNewSession = useCallback(() => {
    const newId = `session_${Date.now()}`
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
    }
    setSessions((prev) => [newSession, ...prev])
    setActiveSessionId(newId)
    setInput('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0 && !checkingConfig) {
      createNewSession()
    }
  }, [sessions.length, checkingConfig, createNewSession])

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim()
    if (!messageContent || loading) return

    if (!aiConfig?.enabled) {
      toast.error('AI assistant is not configured. Please enable it in Settings.')
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    }

    // Build the updated messages list
    const updatedMessages = [...currentMessages, userMessage]

    // Update session title on first message
    let updatedTitle = activeSession?.title
    if (currentMessages.length === 0) {
      updatedTitle = messageContent.length > 28 ? `${messageContent.substring(0, 28)}...` : messageContent
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: updatedTitle || s.title,
              messages: updatedMessages,
            }
          : s
      )
    )

    setInput('')
    setLoading(true)

    try {
      // Build conversation payload for backend
      const historyPayload = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await adminApi.ai.chat(historyPayload)

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.reply || 'No response generated.',
        timestamp: new Date().toISOString(),
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [...s.messages, assistantMessage],
              }
            : s
        )
      )
    } catch (err: any) {
      console.error('AI Chat Error:', err)
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to communicate with AI provider.'}`,
        timestamp: new Date().toISOString(),
        isError: true,
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [...s.messages, errorMessage],
              }
            : s
        )
      )
      toast.error('AI query failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCodeId(id)
    toast.success('Code copied to clipboard')
    setTimeout(() => setCopiedCodeId(null), 2000)
  }

  const handleCopyMessage = (text: string, id: number) => {
    navigator.clipboard.writeText(text)
    setCopiedMessageId(id)
    toast.success('Message copied to clipboard')
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const handleRetryLastMessage = () => {
    if (currentMessages.length === 0) return
    const lastUserMessage = [...currentMessages].reverse().find((m) => m.role === 'user')
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content)
    }
  }

  const confirmClearAllChats = () => {
    setSessions([])
    localStorage.removeItem(STORAGE_KEY)
    setShowClearConfirm(false)
    createNewSession()
    toast.success('All AI conversations cleared')
  }

  // Parse structured blocks in markdown assistant response
  const renderMessageContent = (content: string) => {
    const blocks: { type: 'text' | 'code'; content: string; language?: string }[] = []
    const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g

    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
        })
      }
      blocks.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2].trim(),
      })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      blocks.push({
        type: 'text',
        content: content.substring(lastIndex),
      })
    }

    return blocks
  }

  return (
    <div className="space-y-4">
      {/* 1. Header with New Chat & Clear Actions */}
      <PageHeader
        title="AI Assistant"
        description="Natural language schema generation, query assistance, and data modeling."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={createNewSession}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary h-8"
            >
              <Plus size={13} />
              <span>New Chat</span>
            </Button>
            {sessions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 text-xs text-status-danger hover:text-status-danger hover:bg-status-danger/10 border-border/60 h-8"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Clear History</span>
              </Button>
            )}
          </div>
        }
      />

      {/* 2. AI Provider Status Banner */}
      {!checkingConfig && !aiConfig?.enabled && (
        <div className="p-3.5 rounded-xl border border-status-warning/30 bg-status-warning/10 text-xs flex items-center justify-between gap-3 text-text-primary">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" />
            <span>AI Assistant is currently disabled. Configure your provider API key to enable generation.</span>
          </div>
          <Link to="/settings">
            <Button size="sm" variant="outline" className="h-7 text-xs flex items-center gap-1 shrink-0">
              Configure Settings <ExternalLink size={11} />
            </Button>
          </Link>
        </div>
      )}

      {/* 3. Main Chat Viewport */}
      <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-none flex flex-col h-[calc(100vh-230px)] min-h-[500px]">
        {/* Messages List Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {currentMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                <Bot size={24} />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-display font-semibold text-base text-text-primary">
                  How can Solarch AI help today?
                </h3>
                <p className="text-xs text-text-secondary">
                  Ask me to design schema collections, write access rules, generate mock data, or optimize database queries.
                </p>
              </div>

              {/* Quick Suggestion Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full pt-2">
                {[
                  {
                    icon: Database,
                    title: 'Create E-Commerce Schema',
                    prompt: 'Design a complete e-commerce schema with products, orders, customers, and order items.',
                  },
                  {
                    icon: Shield,
                    title: 'Owner-Only Access Rule',
                    prompt: 'Write an access rule where only the record creator (user ID) can update or delete.',
                  },
                  {
                    icon: Layers,
                    title: 'Seed Realistic Users',
                    prompt: 'Generate mock JSON data for 5 verified users with profile fields.',
                  },
                  {
                    icon: Code2,
                    title: 'Filter Syntax Guide',
                    prompt: 'Explain Solarch filter expression syntax with examples of AND, OR, and operators.',
                  },
                ].map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => {
                      setInput(item.prompt)
                      setTimeout(() => textareaRef.current?.focus(), 50)
                    }}
                    className="flex items-start gap-2.5 p-3 rounded-lg border border-border/60 bg-bg-surface hover:bg-bg-elevated hover:border-brand-primary/40 text-left transition-all group"
                  >
                    <item.icon size={15} className="text-brand-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary group-hover:text-brand-bright transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-text-muted truncate">
                        {item.prompt}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Messages Thread */}
          {currentMessages.map((msg, i) => {
            const isUser = msg.role === 'user'
            const blocks = renderMessageContent(msg.content)

            return (
              <div
                key={i}
                className={cn(
                  'flex gap-3 max-w-[88%]',
                  isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'
                )}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/25 flex items-center justify-center text-brand-primary shrink-0 mt-0.5">
                    <Bot size={16} />
                  </div>
                )}

                {/* Message Body Bubble */}
                <div className="space-y-1.5 max-w-full">
                  <div
                    className={cn(
                      'p-3.5 rounded-2xl text-xs leading-relaxed',
                      isUser
                        ? 'bg-brand-primary text-white rounded-tr-none font-sans font-medium shadow-sm'
                        : msg.isError
                        ? 'bg-status-danger/10 border border-status-danger/30 text-status-danger rounded-tl-none font-sans'
                        : 'bg-bg-surface border border-border/70 text-text-primary rounded-tl-none font-sans space-y-2'
                    )}
                  >
                    {blocks.map((block, idx) => {
                      if (block.type === 'code') {
                        const codeId = `code_${i}_${idx}`
                        return (
                          <div
                            key={idx}
                            className="my-2 rounded-lg border border-border/80 bg-bg-void overflow-hidden text-xs"
                          >
                            <div className="flex items-center justify-between px-3 py-1.5 bg-bg-elevated border-b border-border text-[11px] text-text-muted font-mono">
                              <span>{block.language || 'code'}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(block.content, codeId)}
                                className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
                              >
                                {copiedCodeId === codeId ? (
                                  <>
                                    <Check size={11} className="text-status-success" />
                                    <span className="text-status-success">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="p-3 overflow-x-auto font-mono text-[11px] text-text-primary leading-normal">
                              <code>{block.content}</code>
                            </pre>
                          </div>
                        )
                      }

                      return (
                        <p key={idx} className="whitespace-pre-wrap select-text">
                          {block.content}
                        </p>
                      )
                    })}
                  </div>

                  {/* Assistant Actions: Copy & Retry */}
                  {!isUser && (
                    <div className="flex items-center gap-2 text-[11px] text-text-muted pl-1">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.content, i)}
                        aria-label="Copy assistant response"
                        className="flex items-center gap-1 hover:text-text-primary transition-colors focus-visible:ring-1 focus-visible:ring-brand-primary rounded px-1 cursor-pointer"
                      >
                        {copiedMessageId === i ? (
                          <>
                            <Check size={11} className="text-status-success" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={11} /> Copy
                          </>
                        )}
                      </button>

                      {(msg.isError || i === currentMessages.length - 1) && (
                        <button
                          type="button"
                          onClick={handleRetryLastMessage}
                          disabled={loading || !aiConfig?.enabled}
                          aria-label="Retry last request"
                          className="flex items-center gap-1 hover:text-brand-primary transition-colors focus-visible:ring-1 focus-visible:ring-brand-primary rounded px-1 disabled:opacity-50 cursor-pointer"
                        >
                          <RotateCcw size={11} /> Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-text-secondary shrink-0 mt-0.5">
                    <User size={16} />
                  </div>
                )}
              </div>
            )
          })}

          {/* Thinking Shimmer */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary shrink-0 animate-pulse">
                <Bot size={16} />
              </div>
              <div className="p-3 rounded-2xl rounded-tl-none bg-bg-elevated border border-border text-xs text-text-secondary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
                <span>Solarch AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* 4. Composer Area */}
        <div className="p-3 sm:p-4 border-t border-border bg-bg-elevated/50 space-y-2.5">
          {!input && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                'Generate a blog collection with tags and author',
                'Write an owner-only update rule',
                'Seed 10 test users with realistic emails',
              ].map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => {
                    setInput(promptText)
                    setTimeout(() => textareaRef.current?.focus(), 50)
                  }}
                  disabled={!aiConfig?.enabled}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-brand-primary/40 flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles size={11} className="text-brand-bright" />
                  <span className="truncate max-w-[240px] sm:max-w-none">{promptText}</span>
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-end gap-2"
          >
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  aiConfig?.enabled
                    ? 'Ask me anything about your Solarch database... (Enter to send, Shift+Enter for newline)'
                    : 'AI Assistant is disabled. Configure in Settings to chat.'
                }
                disabled={loading || !aiConfig?.enabled}
                aria-label="Ask Solarch AI"
                className="w-full min-h-[44px] max-h-[160px] resize-none rounded-lg border border-border bg-bg-elevated px-3.5 py-3 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:border-brand-primary focus-visible:ring-1 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed font-sans"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              disabled={loading || !input.trim() || !aiConfig?.enabled}
              aria-label="Send message to AI assistant"
              className="h-[44px] px-4 rounded-lg shrink-0 disabled:opacity-40"
            >
              <Send size={15} />
            </Button>
          </form>
        </div>
      </Card>

      {/* 5. Clear Conversations Confirmation Modal */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="p-6 space-y-4">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-danger/10 text-status-danger border border-status-danger/20 shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <AlertDialogTitle className="font-display text-lg font-semibold text-text-primary">
                  Clear AI Conversations
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-text-secondary mt-0.5">
                  This permanently removes all locally stored AI conversations from this browser.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs space-y-1">
            <p className="font-semibold text-status-danger">This action is permanent.</p>
            <p className="text-status-danger/90">
              All active sessions and chat history will be deleted from localStorage and cannot be recovered.
            </p>
          </div>

          <AlertDialogFooter className="pt-2 border-t border-border gap-2.5">
            <AlertDialogCancel
              onClick={() => setShowClearConfirm(false)}
              className="text-xs h-9 px-4"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearAllChats}
              variant="destructive"
              className="text-xs h-9 px-4"
            >
              Clear All Chats
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
