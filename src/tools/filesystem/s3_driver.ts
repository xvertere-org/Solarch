import { BlobDriver, FileAttributes } from './driver'
import { S3Config } from '../../core/settings'
import { Readable } from 'stream'
import crypto from 'crypto'

export class S3BlobDriver extends BlobDriver {
  private config: S3Config

  constructor(config: S3Config) {
    super()
    this.config = config
  }

  private getBaseUrl(): string {
    if (this.config.endpoint) {
      const ep = this.config.endpoint.replace(/\/$/, '')
      if (this.config.forcePathStyle) {
        return `${ep}/${this.config.bucket}`
      }
      return `${ep}`
    }
    if (this.config.forcePathStyle) {
      return `https://s3.${this.config.region}.amazonaws.com/${this.config.bucket}`
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com`
  }

  private getObjectUrl(key: string): string {
    const prefix = this.config.prefix ? `${this.config.prefix}/` : ''
    return `${this.getBaseUrl()}/${prefix}${key}`
  }

  private async signedRequest(
    method: string,
    key: string,
    body?: Buffer,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const url = this.getObjectUrl(key)
    const date = new Date()
    const dateStamp = date.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 8)
    const amzDate = date.toISOString().replace(/[:\-]|\.\d{3}/g, '')

    const signedHeaders = Object.keys(headers).map(h => h.toLowerCase()).sort().join(';')
    const canonicalHeaders = Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}\n`)
      .join('')

    const payloadHash = body
      ? crypto.createHash('sha256').update(body).digest('hex')
      : crypto.createHash('sha256').update('').digest('hex')

    const canonicalRequest = [
      method,
      new URL(url).pathname,
      new URL(url).search.slice(1) || '',
      canonicalHeaders + `host:${new URL(url).host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`,
      signedHeaders + ';host;x-amz-content-sha256;x-amz-date',
      payloadHash,
    ].join('\n')

    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n')

    const signingKey = this.getSigningKey(dateStamp)
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex')

    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders};host;x-amz-content-sha256;x-amz-date, Signature=${signature}`

    const reqHeaders: Record<string, string> = {
      ...headers,
      Host: new URL(url).host,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-SHA256': payloadHash,
      Authorization: authHeader,
    }

    return fetch(url, { method, headers: reqHeaders, body })
  }

  private getSigningKey(dateStamp: string): Buffer {
    const kDate = crypto.createHmac('sha256', `AWS4${this.config.secret}`).update(dateStamp).digest()
    const kRegion = crypto.createHmac('sha256', kDate).update(this.config.region).digest()
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest()
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest()
    return kSigning
  }

  async list(prefix?: string): Promise<FileAttributes[]> {
    const listUrl = new URL(`${this.getBaseUrl()}`)
    listUrl.searchParams.set('list-type', '2')
    if (prefix) {
      const fullPrefix = this.config.prefix ? `${this.config.prefix}/${prefix}` : prefix
      listUrl.searchParams.set('prefix', fullPrefix)
    } else if (this.config.prefix) {
      listUrl.searchParams.set('prefix', this.config.prefix)
    }

    const res = await this.signedRequest('GET', `?${listUrl.searchParams.toString()}`)
    if (!res.ok) {
      throw new Error(`S3 list failed: ${res.status} ${res.statusText}`)
    }

    const xml = await res.text()
    const files: FileAttributes[] = []
    const keyRegex = /<Key>([^<]+)<\/Key>/g
    const sizeRegex = /<Size>(\d+)<\/Size>/g
    const modifiedRegex = /<LastModified>([^<]+)<\/LastModified>/g

    let keyMatch, sizeMatch, modifiedMatch
    while ((keyMatch = keyRegex.exec(xml)) !== null) {
      sizeMatch = sizeRegex.exec(xml)
      modifiedMatch = modifiedRegex.exec(xml)
      files.push({
        key: keyMatch[1].replace(this.config.prefix ? `${this.config.prefix}/` : '', ''),
        size: sizeMatch ? parseInt(sizeMatch[1]) : 0,
        modified: modifiedMatch ? new Date(modifiedMatch[1]) : new Date(),
      })
    }

    return files
  }

  async get(key: string): Promise<Readable> {
    const res = await this.signedRequest('GET', key)
    if (!res.ok) {
      throw new Error(`S3 get failed: ${res.status} ${res.statusText}`)
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    const stream = new Readable()
    stream.push(buffer)
    stream.push(null)
    return stream
  }

  async put(key: string, content: Readable | Buffer | string, size?: number): Promise<void> {
    let body: Buffer
    if (Buffer.isBuffer(content)) {
      body = content
    } else if (typeof content === 'string') {
      body = Buffer.from(content)
    } else {
      const chunks: Buffer[] = []
      for await (const chunk of content) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      body = Buffer.concat(chunks)
    }

    const headers: Record<string, string> = {
      'Content-Length': String(body.length),
    }
    if (size) {
      headers['Content-Length'] = String(size)
    }

    const res = await this.signedRequest('PUT', key, body, headers)
    if (!res.ok) {
      throw new Error(`S3 put failed: ${res.status} ${res.statusText}`)
    }
  }

  async delete(key: string): Promise<void> {
    const res = await this.signedRequest('DELETE', key)
    if (!res.ok && res.status !== 404) {
      throw new Error(`S3 delete failed: ${res.status} ${res.statusText}`)
    }
  }

  async exists(key: string): Promise<boolean> {
    const res = await this.signedRequest('HEAD', key)
    return res.ok
  }

  async url(key: string): Promise<string> {
    return this.getObjectUrl(key)
  }
}
