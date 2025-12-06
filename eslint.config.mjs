import { config as baseConfig } from './packages/eslint-config/base.js';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: [
      'node_modules/**',
      '.nx/**',
      '**/tsconfig.json',
      '.next/**',
      'dist/**',
      'build/**',
      'out/**',
      'coverage/**',
      '**/vitest.config.*.timestamp*',
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
  {
    // Enforce Nx tag-based boundaries (observability §4.3)
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          depConstraints: [
            {
              sourceTag: 'runtime:web',
              onlyDependOnLibsWithTags: ['runtime:web', 'runtime:shared'],
            },
            {
              sourceTag: 'runtime:edge',
              onlyDependOnLibsWithTags: ['runtime:edge', 'runtime:shared'],
            },
            {
              sourceTag: 'runtime:server',
              onlyDependOnLibsWithTags: ['runtime:server', 'runtime:shared'],
            },
            { sourceTag: 'runtime:shared', onlyDependOnLibsWithTags: ['runtime:shared'] },
          ],
        },
      ],
    },
  },
];
