export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'coverage/**',
      'build/**',
      '*.config.{js,mjs,ts}',
      'apps/web/.next/**',
      'libs/**',
      'services/**',
    ],
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      // Minimal rules - let TypeScript handle type checking
      'no-console': 'warn',
      'no-debugger': 'error',
    },
  },
];
