import { BaseApp } from '../core/base'
import { Collection, CollectionData } from '../core/collection'
import { LLMProvider, LLMMessage, createLLMProvider, AIConfig } from './provider'
import { RecordModel as PBRecord } from '../core/record'
import { Field, fieldFromJSON } from '../core/field'

export class AIService {
  private app: BaseApp
  private provider: LLMProvider | null = null

  constructor(app: BaseApp) {
    this.app = app
  }

  private getConfig(): AIConfig | null {
    const settings = this.app.settings()
    const ai = (settings as any).ai as AIConfig | undefined
    if (!ai || !ai.enabled || !ai.apiKey) return null
    return ai
  }

  private getProvider(): LLMProvider {
    const config = this.getConfig()
    if (!config) throw new Error('AI is not configured. Set ai.enabled=true and ai.apiKey in settings.')
    if (!this.provider) {
      this.provider = createLLMProvider(config)
    }
    return this.provider
  }

  async generateCollection(description: string, options?: { dryRun?: boolean }): Promise<CollectionData> {
    const systemPrompt = `You are a database schema designer. Generate a JSON collection schema for Solarch.

Available field types: text, number, email, url, bool, date, select, file, relation, json, editor, autodate, geoPoint.

Collection types: base (regular), auth (has users), view (read-only SQL).

Rules use Solarch filter syntax: @request.auth.id, @request.auth.isAdmin, =, !=, >, <, ~ (contains), &&, ||, !().

Respond ONLY with valid JSON in this exact shape:
{
  "name": "string",
  "type": "base|auth|view",
  "fields": [
    { "name": "string", "type": "string", "required": boolean, "presentable": boolean }
  ],
  "listRule": "string|null",
  "viewRule": "string|null",
  "createRule": "string|null",
  "updateRule": "string|null",
  "deleteRule": "string|null"
}

Do not include markdown, explanations, or comments. Only raw JSON.`

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a collection schema for: ${description}` },
    ]

    const response = await this.getProvider().complete(messages)
    const content = response.content.trim()
    const jsonStr = content.replace(/^```json\s*|\s*```$/g, '').trim()

    let data: CollectionData
    try {
      data = JSON.parse(jsonStr)
    } catch {
      throw new Error('AI returned invalid JSON. Please try again.')
    }

    // Validate and normalize
    if (!data.name) throw new Error('Generated schema missing name')
    if (!data.type) data.type = 'base'
    if (!data.fields) data.fields = []
    data.system = false
    data.indexes = data.indexes || []

    if (!options?.dryRun) {
      const collection = new Collection(data)
      await this.app.save(collection)
    }

    return data
  }

  async generateRule(action: string, description: string): Promise<string> {
    const systemPrompt = `You translate plain English security requirements into Solarch filter expressions.

Available syntax:
- @request.auth.id - current user's ID
- @request.auth.isAdmin - true if admin
- @request.auth.email - current user's email
- field operators: =, !=, >, <, >=, <=, ~ (contains), % (starts with), @ (ends with)
- logical: && (AND), || (OR), !(...) (NOT)
- null means public/no restriction

Examples:
- "Only admins" → "@request.auth.isAdmin = true"
- "Only the owner can edit" → "owner = @request.auth.id"
- "Anyone can read, only owner can edit" → listRule: null, updateRule: "owner = @request.auth.id"

Respond with ONLY the filter expression string, or the word "null" for no restriction. No markdown, no quotes around the whole string.`

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Action: ${action}\nRequirement: ${description}` },
    ]

    const response = await this.getProvider().complete(messages)
    let rule = response.content.trim()
    rule = rule.replace(/^```.*?\n?|\n?```$/g, '').trim()
    if (rule.toLowerCase() === 'null') return ''
    return rule
  }

  async seedRecords(collectionName: string, count: number, constraints?: string): Promise<PBRecord[]> {
    // Validate AI config first
    this.getProvider()

    const collection = await this.app.findCollectionByNameOrId(collectionName)
    if (!collection) throw new Error(`Collection ${collectionName} not found`)

    const fieldDescriptions = collection.fields.map(f => {
      let desc = `${f.name} (${f.type})`
      if (f.type === 'select' && (f as any).values?.length) {
        desc += ` values: ${(f as any).values.join(', ')}`
      }
      if (f.type === 'relation') {
        desc += ` relation to ${(f as any).collectionName || 'another collection'}`
      }
      return desc
    }).join(', ')

    const systemPrompt = `You generate realistic fake JSON data for a database. Respond with ONLY a JSON array of objects. No markdown, no explanations.`

    const userPrompt = `Collection: ${collection.name}\nFields: ${fieldDescriptions}\nGenerate ${count} realistic records${constraints ? ` with these constraints: ${constraints}` : ''}. Use ISO dates for date fields. For relation fields, use placeholder IDs like "rec_123". Return ONLY a JSON array.`

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const response = await this.getProvider().complete(messages)
    const content = response.content.trim()
    const jsonStr = content.replace(/^```json\s*|\s*```$/g, '').trim()

    let records: any[]
    try {
      records = JSON.parse(jsonStr)
    } catch {
      throw new Error('AI returned invalid JSON for seed data.')
    }

    const created: PBRecord[] = []
    for (const data of records) {
      const record = new PBRecord(collection.id, collection.name, data)
      await this.app.save(record)
      created.push(record)
    }

    return created
  }

  async chat(message: string, context?: { collections?: string[] }): Promise<string> {
    const collections = await this.app.findAllCollections()
    const collectionInfo = collections.map(c => ({
      name: c.name,
      type: c.type,
      fields: c.fields.map(f => f.name),
    }))

    const systemPrompt = `You are Solarch AI Assistant, a helpful backend development assistant.

Current database collections:\n${JSON.stringify(collectionInfo, null, 2)}

You can help with:
- Writing Solarch filter expressions
- Designing collection schemas
- Explaining API endpoints
- Generating test data
- Debugging access rules

Be concise and helpful. If the user asks to create or modify data, explain how to do it via the API.`

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]

    const response = await this.getProvider().complete(messages)
    return response.content.trim()
  }
}
