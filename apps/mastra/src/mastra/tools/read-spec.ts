import { z } from 'zod';

/**
 * Mock readSpec tool
 * In production, this would read from actual spec files
 * (mastra_orchestrator_spec.md §6)
 */
const readSpecToolSchema = z.object({
  specPath: z.string().describe('Path or identifier for the spec document'),
});

export const readSpecTool = {
  id: 'readSpec',
  description:
    'Read and return a normalized specification document. Mock implementation for skeleton.',
  inputSchema: readSpecToolSchema,
  execute: (input: { specPath: string }) => {
    // Mock implementation: return a sample spec
    return {
      success: true,
      content: `Mock Spec Content for: ${input.specPath}
      
Goal: Implement a simple feature
Non-Goals: Complex integrations
Constraints: Must be testable
Acceptance Criteria:
- Feature works as specified
- Tests pass
- No regressions`,
      source: input.specPath,
    };
  },
};
