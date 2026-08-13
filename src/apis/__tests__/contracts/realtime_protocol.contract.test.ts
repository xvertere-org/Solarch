import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Solarch } from '../../../solarch'
import { serve } from '../../serve'
import { WebSocket } from 'ws'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Realtime Protocol Contract (CORE-8 / CORE-10)', () => {
  let app: Solarch
  let server: http.Server
  let port: number
  let tempDir: string

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-rt-contract-'))
    app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: tempDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()
    server = await serve(app, 0)
    const addr = server.address()
    port = typeof addr === 'object' && addr ? addr.port : 8090
  })

  afterAll(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
    if (app) {
      await app.db().close()
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('sends protocolVersion: "1.0" in connected handshake message', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/realtime`)

    const connectedMsg = await new Promise<any>((resolve, reject) => {
      ws.on('message', (data) => {
        try {
          resolve(JSON.parse(data.toString()))
        } catch (e) {
          reject(e)
        }
      })
      ws.on('error', reject)
    })

    expect(connectedMsg).toHaveProperty('type', 'connected')
    expect(connectedMsg).toHaveProperty('clientId')
    expect(connectedMsg).toHaveProperty('protocolVersion', '1.0')
    expect(connectedMsg).toHaveProperty('authenticated')

    ws.close()
  })

  it('handles ping / pong heartbeat with timestamp', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/realtime`)

    await new Promise<void>((resolve) => {
      ws.on('open', () => resolve())
    })

    const pongPromise = new Promise<any>((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'pong') {
          resolve(msg)
        }
      })
    })

    ws.send(JSON.stringify({ type: 'ping' }))
    const pong = await pongPromise

    expect(pong.type).toBe('pong')
    expect(typeof pong.timestamp).toBe('number')

    ws.close()
  })
})
