#!/usr/bin/env node

/**
 * @file packages/core-client/scripts/check-package-shape.cjs
 * @description Validates distribution output shape (ESM, CJS, and TypeScript declarations).
 */

const fs = require('fs');
const path = require('path');

const PKG_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PKG_DIR, 'dist');
const PKG_JSON = path.join(PKG_DIR, 'package.json');

console.log('========================================');
console.log('  Core-Client Distribution Shape Audit  ');
console.log('========================================');

if (!fs.existsSync(DIST_DIR)) {
  console.error('\x1b[31m✖ FAIL: dist/ directory does not exist. Run build first.\x1b[0m');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(PKG_JSON, 'utf8'));
const requiredFiles = [
  { name: 'CJS bundle', relPath: pkg.main || './dist/index.cjs' },
  { name: 'ESM bundle', relPath: pkg.module || './dist/index.js' },
  { name: 'TypeScript declarations', relPath: pkg.types || './dist/index.d.ts' }
];

let errors = [];

for (const req of requiredFiles) {
  const fullPath = path.resolve(PKG_DIR, req.relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing ${req.name} at declared target: ${req.relPath}`);
  } else {
    const size = fs.statSync(fullPath).size;
    if (size === 0) {
      errors.push(`Empty file for ${req.name}: ${req.relPath} (0 bytes)`);
    } else {
      console.log(`  ✔ ${req.name}: ${req.relPath} (${size} bytes)`);
    }
  }
}

if (errors.length > 0) {
  console.error('\x1b[31m✖ Distribution Shape Failures:\x1b[0m');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}

console.log('\x1b[32m✔ PASS: Package distribution shape conforms to ESM + CJS + Types requirements.\x1b[0m\n');
