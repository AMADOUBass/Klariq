import baseConfig from './base.js';

/**
 * ESLint config for NestJS apps.
 * Extends the base config with NestJS-specific rules and module boundary enforcement.
 *
 * Module boundary rule: modules may only import each other's public interfaces.
 * Internal files (anything not exported from a module's index.ts) are off-limits.
 * Full eslint-plugin-boundaries setup will be added in Phase 2 after module
 * structures are finalised. For now we use no-restricted-imports patterns.
 *
 * @type {import("typescript-eslint").ConfigArray}
 */
export default [
  ...baseConfig,
  {
    rules: {
      // NestJS DI classes are often empty or metadata-only — this is intentional
      '@typescript-eslint/no-extraneous-class': 'off',
      // Decorators return void in DI context
      '@typescript-eslint/no-floating-promises': 'warn',
      // Enforce module boundary: only import from a module's public index.ts
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/modules/*/internal/*', '*/modules/*/internal'],
              message:
                'Cross-module internal imports are forbidden. Import from the module public index only.',
            },
          ],
        },
      ],
    },
  },
];
