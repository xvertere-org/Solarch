/**
 * Solarch CLI UI & TUI Subsystem
 * Central facade for terminal styling, prompts, banners, spinners, command registry, errors, and interactive dialogs.
 */

export * from './theme.js'
export * from './banner.js'
export * from './command.js'
export * from './suggestions.js'
export * from './errors.js'
export * from './output.js'
export * from './interactive.js'

export * from './prompts/text.js'
export * from './prompts/select.js'
export * from './prompts/multiselect.js'
export * from './prompts/confirm.js'
export * from './prompts/init.js'
export * from './prompts/review.js'

// Re-export structured display elements from clack
export {
  intro,
  outro,
  spinner,
  note,
  log,
  cancel,
  isCancel,
  isCI,
  isTTY,
} from '@clack/prompts'
