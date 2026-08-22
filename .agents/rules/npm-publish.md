# Solarch npm Publish Protocol

## The ONLY correct way to publish `solarch` to npm

Publishing is done **exclusively via GitHub Actions CI**. Never attempt `npm publish` locally.

### How it works

1. The `publish.yml` workflow at `.github/workflows/publish.yml` triggers on any `v*` tag push.
2. It uses `secrets.NPM_TOKEN` stored in the GitHub repo secrets — this is the valid token.
3. The local `~/.npmrc` token is **irrelevant and likely expired**. Never use it.

### Exact publish sequence

```bash
# 1. Bump version in package.json
# 2. Commit everything
git add .
git commit -m "release: solarch vX.X.X"

# 3. Tag the release
git tag vX.X.X

# 4. Push branch + tag together
git push origin main --tags
```

GitHub Actions fires automatically on the tag. Done.

### If the push is rejected (secret scanning)

GitHub may block the push if any file matches a secret pattern (e.g. Stripe `sk_live_` prefix in test files).

**Fix:**
1. Replace the offending value in the file with a neutral fake (e.g. `test_key_XXXXXX`)
2. Add the old commit SHA fingerprint to `.gitleaksignore` in format:
   `<commit-sha>:<file-path>:<rule-id>:<line>`
3. Squash or amend the history so the old commit is no longer reachable:
   `git reset --soft HEAD~N && git commit -m "release: ..."` 
4. Force-push with `--force-with-lease`, then retag and push

### If the publish workflow doesn't trigger

The `publish.yml` trigger is `push: tags: ['v*']`. If the secret scan workflow
cancels the tag event (same concurrency group), delete and re-push the tag:

```bash
git tag -f vX.X.X
git push origin vX.X.X --force
```

This issues a fresh tag push event and re-triggers `publish.yml`.

### Verify

```bash
npm view solarch version   # should return the new version
```

Or check: https://github.com/xvertere-org/Solarch/actions

### What NOT to do

- ❌ Never run `npm publish` locally
- ❌ Never try to add a token to `~/.npmrc` to work around CI
- ❌ Never assume the local `~/.npmrc` token is valid
- ❌ Never publish without the gitleaks scan passing first
