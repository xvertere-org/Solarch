import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'

interface TocItem {
  id: string
  text: string
  level: number
}

export default function TableOfContents() {
  const { section, subsection } = useParams<{ section: string; subsection?: string }>()
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState('')
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const scan = () => {
      const main = document.querySelector('main')
      if (!main) return

      const headings = main.querySelectorAll('h2[id], h3[id]')
      const tocItems = Array.from(headings).map((h) => ({
        id: h.id,
        text: h.textContent?.replace('#', '').trim() || '',
        level: h.tagName === 'H3' ? 3 : 2,
      }))
      setItems(tocItems)
      setActiveId('')
    }

    // Delay to let content render
    const timeout = setTimeout(scan, 100)
    return () => clearTimeout(timeout)
  }, [section, subsection])

  useEffect(() => {
    if (items.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-12% 0px -75% 0px' }
    )

    items.forEach((item) => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [items])

  // Scroll active TOC item into view
  useEffect(() => {
    if (!activeId || !navRef.current) return
    const activeLink = navRef.current.querySelector(`[data-toc-id="${activeId}"]`) as HTMLElement | null
    if (!activeLink) return

    const navRect = navRef.current.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()

    const isAbove = linkRect.top < navRect.top + 8
    const isBelow = linkRect.bottom > navRect.bottom - 8

    if (isAbove || isBelow) {
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeId])

  if (items.length === 0) return null

  return (
    <aside className="hidden w-[200px] shrink-0 xl:block">
      <div className="sticky top-24 px-2 py-6">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
          On this page
        </h2>
        <nav ref={navRef} className="space-y-0.5 border-l border-theme max-h-[calc(100vh-12rem)] overflow-y-auto">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              data-toc-id={item.id}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className={`block border-l-2 py-1 text-[13px] leading-snug transition-colors ${
                item.level === 3 ? 'pl-5' : 'pl-3'
              } ${
                activeId === item.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-theme-muted hover:text-theme-secondary'
              }`}
            >
              {item.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
