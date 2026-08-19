import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runInit } from '../init'
import { runProjectPath, runProjectClean, runProjectReset } from '../project'
import { execSync } from 'child_process'

describe('Solarch Project Lifecycle Commands (solarch project)', () => {
  let tempBaseDir: string

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-proj-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true })
    }
    vi.restoreAllMocks()
  })

  describe('solarch project path', () => {
    it('1. project path returns correct paths', async () => {
      await runInit({
        yes: true,
        name: 'path-test-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'path-test-app')
      const report = await runProjectPath({
        dir: projectDir,
        exitOnComplete: false,
      })

      expect(report.projectDir).toBe(projectDir)
      expect(report.configFile).toBe(path.join(projectDir, 'solarch.config.ts'))
      expect(report.dataDir).toBe(path.join(projectDir, 'pb_data'))
      expect(report.migrationsDir).toBe(path.join(projectDir, 'pb_migrations'))
    })

    it('2. project path JSON safe', async () => {
      await runInit({
        yes: true,
        name: 'path-json-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'path-json-app')
      const report = await runProjectPath({
        dir: projectDir,
        json: true,
        exitOnComplete: false,
      })

      const rawJson = JSON.stringify(report)
      expect(rawJson).not.toContain('secret')
      expect(rawJson).not.toContain('password')
      expect(report.projectDir).toBe(projectDir)
    })
  })

  describe('solarch project clean', () => {
    it('3. clean removes runtime folders', async () => {
      const projectDir = path.join(tempBaseDir, 'clean-folders-app')
      fs.mkdirSync(projectDir)
      fs.mkdirSync(path.join(projectDir, 'pb_data'))
      fs.mkdirSync(path.join(projectDir, 'coverage'))
      fs.mkdirSync(path.join(projectDir, '.tmp'))
      fs.mkdirSync(path.join(projectDir, 'logs'))

      const result = await runProjectClean({
        dir: projectDir,
        yes: true,
        exitOnComplete: false,
      })

      expect(result.cleaned).toBe(true)
      expect(result.removedPaths).toContain('pb_data')
      expect(result.removedPaths).toContain('coverage')
      expect(result.removedPaths).toContain('.tmp')
      expect(result.removedPaths).toContain('logs')

      expect(fs.existsSync(path.join(projectDir, 'pb_data'))).toBe(false)
      expect(fs.existsSync(path.join(projectDir, 'coverage'))).toBe(false)
      expect(fs.existsSync(path.join(projectDir, '.tmp'))).toBe(false)
      expect(fs.existsSync(path.join(projectDir, 'logs'))).toBe(false)
    })

    it('4. clean keeps env/config/migrations/src', async () => {
      const projectDir = path.join(tempBaseDir, 'clean-keep-app')
      fs.mkdirSync(projectDir)
      fs.mkdirSync(path.join(projectDir, 'pb_data'))
      fs.mkdirSync(path.join(projectDir, 'pb_migrations'))
      fs.mkdirSync(path.join(projectDir, 'src'))

      fs.writeFileSync(path.join(projectDir, '.env'), 'JWT_SECRET=12345678901234567890123456789012\n')
      fs.writeFileSync(path.join(projectDir, 'solarch.config.ts'), 'export default {}\n')
      fs.writeFileSync(path.join(projectDir, 'pb_migrations', '001_init.js'), '// migration\n')
      fs.writeFileSync(path.join(projectDir, 'src', 'index.ts'), '// source\n')

      const result = await runProjectClean({
        dir: projectDir,
        yes: true,
        exitOnComplete: false,
      })

      expect(result.cleaned).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'pb_data'))).toBe(false)
      expect(fs.existsSync(path.join(projectDir, '.env'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'solarch.config.ts'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'pb_migrations', '001_init.js'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'src', 'index.ts'))).toBe(true)
    })

    it('5. clean requires confirmation in non-interactive mode without --yes', async () => {
      const projectDir = path.join(tempBaseDir, 'clean-confirm-app')
      fs.mkdirSync(projectDir)
      fs.mkdirSync(path.join(projectDir, 'coverage'))

      await expect(
        runProjectClean({
          dir: projectDir,
          yes: false,
          exitOnComplete: false,
        })
      ).rejects.toThrow(/Confirmation required in non-interactive mode/)
    })

    it('6. clean --yes works without prompting', async () => {
      const projectDir = path.join(tempBaseDir, 'clean-yes-app')
      fs.mkdirSync(projectDir)
      fs.mkdirSync(path.join(projectDir, 'coverage'))

      const result = await runProjectClean({
        dir: projectDir,
        yes: true,
        exitOnComplete: false,
      })

      expect(result.cleaned).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'coverage'))).toBe(false)
    })
  })

  describe('solarch project reset', () => {
    it('7. reset recreates pb_data', async () => {
      await runInit({
        yes: true,
        name: 'reset-recreate-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'reset-recreate-app')
      // Place a dummy file in pb_data to prove deletion and recreation
      fs.writeFileSync(path.join(projectDir, 'pb_data', 'dummy.db'), 'data')

      const result = await runProjectReset({
        dir: projectDir,
        yes: true,
        exitOnComplete: false,
      })

      expect(result.databaseRemoved).toBe(true)
      expect(result.runtimeRecreated).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'pb_data'))).toBe(true)
      expect(fs.existsSync(path.join(projectDir, 'pb_data', 'dummy.db'))).toBe(false)
    })

    it('8. reset runs doctor validation', async () => {
      await runInit({
        yes: true,
        name: 'reset-doctor-app',
        dir: tempBaseDir,
        exitOnComplete: false,
      })

      const projectDir = path.join(tempBaseDir, 'reset-doctor-app')
      const result = await runProjectReset({
        dir: projectDir,
        yes: true,
        exitOnComplete: false,
      })

      expect(result.doctorValidated).toBe(true)
      expect(result.reset).toBe(true)
    })
  })

  describe('Errors & CLI Help', () => {
    it('9. invalid directory fails', async () => {
      const invalidDir = path.join(tempBaseDir, 'non-existent-proj')

      await expect(
        runProjectPath({
          dir: invalidDir,
          exitOnComplete: false,
        })
      ).rejects.toThrow(/Project directory does not exist/)

      await expect(
        runProjectClean({
          dir: invalidDir,
          yes: true,
          exitOnComplete: false,
        })
      ).rejects.toThrow(/Project directory does not exist/)

      await expect(
        runProjectReset({
          dir: invalidDir,
          yes: true,
          exitOnComplete: false,
        })
      ).rejects.toThrow(/Project directory does not exist/)
    })

    it('10. CLI help works', () => {
      const cliPath = path.join(__dirname, '..', '..', 'cli.ts')
      const helpOutput = execSync(`npx tsx "${cliPath}" project --help`, {
        encoding: 'utf-8',
      })

      expect(helpOutput).toContain('Usage: solarch project')
      expect(helpOutput).toContain('path')
      expect(helpOutput).toContain('clean')
      expect(helpOutput).toContain('reset')
    })
  })
})
