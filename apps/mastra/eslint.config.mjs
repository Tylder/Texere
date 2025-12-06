import { config } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ['.mastra/**', 'coverage/**', 'dist/**', 'test-agent.mjs'],
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
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
];
