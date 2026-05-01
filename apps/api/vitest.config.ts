import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    include: ['test/**/*.test.ts', 'src/**/*.spec.ts'],
    alias: {
      '@klariq/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@klariq/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
    },
  },
  resolve: {
    alias: {
      '@klariq/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@klariq/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
    },
  },
});
