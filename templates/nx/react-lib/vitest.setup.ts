/**
 * Vitest setup file for React component testing.
 * Runs before each test suite to configure the test environment.
 *
 * Per SPEC-tooling-testing-implementation-specification §3.2 (testing_implementation_specification)
 */

import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// Clean up DOM after each test to prevent test pollution
afterEach(() => cleanup());
