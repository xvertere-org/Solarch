/**
 * Centralized CLI Context Resolution
 *
 * Commander.js routes options to the root program when both root and
 * subcommand define the same flag. This module provides safe resolvers
 * that check subcommand opts first, then fall back to parent opts,
 * filtering out root-level defaults that have different semantics.
 */
import type { Command } from 'commander'

// The root program's --dir default is for data-directory (./pb_data).
// Subcommands that use --dir for project/parent directory should not
// inherit this value.
const ROOT_DIR_DEFAULT = './pb_data'

/**
 * Resolve --dir from the Commander option chain.
 *
 * Priority:
 *   1. Subcommand opts.dir (if Commander routed it here)
 *   2. Parent command's parsed --dir (if it was explicitly passed by user)
 *   3. Fallback default
 *
 * The root program's default ('./pb_data') is excluded for subcommands
 * that use --dir as a project directory, not a data directory.
 */
export function resolveDir(
  opts: { dir?: string },
  cmd?: Command,
  fallback = '.'
): string {
  // If Commander routed --dir to this subcommand, use it directly
  if (opts.dir) return opts.dir

  // Walk up the command chain to find an explicitly passed --dir
  let parent = cmd?.parent
  while (parent) {
    const parentDir = parent.opts()?.dir
    if (parentDir && parentDir !== ROOT_DIR_DEFAULT) {
      return parentDir
    }
    parent = parent.parent
  }

  return fallback
}

/**
 * Resolve database-related options from the Commander chain.
 * Handles --db, --db-url, --database-url, --db-driver, --db-mode.
 */
export function resolveDatabaseOptions(
  opts: Record<string, any>,
  cmd?: Command
): { db?: string; dbUrl?: string; dbDriver?: string; dbMode?: string } {
  const parent = cmd?.parent?.opts() ?? {}
  return {
    db: opts.db ?? parent.db,
    dbUrl: opts.dbUrl ?? opts.databaseUrl ?? parent.dbUrl ?? parent.databaseUrl,
    dbDriver: opts.dbDriver ?? parent.dbDriver,
    dbMode: opts.dbMode ?? parent.dbMode,
  }
}

/**
 * Resolve runtime options (--dev, --port, --query-timeout, --encryptionEnv).
 */
export function resolveRuntimeOptions(
  opts: Record<string, any>,
  cmd?: Command
): { dev?: boolean; queryTimeout?: number; encryptionEnv?: string } {
  const parent = cmd?.parent?.opts() ?? {}
  return {
    dev: opts.dev ?? parent.dev ?? false,
    queryTimeout: parseInt(opts.queryTimeout ?? parent.queryTimeout ?? '30', 10),
    encryptionEnv: opts.encryptionEnv ?? parent.encryptionEnv,
  }
}
