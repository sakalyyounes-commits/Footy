import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['core/src/**/*.test.ts', 'server/src/**/*.test.ts', 'app/src/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
