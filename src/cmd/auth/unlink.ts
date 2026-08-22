/**
 * Solarch CLI Unlink Command (Phase 2)
 *
 * Implements `solarch unlink`
 * Removes remote platform linkage from .solarch/project.json while preserving all local metadata.
 */

import { ProjectMetadata } from '../../ecosystem/metadata.js'
import { output } from '../../ui/output.js'
import { colors } from '../../ui/theme.js'

export interface UnlinkOptions {
  dir?: string
}

export async function runUnlink(options: UnlinkOptions = {}): Promise<void> {
  const projectDir = options.dir ? options.dir : process.cwd()

  const manifest = await ProjectMetadata.readManifest(projectDir)
  if (!manifest) {
    output.failure('No Solarch project manifest found in current directory.')
    throw new Error('Missing .solarch/project.json')
  }

  if (!manifest.platform) {
    output.info('Project is not linked to any remote Solarch Platform project.')
    return
  }

  const previousProjectId = manifest.platform.projectId
  await ProjectMetadata.unlinkProject(projectDir)

  output.success(
    `Unlinked project from remote platform project ${colors.cyan(
      previousProjectId
    )}. Local configuration preserved.`
  )
}
