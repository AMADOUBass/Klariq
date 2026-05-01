import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@klariq/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@klariq/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
