# Installing Solarch

This guide details system requirements, installation methods, binary verification, and environment setup for the Solarch CLI and core client.

---

## System Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| **Node.js** | `>= 20.0.0` (LTS) | `v22.x` or higher |
| **Operating System** | macOS, Linux, Windows (WSL recommended) | macOS / Linux |
| **Memory (RAM)** | 512 MB | 2 GB+ |
| **Disk Space** | 50 MB | 500 MB (for database files) |
| **Database** | SQLite (embedded) | SQLite / PostgreSQL 14+ |

---

## Installation Methods

### 1. Global Installation (Recommended)

Install the `solarch` executable globally using npm:

```bash
npm install -g solarch
```

Using pnpm:

```bash
pnpm add -g solarch
```

Using yarn:

```bash
yarn global add solarch
```

### 2. On-Demand Execution via `npx`

You can execute Solarch commands without installing globally:

```bash
npx solarch init
npx solarch dev
npx solarch doctor
```

### 3. Local Project Dependency

Install Solarch inside an existing Node.js project:

```bash
npm install --save-dev solarch @solarch/core-client
```

Add scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "solarch dev",
    "serve": "solarch serve",
    "migrate": "solarch migrate up",
    "doctor": "solarch doctor"
  }
}
```

---

## Verifying Installation

Verify that the CLI is accessible and installed correctly:

```bash
solarch version
```

Expected output:

```text
⚡ Solarch CLI

Version:
0.19.5

Node:
v22.22.3

Platform:
darwin-arm64
```

To view the complete list of available command groups:

```bash
solarch --help
```

---

## Troubleshooting Installation Issues

### EACCES / Permission Denied (Global npm Install)

If you encounter permission errors during global install on Unix systems:

```bash
# Solution 1: Use an npm version manager (nvm, fnm)
nvm install 22
npm install -g solarch

# Solution 2: Change npm's default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g solarch
```

### Node.js Version Incompatibility

If you see `Node.js version < 20.0.0 not supported`:

```bash
node -v
# Upgrade your Node.js runtime to >= 20.0.0 using nvm or fnm
nvm install 20
nvm use 20
```

---

## Updating Solarch

To update Solarch to the latest release:

```bash
npm install -g solarch@latest
```

Check your installed version after upgrading:

```bash
solarch version
```
