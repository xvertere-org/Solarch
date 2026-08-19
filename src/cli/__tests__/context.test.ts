import { describe, it, expect } from 'vitest'
import { Command } from 'commander'
import { resolveDir, resolveDatabaseOptions, resolveRuntimeOptions } from '../context.js'

describe('CLI Context Resolution (src/cli/context.ts)', () => {
  describe('resolveDir', () => {
    it('returns direct opts.dir when provided by subcommand', () => {
      const opts = { dir: '/custom/path' }
      expect(resolveDir(opts)).toBe('/custom/path')
    })

    it('falls back to default fallback when no dir provided anywhere', () => {
      const opts = {}
      expect(resolveDir(opts)).toBe('.')
      expect(resolveDir(opts, undefined, '/default/fallback')).toBe('/default/fallback')
    })

    it('recovers --dir from parent command when Commander routes option to root', () => {
      const root = new Command()
      root.option('--dir <path>', 'data directory', './pb_data')
      const sub = root.command('inspect')

      // Simulate Commander parsing "solarch --dir /explicit/root/dir inspect"
      root.parse(['node', 'solarch', '--dir', '/explicit/root/dir', 'inspect'])

      expect(resolveDir({}, sub)).toBe('/explicit/root/dir')
    })

    it('ignores default "./pb_data" on root program when resolving project directory', () => {
      const root = new Command()
      root.option('--dir <path>', 'data directory', './pb_data')
      const sub = root.command('inspect')

      // Simulate Commander parsing "solarch inspect" (no explicit --dir)
      root.parse(['node', 'solarch', 'inspect'])

      // Should ignore root default './pb_data' and fall back to '.'
      expect(resolveDir({}, sub)).toBe('.')
    })

    it('walks multi-level parent command hierarchy', () => {
      const root = new Command()
      root.option('--dir <path>', 'data directory', './pb_data')
      const group = root.command('inspect')
      const sub = group.command('project')

      // Parent has custom dir
      root.parse(['node', 'solarch', '--dir', '/nested/project/dir', 'inspect', 'project'])

      expect(resolveDir({}, sub)).toBe('/nested/project/dir')
    })
  })

  describe('resolveDatabaseOptions', () => {
    it('prefers subcommand database options when present', () => {
      const subOpts = {
        db: 'postgres',
        dbUrl: 'postgres://custom:5432/db',
        dbDriver: 'neon',
        dbMode: 'http',
      }
      const res = resolveDatabaseOptions(subOpts)
      expect(res.db).toBe('postgres')
      expect(res.dbUrl).toBe('postgres://custom:5432/db')
      expect(res.dbDriver).toBe('neon')
      expect(res.dbMode).toBe('http')
    })

    it('inherits database options from parent when not on subcommand', () => {
      const root = new Command()
      root
        .option('--db <provider>', 'database provider')
        .option('--db-url <url>', 'database url')
        .option('--db-driver <driver>', 'driver')
        .option('--db-mode <mode>', 'mode')
      const sub = root.command('doctor')

      root.parse([
        'node',
        'solarch',
        '--db',
        'postgres',
        '--db-url',
        'postgres://root:5432/db',
        'doctor',
      ])

      const res = resolveDatabaseOptions({}, sub)
      expect(res.db).toBe('postgres')
      expect(res.dbUrl).toBe('postgres://root:5432/db')
    })
  })

  describe('resolveRuntimeOptions', () => {
    it('resolves dev and query timeout defaults', () => {
      const res = resolveRuntimeOptions({})
      expect(res.dev).toBe(false)
      expect(res.queryTimeout).toBe(30)
    })

    it('resolves explicit parent options', () => {
      const root = new Command()
      root
        .option('--dev', 'enable dev mode')
        .option('--query-timeout <seconds>', 'query timeout', '30')
        .option('--encryptionEnv <env>', 'encryption env')
      const sub = root.command('status')

      root.parse(['node', 'solarch', '--dev', '--query-timeout', '60', '--encryptionEnv', 'SOLARCH_KEY', 'status'])

      const res = resolveRuntimeOptions({}, sub)
      expect(res.dev).toBe(true)
      expect(res.queryTimeout).toBe(60)
      expect(res.encryptionEnv).toBe('SOLARCH_KEY')
    })
  })
})
