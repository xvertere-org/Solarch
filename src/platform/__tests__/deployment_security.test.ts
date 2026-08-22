import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { DeploymentScanner } from '../deployment/scanner.js'
import { DeploymentPackager } from '../deployment/packager.js'
import { ProjectManifest } from '../../ecosystem/metadata.js'

describe('Deployment Secret Scanner & Exclusion Boundary (Phase 7)', () => {
  let tmpDir: string

  const sampleManifest: ProjectManifest = {
    schemaVersion: 1,
    name: 'security-app',
    runtimeVersion: '0.19.8',
    capabilities: {},
    sdks: [],
    plugins: [],
    platform: {
      projectId: 'prj-sec-123',
      orgId: 'org-1',
      linkedAt: '2026-08-22T00:00:00.000Z',
    },
  }

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-deploy-sec-'))
    await fs.promises.mkdir(path.join(tmpDir, 'src'), { recursive: true })
    await fs.promises.mkdir(path.join(tmpDir, 'pb_data'), { recursive: true })
    await fs.promises.mkdir(path.join(tmpDir, 'node_modules'), { recursive: true })

    await fs.promises.writeFile(path.join(tmpDir, 'src', 'index.ts'), 'export const ready = true\n')
  })

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true })
  })

  it('1. Strictly excludes .env, pb_data, and private key files from packaging', async () => {
    await fs.promises.writeFile(path.join(tmpDir, '.env'), 'DATABASE_URL=postgres://secret@localhost/db\n')
    await fs.promises.writeFile(path.join(tmpDir, '.env.production'), 'SECRET=12345\n')
    await fs.promises.writeFile(path.join(tmpDir, 'server.key'), 'PRIVATE KEY\n')
    await fs.promises.writeFile(path.join(tmpDir, 'cert.pem'), 'CERT\n')
    await fs.promises.writeFile(path.join(tmpDir, 'pb_data', 'data.db'), 'BINARY DATA')
    await fs.promises.writeFile(path.join(tmpDir, 'node_modules', 'foo.js'), 'module.exports = {}')

    const { includedFiles, scanResult } = await DeploymentScanner.scanProject(tmpDir)

    expect(scanResult.passed).toBe(true)
    expect(includedFiles).toEqual(['src/index.ts'])
    expect(includedFiles).not.toContain('.env')
    expect(includedFiles).not.toContain('.env.production')
    expect(includedFiles).not.toContain('server.key')
    expect(includedFiles).not.toContain('cert.pem')
    expect(includedFiles).not.toContain('pb_data/data.db')
    expect(includedFiles).not.toContain('node_modules/foo.js')
  })

  it('2. Aborts packaging if unredacted secret is detected in source code', async () => {
    await fs.promises.writeFile(
      path.join(tmpDir, 'src', 'config.ts'),
      'export const conn = "DATABASE_URL=postgres://admin:supersecretpassword@remote.host:5432/app"\n'
    )

    await expect(
      DeploymentPackager.createBundle(tmpDir, sampleManifest, { environment: 'production' })
    ).rejects.toThrow(/Deployment packaging aborted due to detected secret leaks/)
  })

  it('3. Detects private key blocks embedded in source files', async () => {
    await fs.promises.writeFile(
      path.join(tmpDir, 'src', 'keys.ts'),
      'export const key = "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk..."\n'
    )

    const { scanResult } = await DeploymentScanner.scanProject(tmpDir)
    expect(scanResult.passed).toBe(false)
    expect(scanResult.leaks.length).toBeGreaterThan(0)
    expect(scanResult.leaks[0].rule).toBe('Raw Private Key Block')
  })
})
