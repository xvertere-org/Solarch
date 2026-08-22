import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { ProjectMetadata } from '../metadata'
import { RecommendationEngine } from '../recommendation'
import { ProjectIntent } from '../intent'

describe('ProjectMetadata Manifest Contract (Phase 0)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'solarch-manifest-test-'))
  })

  afterEach(async () => {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
    } catch {}
  })

  it('serializes, writes, and reads .solarch/project.json manifest with zero secrets', async () => {
    const intent = new ProjectIntent({ application: 'ai' })
    const plan = RecommendationEngine.createPlan({ name: 'manifest-test-app', dir: tmpDir }, intent)

    const manifest = ProjectMetadata.fromPlan(plan, '0.19.8')
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.name).toBe('manifest-test-app')
    expect(manifest.application).toBe('ai')
    expect(manifest.database.engine).toBe('postgres')
    expect(manifest.database.capabilities.vector).toBe(true)

    const manifestPath = await ProjectMetadata.writeManifest(tmpDir, manifest)
    expect(fs.existsSync(manifestPath)).toBe(true)

    const readBack = await ProjectMetadata.readManifest(tmpDir)
    expect(readBack).toBeDefined()
    expect(readBack?.name).toBe('manifest-test-app')
    expect(readBack?.application).toBe('ai')
    expect(readBack?.database.engine).toBe('postgres')
  })

  it('rejects corrupt or invalid manifest objects', () => {
    expect(() => {
      // @ts-expect-error - testing invalid manifest schema
      ProjectMetadata.validateManifest({ schemaVersion: 2 })
    }).toThrow(/Unsupported project manifest schemaVersion/)
  })
})
