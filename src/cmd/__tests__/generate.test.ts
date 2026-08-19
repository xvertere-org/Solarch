import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  generateCollection,
  generateMigration,
  generateHook,
  validateResourceName,
  getNextMigrationPrefix,
} from '../generate/index.js'

describe('solarch generate Resource Scaffolding', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-generate-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('1. validates resource names strictly and rejects path traversal', () => {
    expect(() => validateResourceName('../users')).toThrow('Path traversal')
    expect(() => validateResourceName('../../etc/passwd')).toThrow('Path traversal')
    expect(() => validateResourceName('invalid space')).toThrow('alphanumeric characters')
    expect(() => validateResourceName('')).toThrow('required')
    expect(() => validateResourceName('valid_name-123')).not.toThrow()
  })

  it('2. auto-increments migration numbering', () => {
    const migrationsDir = path.join(tempDir, 'pb_migrations')
    fs.mkdirSync(migrationsDir, { recursive: true })

    expect(getNextMigrationPrefix(migrationsDir)).toBe('001')

    fs.writeFileSync(path.join(migrationsDir, '001_initial.js'), '// initial')
    expect(getNextMigrationPrefix(migrationsDir)).toBe('002')

    fs.writeFileSync(path.join(migrationsDir, '002_add_posts.js'), '// posts')
    expect(getNextMigrationPrefix(migrationsDir)).toBe('003')
  })

  it('3. generates collection migration with up/down schema', async () => {
    const result = await generateCollection({
      name: 'users',
      dir: tempDir,
      exitOnComplete: false,
    })

    expect(result.type).toBe('collection')
    expect(result.created).toBe(true)

    const expectedFile = path.join(tempDir, 'pb_migrations', '001_create_users.js')
    expect(fs.existsSync(expectedFile)).toBe(true)

    const content = fs.readFileSync(expectedFile, 'utf-8')
    expect(content).toContain('CREATE TABLE IF NOT EXISTS users')
    expect(content).toContain('DROP TABLE IF EXISTS users')
  })

  it('4. generates generic migration file', async () => {
    const result = await generateMigration({
      name: 'add_posts',
      dir: tempDir,
      exitOnComplete: false,
    })

    expect(result.type).toBe('migration')
    const expectedFile = path.join(tempDir, 'pb_migrations', '001_add_posts.js')
    expect(fs.existsSync(expectedFile)).toBe(true)

    const content = fs.readFileSync(expectedFile, 'utf-8')
    expect(content).toContain('async up(app)')
    expect(content).toContain('async down(app)')
  })

  it('5. generates hook in src/hooks/', async () => {
    const result = await generateHook({
      name: 'auth',
      dir: tempDir,
      exitOnComplete: false,
    })

    expect(result.type).toBe('hook')
    const expectedFile = path.join(tempDir, 'src', 'hooks', 'auth.ts')
    expect(fs.existsSync(expectedFile)).toBe(true)

    const content = fs.readFileSync(expectedFile, 'utf-8')
    expect(content).toContain('export default async function hook(ctx: any)')
  })

  it('6. protects existing files from accidental overwrite', async () => {
    await generateHook({
      name: 'auth',
      dir: tempDir,
      exitOnComplete: false,
    })

    // Attempting to generate again without --force must fail
    await expect(
      generateHook({
        name: 'auth',
        dir: tempDir,
        force: false,
        exitOnComplete: false,
      })
    ).rejects.toThrow('Hook already exists')

    // With --force it should succeed
    const forced = await generateHook({
      name: 'auth',
      dir: tempDir,
      force: true,
      exitOnComplete: false,
    })
    expect(forced.created).toBe(true)
  })
})
