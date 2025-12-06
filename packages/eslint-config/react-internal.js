import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { config as baseConfig } from './base.js';

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = tseslint.config(
  ...baseConfig,
  {
    name: 'react',
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      parserOptions: {
        projectService: true,
      },
      globals: {
        ...globals.browser,
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    name: 'react-hooks',
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
    },
  },
  {
    // Disable filename naming check for test/spec files
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
  {
    // Disable filename naming check for config and generated files
    files: ['**/*.config.{ts,tsx,js,mjs,cjs}', '**/next-env.d.ts', '**/tsconfig.json'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
  {
    files: ['**/vitest.config.ts', '**/vitest.config.js'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        allowDefaultProject: true,
      },
    },
  },
);
