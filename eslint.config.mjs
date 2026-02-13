import tseslint from 'typescript-eslint';

import { config as baseConfig } from '@texere/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: [
      'node_modules/**',
      '.turbo/**',
      '**/tsconfig.json',
      'dist/**',
      'build/**',
      'out/**',
      'coverage/**',
      '.test/**',
      '**/.cache/**',
      '**/vitest.config.*.timestamp*',
      '**/scripts/**',
      '**/vendor/**',
    ],
  },
  {
    files: ['tooling/eslint-config/*.js'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: [
      '**/*.config.{ts,tsx,js,mjs,cjs}',
      '**/vitest.config.ts',
      '**/vitest.workspace.ts',
      '**/tsconfig.json',
    ],
    rules: {
      'check-file/filename-naming-convention': 'off',
      'unicorn/filename-case': 'off',
    },
  },
  {
    files: ['**/*.config.{ts,tsx,js,mjs,cjs}', '**/vitest.workspace.ts', 'eslint.config.mjs'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['*.mjs', '*.cjs'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    ...tseslint.configs.disableTypeChecked,
  },
];
