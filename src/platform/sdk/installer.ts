/**
 * Solarch CLI SDK Installer & Reconciliation Service (Phase 3)
 */

import * as fs from 'fs'
import * as path from 'path'
import { SdkRegistry } from './registry.js'
import { PackageManagerDetector } from './package-manager.js'
import { PackageManagerType, SdkPackageInfo, SdkSyncPlan } from './types.js'
import { ProjectMetadata } from '../../ecosystem/metadata.js'

export class SdkInstaller {
  /**
   * Returns complete status of all Solarch SDK packages in the target project.
   */
  public static async listSdkStatus(
    projectDir: string = process.cwd()
  ): Promise<SdkPackageInfo[]> {
    const installedDeps = SdkInstaller.readInstalledDependencies(projectDir)
    const manifest = await ProjectMetadata.readManifest(projectDir).catch(() => null)
    const requiredSdks = new Set(manifest?.sdks || [])

    return SdkRegistry.getAll().map((entry) => {
      const isInstalled = entry.name in installedDeps
      const currentVersion = installedDeps[entry.name]
      const isRequired = requiredSdks.has(entry.name)

      return {
        name: entry.name,
        description: entry.description,
        category: entry.category,
        installed: isInstalled,
        currentVersion,
        required: isRequired,
        recommendedFor: entry.recommendedFor,
      }
    })
  }

  /**
   * Computes reconciliation plan between .solarch/project.json requirements and package.json dependencies.
   */
  public static async computeSyncPlan(
    projectDir: string = process.cwd(),
    overrideManager?: PackageManagerType
  ): Promise<SdkSyncPlan> {
    const pm = PackageManagerDetector.detect(projectDir, overrideManager)
    const installedDeps = SdkInstaller.readInstalledDependencies(projectDir)
    const manifest = await ProjectMetadata.readManifest(projectDir).catch(() => null)
    const requiredSdks = manifest?.sdks || []

    const toInstall: string[] = []
    const alreadyInstalled: string[] = []

    for (const sdk of requiredSdks) {
      if (sdk in installedDeps) {
        alreadyInstalled.push(sdk)
      } else {
        toInstall.push(sdk)
      }
    }

    return {
      packageManager: pm,
      toInstall,
      toRemove: [],
      alreadyInstalled,
      isUpToDate: toInstall.length === 0,
    }
  }

  /**
   * Installs specified SDKs using the detected package manager and updates .solarch/project.json.
   */
  public static async installSdks(
    projectDir: string = process.cwd(),
    packages: string[],
    options: {
      manager?: PackageManagerType
      isDev?: boolean
      updateManifest?: boolean
    } = {}
  ): Promise<{ command: string; output: string }> {
    const pm = PackageManagerDetector.detect(projectDir, options.manager)
    const normalizedPackages = packages.map((pkg) => SdkRegistry.normalizePackageName(pkg))
    const command = PackageManagerDetector.getInstallCommand(pm, normalizedPackages, options.isDev)

    const output = await PackageManagerDetector.execute(command, projectDir)

    if (options.updateManifest !== false) {
      const manifest = await ProjectMetadata.readManifest(projectDir).catch(() => null)
      if (manifest) {
        const existing = new Set(manifest.sdks || [])
        for (const pkg of normalizedPackages) {
          existing.add(pkg)
        }
        manifest.sdks = Array.from(existing)
        manifest.updatedAt = new Date().toISOString()
        await ProjectMetadata.writeManifest(projectDir, manifest)
      }
    }

    return { command, output }
  }

  /**
   * Uninstalls specified SDKs and updates .solarch/project.json.
   */
  public static async removeSdks(
    projectDir: string = process.cwd(),
    packages: string[],
    options: {
      manager?: PackageManagerType
      updateManifest?: boolean
    } = {}
  ): Promise<{ command: string; output: string }> {
    const pm = PackageManagerDetector.detect(projectDir, options.manager)
    const normalizedPackages = packages.map((pkg) => SdkRegistry.normalizePackageName(pkg))
    const command = PackageManagerDetector.getUninstallCommand(pm, normalizedPackages)

    const output = await PackageManagerDetector.execute(command, projectDir)

    if (options.updateManifest !== false) {
      const manifest = await ProjectMetadata.readManifest(projectDir).catch(() => null)
      if (manifest) {
        manifest.sdks = (manifest.sdks || []).filter(
          (pkg) => !normalizedPackages.includes(pkg)
        )
        manifest.updatedAt = new Date().toISOString()
        await ProjectMetadata.writeManifest(projectDir, manifest)
      }
    }

    return { command, output }
  }

  /**
   * Reads dependencies and devDependencies from package.json.
   */
  public static readInstalledDependencies(projectDir: string): Record<string, string> {
    const pkgPath = path.join(projectDir, 'package.json')
    if (!fs.existsSync(pkgPath)) {
      return {}
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      return {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      }
    } catch {
      return {}
    }
  }
}
