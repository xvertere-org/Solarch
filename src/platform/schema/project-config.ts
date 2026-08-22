/**
 * Solarch Platform Canonical Project Configuration Schema (Phase 4)
 *
 * Defines the canonical contract representing desired platform state from Dashboard.
 */

import { CapabilityMap } from './capability.js'
import { DatabaseMetadata } from './database-metadata.js'
import { EnvironmentSpec } from './environment-spec.js'

export interface SdkRequirementSpec {
  sdk: string
  minVersion?: string
  required: boolean
}

export interface PluginRequirementSpec {
  name: string
  version?: string
  config?: Record<string, any>
}

export interface PlatformProjectConfig {
  schemaVersion: string
  configVersion: number
  projectId: string
  orgId: string
  name: string
  description?: string
  capabilities: CapabilityMap
  database: DatabaseMetadata
  sdkRequirements: SdkRequirementSpec[]
  pluginRequirements: PluginRequirementSpec[]
  environments: Record<string, EnvironmentSpec>
  updatedAt: string
  updatedBy?: string
}
