/**
 * Solarch CLI Ecosystem — Local Ecosystem Manifest (.solarch/project.json) (Phase 0 & 2)
 *
 * Defines the non-secret metadata manifest stored at `.solarch/project.json`.
 * Acts as the bridge between CLI, Dashboard, and SDK tooling.
 *
 * INVARIANT: Never contains passwords, credentials, API keys, or access tokens.
 */

import fs from 'fs'
import path from 'path'
import { ProjectPlan } from './plan.js'

export interface ProjectPlatformLink {
  projectId: string
  orgId: string
  linkedAt: string
}

export interface ProjectManifestSchema {
  schemaVersion: 1
  name: string
  application: string
  runtimeVersion: string
  database: {
    engine: string
    topology: string
    provider?: string
    secretRefs?: string[]
    capabilities: Record<string, any>
    source: string
  }
  sdks: string[]
  plugins: {
    mode: string
    list: string[]
  }
  desktop?: {
    runtime: string
  }
  platform?: ProjectPlatformLink
  createdAt: string
  updatedAt: string
}

export type ProjectManifest = ProjectManifestSchema

export class ProjectMetadata {
  public static readonly MANIFEST_DIR = '.solarch'
  public static readonly MANIFEST_FILE = 'project.json'

  /**
   * Generates a manifest object from a ProjectPlan and runtime version.
   */
  public static fromPlan(
    plan: ProjectPlan,
    runtimeVersion: string = '0.19.8'
  ): ProjectManifestSchema {
    ProjectPlan.assertNoSecrets(plan)

    const now = new Date().toISOString()
    const manifest: ProjectManifestSchema = {
      schemaVersion: 1,
      name: plan.identity.name,
      application: plan.intent.application,
      runtimeVersion,
      database: plan.database.toJSON(),
      sdks: [...plan.sdks.selected],
      plugins: {
        mode: plan.plugins.mode,
        list: [...plan.plugins.plugins],
      },
      desktop:
        plan.intent.application === 'desktop'
          ? { runtime: plan.desktop.runtime }
          : undefined,
      createdAt: plan.createdAt || now,
      updatedAt: now,
    }

    ProjectMetadata.validateManifest(manifest)
    return manifest
  }

  /**
   * Writes the project manifest to `.solarch/project.json` inside projectDir.
   */
  public static async writeManifest(
    projectDir: string,
    manifest: ProjectManifestSchema
  ): Promise<string> {
    ProjectMetadata.validateManifest(manifest)

    const dir = path.join(projectDir, ProjectMetadata.MANIFEST_DIR)
    const filePath = path.join(dir, ProjectMetadata.MANIFEST_FILE)

    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(manifest, null, 2) + '\n',
      'utf-8'
    )

    return filePath
  }

  /**
   * Reads and parses `.solarch/project.json` from projectDir.
   */
  public static async readManifest(
    projectDir: string
  ): Promise<ProjectManifestSchema | null> {
    const filePath = path.join(
      projectDir,
      ProjectMetadata.MANIFEST_DIR,
      ProjectMetadata.MANIFEST_FILE
    )
    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(content) as ProjectManifestSchema
      ProjectMetadata.validateManifest(parsed)
      return parsed
    } catch (err: any) {
      throw new Error(
        `Failed to read Solarch project manifest at ${filePath}: ${err.message}`
      )
    }
  }

  /**
   * Patches the local manifest with platform linkage identifiers atomically.
   * Preserves all other manifest fields.
   */
  public static async linkProject(
    projectDir: string,
    linkage: { projectId: string; orgId: string }
  ): Promise<ProjectManifestSchema> {
    const manifest = await ProjectMetadata.readManifest(projectDir)
    if (!manifest) {
      throw new Error(
        `No Solarch project manifest found in ${projectDir}. Initialize a project with "solarch init" first.`
      )
    }

    manifest.platform = {
      projectId: linkage.projectId,
      orgId: linkage.orgId,
      linkedAt: new Date().toISOString(),
    }
    manifest.updatedAt = new Date().toISOString()

    await ProjectMetadata.writeManifest(projectDir, manifest)
    return manifest
  }

  /**
   * Removes remote platform linkage identifiers from the local manifest.
   * Preserves all other local configuration and manifest fields.
   */
  public static async unlinkProject(
    projectDir: string
  ): Promise<ProjectManifestSchema> {
    const manifest = await ProjectMetadata.readManifest(projectDir)
    if (!manifest) {
      throw new Error(
        `No Solarch project manifest found in ${projectDir}.`
      )
    }

    delete manifest.platform
    manifest.updatedAt = new Date().toISOString()

    await ProjectMetadata.writeManifest(projectDir, manifest)
    return manifest
  }

  /**
   * Validates manifest schema and asserts zero secrets.
   */
  public static validateManifest(manifest: unknown): void {
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Project manifest must be a valid object')
    }

    const m = manifest as Partial<ProjectManifestSchema>
    if (m.schemaVersion !== 1) {
      throw new Error(
        `Unsupported project manifest schemaVersion: ${(m as any).schemaVersion}`
      )
    }
    if (!m.name || typeof m.name !== 'string') {
      throw new Error('Project manifest requires a string "name"')
    }
    if (!m.application || typeof m.application !== 'string') {
      throw new Error('Project manifest requires an "application" string')
    }
    if (!m.database || typeof m.database !== 'object') {
      throw new Error('Project manifest requires a "database" strategy object')
    }

    ProjectPlan.assertNoSecrets(manifest)
  }
}
