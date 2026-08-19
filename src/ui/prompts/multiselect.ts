import { multiselect as clackMultiSelect, isCancel, cancel } from '@clack/prompts'

export interface MultiSelectOption<T = string> {
  value: T
  label: string
  hint?: string
}

export interface PromptMultiSelectOptions<T = string> {
  message: string
  options: MultiSelectOption<T>[]
  initialValues?: T[]
  required?: boolean
  onCancel?: () => void
}

/**
 * Solarch TUI Multiselect Prompt Wrapper
 * Displays a multi-choice interactive list with spacebar selection and arrow navigation.
 */
export async function promptMultiSelect<T = string>(opts: PromptMultiSelectOptions<T>): Promise<T[]> {
  const result = await clackMultiSelect({
    message: opts.message,
    options: opts.options as any,
    initialValues: opts.initialValues as any,
    required: opts.required ?? false,
  })

  if (isCancel(result)) {
    if (opts.onCancel) {
      opts.onCancel()
      return []
    }
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return result as T[]
}
