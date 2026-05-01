import nestConfig from '@klariq/config/eslint/nest';

/** @type {import("typescript-eslint").ConfigArray} */
export default [
  ...nestConfig,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
