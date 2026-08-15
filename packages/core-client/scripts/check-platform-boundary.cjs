#!/usr/bin/env node

/**
 * @file packages/core-client/scripts/check-platform-boundary.cjs
 * @description Static analysis gate enforcing zero platform leakage in @solarch/core-client.
 * Scans src/** for disallowed imports (Node built-ins, React, React Native, Electron, Tauri).
 */

const fs = require('fs');
const path = require('path');

const PKG_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PKG_DIR, 'src');

if (!fs.existsSync(SRC_DIR)) {
  console.log('No src directory found to scan for platform boundaries.');
  process.exit(0);
}

const DENYLIST = [
  // Node.js built-ins
  'fs', 'node:fs',
  'path', 'node:path',
  'crypto', 'node:crypto',
  'child_process', 'node:child_process',
  'http', 'node:http',
  'https', 'node:https',
  'os', 'node:os',
  'net', 'node:net',
  'tls', 'node:tls',
  // UI & Mobile Frameworks
  'react', 'react-dom', 'react-native',
  // Desktop Frameworks
  'electron',
  '@tauri-apps/api', '@tauri-apps/plugin-sql', '@tauri-apps/plugin-http'
];

function getAllFiles(dir, ext = ['.ts', '.js', '.tsx', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, ext));
    } else if (ext.some(e => file.endsWith(e)) && !file.endsWith('.d.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = getAllFiles(SRC_DIR);
let violations = [];

const IMPORT_REGEX = /(?:import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)|import\(['"]([^'"]+)['"]\))/g;

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(PKG_DIR, filePath);
  const lines = content.split('\n');

  lines.forEach((line, lineNum) => {
    let match;
    const lineRegex = new RegExp(IMPORT_REGEX.source, 'g');
    while ((match = lineRegex.exec(line)) !== null) {
      const moduleName = match[1] || match[2] || match[3];
      if (!moduleName) continue;

      const isDisallowed = DENYLIST.some(denied => {
        if (denied.endsWith('/*')) {
          const prefix = denied.slice(0, -2);
          return moduleName.startsWith(prefix);
        }
        return moduleName === denied || moduleName.startsWith(denied + '/');
      });

      if (isDisallowed) {
        violations.push({
          file: relPath,
          line: lineNum + 1,
          module: moduleName,
          code: line.trim()
        });
      }
    }
  });
}

console.log('========================================');
console.log('  Core-Client Platform Boundary Audit  ');
console.log('========================================');
console.log(`Audited ${files.length} source file(s) in ${path.relative(process.cwd(), SRC_DIR)}`);

if (violations.length === 0) {
  console.log('\x1b[32m✔ PASS: Zero platform boundary violations. @solarch/core-client is 100% platform-neutral.\x1b[0m\n');
  process.exit(0);
} else {
  console.error(`\x1b[31m✖ FAIL: Found ${violations.length} forbidden platform import(s):\x1b[0m\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} -> Disallowed import '${v.module}'`);
    console.error(`    \x1b[90m${v.code}\x1b[0m`);
  }
  console.log('\nCore Client must not import platform-specific modules. Use injected adapters/primitives instead.\n');
  process.exit(1);
}
