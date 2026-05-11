const NODE_EXECUTORS: Record<string, string> = {
  webhook: `async (config, input) => ({ triggered: true, input, method: config.method || 'POST' })`,
  schedule: `async (config, input) => ({ triggeredAt: new Date().toISOString(), cron: config.cron })`,
  form_submit: `async (config, input) => input`,
  email_in: `async (config, input) => input`,
  db_watch: `async (config, input) => input`,
  custom_event: `async (config, input) => input`,

  llm: `async (config, input) => {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': \`Bearer \${apiKey}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model || 'gpt-4o',
        messages: [
          ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
          { role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) },
        ],
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 2048,
      }),
    })
    if (!res.ok) throw new Error(\`LLM error: \${res.status}\`)
    const json = await res.json()
    return json.choices[0].message.content
  }`,
  embed: `async (config, input) => input`,
  classify: `async (config, input) => input`,
  extract: `async (config, input) => input`,
  translate: `async (config, input) => input`,
  summarize: `async (config, input) => input`,
  rag_search: `async (config, input) => input`,
  image_gen: `async (config, input) => input`,
  audio_transcribe: `async (config, input) => input`,
  llm_vision: `async (config, input) => input`,
  llm_tool_use: `async (config, input) => input`,

  pocketbase_get: `async (config, input) => input`,
  pocketbase_list: `async (config, input) => input`,
  pocketbase_create: `async (config, input) => input`,
  pocketbase_update: `async (config, input) => input`,
  pocketbase_delete: `async (config, input) => input`,
  json_parse: `async (config, input) => typeof input === 'string' ? JSON.parse(input) : input`,
  transform: `async (config, input) => input`,
  filter: `async (config, input) => input`,
  aggregate: `async (config, input) => input`,
  merge: `async (config, input) => input`,
  split: `async (config, input) => input`,
  sort: `async (config, input) => input`,
  deduplicate: `async (config, input) => input`,

  http_request: `async (config, input) => {
    const url = config.url
    if (!url) throw new Error('URL is required')
    const res = await fetch(url, {
      method: config.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
      body: config.method !== 'GET' ? JSON.stringify(config.body || input) : undefined,
    })
    const text = await res.text()
    try { return JSON.parse(text) } catch { return text }
  }`,
  graphql: `async (config, input) => input`,
  send_email: `async (config, input) => ({ sent: true, to: config.to })`,
  push_notification: `async (config, input) => input`,
  slack_message: `async (config, input) => input`,
  discord_message: `async (config, input) => input`,
  sms_twilio: `async (config, input) => input`,
  github_action: `async (config, input) => input`,
  notion_create: `async (config, input) => input`,
  file_upload: `async (config, input) => input`,
  webhook_send: `async (config, input) => input`,
  pdf_generate: `async (config, input) => input`,

  condition: `async (config, input) => {
    const fn = new Function('input', \`return Boolean(\${config.expression})\`)
    return { passed: fn(input), input }
  }`,
  switch: `async (config, input) => input`,
  loop: `async (config, input) => input`,
  delay: `async (config, input) => {
    const ms = Math.min(parseInt(config.seconds) || 5, 300) * 1000
    await new Promise(r => setTimeout(r, ms))
    return input
  }`,
  code: `async (config, input) => {
    const fn = new Function('input', config.code || 'return input')
    return fn(input)
  }`,
  retry: `async (config, input) => input`,
  try_catch: `async (config, input) => input`,
  parallel: `async (config, input) => input`,
  throttle: `async (config, input) => input`,
  dedup_events: `async (config, input) => input`,

  log: `async (config, input) => {
    console.log(\`[workflow]\`, config.message || input)
    return input
  }`,
  webhook_response: `async (config, input) => input`,
  export_csv: `async (config, input) => input`,
  save_record: `async (config, input) => input`,
  return_data: `async (config, input) => input`,
  webhook_slack: `async (config, input) => input`,
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\$/g, '\\$').replace(/\n/g, '\\n')
}

function toSafeIdentifier(label: string): string {
  return label.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^(\d)/, '_$1') || 'node'
}

