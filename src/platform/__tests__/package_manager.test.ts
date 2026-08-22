import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { PackageManagerDetector } from '../sdk/package-manager.js'

describe('PackageManagerDetector (Phase 3)', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-pm-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. respects explicit override manager', () => {
    expect(PackageManagerDetector.detect(tempDir, 'pnpm')).toBe('pnpm')
    expect(PackageManagerDetector.detect(tempDir, 'yarn')).toBe('yarn')
    expect(PackageManagerDetector.detect(tempDir, 'bun')).toBe('bun')
    expect(PackageManagerDetector.detect(tempDir, 'npm')).toBe('npm')
  })

  it('2. detects packageManager field in package.json', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test', packageManager: 'pnpm@8.15.0' }),
      'utf-8'
    )
    expect(PackageManagerDetector.detect(tempDir)).toBe('pnpm')

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test', packageManager: 'yarn@4.1.0' }),
      'utf-8'
    )
    expect(PackageManagerDetector.detect(tempDir)).toBe('yarn')

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test', packageManager: 'bun@1.0.28' }),
      'utf-8'
    )
    expect(PackageManagerDetector.detect(tempDir)).toBe('bun')
  })

  it('3. detects lockfiles in project directory', () => {
    fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), '', 'utf-8')
    expect(PackageManagerDetector.detect(tempDir)).toBe('pnpm')

    fs.unlinkSync(path.join(tempDir, 'pnpm-lock.yaml'))
    fs.writeFileSync(path.join(tempDir, 'yarn.lock'), '', 'utf-8')
    expect(PackageManagerDetector.detect(tempDir)).toBe('yarn')

    fs.unlinkSync(path.join(tempDir, 'yarn.lock'))
    fs.writeFileSync(path.join(tempDir, 'bun.lockb'), '', 'utf-8')
    expect(PackageManagerDetector.detect(tempDir)).toBe('bun')

    fs.unlinkSync(path.join(tempDir, 'bun.lockb'))
    fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '', 'utf-8')
    expect(PackageManagerDetector.detect(tempDir)).toBe('npm')
  })

  it('4. falls back to npm when no lockfile or packageManager field exists', () => {
    expect(PackageManagerDetector.detect(tempDir)).toBe('npm')
  })

  it('5. generates correct install and uninstall commands for all package managers', () => {
    const pkgs = ['solarch-web', 'solarch-ai']

    expect(PackageManagerDetector.getInstallCommand('npm', pkgs)).toBe('npm install solarch-web solarch-ai')
    expect(PackageManagerDetector.getInstallCommand('pnpm', pkgs, true)).toBe('pnpm add -D solarch-web solarch-ai')
    expect(PackageManagerDetector.getInstallCommand('yarn', pkgs)).toBe('yarn add solarch-web solarch-ai')
    expect(PackageManagerDetector.getInstallCommand('bun', pkgs)).toBe('bun add solarch-web solarch-ai')

    expect(PackageManagerDetector.getUninstallCommand('npm', pkgs)).toBe('npm uninstall solarch-web solarch-ai')
    expect(PackageManagerDetector.getUninstallCommand('pnpm', pkgs)).toBe('pnpm remove solarch-web solarch-ai')
    expect(PackageManagerDetector.getUninstallCommand('yarn', pkgs)).toBe('yarn remove solarch-web solarch-ai')
    expect(PackageManagerDetector.getUninstallCommand('bun', pkgs)).toBe('bun remove solarch-web solarch-ai')
  })
})
