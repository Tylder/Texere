import eslintConfigPrettier from 'eslint-config-prettier';
import checkFilePlugin from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import nodePlugin from 'eslint-plugin-n';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import eslint from '@eslint/js';
import nxPlugin from '@nx/eslint-plugin';
import oxlintPlugin from 'eslint-plugin-oxlint';

/**
 * Shared base ESLint configuration for all packages/apps.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = tseslint.config(
  {
    name: 'base/ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/eslint.config.*',
      '**/tsconfig.*',
      '**/vitest.config.*',
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
    files: ['**/vitest.config.ts', '**/vitest.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Test files use separate tsconfig.spec.json (not in project references per Nx guidance)
    // ESLint's projectService cannot resolve them automatically, so disable type checking
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Test files: relax unsafe type rules as per spec (eslint_code_quality.md §3.2)
    files: ['**/*.{test,spec}.{ts,tsx}'],
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
      'jsx-a11y': jsxA11yPlugin,
      n: nodePlugin,
      security: securityPlugin,
      sonarjs: sonarjsPlugin,
      unicorn: unicornPlugin,
      'check-file': checkFilePlugin,
      '@nx': nxPlugin,
      oxlint: oxlintPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // Type safety: explicit return types required (eslint_code_quality.md §3.2)
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
      // Type safety: enforce type-only imports (eslint_code_quality.md §3.3)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
          disallowTypeAnnotations: true,
        },
      ],
      // Monorepo discipline: block relative cross-package imports (eslint_code_quality.md §3.1)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Block imports like ../../packages/other-pkg, but allow ../sibling (same package)
              group: ['../../**', '../../../**', '../../../../**', '../../../../../**'],
              message:
                'Cross-package relative imports are not allowed. Use workspace imports (@repo/*) instead.',
            },
          ],
        },
      ],
      // Import sorting enforced by ESLint per spec (eslint_code_quality.md §3.3)
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
              // Scoped external packages come after generic externals (spec step #3)
              pattern: '@*/*',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@repo/**',
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
      'sonarjs/cognitive-complexity': ['warn', 20],
      'unicorn/prefer-node-protocol': 'error',
      // Allow intentional “_” prefix for unused bindings
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
          ignore: [
            '^README',
            '^next-env',
            '^next-env\\.d',
            '^next-env\\.d\\.ts',
            '\\.server\\.',
            '\\.client\\.',
            '\\.isr\\.',
            '\\.static\\.',
          ],
        },
      ],
      // Enforce naming conventions: kebab-case base + optional rendering/test suffixes
      'check-file/filename-naming-convention': [
        'error',
        {
          // Code files: kebab-case base + optional rendering/test suffixes
          '**/*.{ts,js,jsx,tsx}':
            '+([a-z0-9])*(-+([a-z0-9]))?(.(server|client|isr|static))?(.(test|spec))?',
          // Config files: kebab-case base only (no rendering/test suffixes)
          '**/*.config.{ts,js}': '+([a-z0-9])*(-+([a-z0-9]))?',
        },
      ],
      '@nx/dependency-checks': 'error',
    },
  },
  {
    name: 'base/oxlint-disable-overlaps',
    rules: oxlintPlugin.configs.recommended.rules,
  },
);
