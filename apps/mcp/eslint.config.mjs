import tseslint from 'typescript-eslint';

import { config as baseConfig } from '@texere/eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ['**/*.config.{ts,mjs}', 'eslint.config.mjs'],
    rules: {
      'import/no-default-export': 'off',
      'check-file/filename-naming-convention': 'off',
      'unicorn/filename-case': 'off',
    },
  },
  {
    files: ['*.mjs'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    ...tseslint.configs.disableTypeChecked,
  },
];
