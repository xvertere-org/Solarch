import { confirm as clackConfirm, isCancel, cancel } from '@clack/prompts'

export interface PromptConfirmOptions {
  message: string
  initialValue?: boolean
  active?: string
  inactive?: string
  onCancel?: () => void
}

/**
 * Solarch TUI Confirm Prompt Wrapper
 * Displays a boolean yes/no interactive confirmation.
 */
export async function promptConfirm(opts: PromptConfirmOptions): Promise<boolean> {
  const result = await clackConfirm({
    message: opts.message,
    initialValue: opts.initialValue ?? true,
    active: opts.active ?? 'Yes',
    inactive: opts.inactive ?? 'No',
  })

  if (isCancel(result)) {
    if (opts.onCancel) {
      opts.onCancel()
      return false
    }
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return Boolean(result)
}
