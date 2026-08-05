export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export interface LLMProvider {
  complete(messages: LLMMessage[]): Promise<LLMResponse>
  stream?(messages: LLMMessage[]): AsyncGenerator<string, void, unknown>
}

export interface AIConfig {
  enabled: boolean
  provider: 'openai' | 'openrouter' | 'anthropic' | 'ollama' | 'custom'
  apiKey: string
  model: string
  baseURL: string
  maxTokens: number
  temperature: number
}

export function defaultAIConfig(): AIConfig {
  return {
    enabled: false,
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    baseURL: '',
    maxTokens: 4096,
    temperature: 0.2,
  }
}

export class OpenAIProvider implements LLMProvider {
  private apiKey: string
  private model: string
  private baseURL: string
  private maxTokens: number
  private temperature: number

  constructor(config: AIConfig) {
    this.apiKey = config.apiKey
    this.model = config.model
    this.baseURL = config.baseURL || 'https://api.openai.com/v1'
    this.maxTokens = config.maxTokens
    this.temperature = config.temperature
  }

  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`LLM request failed: ${res.status} ${err}`)
    }

    const data: any = await res.json()
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    }
  }

  async *stream(messages: LLMMessage[]): AsyncGenerator<string, void, unknown> {
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: true,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`LLM stream failed: ${res.status} ${err}`)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6))
              const chunk = json.choices?.[0]?.delta?.content
              if (chunk) yield chunk
            } catch {}
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}

export class AnthropicProvider implements LLMProvider {
  private apiKey: string
  private model: string
  private baseURL: string
  private maxTokens: number
  private temperature: number

  constructor(config: AIConfig) {
    this.apiKey = config.apiKey
    this.model = config.model
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1'
    this.maxTokens = config.maxTokens
    this.temperature = config.temperature
  }

  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    const systemMsg = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')

    const res = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        system: systemMsg?.content,
        messages: userMessages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`LLM request failed: ${res.status} ${err}`)
    }

    const data: any = await res.json()
    return {
      content: data.content?.[0]?.text || '',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    }
  }
}

export class OllamaProvider implements LLMProvider {
  private model: string
  private baseURL: string
  private temperature: number

  constructor(config: AIConfig) {
    this.model = config.model
    this.baseURL = config.baseURL || 'http://localhost:11434'
    this.temperature = config.temperature
  }

  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    const res = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        options: { temperature: this.temperature },
        stream: false,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`LLM request failed: ${res.status} ${err}`)
    }

    const data: any = await res.json()
    return {
      content: data.message?.content || '',
    }
  }
}

export function createLLMProvider(config: AIConfig): LLMProvider {
  switch (config.provider) {
    case 'openrouter':
      return new OpenAIProvider({
        ...config,
        baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
      })
    case 'anthropic':
      return new AnthropicProvider(config)
    case 'ollama':
      return new OllamaProvider(config)
    case 'custom':
    case 'openai':
    default:
      return new OpenAIProvider(config)
  }
}
