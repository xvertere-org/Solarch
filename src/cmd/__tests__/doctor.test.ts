import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runDoctor } from '../doctor'
import { runInit } from '../init'
import { createSuperuser } from '../superuser'
import { Solarch } from '../../solarch'

describe('CLI Doctor Command (System & Diagnostic Health)', () => {
  let tempBaseDir: string

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-doctor-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true })
    }
  })

  it('runs doctor diagnostics on a clean initialized project', async () => {
    // 1. Initialize clean project
    await runInit({
      yes: true,
      dir: tempBaseDir,
      name: 'doc-app',
      exitOnComplete: false,
    })

    const projectDir = path.join(tempBaseDir, 'doc-app')

    // 2. Run doctor in project directory
    const report = await runDoctor({
      cwd: projectDir,
      exitOnComplete: false,
    })

    expect(report).toBeDefined()
    expect(report.nodeVersion).toBe(process.version)
    expect(report.checks.length).toBeGreaterThanOrEqual(5)

    const nodeCheck = report.checks.find(c => c.id === 'node_runtime')
    expect(nodeCheck?.status).toBe('pass')

    const configCheck = report.checks.find(c => c.id === 'config_file')
    expect(configCheck?.status).toBe('pass')

    const dataCheck = report.checks.find(c => c.id === 'data_directory')
    expect(dataCheck?.status).toBe('pass')

    const dbCheck = report.checks.find(c => c.id === 'database_connectivity')
    expect(dbCheck?.status).toBe('pass')

    const suCheck = report.checks.find(c => c.id === 'superuser')
    expect(suCheck?.status).toBe('warn') // No superuser created yet
  })

  it('outputs JSON structured report with --json', async () => {
    const report = await runDoctor({
      cwd: tempBaseDir,
      json: true,
      exitOnComplete: false,
    })

    expect(report).toHaveProperty('timestamp')
    expect(report).toHaveProperty('nodeVersion')
    expect(report).toHaveProperty('platform')
    expect(report).toHaveProperty('cwd')
    expect(report).toHaveProperty('overallStatus')
    expect(report).toHaveProperty('checks')
    expect(Array.isArray(report.checks)).toBe(true)
  })

  it('detects active superuser account after creation', async () => {
    const dataDir = path.join(tempBaseDir, 'pb_data')
    fs.mkdirSync(dataDir, { recursive: true })

    const app = new Solarch({
      hideStartBanner: true,
      defaultDev: false,
      defaultDataDir: dataDir,
      dbProvider: 'sqlite',
    })
    await app.bootstrap()

    await createSuperuser({
      app,
      email: 'doctor-admin@example.com',
      password: 'SecurePassword123!',
      dataDir,
      exitOnComplete: false,
    })
    await app.db().close()

    const report = await runDoctor({
      cwd: tempBaseDir,
      defaultDataDir: dataDir,
      exitOnComplete: false,
    })

    const suCheck = report.checks.find(c => c.id === 'superuser')
    expect(suCheck?.status).toBe('pass')
    expect(suCheck?.message).toContain('Active superuser account verified')
  })

  it('reports failure when database is unreachable', async () => {
    const report = await runDoctor({
      cwd: tempBaseDir,
      dbProvider: 'postgres',
      connectionString: 'postgres://user:pass@127.0.0.1:54321/unreachable_db',
      exitOnComplete: false,
    })

    expect(report.overallStatus).toBe('unhealthy')
    const dbCheck = report.checks.find(c => c.id === 'database_connectivity')
    expect(dbCheck?.status).toBe('fail')
    expect(dbCheck?.message).toContain('Database connection failed')
  })
})
