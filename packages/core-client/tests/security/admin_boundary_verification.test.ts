/**
 * ADMIN-12: Static & Boundary Verification Gate
 * Verifies that admin/src contains zero direct transport calls and zero direct JWT handling.
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('ADMIN-12: Admin Boundary Verification Gate', () => {
  const adminSrcDir = path.resolve(process.cwd(), '../../admin/src')
  const rootAdminSrcDir = fs.existsSync(adminSrcDir)
    ? adminSrcDir
    : path.resolve(process.cwd(), 'admin/src')

  function getAllFiles(dir: string, extList: string[] = ['.ts', '.tsx', '.js']): string[] {
    const files: string[] = []
    if (!fs.existsSync(dir)) return files

    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, item.name)
      if (item.isDirectory()) {
        files.push(...getAllFiles(fullPath, extList))
      } else if (extList.some(ext => item.name.endsWith(ext))) {
        files.push(fullPath)
      }
    }
    return files
  }

  it('Gate 1: Legacy admin/src/api/client.ts is completely deleted', () => {
    const legacyPath = path.join(rootAdminSrcDir, 'api', 'client.ts')
    expect(fs.existsSync(legacyPath)).toBe(false)
  })

  it('Gate 2: admin/src contains ZERO direct calls to fetch, axios, XMLHttpRequest, WebSocket, EventSource', () => {
    const files = getAllFiles(rootAdminSrcDir)
    expect(files.length).toBeGreaterThan(0)

    const forbiddenPatterns = [
      /\bfetch\s*\(/g,
      /\baxios\b/g,
      /\bnew\s+XMLHttpRequest\b/g,
      /\bnew\s+WebSocket\b/g,
      /\bnew\s+EventSource\b/g,
    ]

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      for (const pattern of forbiddenPatterns) {
        const matches = content.match(pattern)
        expect(matches, `Forbidden transport pattern ${pattern} found in ${path.relative(rootAdminSrcDir, file)}`).toBeNull()
      }
    }
  })

  it('Gate 3: admin/src contains ZERO legacy localStorage tb_admin_auth references', () => {
    const files = getAllFiles(rootAdminSrcDir)
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      expect(content.includes('tb_admin_auth'), `Legacy auth key found in ${path.relative(rootAdminSrcDir, file)}`).toBe(false)
    }
  })

  it('Gate 4: Canonical Solarch client instance in admin/src/lib/solarch.ts uses LocalAuthStore', () => {
    const solarchClientPath = path.join(rootAdminSrcDir, 'lib', 'solarch.ts')
    expect(fs.existsSync(solarchClientPath)).toBe(true)
    const content = fs.readFileSync(solarchClientPath, 'utf8')
    expect(content).toContain('SolarchClient')
    expect(content).toContain('LocalAuthStore')
  })
})
