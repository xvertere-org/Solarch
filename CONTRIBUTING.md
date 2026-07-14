# Contributing to Solarch

Thank you for your interest in contributing to Solarch! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/solarch.git
   cd solarch
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```

## Development Setup

### Requirements
- Node.js >= 20.0.0
- npm or pnpm

### Running in Development
```bash
# Start the dev server with hot reload
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Run tests
npm test
```

### Project Structure
```
src/
├── solarch.ts    # Main application class
├── cli.ts           # CLI entry point
├── core/            # Core models (collections, records, fields, db)
├── apis/            # Express routes and middleware
├── tools/           # Utilities (auth, files, hooks, mailer, etc.)
└── admin/           # React/Vite Admin UI
```

## How to Contribute

### Reporting Bugs

Before creating a bug report, please:
1. Check the [existing issues](https://github.com/Jay-Suryawansh7/solarch/issues) to avoid duplicates
2. Use the [Bug Report template](https://github.com/Jay-Suryawansh7/solarch/issues/new?template=bug_report.yml)
3. Include as much detail as possible (steps to reproduce, environment, logs)

### Suggesting Features

1. Check if the feature has already been requested
2. Use the [Feature Request template](https://github.com/Jay-Suryawansh7/solarch/issues/new?template=feature_request.yml)
3. Explain the use case and why it would be valuable

### Contributing Code

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:
   ```bash
   npm run typecheck
   npm test
   ```

4. **Commit** with a clear message (see [Commit Convention](#commit-message-convention))

5. **Push** to your fork:
   ```bash
   git push origin your-branch-name
   ```

6. **Open a Pull Request** against the `main` branch

## Coding Standards

### TypeScript
- Use strict TypeScript (`strict: true` in tsconfig)
- Prefer `interface` over `type` for object shapes
- Use explicit return types on public API functions
- Avoid `any` — use `unknown` with type guards instead

### Code Style
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- No trailing commas
- Max line length: 100 characters

### Linting
```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Testing
- Write tests for new features
- Ensure existing tests pass before submitting PR
- Aim for meaningful test coverage, not just numbers

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling
- `ci`: CI/CD changes

### Examples
```
feat(auth): add OAuth2 provider registry
fix(db): handle concurrent migration conflicts
docs(readme): update installation instructions
refactor(core): simplify collection schema sync
```

## Pull Request Process

1. **Fill out the PR template** completely
2. **Link related issues** using `Fixes #123` or `Closes #456`
3. **Ensure CI passes** (typecheck, lint, tests)
4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Squash commits** if requested

### PR Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (if applicable)
- [ ] No breaking changes without discussion
- [ ] PR title follows commit convention

## Release Process

Releases are managed by maintainers:
1. Version bump in `package.json`
2. Update `CHANGELOG.md`
3. Create Git tag: `git tag vX.Y.Z`
4. Push tag: `git push origin vX.Y.Z`
5. GitHub Actions publishes to npm automatically

## Questions?

- Open a [GitHub Discussion](https://github.com/Jay-Suryawansh7/solarch/discussions)
- Check the [Documentation](https://solarch-docs.vercel.app/)

Thank you for contributing!
