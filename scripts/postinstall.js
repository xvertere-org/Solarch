#!/usr/bin/env node
// ponytail: writes to /dev/tty to bypass npm10 lifecycle output suppression — zero deps
'use strict'

const ORANGE = '\x1b[38;5;208m'
const RESET  = '\x1b[0m'
const pkg    = require('../package.json')

const banner = ORANGE + `
  ███████╗ ██████╗ ██╗      █████╗ ██████╗  ██████╗██╗  ██╗
  ██╔════╝██╔═══██╗██║     ██╔══██╗██╔══██╗██╔════╝██║  ██║
  ███████╗██║   ██║██║     ███████║██████╔╝██║     ███████║
  ╚════██║██║   ██║██║     ██╔══██║██╔══██╗██║     ██╔══██║
  ███████║╚██████╔╝███████╗██║  ██║██║  ██║╚██████╗██║  ██║
  ╚══════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝

  ⚡ Solarch CLI v${pkg.version}

  Create:
    solarch init

  Develop:
    solarch dev

  Diagnose:
    solarch doctor

` + RESET

try {
  // Bypass npm's stdout capture by writing directly to the terminal device.
  // Falls through silently in CI, piped contexts, and Windows (no /dev/tty).
  const fs = require('fs')
  const tty = fs.openSync('/dev/tty', 'w')
  fs.writeSync(tty, banner)
  fs.closeSync(tty)
} catch {
  // not a TTY (CI, --ignore-scripts, Windows) — skip silently
}
