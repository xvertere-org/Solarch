import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runInit } from '../init.js'
import { runDoctor } from '../doctor.js'

describe('Template Isolation and Doctor Verification (All 5 Templates)', () => {
  let testRoot: string

  beforeEach(() => {
    testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-iso-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true })
    }
  })

  const templates = ['minimal', 'api', 'realtime', 'saas', 'ai'] as const

  for (const template of templates) {
    it(`scaffolds and validates template: ${template}`, async () => {
      const projectName = `test-${template}`
      const projectDir = path.join(testRoot, projectName)

      // 1. Scaffolding
      const res = await runInit({
        name: projectName,
        dir: testRoot,
        template,
        yes: true,
        exitOnComplete: false,
      })

      expect(res.projectDir).toBe(projectDir)
      expect(fs.existsSync(path.join(projectDir, 'solarch.config.ts'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, '.env'))).toBe(true)

      // 2. Doctor Diagnostics
      const report = await runDoctor({
        cwd: projectDir,
        dir: path.join(projectDir, 'pb_data'),
        json: true,
        exitOnComplete: false,
      })

      expect(report.overallStatus).not.toBe('unhealthy')
      expect(report.checks.some(c => c.id === 'config_file' && c.status === 'pass')).toBe(true)
      expect(report.checks.some(c => c.status === 'fail')).toBe(false)
    })
  }
})
