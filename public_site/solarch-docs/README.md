# Solarch Documentation

The official documentation site for Solarch — a TypeScript Backend-as-a-Service in a single package.

## Overview

Solarch gives you SQLite, Express, WebSocket, Auth, Realtime, File Storage, AI Tools, and Vector Search — all in one package. This repository contains the documentation site built with React, Vite, Tailwind CSS, and TypeScript.

## Local Development

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The site will be available at `http://localhost:5173`.

## Build

```bash
npm run build
```

The static site is generated in the `dist/` directory.

## Deploy

### Automatic (GitHub Actions)

Pushes to `main` automatically trigger a deployment via GitHub Actions. You will need to configure these secrets in your repository:

- `VERCEL_TOKEN` — Your Vercel personal access token
- `VERCEL_ORG_ID` — Your Vercel team / user ID
- `VERCEL_PROJECT_ID` — Your Vercel project ID

### Manual (Vercel CLI)

```bash
# Install Vercel CLI globally
npm i -g vercel

# Link and deploy
vercel --prod
```

## Environment Variables

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_SITE_URL` | Public URL of the deployed site (used for SEO / OG tags) |
| `VITE_GITHUB_URL` | Link to the GitHub repository |
