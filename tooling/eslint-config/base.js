import eslintConfigPrettier from 'eslint-config-prettier';
import checkFilePlugin from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import nodePlugin from 'eslint-plugin-n';
import oxlintPlugin from 'eslint-plugin-oxlint';
import securityPlugin from 'eslint-plugin-security';
import unicornPlugin from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import eslint from '@eslint/js';

/** @type {any} */
export const config = tseslint.config(
  {
    name: 'base/ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/eslint.config.*',
      '**/tsconfig.*',
      '**/vitest.config.*',
      '**/vitest.*.config.*',
      '**/vitest.setup.*',
    ],
  },
  {
    name: 'base/language',
    ...eslint.configs.recommended,
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
      },
      globals: {
        ...globals.node,
      },
    },
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/vitest.config.ts', '**/vitest.config.js', '**/vite.config.ts', '**/vite.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Test files: disable type checking (separate tsconfig.spec.json not in project references)
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.e2e.spec.ts',
      '**/*.e2e.spec.tsx',
    ],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Test files: relax unsafe type rules
    files: ['**/*.{test,spec,e2e.spec}.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  eslintConfigPrettier,
  {
    name: 'base/plugins',
    plugins: {
      import: importPlugin,
      n: nodePlugin,
      security: securityPlugin,
      unicorn: unicornPlugin,
      'check-file': checkFilePlugin,
      oxlint: oxlintPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // Type safety: explicit return types required
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: false,
          allowFunctionsWithoutTypeParameters: false,
          allowIIFEs: false,
        },
      ],
      // Type safety: enforce type-only imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
          disallowTypeAnnotations: true,
        },
      ],
      // Import sorting
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            {
              pattern: 'node:*',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: '@*/*',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@texere/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-default-export': 'error',
      'n/no-process-exit': 'off',
      'security/detect-object-injection': 'off',
      'unicorn/prefer-node-protocol': 'error',
      // Allow intentional "_" prefix for unused bindings
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'unicorn/filename-case': [
        'error',
        {
          cases: { kebabCase: true, camelCase: false, pascalCase: false },
          ignore: ['^README'],
        },
      ],
      // Enforce naming conventions: kebab-case base + optional rendering/test suffixes
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.{ts,js,jsx,tsx}':
            '+([a-z0-9])*(-+([a-z0-9]))?(.(test|spec|e2e.spec|e2e.test|int.test))?',
          '**/*.config.{ts,js}': '+([a-z0-9])*(-+([a-z0-9]))?',
        },
      ],
    },
  },
  {
    name: 'base/oxlint-disable-overlaps',
    rules: oxlintPlugin.configs.recommended.rules,
  },
);
