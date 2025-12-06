import { config } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ['.mastra/**', 'coverage/**', 'dist/**'],
  },
  ...config,
  {
    files: ['vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        allowDefaultProject: true,
      },
    },
  },
  {
    files: ['src/**/*.test.ts'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
];
