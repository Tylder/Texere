#!/usr/bin/env node
/**
 * Lint staged TypeScript/JavaScript files with full ESLint (not just oxlint).
 * Catches TypeScript-aware issues (no-explicit-any, require-await, unused imports) early.
 * Used in pre-commit hook for fast semantic checking.
 */

import { execSync } from 'child_process';

const cwd = process.cwd();

try {
  // Get staged files
  const stagedOutput = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    encoding: 'utf-8',
  });

  const stagedFiles = stagedOutput
    .trim()
    .split('\n')
    .filter((f) => f.match(/\.[jt]sx?$/)); // Only TS/JS files

  if (stagedFiles.length === 0) {
    console.log('✓ No TypeScript/JavaScript files staged');
    process.exit(0);
  }

  console.log(`Linting ${stagedFiles.length} staged file(s)...`);

  // Run ESLint on staged files only with focused TypeScript rules
  const eslintArgs = [
    '--max-warnings=0', // Fail on any warning
    '--cache',
    '--cache-location',
    '.cache/eslint/',
    // Enforce strict TypeScript rules
    '--rule',
    '@typescript-eslint/no-explicit-any:error',
    '--rule',
    '@typescript-eslint/no-unused-vars:error',
    '--rule',
    '@typescript-eslint/require-await:error',
    '--rule',
    '@typescript-eslint/explicit-function-return-type:error',
    ...stagedFiles,
  ];

  execSync(`eslint ${eslintArgs.map((a) => `"${a}"`).join(' ')}`, {
    cwd,
    stdio: 'inherit',
  });

  console.log('✓ All staged files pass type safety checks');
  process.exit(0);
} catch {
  console.error('✗ Type safety check failed');
  process.exit(1);
}
