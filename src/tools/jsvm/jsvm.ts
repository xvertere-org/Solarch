import { BaseApp } from '../../core/base'
import vm from 'vm'
import fs from 'fs'
import path from 'path'
import { runInDeno, sanitizeSettingsForSandbox, checkDenoAvailability, SerializableContext } from './deno_sandbox'

export type JSVMSandboxMode = 'legacy' | 'isolated'

export function getSandboxMode(): JSVMSandboxMode {
  const mode = process.env.JSVM_SANDBOX_MODE?.toLowerCase()
  if (mode === 'isolated') return 'isolated'
  return 'legacy'
}

export interface JSVMContext {
  $app: BaseApp
  $apis: {
    record: string
    collection: string
    settings: string
  }
  console: Console
  require: NodeRequire
}

export class JSVM {
  private app: BaseApp
  private hooksDir: string

  constructor(app: BaseApp, hooksDir = 'pb_hooks') {
    this.app = app
    this.hooksDir = path.join(process.cwd(), hooksDir)
  }

  async loadHooks(): Promise<void> {
    if (!fs.existsSync(this.hooksDir)) {
      return
    }

    const mode = getSandboxMode()
    if (mode === 'isolated') {
      const denoVersion = await checkDenoAvailability()
      if (denoVersion) {
        console.log(`[JSVM] Isolated sandbox mode active for agent nodes (Deno ${denoVersion})`)
      } else {
        console.warn(
          '[JSVM] JSVM_SANDBOX_MODE=isolated but Deno is not available. ' +
          'Agent code/condition nodes will fall back to legacy vm.Script execution.'
        )
      }
      console.log('[JSVM] Hooks always run in legacy mode (operator-trusted files)')
    }

    const files = fs.readdirSync(this.hooksDir)
      .filter(f => f.endsWith('.js'))
      .sort()

    for (const file of files) {
      try {
        await this.executeHookFileLegacy(file)
        console.log(`JS hook loaded: ${file}`)
      } catch (err: any) {
        console.error(`JS hook failed: ${file}`, err.message)
      }
    }
  }

  private async executeHookFileLegacy(filename: string): Promise<void> {
    const fullPath = path.join(this.hooksDir, filename)
    const code = fs.readFileSync(fullPath, 'utf-8')

    const context = this.createContext()
    const script = new vm.Script(code, { filename })
    script.runInContext(context, { timeout: 5000 })
  }

  private createContext(): vm.Context {
    const app = this.app
    const crypto = require('crypto')

    const sandbox: any = {
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Date,
      Math,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      Promise,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Symbol,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURI,
      decodeURI,
      encodeURIComponent,
      decodeURIComponent,
      escape,
      unescape,
      Intl,
      URL,
      URLSearchParams,
      crypto: {
        randomBytes: (size: number) => crypto.randomBytes(size),
        randomInt: (min: number, max: number) => crypto.randomInt(min, max),
        createHash: (algo: string) => crypto.createHash(algo),
        createHmac: (algo: string, key: string) => crypto.createHmac(algo, key),
        timingSafeEqual: (a: Buffer, b: Buffer) => crypto.timingSafeEqual(a, b),
      },
      fetch: globalThis.fetch.bind(globalThis),

      $app: this.createAppProxy(),
      $apis: {
        record: '/api/collections',
        collection: '/api/collections',
        settings: '/api/settings',
      },
      onBootstrap: (handler: Function) => app.onBootstrap.bindFunc(handler as any),
      onServe: (handler: Function) => app.onServe.bindFunc(handler as any),
      onRecordCreate: (tag: string, handler: Function) => app.onRecordCreate.bindFunc(handler as any),
      onRecordUpdate: (tag: string, handler: Function) => app.onRecordUpdate.bindFunc(handler as any),
      onRecordDelete: (tag: string, handler: Function) => app.onRecordDelete.bindFunc(handler as any),
      onCollectionCreate: (handler: Function) => app.onCollectionCreate.bindFunc(handler as any),
      onCollectionUpdate: (handler: Function) => app.onCollectionUpdate.bindFunc(handler as any),
      onCollectionDelete: (handler: Function) => app.onCollectionDelete.bindFunc(handler as any),
    }

    return vm.createContext(sandbox)
  }

  private createAppProxy(): any {
    const app = this.app
    return {
      settings: () => app.settings(),
      db: () => app.db(),
      logger: () => app.logger(),
      findCollectionByNameOrId: (name: string) => app.findCollectionByNameOrId(name),
      findAllCollections: (types?: string[]) => app.findAllCollections(types),
      save: (model: any) => app.save(model),
      delete: (model: any) => app.delete(model),
      generateJWT: (payload: any, secret: string, duration: string) => app.generateJWT(payload, secret, duration),
      parseJWT: (token: string, secret: string) => app.parseJWT(token, secret),
      hashPassword: (password: string) => app.hashPassword(password),
      verifyPassword: (password: string, hash: string) => app.verifyPassword(password, hash),
      dataDir: app.dataDir,
      isDev: app.isDev,
    }
  }
}