export interface WorkflowData {
  nodes: Array<{ id: string; data: { nodeType: string; label: string; config: Record<string, any> } }>
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }>
  meta: { workflowId: string; name: string }
}

export function generateTypeScript(workflow: WorkflowData): string {
  const { nodes, edges, meta } = workflow

  let executorEntries = ''
  const usedTypes = new Set<string>()
  for (const node of nodes) {
    const t = node.data.nodeType
    if (!usedTypes.has(t)) {
      usedTypes.add(t)
      const executor = NODE_EXECUTORS[t] || `async (config, input) => input`
      executorEntries += `  '${t}': ${executor},\n`
    }
  }

  const configMap = nodes.map(n => {
    const safeId = toSafeIdentifier(n.data.label)
    return `  '${n.id}': ${JSON.stringify(n.data.config)}`
  }).join(',\n')

  const edgeList = edges.map(e =>
    `  { from: '${e.source}', to: '${e.target}', sourceHandle: '${e.sourceHandle || ''}', targetHandle: '${e.targetHandle || ''}' }`
  ).join(',\n')

  return `// ── Torque exported workflow ──
// Run: npx tsx ${meta.workflowId}.ts
//
// Name: ${meta.name}
// ID:   ${meta.workflowId}
//

const WORKFLOW = {
  nodes: [
${nodes.map(n => `    { id: '${n.id}', type: '${n.data.nodeType}', config: ${JSON.stringify(n.data.config)} }`).join(',\n')}
  ],
  edges: [${edgeList}],
}

// ── Inline executor ─────────────────────────────────
const NODE_REGISTRY: Record<string, (config: any, input: any) => Promise<any>> = {
${executorEntries}}

function topologicalSort(nodes: any[], edges: any[]): string[] {
  if (edges.length === 0) return nodes.map(n => n.id)
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const n of nodes) { inDegree.set(n.id, 0); adj.set(n.id, []) }
  for (const e of edges) { adj.get(e.from)?.push(e.to); inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1) }
  const q: string[] = []
  for (const [id, d] of inDegree) { if (d === 0) q.push(id) }
  const order: string[] = []
  const visited = new Set<string>()
  while (q.length > 0) {
    const id = q.shift()!
    if (visited.has(id)) continue
    visited.add(id); order.push(id)
    for (const n of adj.get(id) || []) {
      const nd = (inDegree.get(n) || 0) - 1
      inDegree.set(n, nd)
      if (nd === 0) q.push(n)
    }
  }
  return order
}

async function execute(workflow: typeof WORKFLOW, input?: any): Promise<any> {
  const order = topologicalSort(workflow.nodes, workflow.edges)
  let current = input
  for (const nodeId of order) {
    const node = workflow.nodes.find(n => n.id === nodeId)
    if (!node) continue
    const exec = NODE_REGISTRY[node.type]
    if (!exec) throw new Error(\`Unknown node type: \${node.type}\`)
    const start = Date.now()
    console.log(\`[workflow] executing \${node.id} (\${node.type})\`)
    current = await exec(node.config, current)
    console.log(\`[workflow] \${node.id} done in \${Date.now() - start}ms\`)
  }
  return current
}

// ── Run ──────────────────────────────────────────────
const input = process.argv[2] ? JSON.parse(process.argv[2]) : {}
execute(WORKFLOW, input)
  .then(output => { console.log(JSON.stringify(output, null, 2)); process.exit(0) })
  .catch(err => { console.error(err.message); process.exit(1) })
`
}

export function generateJavaScript(workflow: WorkflowData): string {
  return generateTypeScript(workflow)
}

export function getExportJson(workflow: WorkflowData): string {
  return JSON.stringify({
    workflowId: workflow.meta.workflowId,
    name: workflow.meta.name,
    nodes: workflow.nodes.map(n => ({
      id: n.id,
      type: n.data.nodeType,
      label: n.data.label,
      config: n.data.config,
    })),
    edges: workflow.edges.map(e => ({
      id: e.id,
      from: e.source,
      to: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  }, null, 2)
}
