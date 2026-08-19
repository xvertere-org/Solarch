import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import { formatGroupedHelp } from '../command'

describe('CLI Help & Command Aliases', () => {
  const distCliPath = path.join(__dirname, '..', '..', '..', 'dist', 'cli.js')
  const srcCliPath = path.join(__dirname, '..', '..', 'cli.ts')
  const execCmd = fs.existsSync(distCliPath) ? `node "${distCliPath}"` : `npx tsx "${srcCliPath}"`

  it('1. formatGroupedHelp contains all command categories', () => {
    const help = formatGroupedHelp('0.19.5')
    expect(help).toContain('⚡ Solarch CLI v0.19.5')
    expect(help).toContain('PROJECT')
    expect(help).toContain('DEVELOPMENT')
    expect(help).toContain('CONFIGURATION')
    expect(help).toContain('DATABASE')
    expect(help).toContain('INSPECTION')
    expect(help).toContain('ACCOUNT')
    expect(help).toContain('solarch <command> --help')
  })

  it('2. solarch --help CLI execution contains grouped layout', () => {
    const output = execSync(`${execCmd} --help`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    })
    expect(output).toContain('PROJECT')
    expect(output).toContain('init')
    expect(output).toContain('project')
    expect(output).toContain('DEVELOPMENT')
    expect(output).toContain('dev')
    expect(output).toContain('serve')
    expect(output).toContain('CONFIGURATION')
    expect(output).toContain('config')
    expect(output).toContain('env')
    expect(output).toContain('DATABASE')
    expect(output).toContain('migrate')
    expect(output).toContain('INSPECTION')
    expect(output).toContain('doctor')
    expect(output).toContain('status')
    expect(output).toContain('inspect')
  })

  it('3. solarch version command prints detailed runtime info', () => {
    const output = execSync(`${execCmd} version`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    })
    expect(output).toContain('⚡ Solarch CLI')
    expect(output).toContain('Version:')
    expect(output).toContain('Node:')
    expect(output).toContain('Platform:')
  })

  it('4. aliases work correctly', () => {
    // solarch create -> solarch init
    const createHelp = execSync(`${execCmd} create --help`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    })
    expect(createHelp).toContain('init')

    // solarch check -> solarch doctor
    const checkHelp = execSync(`${execCmd} check --help`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    })
    expect(checkHelp).toContain('doctor')

    // solarch ls -> solarch inspect
    const lsHelp = execSync(`${execCmd} ls --help`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    })
    expect(lsHelp).toContain('inspect')

    // solarch about -> solarch info
    const aboutHelp = execSync(`${execCmd} about --help`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    })
    expect(aboutHelp).toContain('info')
  })

  it('5. unknown command with typo suggests closest match', () => {
    try {
      execSync(`${execCmd} migarte`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000,
      })
      expect.unreachable('Should fail with exit code 1')
    } catch (err: any) {
      expect(err.status).toBe(1)
      const output = (err.stderr || err.stdout || '').toString()
      expect(output).toContain('Unknown command: migarte')
      expect(output).toContain('Did you mean?')
      expect(output).toContain('→ migrate')
      expect(output).toContain('solarch migrate --help')
    }
  })
})
