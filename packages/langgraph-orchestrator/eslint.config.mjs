import { config } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
export default [
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
    files: ['**/*.test.ts'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
];
