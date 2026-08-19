import { select as clackSelect, isCancel, cancel } from '@clack/prompts'

export interface SelectOption<T = string> {
  value: T
  label: string
  hint?: string
}

export interface PromptSelectOptions<T = string> {
  message: string
  options: SelectOption<T>[]
  initialValue?: T
  maxItems?: number
  onCancel?: () => void
}

/**
 * Solarch TUI Select Prompt Wrapper
 * Displays a single-choice interactive list with arrow navigation.
 */
export async function promptSelect<T = string>(opts: PromptSelectOptions<T>): Promise<T> {
  const result = await clackSelect({
    message: opts.message,
    options: opts.options as any,
    initialValue: opts.initialValue as any,
    maxItems: opts.maxItems,
  })

  if (isCancel(result)) {
    if (opts.onCancel) {
      opts.onCancel()
      return opts.options[0]?.value
    }
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return result as T
}
