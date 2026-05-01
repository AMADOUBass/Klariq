/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/prisma/migrations/**',
      '**/*.generated.ts',
    ],
  },
];
