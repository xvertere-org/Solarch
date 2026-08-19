import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

describe('CLI Option Resolution E2E (--dir external paths)', () => {
  let tmpRoot: string
  let projectDir: string
  const cliPath = path.resolve(__dirname, '../../../dist/cli.js')

  beforeAll(() => {
    if (!fs.existsSync(cliPath)) {
      execSync('npm run build', { cwd: path.resolve(__dirname, '../../..'), stdio: 'pipe' })
    }
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-opt-test-'))
    projectDir = path.join(tmpRoot, 'my-external-app')

    // Scaffolds project using CLI init into external tmp directory
    execSync(`node "${cliPath}" init --name my-external-app --template minimal --db sqlite --yes --dir "${tmpRoot}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
  })

  afterAll(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true })
    } catch {}
  })

  it('scaffolded correctly inside target directory, not in CWD', () => {
    expect(fs.existsSync(projectDir)).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'solarch.config.ts'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, '.env'))).toBe(true)
    expect(fs.existsSync(path.join(projectDir, 'pb_data'))).toBe(true)
  })

  it('doctor resolves external --dir correctly and finds config', () => {
    const stdout = execSync(`node "${cliPath}" doctor --dir "${projectDir}" --json`, {
      encoding: 'utf-8',
    })
    const report = JSON.parse(stdout)
    expect(report.cwd).toBe(projectDir)
    const configCheck = report.checks.find((c: any) => c.id === 'config_file')
    expect(configCheck.status).toBe('pass')
    expect(configCheck.message).toContain('solarch.config.ts')
  })

  it('status resolves external --dir correctly', () => {
    const stdout = execSync(`node "${cliPath}" status --dir "${projectDir}" --json`, {
      encoding: 'utf-8',
    })
    const status = JSON.parse(stdout)
    expect(status.overallStatus).toBeDefined()
    expect(status.checks.configuration.status).toBe('pass')
    expect(status.checks.configuration.message).toContain('solarch.config.ts')
  })

  it('info resolves external --dir correctly', () => {
    const stdout = execSync(`node "${cliPath}" info --dir "${projectDir}" --json`, {
      encoding: 'utf-8',
    })
    const info = JSON.parse(stdout)
    expect(info.projectDir).toBe(projectDir)
    expect(info.name).toBe('my-external-app')
    expect(info.configFile).toBe('solarch.config.ts')
  })

  it('inspect project resolves external --dir correctly', () => {
    const stdout = execSync(`node "${cliPath}" inspect project --dir "${projectDir}" --json`, {
      encoding: 'utf-8',
    })
    const report = JSON.parse(stdout)
    expect(report.projectName).toBe('my-external-app')
    expect(report.projectDir).toBe(projectDir)
    expect(report.configFile).toBe('solarch.config.ts')
  })

  it('inspect database resolves external --dir correctly', () => {
    const stdout = execSync(`node "${cliPath}" inspect database --dir "${projectDir}" --json`, {
      encoding: 'utf-8',
    })
    const report = JSON.parse(stdout)
    expect(report.provider).toBe('sqlite')
  })

  it('inspect features resolves external --dir correctly', () => {
    const stdout = execSync(`node "${cliPath}" inspect features --dir "${projectDir}" --json`, {
      encoding: 'utf-8',
    })
    const report = JSON.parse(stdout)
    expect(report.auth.providers).toEqual(['email'])
  })

  it('config show resolves external --dir correctly', () => {
    const stdout = execSync(`node "${cliPath}" config show --dir "${projectDir}" --json`, {
      encoding: 'utf-8',
    })
    const report = JSON.parse(stdout)
    expect(report.project.name).toBe('my-external-app')
    expect(report.project.dir).toBe(projectDir)
    expect(report.database.provider).toBe('sqlite')
  })

  it('env show resolves external --dir correctly', () => {
    const stdout = execSync(`node "${cliPath}" env show --dir "${projectDir}" --json`, {
      encoding: 'utf-8',
    })
    const report = JSON.parse(stdout)
    expect(report.envPath).toBe(path.join(projectDir, '.env'))
    expect(report.variables.JWT_SECRET).toBe('configured')
  })

  it('project path resolves external --dir correctly', () => {
    const stdout = execSync(`node "${cliPath}" project path --dir "${projectDir}" --json`, {
      encoding: 'utf-8',
    })
    const report = JSON.parse(stdout)
    expect(report.projectDir).toBe(projectDir)
    expect(report.configFile).toBe(path.join(projectDir, 'solarch.config.ts'))
  })

  it('routes resolves external --dir correctly', () => {
    const stdout = execSync(`node "${cliPath}" routes --dir "${projectDir}" --json`, {
      encoding: 'utf-8',
    })
    const report = JSON.parse(stdout)
    expect(Array.isArray(report.routes)).toBe(true)
    expect(Array.isArray(report.realtime)).toBe(true)
  })
})
