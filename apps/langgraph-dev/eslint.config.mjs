import { config } from '@repo/eslint-config/base';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  ...config,
];
