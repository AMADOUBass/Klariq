import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    include: ['test/integration/**/*.test.ts'],
    alias: {
      '@klariq/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@klariq/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
    },
    // Testcontainers can take a while to pull images and start
    testTimeout: 60000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      '@klariq/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@klariq/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
    },
  },
});
