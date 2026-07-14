import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import GettingStarted from './getting-started'
import Authentication from './authentication'
import Collections from './collections'
import AITools from './ai-tools'
import VectorSearch from './vector-search'
import FileStorage from './file-storage'
import Realtime from './realtime'
import Migrations from './migrations'
import JavascriptHooks from './javascript-hooks'
import APIReference from './api-reference'
import Configuration from './configuration'
import Torque from './torque'

const contentMap: Record<string, React.FC> = {
  'getting-started': GettingStarted,
  'authentication': Authentication,
  'collections': Collections,
  'ai-tools': AITools,
  'vector-search': VectorSearch,
  'file-storage': FileStorage,
  'realtime': Realtime,
  'migrations': Migrations,
  'javascript-hooks': JavascriptHooks,
  'api-reference': APIReference,
  'configuration': Configuration,
  'torque': Torque,
}

export default function DocsContent() {
  const { section, subsection } = useParams<{ section: string; subsection?: string }>()
  const Component = section ? contentMap[section] : undefined

  // Scroll to subsection anchor after content renders
  useEffect(() => {
    if (!subsection) return
    const el = document.getElementById(subsection)
    if (el) {
      const timeout = setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [section, subsection])

  if (!Component) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-theme">Page Not Found</h1>
          <p className="mt-2 text-theme-muted">The requested documentation page does not exist.</p>
        </div>
      </div>
    )
  }

  return <Component />
}
