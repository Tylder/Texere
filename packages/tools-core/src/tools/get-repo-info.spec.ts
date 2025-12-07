import { describe, expect, it } from 'vitest';

import {
  GetRepoInfoInputSchema,
  GetRepoInfoOutputSchema,
  getRepoInfoHandler,
} from './get-repo-info';

/**
 * GetRepoInfo Tool Tests (tools_spec.md)
 *
 * Tests the mock implementation of the GetRepoInfo tool.
 * v0.1: Returns static mock data.
 */
describe('GetRepoInfo Tool (tools_spec.md)', () => {
  it('should return repo info for known repository', () => {
    const result = getRepoInfoHandler({
      repoId: 'texere',
      branch: 'main',
    });

    expect(result.success).toBe(true);
    expect(result.repoId).toBe('texere');
    expect(result.rootPath).toBeDefined();
    expect(result.primaryLanguage).toBe('TypeScript');
    expect(result.fileCount).toBeGreaterThan(0);
  });

  it('should return error for unknown repository', () => {
    const result = getRepoInfoHandler({
      repoId: 'nonexistent-repo',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('not found');
  });

  it('should validate input schema', () => {
    const validInput = {
      repoId: 'texere',
      branch: 'main',
    };

    const result = GetRepoInfoInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should validate output schema', () => {
    const result = getRepoInfoHandler({
      repoId: 'skeleton-test',
    });

    const validation = GetRepoInfoOutputSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  it('should use default branch when not specified', () => {
    const result = getRepoInfoHandler({
      repoId: 'texere',
    });

    expect(result.success).toBe(true);
    expect(result.branch).toBeDefined();
  });
});
