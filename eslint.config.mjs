import { config as baseConfig } from './packages/eslint-config/base.js';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: [
      'node_modules/**',
      '.nx/**',
      '**/tsconfig.json',
      'dist/**',
      'build/**',
      'out/**',
      'coverage/**',
      '.test/**',
      '**/.cache/**',
      '**/vitest.config.*.timestamp*',
      '**/scripts/**',
      '**/generated/**',
      '**/vendor/**',
    ],
  },
  {
    files: ['packages/eslint-config/*.js'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
  },
  {
    // Disable filename naming check for config and generated files
    files: [
      '**/*.config.{ts,tsx,js,mjs,cjs}',
      '**/vitest.config.ts',
      '**/next-env.d.ts',
      '**/tsconfig.json',
    ],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
  {
    // Allow project service to skip unmapped files gracefully
    languageOptions: {
      parserOptions: {
        allowDefaultProject: true,
      },
    },
  },
];
