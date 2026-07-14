import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import MermaidDiagram from '../../components/MermaidDiagram'
import { HardDrive, Cloud } from 'lucide-react'

export default function FileStorage() {
  return (
    <article>
      <h1 className="mb-8 font-heading text-4xl font-bold text-theme">File Storage</h1>

      <p className="mb-8 text-lg text-theme-secondary">
        Solarch handles file uploads, serving, and storage with support for local filesystem
        and S3-compatible backends. Automatic thumbnail generation is included.
      </p>

      <MermaidDiagram
        caption="File upload and serve flow"
        children={`flowchart LR
    A[Client Upload] --> B{Has File Field?}
    B -->|No| C[Reject 400]
    B -->|Yes| D[Validate MIME / Size]
    D --> E{Storage Driver}
    E -->|Local| F[Save to Disk]
    E -->|S3| G[Stream to Bucket]
    F --> H[Generate Thumbnail]
    G --> H
    H --> I[Store Path in DB]
    I --> J[Return File URL]
    J --> K[Client Requests File]
    K --> L{Protected?}
    L -->|Yes| M[Verify Token]
    M --> N[Serve File]
    L -->|No| N
    style C fill:#ef4444,color:#fff
    style N fill:#1a6fff,color:#fff`}
      />

      <DocSection id="upload" title="Upload">
        <p className="text-theme-secondary">
          Upload files to a record using multipart form data. The file field must be defined in
          the collection schema first.
        </p>

        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections/posts/records/RECORD_ID/files \\
  -F "files=@image.png" \\
  -F "files=@document.pdf"`} />
      </DocSection>

      <DocSection id="serve-files" title="Serve Files">
        <p className="text-theme-secondary">
          Files are served directly from the storage driver. Add query parameters for thumbnails
          or forced downloads.
        </p>

        <CodeBlock lang="bash" code={`# Original file
GET /api/files/:collection/:recordId/:filename

# Thumbnail (auto-generated via sharp)
GET /api/files/:collection/:recordId/:filename?thumb=100x100

# Force download
GET /api/files/:collection/:recordId/:filename?download=1`} />
      </DocSection>

      <DocSection id="protected-tokens" title="Protected File Tokens">
        <p className="text-theme-secondary">
          For files behind a <code className="text-primary">viewRule</code>, generate a time-limited
          signed token. The token embeds the user's auth context and expiry.
        </p>

        <MermaidDiagram
          caption="Protected file access flow"
          children={`sequenceDiagram
    participant Client
    participant API
    participant Storage
    Client->>API: POST /api/files/token
    API-->>Client: Signed JWT Token
    Client->>API: GET /api/files/...?token=JWT
    API->>API: Verify Token
    API->>Storage: Fetch File
    Storage-->>API: File Data
    API-->>Client: Return File`}
        />

        <h3 className="mb-2 mt-4 font-heading text-sm font-semibold text-theme-secondary">1. Generate Token</h3>
        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/files/token \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collection": "posts",
    "recordId": "RECORD_ID",
    "filename": "image.png"
  }'`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">2. Use Token</h3>
        <CodeBlock lang="bash" code={`curl http://localhost:8090/api/files/posts/RECORD_ID/image.png?token=SIGNED_JWT`} />
      </DocSection>

      <DocSection id="s3-configuration" title="S3 Configuration">
        <p className="text-theme-secondary">
          Configure S3 via the Admin UI or PATCH the settings API. Supports AWS S3, MinIO,
          DigitalOcean Spaces, and any S3-compatible service.
        </p>

        <CodeBlock lang="json" code={`{
  "s3": {
    "enabled": true,
    "bucket": "my-bucket",
    "region": "us-east-1",
    "endpoint": "https://s3.amazonaws.com",
    "accessKey": "AKIA...",
    "secret": "...",
    "prefix": "uploads/"
  }
}`} />
      </DocSection>

      <MermaidDiagram
        caption="Thumbnail generation on first request"
        children={`flowchart LR
    A[Client Request] --> B{thumb param?}
    B -->|No| C[Return Original]
    B -->|Yes| D{Cached?}
    D -->|Yes| E[Return Cached Thumb]
    D -->|No| F[sharp.resize]
    F --> G[Generate Thumbnail]
    G --> H[Save to Cache]
    H --> E
    style F fill:#1a6fff,color:#fff
    style E fill:#1a6fff,color:#fff`}
      />

      <DocSection id="thumbnail-generation" title="Thumbnail Generation">
        <p className="text-theme-secondary">
          Thumbnails are generated automatically on first request using{' '}
          <code className="text-primary">sharp</code>. Supported formats: JPEG, PNG, WebP, AVIF.
          The resized image is cached for subsequent requests.
        </p>

        <CodeBlock lang="bash" code={`GET /api/files/posts/RECORD_ID/photo.jpg?thumb=300x300`} />
      </DocSection>

      <DocSection id="storage-drivers" title="Storage Drivers">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              icon: HardDrive,
              title: 'Local Filesystem',
              desc: 'Stores files in pb_data/storage/. Default driver. Fast for single-node deployments.',
            },
            {
              icon: Cloud,
              title: 'S3-Compatible',
              desc: 'AWS S3, MinIO, DigitalOcean Spaces, Wasabi, Cloudflare R2. Scales to any size.',
            },
          ].map((d) => (
            <div
              key={d.title}
              className="rounded-xl border border-theme bg-theme-surface p-5"
            >
              <d.icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="mb-1 font-heading text-sm font-semibold text-theme">{d.title}</h3>
              <p className="text-xs leading-relaxed text-theme-tertiary">{d.desc}</p>
            </div>
          ))}
        </div>
      </DocSection>
    </article>
  )
}
