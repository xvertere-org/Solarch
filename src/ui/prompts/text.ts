import { text as clackText, isCancel, cancel } from '@clack/prompts'

export interface PromptTextOptions {
  message: string
  placeholder?: string
  defaultValue?: string
  initialValue?: string
  validate?: (value: string | undefined) => string | Error | undefined
  onCancel?: () => void
}

/**
 * Solarch TUI Text Prompt Wrapper
 * Prompts user for string input with validation, cancellation handling, and defaults.
 */
export async function promptText(opts: PromptTextOptions): Promise<string> {
  const result = await clackText({
    message: opts.message,
    placeholder: opts.placeholder,
    defaultValue: opts.defaultValue,
    initialValue: opts.initialValue,
    validate: opts.validate,
  })

  if (isCancel(result)) {
    if (opts.onCancel) {
      opts.onCancel()
      return ''
    }
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return (result as string).trim()
}
