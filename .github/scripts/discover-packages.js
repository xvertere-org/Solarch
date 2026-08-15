#!/usr/bin/env node

/**
 * @file .github/scripts/discover-packages.js
 * @description Scans the workspace and packages/* to classify packages by solarchCi.type ('generic' vs 'sdk').
 * Emits GITHUB_OUTPUT variables `generic` and `sdk` as JSON arrays for matrix orchestration.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

const genericPackages = [];
const sdkPackages = [];

// 1. Inspect Root package.json
const rootPkgPath = path.join(ROOT_DIR, 'package.json');
if (fs.existsSync(rootPkgPath)) {
  try {
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    const ciConfig = rootPkg.solarchCi || { type: 'backend', workspace: 'root' };
    const entry = {
      path: '.',
      workspace: ciConfig.workspace || 'root',
      type: ciConfig.type || 'backend'
    };

    if (entry.type === 'sdk') {
      sdkPackages.push(entry);
    } else {
      genericPackages.push(entry);
    }
  } catch (err) {
    console.error('Failed to parse root package.json:', err);
    process.exit(1);
  }
}

// 2. Inspect packages/* subdirectories
if (fs.existsSync(PACKAGES_DIR)) {
  const entries = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const pkgJsonPath = path.join(PACKAGES_DIR, entry.name, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          const ciConfig = pkg.solarchCi || {};
          const pkgPath = `packages/${entry.name}`;
          const workspaceName = ciConfig.workspace || pkg.name || `@solarch/${entry.name}`;
          const pkgType = ciConfig.type || (entry.name.includes('sdk') || entry.name.includes('client') ? 'sdk' : 'generic');

          const item = {
            path: pkgPath,
            workspace: workspaceName,
            type: pkgType
          };

          if (pkgType === 'sdk') {
            sdkPackages.push(item);
          } else {
            genericPackages.push(item);
          }
        } catch (err) {
          console.error(`Failed to parse ${pkgJsonPath}:`, err);
        }
      }
    }
  }
}

console.log('Discovered Packages:');
console.log('  Generic Packages:', JSON.stringify(genericPackages, null, 2));
console.log('  SDK Packages:    ', JSON.stringify(sdkPackages, null, 2));

const genericJson = JSON.stringify(genericPackages);
const sdkJson = JSON.stringify(sdkPackages);

// Write to $GITHUB_OUTPUT if in GitHub Actions
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `generic=${genericJson}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `sdk=${sdkJson}\n`);
  console.log('Successfully wrote discovery matrices to $GITHUB_OUTPUT');
}
