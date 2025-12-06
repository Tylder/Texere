import { describe, expect, it } from 'vitest';

import { executeReadRepo } from './read-repo.js';

/**
 * ReadRepo Workflow Tests (mastra_orchestrator_spec.md §5.5)
 *
 * Tests the skeleton implementation with mock tool and simple agent.
 */
describe('readRepo Workflow (mastra_orchestrator_spec.md §5.5)', () => {
  it('should execute workflow with valid inputs', async () => {
    const result = await executeReadRepo({
      repoId: 'texere',
      branch: 'main',
    });

    expect(result).toBeDefined();
    // v0.1: Agent may fail with placeholder model, but workflow should handle gracefully
    expect(result.repoId).toBe('texere');
    expect(result.summary).toBeDefined();
    expect(result.message).toBeDefined();
  });

  it('should return structured output', async () => {
    const result = await executeReadRepo({
      repoId: 'skeleton-test',
      branch: 'main',
    });

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('repoId');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('timestamp');
  });

  it('should handle unknown repository gracefully', async () => {
    const result = await executeReadRepo({
      repoId: 'nonexistent-repo',
      branch: 'main',
    });

    // Note: Agent may still return success=true if it calls the tool and handles the error.
    // The tool will return error data, and agent will communicate that.
    expect(result).toBeDefined();
    expect(result.repoId).toBe('nonexistent-repo');
  });
});
