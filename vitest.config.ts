import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'packages/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      exclude: ['src/tools/jsvm/deno_worker.ts', '**/dist/**', '**/node_modules/**', '**/*.test.ts'],
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
