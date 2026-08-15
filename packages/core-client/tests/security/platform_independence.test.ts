import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('CORE-CLIENT-1.9: Platform Independence Gate', () => {
  const srcDir = path.resolve(__dirname, '../../src')

  function getAllFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      if (fs.statSync(filePath).isDirectory()) {
        getAllFiles(filePath, fileList)
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        fileList.push(filePath)
      }
    }
    return fileList
  }

  const sourceFiles = getAllFiles(srcDir)

  it('Gate: zero Node built-in module imports in src/', () => {
    const forbiddenNodeModules = [
      'fs',
      'path',
      'crypto',
      'child_process',
      'os',
      'http',
      'https',
      'net',
      'tls',
      'stream',
      'buffer',
      'events',
      'util',
      'node:',
    ]

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const mod of forbiddenNodeModules) {
        const importRegex = new RegExp(`(from|require)\\s*['"](${mod}|node:${mod})['"]`, 'g')
        expect(
          importRegex.test(content),
          `Found forbidden Node built-in import '${mod}' in ${path.relative(srcDir, file)}`
        ).toBe(false)
      }
    }
  })

  it('Gate: zero platform/framework specific imports in src/', () => {
    const forbiddenFrameworks = [
      'react',
      'react-native',
      '@tauri-apps',
      'electron',
      'better-sqlite3',
      'pg',
      'mongodb',
      '@neondatabase',
    ]

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const fw of forbiddenFrameworks) {
        const importRegex = new RegExp(`(from|require)\\s*['"]${fw}`, 'g')
        expect(
          importRegex.test(content),
          `Found forbidden platform/framework import '${fw}' in ${path.relative(srcDir, file)}`
        ).toBe(false)
      }
    }
  })

  it('Gate: zero external runtime dependencies in package.json', () => {
    const pkgJsonPath = path.resolve(__dirname, '../../package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
    const deps = pkg.dependencies || {}
    expect(Object.keys(deps).length).toBe(0)
  })
})
