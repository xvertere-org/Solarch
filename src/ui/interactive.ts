/**
 * Interactive Command Launcher for Solarch CLI.
 * Opens an interactive prompt menu when solarch is invoked without arguments.
 */

import { promptSelect } from './prompts/select.js'
import { isCancel } from '@clack/prompts'

export async function runInteractiveLauncher(): Promise<string | null> {
  const choice = await promptSelect<string>({
    message: 'What do you want to do?',
    options: [
      { value: 'init', label: 'Create project', hint: 'solarch init' },
      { value: 'dev', label: 'Start development server', hint: 'solarch dev' },
      { value: 'logs', label: 'View logs', hint: 'solarch logs' },
      { value: 'routes', label: 'Explore API routes', hint: 'solarch routes' },
      { value: 'generate', label: 'Generate backend files', hint: 'solarch generate' },
      { value: 'doctor', label: 'Check health', hint: 'solarch doctor' },
      { value: 'status', label: 'Show runtime status', hint: 'solarch status' },
      { value: 'config', label: 'Manage configuration', hint: 'solarch config' },
      { value: 'env', label: 'Manage environment', hint: 'solarch env' },
      { value: 'migrate', label: 'Database migrations', hint: 'solarch migrate' },
      { value: 'inspect', label: 'Inspect project', hint: 'solarch inspect' },
      { value: 'project', label: 'Project lifecycle', hint: 'solarch project' },
      { value: 'serve', label: 'Start production server', hint: 'solarch serve' },
      { value: 'superuser', label: 'Manage admin users', hint: 'solarch superuser' },
      { value: 'version', label: 'Show version details', hint: 'solarch version' },
    ],
  })

  if (isCancel(choice) || typeof choice !== 'string') {
    return null
  }

  return choice
}
