import nextConfig from '@klariq/config/eslint/next';

/** @type {import("typescript-eslint").ConfigArray} */
export default [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
];
