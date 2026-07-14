import { useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import {
  Clock,
  Layers,
  Cpu,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import CodeBlock from '../../components/CodeBlock'
import Footer from '../../components/Footer'

function IconGithub({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

/* ─── Types ─── */

interface GuideSection {
  id: string
  title: string
  content: React.ReactNode
}

interface ProjectGuideData {
  slug: string
  name: string
  tagline: string
  difficulty: string
  features: { name: string; color: string }[]
  techStack: string[]
  estimatedTime: string
  githubPlaceholder: string
  sections: GuideSection[]
}

/* ─── Shared styles ─── */

const badgeColorMap: Record<string, string> = {
  teal: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  green: 'bg-green-500/10 text-green-500 border-green-500/20',
  red: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const difficultyColorMap: Record<string, string> = {
  Beginner: 'bg-green-500/10 text-green-500 border-green-500/20',
  Intermediate: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Advanced: 'bg-red-500/10 text-red-500 border-red-500/20',
}

/* ─── Project data ─── */

const projectGuides: Record<string, ProjectGuideData> = {
  devcollab: {
    slug: 'devcollab',
    name: 'DevCollab',
    tagline: 'Real-time collaborative dev knowledge base',
    difficulty: 'Intermediate',
    features: [
      { name: 'Auth', color: 'teal' },
      { name: 'Realtime', color: 'blue' },
      { name: 'File Storage', color: 'green' },
    ],
    techStack: ['React', 'TypeScript', 'Solarch SDK', 'Tailwind CSS'],
    estimatedTime: '4–6 hours',
    githubPlaceholder: 'github.com/yourname/devcollab',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              DevCollab is a live knowledge-sharing platform for developers. Users can create topics,
              co-edit markdown documents in real-time, upload code snippets with file storage, and
              vote on solutions. This guide walks you through building the entire stack with
              Solarch.
            </p>
            <div className="mt-4 rounded-xl border border-theme bg-theme-surface p-4">
              <h4 className="text-sm font-semibold text-theme">What you will build</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-theme-tertiary">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Email + OAuth2 authentication with role-based access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Realtime collaborative document editing via WebSocket
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  File upload for code snippets and screenshots
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Voting system with realtime count updates
                </li>
              </ul>
            </div>
          </>
        ),
      },
      {
        id: 'architecture',
        title: 'Architecture',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              DevCollab uses a straightforward client-server architecture. The frontend is a React
              SPA that communicates with Solarch over HTTP and WebSocket for realtime updates.
            </p>
            <CodeBlock
              lang="typescript"
              filename="architecture.ts"
              code={`// High-level data flow
Client (React)  →  Solarch HTTP API  →  SQLite
     ↓                    ↓
WebSocket Channel  ←  Realtime Broker`}
            />
            <p className="text-theme-secondary leading-relaxed">
              Realtime channels are scoped per document. When a user joins a doc, the client
              subscribes to <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">doc:{`{id}`}</code> and receives
              operational-transform-like patches from other collaborators.
            </p>
          </>
        ),
      },
      {
        id: 'schema',
        title: 'Schema Design',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              Create three core collections: <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">users</code>,{' '}
              <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">documents</code>, and{' '}
              <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">votes</code>. The users collection is
              auto-generated by Solarch auth.
            </p>
            <CodeBlock
              lang="typescript"
              filename="schema.ts"
              code={`import { defineCollection } from 'solarch'

export const documents = defineCollection({
  name: 'documents',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'text', required: true },
    { name: 'owner', type: 'relation', collection: 'users', required: true },
    { name: 'tags', type: 'select', multiple: true, options: ['react', 'node', 'css'] },
    { name: 'isPublic', type: 'bool', default: false },
  ],
  rules: {
    create: '@request.auth.id != ""',
    read: 'isPublic = true || owner.id = @request.auth.id',
    update: 'owner.id = @request.auth.id',
    delete: 'owner.id = @request.auth.id',
  },
})

export const votes = defineCollection({
  name: 'votes',
  fields: [
    { name: 'document', type: 'relation', collection: 'documents', required: true },
    { name: 'user', type: 'relation', collection: 'users', required: true },
    { name: 'value', type: 'number', min: -1, max: 1 },
  ],
  rules: {
    create: '@request.auth.id != ""',
    read: true,
    update: false,
    delete: 'user.id = @request.auth.id',
  },
})`}
            />
          </>
        ),
      },
      {
        id: 'backend',
        title: 'Backend Setup',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              Initialize a new Solarch project and apply the schema. Enable realtime and file
              storage in the admin dashboard.
            </p>
            <CodeBlock
              lang="bash"
              code={`npm install -g solarch
solarch init devcollab-backend
cd devcollab-backend

# Apply schema
solarch migrate push

# Start dev server with realtime enabled
solarch serve --dev --realtime --storage`}
            />
            <p className="text-theme-secondary leading-relaxed mt-4">
              Configure OAuth2 providers in the admin UI under{' '}
              <strong>Settings → Auth Providers</strong>. For GitHub OAuth, add your client ID and
              secret, then whitelist <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">http://localhost:5173</code>.
            </p>
          </>
        ),
      },
      {
        id: 'frontend',
        title: 'Frontend',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              Scaffold a React app with Vite and install the Solarch SDK. Set up auth context and
              realtime hooks.
            </p>
            <CodeBlock
              lang="bash"
              code={`npm create vite@latest devcollab-frontend -- --template react-ts
cd devcollab-frontend
npm install solarch-sdk
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p`}
            />
            <CodeBlock
              lang="typescript"
              filename="src/lib/solarch.ts"
              code={`import { SolarchClient } from 'solarch-sdk'

export const pb = new SolarchClient('http://localhost:8090')

// Realtime subscription helper
export function subscribeToDoc(docId: string, onChange: (data: any) => void) {
  return pb.realtime.subscribe('documents', docId, onChange)
}`}
            />
            <p className="text-theme-secondary leading-relaxed mt-4">
              Build the document editor component using a lightweight markdown editor. On every
              keystroke, debounce the update and broadcast the patch to the realtime channel.
            </p>
          </>
        ),
      },
      {
        id: 'deploy',
        title: 'Deploy',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              Deploy the backend using Docker and the frontend on Vercel. For production, use an
              S3-compatible store for file assets.
            </p>
            <CodeBlock
              lang="dockerfile"
              filename="Dockerfile"
              code={`FROM solarch/solarch:latest
WORKDIR /app
COPY pb_data ./pb_data
EXPOSE 8090
CMD ["solarch", "serve", "--port", "8090"]`}
            />
            <CodeBlock
              lang="bash"
              code={`# Build & push
docker build -t devcollab-backend .
docker run -p 8090:8090 devcollab-backend`}
            />
          </>
        ),
      },
    ],
  },
  neuralhire: {
    slug: 'neuralhire',
    name: 'NeuralHire',
    tagline: 'AI-powered recruitment platform',
    difficulty: 'Advanced',
    features: [
      { name: 'AI', color: 'orange' },
      { name: 'Vector Search', color: 'purple' },
      { name: 'Migrations', color: 'red' },
    ],
    techStack: ['Next.js', 'TypeScript', 'Solarch SDK', 'OpenAI API', 'Tailwind CSS'],
    estimatedTime: '8–12 hours',
    githubPlaceholder: 'github.com/yourname/neuralhire',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              NeuralHire automates recruitment with AI. It parses resumes, converts candidate
              profiles into vector embeddings, scores applicants against job descriptions using
              cosine similarity, and drafts outreach emails. This guide shows you how to wire
              Solarch AI tools and vector search into a complete hiring pipeline.
            </p>
            <div className="mt-4 rounded-xl border border-theme bg-theme-surface p-4">
              <h4 className="text-sm font-semibold text-theme">What you will build</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-theme-tertiary">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Resume parser with AI-generated structured data
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Vector search for semantic candidate matching
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Automated email generation and tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Migration pipeline for schema versioning
                </li>
              </ul>
            </div>
          </>
        ),
      },
      {
        id: 'architecture',
        title: 'Architecture',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              NeuralHire layers AI services on top of Solarch. Resumes are uploaded to file
              storage, processed by an AI hook that generates embeddings, and indexed in the vector
              search table.
            </p>
            <CodeBlock
              lang="typescript"
              filename="architecture.ts"
              code={`// Pipeline
Resume Upload  →  File Storage
     ↓
AI Hook (parse + embed)  →  SQLite records + vector table
     ↓
Vector Search API  ←  Query embedding  →  Ranked candidates`}
            />
            <p className="text-theme-secondary leading-relaxed">
              The AI hook runs inside Solarch JSVM on record creation. It calls OpenAI to
              generate a 1536-dimension embedding and stores it in the auxiliary vector database.
            </p>
          </>
        ),
      },
      {
        id: 'schema',
        title: 'Schema Design',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              We need <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">candidates</code>,{' '}
              <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">jobs</code>, and{' '}
              <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">applications</code> collections.
              The vector search index lives in the auxiliary DB and is managed automatically.
            </p>
            <CodeBlock
              lang="typescript"
              filename="schema.ts"
              code={`import { defineCollection } from 'solarch'

export const candidates = defineCollection({
  name: 'candidates',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'resume', type: 'file', required: true },
    { name: 'skills', type: 'select', multiple: true },
    { name: 'experienceYears', type: 'number', min: 0 },
    { name: 'embedding', type: 'json', hidden: true },
  ],
  hooks: {
    afterCreate: 'generateCandidateEmbedding',
  },
})

export const jobs = defineCollection({
  name: 'jobs',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'text', required: true },
    { name: 'department', type: 'text' },
    { name: 'status', type: 'select', options: ['open', 'closed'], default: 'open' },
  ],
})

export const applications = defineCollection({
  name: 'applications',
  fields: [
    { name: 'candidate', type: 'relation', collection: 'candidates', required: true },
    { name: 'job', type: 'relation', collection: 'jobs', required: true },
    { name: 'matchScore', type: 'number', min: 0, max: 100 },
    { name: 'stage', type: 'select', options: ['new', 'screening', 'interview', 'offer'], default: 'new' },
  ],
})`}
            />
          </>
        ),
      },
      {
        id: 'backend',
        title: 'Backend Setup',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              Enable AI tools and vector search during initialization. Configure your OpenAI API
              key in environment variables.
            </p>
            <CodeBlock
              lang="bash"
              code={`export OPENAI_API_KEY=sk-...
solarch init neuralhire-backend --template ai
cd neuralhire-backend

# Enable vector search extension
solarch ext enable vector-search

# Apply schema with migration
solarch migrate create init_schema
solarch migrate up`}
            />
            <CodeBlock
              lang="javascript"
              filename="pb_hooks/generateCandidateEmbedding.js"
              code={`onRecordAfterCreateRequest((e) => {
  const record = e.record
  if (!record) return

  const resumeText = $http.send({
    url: record.getString('resumeUrl'),
    method: 'GET',
  }).rawText

  const embedding = $ai.embeddings.create({
    model: 'text-embedding-3-small',
    input: resumeText,
  })

  record.set('embedding', embedding.data[0].embedding)
  $app.dao().saveRecord(record)
}, 'candidates')`}
            />
          </>
        ),
      },
      {
        id: 'frontend',
        title: 'Frontend',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              Build a Next.js dashboard with server-side rendering for the job board and client-side
              vector search for candidate matching.
            </p>
            <CodeBlock
              lang="typescript"
              filename="app/api/match/route.ts"
              code={`import { NextRequest } from 'next/server'
import { pb } from '@/lib/solarch'

export async function POST(req: NextRequest) {
  const { jobDescription, limit = 10 } = await req.json()

  const queryEmbedding = await pb.ai.embeddings.create({
    model: 'text-embedding-3-small',
    input: jobDescription,
  })

  const matches = await pb.vectorSearch({
    collection: 'candidates',
    vector: queryEmbedding.data[0].embedding,
    topK: limit,
  })

  return Response.json(matches)
}`}
            />
            <p className="text-theme-secondary leading-relaxed mt-4">
              The match score is computed server-side using cosine similarity against stored
              candidate embeddings. Results are ranked and returned with metadata.
            </p>
          </>
        ),
      },
      {
        id: 'deploy',
        title: 'Deploy',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              NeuralHire requires the AI extension and vector search module in production. Deploy
              with Docker Compose including a Redis cache for embeddings.
            </p>
            <CodeBlock
              lang="yaml"
              filename="docker-compose.yml"
              code={`version: '3.8'
services:
  app:
    image: solarch/solarch:latest
    ports:
      - "8090:8090"
    environment:
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - VECTOR_SEARCH_ENABLED=true
    volumes:
      - ./pb_data:/app/pb_data
      - ./pb_hooks:/app/pb_hooks
    depends_on:
      - redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"`}
            />
          </>
        ),
      },
    ],
  },
  pixelvault: {
    slug: 'pixelvault',
    name: 'PixelVault',
    tagline: 'Multiplayer game asset marketplace',
    difficulty: 'Advanced',
    features: [
      { name: 'Auth', color: 'teal' },
      { name: 'Realtime', color: 'blue' },
      { name: 'File Storage', color: 'green' },
    ],
    techStack: ['React', 'TypeScript', 'Solarch SDK', 'Three.js', 'Tailwind CSS'],
    estimatedTime: '10–14 hours',
    githubPlaceholder: 'github.com/yourname/pixelvault',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              PixelVault is a marketplace for game assets with real-time bidding, live 3D previews,
              and collaborative rooms where buyers and sellers negotiate. It pushes Solarch
              Realtime and File Storage to their limits with large asset files and high-frequency
              updates.
            </p>
            <div className="mt-4 rounded-xl border border-theme bg-theme-surface p-4">
              <h4 className="text-sm font-semibold text-theme">What you will build</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-theme-tertiary">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  OAuth + MFA authentication for sellers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Realtime bidding with atomic price updates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Large file storage for 3D models and textures
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Collaborative negotiation rooms
                </li>
              </ul>
            </div>
          </>
        ),
      },
      {
        id: 'architecture',
        title: 'Architecture',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              PixelVault separates asset storage from metadata. Files go to S3-compatible storage
              while Solarch handles metadata, auth, and realtime state. Three.js renders previews
              client-side from GLB URLs.
            </p>
            <CodeBlock
              lang="typescript"
              filename="architecture.ts"
              code={`// Data flow
Uploader  →  Solarch API  →  S3 Storage
     ↓              ↓
Asset Record  ←  Metadata  →  Realtime Room`}
            />
            <p className="text-theme-secondary leading-relaxed">
              Bidding rooms use per-asset channels. Each bid broadcasts to all subscribers who
              validate the new price against their local state before updating UI.
            </p>
          </>
        ),
      },
      {
        id: 'schema',
        title: 'Schema Design',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              Collections: <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">assets</code>,{' '}
              <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">bids</code>,{' '}
              <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">rooms</code>, and{' '}
              <code className="text-xs bg-theme-muted px-1 py-0.5 rounded">transactions</code>. File fields
              store asset previews and source files.
            </p>
            <CodeBlock
              lang="typescript"
              filename="schema.ts"
              code={`import { defineCollection } from 'solarch'

export const assets = defineCollection({
  name: 'assets',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'text' },
    { name: 'category', type: 'select', options: ['3D', '2D', 'Audio', 'VFX'] },
    { name: 'previewFile', type: 'file', required: true },
    { name: 'sourceFile', type: 'file', required: true },
    { name: 'seller', type: 'relation', collection: 'users', required: true },
    { name: 'basePrice', type: 'number', min: 0 },
    { name: 'status', type: 'select', options: ['draft', 'live', 'sold'], default: 'draft' },
  ],
})

export const bids = defineCollection({
  name: 'bids',
  fields: [
    { name: 'asset', type: 'relation', collection: 'assets', required: true },
    { name: 'bidder', type: 'relation', collection: 'users', required: true },
    { name: 'amount', type: 'number', min: 0, required: true },
  ],
  rules: {
    create: '@request.auth.id != ""',
    read: true,
    update: false,
    delete: false,
  },
})

export const rooms = defineCollection({
  name: 'rooms',
  fields: [
    { name: 'asset', type: 'relation', collection: 'assets', required: true },
    { name: 'participants', type: 'relation', collection: 'users', multiple: true },
    { name: 'messages', type: 'json', default: [] },
  ],
})`}
            />
          </>
        ),
      },
      {
        id: 'backend',
        title: 'Backend Setup',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              Configure S3-compatible storage and increase upload limits for large game assets.
              Enable MFA for seller accounts.
            </p>
            <CodeBlock
              lang="bash"
              code={`solarch init pixelvault-backend
cd pixelvault-backend

# Configure S3 storage
solarch config set storage.provider s3
solarch config set storage.s3.endpoint https://s3.amazonaws.com
solarch config set storage.s3.bucket pixelvault-assets
solarch config set storage.maxUploadSize 500MB

# Enable MFA requirement for sellers
solarch config set auth.mfaRequiredForRoles seller,admin

# Start
solarch serve --dev --realtime --storage`}
            />
            <p className="text-theme-secondary leading-relaxed mt-4">
              Set up a JSVM hook to validate bids: reject any bid lower than the current highest
              bid or base price.
            </p>
          </>
        ),
      },
      {
        id: 'frontend',
        title: 'Frontend',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              The frontend features a Three.js preview canvas and realtime bidding UI. Use the
              Solarch SDK to subscribe to bid channels.
            </p>
            <CodeBlock
              lang="typescript"
              filename="src/components/BidStream.tsx"
              code={`import { useEffect, useState } from 'react'
import { pb } from '@/lib/solarch'

export function BidStream({ assetId }: { assetId: string }) {
  const [bids, setBids] = useState<any[]>([])

  useEffect(() => {
    const unsubscribe = pb.realtime.subscribe('bids', assetId, (payload) => {
      setBids((prev) => [payload.record, ...prev])
    })
    return () => unsubscribe()
  }, [assetId])

  return (
    <ul className="space-y-2">
      {bids.map((bid) => (
        <li key={bid.id} className="text-sm">
          <span className="font-medium">\${bid.amount}</span> by {bid.bidderName}
        </li>
      ))}
    </ul>
  )
}`}
            />
            <p className="text-theme-secondary leading-relaxed mt-4">
              For the 3D preview, load GLB files directly from the S3-signed URL returned by
              Solarch file storage.
            </p>
          </>
        ),
      },
      {
        id: 'deploy',
        title: 'Deploy',
        content: (
          <>
            <p className="text-theme-secondary leading-relaxed">
              Deploy with a CDN in front of asset delivery. Use Solarch protected file tokens
              to ensure only buyers can download source files after purchase.
            </p>
            <CodeBlock
              lang="bash"
              code={`# Production build
docker build -t pixelvault-backend .

# Use CloudFront or Cloudflare in front of S3 bucket for assets
# Solarch handles signed URLs automatically:
const url = pb.files.getUrl(record, 'sourceFile', { token: 'protected' })`}
            />
          </>
        ),
      },
    ],
  },
}

