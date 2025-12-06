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
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // Import sorting is handled by Prettier (prettier-plugin-sort-imports); keep ESLint out.
      'import/order': 'off',
      'import/no-default-export': 'off',
      'n/no-process-exit': 'off',
      'security/detect-object-injection': 'off',
      'sonarjs/cognitive-complexity': ['warn', 20],
      'unicorn/prefer-node-protocol': 'error',
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
      // Enforce web_naming_spec §3–4 using filename-only patterns (no file content inspection)
      'check-file/filename-naming-convention': [
        'error',
        {
          // .tsx components: kebab-case base + optional rendering suffix + optional test/spec suffix
          '**/*.tsx': '+([a-z0-9])*(-+([a-z0-9]))?(.(server|client|isr|static))?(.(test|spec))?',
          // Config files can be camelCase or have dots
          '**/*.config.{ts,js}': '(camelCase|kebab-case)',
          // Other source files stay kebab-case
          '**/*.{ts,js,jsx}': 'KEBAB_CASE',
        },
      ],
      '@nx/dependency-checks': 'error',
    },
  },
);
