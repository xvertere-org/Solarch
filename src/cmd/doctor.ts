import fs from 'fs'
import path from 'path'
import os from 'os'
import { Solarch } from '../solarch.js'
import { SolarchConfigInput } from '../core/config_types.js'
import { resolveAppConfig, loadConfigFile } from '../core/config_loader.js'
import { hasSuperuser } from './superuser.js'
import { AuthService } from '../platform/auth/auth-service.js'
import { ProjectMetadata } from '../ecosystem/metadata.js'

import dotenv from 'dotenv'

export interface DoctorOptions extends SolarchConfigInput {
  json?: boolean
  silent?: boolean
  exitOnComplete?: boolean
  cwd?: string
}

export interface DoctorCheckResult {
  id: string
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  details?: string
}

export interface DoctorReport {
  timestamp: string
  nodeVersion: string
  platform: string
  cwd: string
  overallStatus: 'healthy' | 'warning' | 'unhealthy'
  checks: DoctorCheckResult[]
}

export async function runDoctor(opts: DoctorOptions = {}): Promise<DoctorReport> {
  const cwd = opts.cwd || process.cwd()
  const checks: DoctorCheckResult[] = []
  const envSnapshot = { ...process.env }

  // Load target directory .env if present
  const envPath = path.join(cwd, '.env')
  const hasEnvFile = fs.existsSync(envPath)
  if (hasEnvFile) {
    try {
      const parsedEnv = dotenv.parse(fs.readFileSync(envPath, 'utf-8'))
      for (const [k, v] of Object.entries(parsedEnv)) {
        process.env[k] = v
      }
    } catch {}
  }

  // 1. Node.js Runtime Check
  const nodeVer = process.version
  const majorVer = parseInt(nodeVer.replace(/^v/, '').split('.')[0] || '0', 10)
  if (majorVer >= 20) {
    checks.push({
      id: 'node_runtime',
      name: 'Node.js Runtime',
      status: 'pass',
      message: `${nodeVer} (compatible: >= 20.0.0)`,
    })
  } else {
    checks.push({
      id: 'node_runtime',
      name: 'Node.js Runtime',
      status: 'fail',
      message: `${nodeVer} is outdated. Solarch requires Node.js v20.0.0 or higher.`,
    })
  }

  // 2. Configuration & Environment Check
  let fileConfig = null
  let hasConfigFile = false
  let configFileName = ''
  try {
    const jsPath = path.join(cwd, 'solarch.config.js')
    const tsPath = path.join(cwd, 'solarch.config.ts')
    const jsonPath = path.join(cwd, 'solarch.config.json')

    if (fs.existsSync(tsPath)) {
      hasConfigFile = true
      configFileName = 'solarch.config.ts'
    } else if (fs.existsSync(jsPath)) {
      hasConfigFile = true
      configFileName = 'solarch.config.js'
    } else if (fs.existsSync(jsonPath)) {
      hasConfigFile = true
      configFileName = 'solarch.config.json'
    }

    fileConfig = loadConfigFile(cwd)
  } catch (err: any) {
    checks.push({
      id: 'config_file',
      name: 'Configuration File',
      status: 'fail',
      message: `Failed to parse config file: ${err.message}`,
    })
  }

  if (!checks.some((c) => c.id === 'config_file')) {
    if (hasConfigFile) {
      checks.push({
        id: 'config_file',
        name: 'Configuration File',
        status: 'pass',
        message: `Loaded ${configFileName}${hasEnvFile ? ' (with .env)' : ''}`,
      })
    } else {
      checks.push({
        id: 'config_file',
        name: 'Configuration File',
        status: 'warn',
        message: `No solarch.config.ts found in working directory (using defaults${
          hasEnvFile ? ' with .env' : ''
        })`,
      })
    }
  }

  // 3. Data Directory Permissions Check
  let resolvedConfig
  try {
    resolvedConfig = resolveAppConfig(opts, process.env, {
      cwd,
      loadConfigFile: true,
    })
  } catch (err: any) {
    checks.push({
      id: 'config_resolution',
      name: 'Config Resolution',
      status: 'fail',
      message: `Configuration resolution error: ${err.message}`,
    })
  }

  const effectiveDataDir = resolvedConfig
    ? path.resolve(cwd, resolvedConfig.dataDir)
    : path.resolve(cwd, './pb_data')

  try {
    if (!fs.existsSync(effectiveDataDir)) {
      fs.mkdirSync(effectiveDataDir, { recursive: true })
    }
    // Test write permission
    const testFile = path.join(
      effectiveDataDir,
      `.doctor_rw_test_${Date.now()}`
    )
    fs.writeFileSync(testFile, 'test')
    fs.unlinkSync(testFile)

    checks.push({
      id: 'data_directory',
      name: 'Data Directory',
      status: 'pass',
      message: `${
        path.relative(cwd, effectiveDataDir) || '.'
      } (read/write verified)`,
    })
  } catch (err: any) {
    checks.push({
      id: 'data_directory',
      name: 'Data Directory',
      status: 'fail',
      message: `Data directory "${effectiveDataDir}" is not writable: ${err.message}`,
    })
  }

  // 4. Database Connectivity Probe & App Bootstrap
  let app: Solarch | null = null
  let dbConnected = false
  try {
    app = new Solarch({
      ...opts,
      defaultDataDir: effectiveDataDir,
      hideStartBanner: true,
    })

    await app.bootstrap()
    dbConnected = app.isBootstrapped()

    checks.push({
      id: 'database_connectivity',
      name: 'Database Connectivity',
      status: 'pass',
      message: `Connected to ${app.dbProvider} (${
        app.dbProvider === 'sqlite' ? 'WAL mode' : 'external'
      })`,
    })
  } catch (err: any) {
    checks.push({
      id: 'database_connectivity',
      name: 'Database Connectivity',
      status: 'fail',
      message: `Database connection failed: ${err.message}`,
    })
  }

  // 5. Migrations State Check
  if (app && dbConnected) {
    try {
      const migrationsDir = path.join(cwd, 'pb_migrations')
      const localFiles = fs.existsSync(migrationsDir)
        ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.js'))
        : []

      const hasMigrationsTable = await app
        .db()
        .hasTable('_applied_migrations')
      if (!hasMigrationsTable) {
        if (localFiles.length > 0) {
          checks.push({
            id: 'migrations',
            name: 'Database Migrations',
            status: 'warn',
            message: `0 applied, ${localFiles.length} pending (run "solarch migrate up")`,
          })
        } else {
          checks.push({
            id: 'migrations',
            name: 'Database Migrations',
            status: 'pass',
            message: 'Zero migrations found (pb_migrations/)',
          })
        }
      } else {
        const status = await app.migrationStatus()
        const total = status.length
        const applied = status.filter((m) => m.applied).length
        const pending = total - applied

        if (pending > 0) {
          checks.push({
            id: 'migrations',
            name: 'Database Migrations',
            status: 'warn',
            message: `${applied} applied, ${pending} pending (run "solarch migrate up")`,
          })
        } else {
          checks.push({
            id: 'migrations',
            name: 'Database Migrations',
            status: 'pass',
            message:
              total === 0
                ? 'Zero migrations found (pb_migrations/)'
                : `All ${applied} migration(s) applied`,
          })
        }
      }
    } catch (err: any) {
      checks.push({
        id: 'migrations',
        name: 'Database Migrations',
        status: 'warn',
        message: `Could not determine migration status: ${err.message}`,
      })
    }
  }

  // 6. Superuser Presence Check
  if (app && dbConnected) {
    try {
      const suExists = await hasSuperuser(app)
      if (suExists) {
        checks.push({
          id: 'superuser',
          name: 'Superuser Status',
          status: 'pass',
          message: 'Active superuser account verified',
        })
      } else {
        checks.push({
          id: 'superuser',
          name: 'Superuser Status',
          status: 'warn',
          message:
            'No superuser account exists (run "solarch superuser" to create one)',
        })
      }
    } catch (err: any) {
      checks.push({
        id: 'superuser',
        name: 'Superuser Status',
        status: 'warn',
        message: `Could not check superuser status: ${err.message}`,
      })
    } finally {
      try {
        await app.db().close()
      } catch {}
    }
  }

  // 7. Platform Authentication & Project Linkage Check (Phase 2)
  try {
    const authService = new AuthService()
    const resolved = await authService.resolveSession()
    const manifest = await ProjectMetadata.readManifest(cwd).catch(() => null)

    if (resolved.session.isAuthenticated()) {
      const userDesc = resolved.user?.email || resolved.session.userId || 'User'
      if (manifest?.platform) {
        checks.push({
          id: 'platform_auth',
          name: 'Platform Authentication',
          status: 'pass',
          message: `Authenticated as ${userDesc} (Linked: ${manifest.platform.projectId})`,
        })
      } else {
        checks.push({
          id: 'platform_auth',
          name: 'Platform Authentication',
          status: 'pass',
          message: `Authenticated as ${userDesc} (Local project not linked)`,
        })
      }
    } else {
      if (manifest?.platform) {
        checks.push({
          id: 'platform_auth',
          name: 'Platform Authentication',
          status: 'warn',
          message: `Project is linked to platform (${manifest.platform.projectId}), but CLI is not logged in (run "solarch login")`,
        })
      } else {
        checks.push({
          id: 'platform_auth',
          name: 'Platform Authentication',
          status: 'pass',
          message: 'Offline mode active (run "solarch login" for platform integration)',
        })
      }
    }
  } catch {
    checks.push({
      id: 'platform_auth',
      name: 'Platform Authentication',
      status: 'pass',
      message: 'Offline mode active',
    })
  }

  // Overall status evaluation
  const hasFailures = checks.some((c) => c.status === 'fail')
  const hasWarnings = checks.some((c) => c.status === 'warn')
  const overallStatus: 'healthy' | 'warning' | 'unhealthy' = hasFailures
    ? 'unhealthy'
    : hasWarnings
    ? 'warning'
    : 'healthy'

  const report: DoctorReport = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    cwd,
    overallStatus,
    checks,
  }

  // Output formatting
  if (!opts.silent) {
    if (opts.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log('\n⚡ Solarch Doctor - Environment & System Diagnostics\n')

      for (const check of checks) {
        let icon = '✔'
        if (check.status === 'warn') icon = '⚠'
        if (check.status === 'fail') icon = '✖'

        console.log(`  [${icon}] ${check.name}: ${check.message}`)
        if (check.details) {
          console.log(`      ${check.details}`)
        }
      }

      console.log('')
      if (overallStatus === 'healthy') {
        console.log('✔ All systems operational.\n')
      } else if (overallStatus === 'warning') {
        console.log(
          '⚠ System operational with warnings (see details above).\n'
        )
      } else {
        console.log(
          '✖ Diagnostic check failed with one or more fatal issues.\n'
        )
      }
    }
  }

  // Restore process.env so doctor checks on a target cwd do not leak
  for (const key of Object.keys(process.env)) {
    if (!(key in envSnapshot)) {
      delete process.env[key]
    } else {
      process.env[key] = envSnapshot[key]
    }
  }

  if (opts.exitOnComplete ?? true) {
    process.exit(hasFailures ? 1 : 0)
  }

  return report
}