/* ─── Sidebar component ─── */

function Sidebar({ project }: { project: ProjectGuideData }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-6">
        {/* Tech Stack */}
        <div className="rounded-xl border border-theme bg-theme-surface p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-theme">
            <Layers className="h-4 w-4 text-primary" />
            Tech Stack
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.techStack.map((tech) => (
              <span
                key={tech}
                className="rounded-md border border-theme bg-theme-muted px-2 py-1 text-xs font-medium text-theme-secondary"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Solarch Features */}
        <div className="rounded-xl border border-theme bg-theme-surface p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-theme">
            <Cpu className="h-4 w-4 text-primary" />
            Solarch Features
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.features.map((f) => (
              <span
                key={f.name}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${badgeColorMap[f.color]}`}
              >
                {f.name}
              </span>
            ))}
          </div>
        </div>

        {/* Build Time */}
        <div className="rounded-xl border border-theme bg-theme-surface p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-theme">
            <Clock className="h-4 w-4 text-primary" />
            Estimated Build Time
          </div>
          <p className="mt-2 text-sm text-theme-secondary">{project.estimatedTime}</p>
        </div>

        {/* GitHub Link */}
        <div className="rounded-xl border border-theme bg-theme-surface p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-theme">
            <IconGithub className="h-4 w-4 text-primary" />
            Source Code
          </div>
          <p className="mt-2 text-xs text-theme-muted">Coming soon</p>
          <a
            href={`https://${project.githubPlaceholder}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-theme bg-theme-muted px-3 py-1.5 text-xs font-medium text-theme-secondary transition-all hover:border-theme-hover hover:text-theme"
          >
            {project.githubPlaceholder}
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </aside>
  )
}

/* ─── Main page component ─── */

export default function ProjectGuide() {
  const { slug } = useParams<{ slug: string }>()
  const project = slug ? projectGuides[slug] : undefined

  if (!project) {
    return <Navigate to="/projects" replace />
  }

  return (
    <>
      <Helmet>
        <title>{project.name} — Solarch Projects</title>
        <meta name="description" content={project.tagline} />
      </Helmet>

      <div className="min-h-screen bg-theme-body pt-14">
        {/* Banner */}
        <section className="relative overflow-hidden border-b border-theme">
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {project.features.map((f) => (
                  <span
                    key={f.name}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeColorMap[f.color]}`}
                  >
                    {f.name}
                  </span>
                ))}
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${difficultyColorMap[project.difficulty]}`}
                >
                  {project.difficulty}
                </span>
              </div>
              <h1 className="font-heading text-4xl font-bold tracking-tight text-theme sm:text-5xl">
                {project.name}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-theme-tertiary">{project.tagline}</p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
            {/* Left: Guide */}
            <div className="space-y-14">
              {project.sections.map((section, i) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  id={section.id}
                >
                  <h2 className="flex items-center gap-3 font-heading text-2xl font-bold text-theme">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    {section.title}
                  </h2>
                  <div className="mt-5 space-y-4">{section.content}</div>
                </motion.div>
              ))}
            </div>

            {/* Right: Sidebar */}
            <Sidebar project={project} />
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Footer />
        </div>
      </div>
    </>
  )
}
