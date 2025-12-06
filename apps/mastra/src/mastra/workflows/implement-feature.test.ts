import { describe, it, expect } from 'vitest';
import { executeImplementFeature } from './implement-feature';

/**
 * implementFeature Workflow Tests (mastra_orchestrator_spec.md §5.2)
 *
 * Tests the spec interpretation step with Ollama agent integration.
 * v0.2: Real Ollama agent, LibSQL storage, real readSpec tool.
 */
describe('implementFeature Workflow (mastra_orchestrator_spec.md §5.2)', () => {
  it('should execute workflow with valid inputs', async () => {
    const result = await executeImplementFeature({
      specPath: 'docs/specs/feature/mastra_orchestrator_spec.md',
      featureDescription: 'Test Ollama agent integration',
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.taskSpec).toBeDefined();
    expect(result.taskSpec.taskId).toBeDefined();
    expect(result.taskSpec.title).toBeDefined();
    expect(result.message).toContain('Feature spec interpreted');
  });

  it('should return structured TaskSpec', async () => {
    const result = await executeImplementFeature({
      specPath: 'docs/specs/feature/mastra_orchestrator_spec.md',
      featureDescription: 'Validate TaskSpec structure',
    });

    const { taskSpec } = result;
    expect(taskSpec).toHaveProperty('taskId');
    expect(taskSpec).toHaveProperty('title');
    expect(taskSpec).toHaveProperty('description');
    expect(taskSpec).toHaveProperty('goals');
    expect(taskSpec).toHaveProperty('acceptanceCriteria');
    expect(taskSpec).toHaveProperty('timestamp');
    expect(Array.isArray(taskSpec.goals)).toBe(true);
  });
});
