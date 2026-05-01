import baseConfig from './base.js';

/**
 * ESLint config for Next.js apps.
 * @type {import("typescript-eslint").ConfigArray}
 */
export default [
  ...baseConfig,
  {
    rules: {
      // React 19 with App Router — no need to import React in scope
      'react/react-in-jsx-scope': 'off',
      // Server components can be async; allow top-level await patterns
      '@typescript-eslint/require-await': 'off',
    },
  },
];
