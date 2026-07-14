import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import DocsLayout from '../components/DocsLayout'
import DocsContent from './docs/index'
import { findNavPath } from '../lib/navigation'

export default function Docs() {
  const { section, subsection } = useParams<{ section: string; subsection?: string }>()
  const { section: navSection, subsection: navSubsection } = findNavPath(
    subsection ? `/docs/${section}/${subsection}` : `/docs/${section}`
  )

  const pageTitle = navSubsection?.label || navSection?.label || 'Documentation'
  const sectionTitle = navSection?.label || 'Documentation'
  const description = navSubsection
    ? `${navSubsection.label} — ${sectionTitle} documentation for Solarch.`
    : `${sectionTitle} documentation for Solarch.`

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://solarch.dev'
  const ogImage = `${siteUrl}/og-image.png`
  const currentPath = subsection ? `/docs/${section}/${subsection}` : `/docs/${section}`

  return (
    <>
      <Helmet>
        <title>{`Solarch — ${pageTitle}`}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={`Solarch — ${pageTitle}`} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${siteUrl}${currentPath}`} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <DocsLayout>
        <DocsContent />
      </DocsLayout>
    </>
  )
}
