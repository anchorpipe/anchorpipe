import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'coverage/**',
      'build/**',
      '*.config.{js,mjs,ts}',
      'apps/web/.next/**',
    ],
    rules: {
      '@next/next/no-html-link-for-pages': ['error', 'apps/web/src'],
    },
  },
];
