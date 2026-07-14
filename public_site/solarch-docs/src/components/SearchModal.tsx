import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, FileText, ChevronRight } from 'lucide-react'
import Fuse from 'fuse.js'
import { searchDocs } from '../data/searchIndex'

const fuse = new Fuse(searchDocs, {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'sectionLabel', weight: 0.2 },
    { name: 'headings', weight: 0.3 },
    { name: 'content', weight: 0.1 },
  ],
  threshold: 0.35,
  includeMatches: true,
})

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).slice(0, 8)
  }, [query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleSelect = useCallback(
    (path: string) => {
      onClose()
      navigate(path)
      // Small delay to let navigation happen before scrolling
      setTimeout(() => {
        const hash = window.location.hash
        if (hash) {
          const el = document.getElementById(hash.slice(1))
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }, 100)
    },
    [navigate, onClose]
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return

      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + results.length) % results.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const result = results[selectedIndex]
        if (result) {
          handleSelect(result.item.path)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, results, selectedIndex, handleSelect])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 backdrop-blur-sm pt-[15vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl mx-4 overflow-hidden rounded-xl border border-theme-hover bg-theme-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-theme px-4 py-3">
              <Search className="h-5 w-5 text-theme-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documentation..."
                className="flex-1 bg-transparent text-base text-theme placeholder:text-theme-muted focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  className="rounded p-1 text-theme-muted hover:bg-theme-surface hover:text-theme-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden rounded border border-theme-hover bg-theme-surface px-2 py-0.5 text-[11px] text-theme-muted sm:inline-block">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto">
              {results.length === 0 && query.trim() !== '' && (
                <div className="px-4 py-8 text-center text-sm text-theme-muted">
                  No results found for "{query}"
                </div>
              )}

              {results.length === 0 && query.trim() === '' && (
                <div className="px-4 py-8 text-center text-sm text-theme-muted">
                  Type to search documentation...
                </div>
              )}

              {results.map(({ item, matches }, idx) => {
                const isSelected = idx === selectedIndex
                // Find matching heading if any
                const headingMatch = matches?.find((m) => m.key === 'headings')
                const matchedHeading = headingMatch?.value

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.path)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected ? 'bg-theme-surface' : 'hover:bg-theme-muted'
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-theme-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-theme">
                          {item.title}
                        </span>
                        {matchedHeading && matchedHeading !== item.title && (
                          <>
                            <ChevronRight className="h-3 w-3 text-theme-muted" />
                            <span className="text-sm text-primary">
                              {matchedHeading}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-theme-muted">
                        <span>{item.sectionLabel}</span>
                        <span className="text-white/10">/</span>
                        <span className="truncate">{item.content}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <kbd className="hidden rounded border border-theme-hover bg-theme-surface px-1.5 py-0.5 text-[10px] text-theme-muted sm:inline-block">
                        ↵
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-theme px-4 py-2 text-[11px] text-theme-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-theme-hover bg-theme-surface px-1">↑</kbd>
                  <kbd className="rounded border border-theme-hover bg-theme-surface px-1">↓</kbd>
                  <span>to navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-theme-hover bg-theme-surface px-1.5">↵</kbd>
                  <span>to select</span>
                </span>
              </div>
              <span>{results.length} results</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
