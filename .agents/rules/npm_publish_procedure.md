# NPM & Package Publishing Procedure Rule

This rule defines the canonical procedure for building, verifying, and publishing packages (`solarch` and `@solarch/core-client`) to NPM, GitHub Packages, and Homebrew.

---

## 1. Pre-Publish Verification Gate (Mandatory)
Before any package publication, always execute the full verification sequence locally:
```bash
# 1. Full monorepo build (builds @solarch/core-client, server, and Admin UI)
npm run build

# 2. Typecheck & Test suite
npm run typecheck
npm test

# 3. Dry-run pack verification
npm pack --dry-run
npm --workspace=@solarch/core-client pack --dry-run

# 4. Distribution shape verification
node packages/core-client/scripts/check-package-shape.cjs
```

---

## 2. Authentication & Token Extraction

### Method A: Local Publish via `~/.npmrc` / `NODE_AUTH_TOKEN`
1. Check if an active authToken exists in `~/.npmrc`:
   ```bash
   grep "_authToken" ~/.npmrc
   ```
2. If `npm publish` fails with 401, export the token directly:
   ```bash
   export NODE_AUTH_TOKEN=$(grep "_authToken" ~/.npmrc | head -n 1 | cut -d'=' -f2 | tr -d ' \r\n')
   ```
3. Execute publication:
   ```bash
   # Publish Core Client SDK
   npm publish --workspace=@solarch/core-client --access public

   # Publish Root Server
   npm publish --access public
   ```

### Method B: Automated CI Release via Tag (Recommended)
GitHub Actions has `NPM_TOKEN` and `HOMEBREW_TAP_TOKEN` securely configured in repository secrets (`xvertere-org/Solarch`).
Pushing a release tag automatically runs `.github/workflows/publish.yml`:
1. Bump version in `package.json` and/or `packages/core-client/package.json` if necessary.
2. Commit and tag:
   ```bash
   git tag -a v<VERSION> -m "Release v<VERSION>"
   git push origin v<VERSION>
   ```
3. Monitor the workflow:
   ```bash
   gh run list --workflow=publish.yml
   gh run watch <run-id>
   ```
4. This automatically publishes to NPM, publishes to GitHub Packages, generates GitHub Release notes, and updates the Homebrew Tap formula.

---

## 3. Post-Publish Verification
Always verify that the newly published version is live on the registry:
```bash
npm view solarch version
npm view @solarch/core-client version
```
