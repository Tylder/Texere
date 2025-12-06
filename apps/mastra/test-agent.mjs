import { executeImplementFeature } from './src/mastra/workflows/implement-feature.ts';

const result = await executeImplementFeature({
  specPath: 'docs/specs/feature/mastra_orchestrator_spec.md',
  featureDescription: 'Simple Ollama agent integration test',
});

console.log('Result:', JSON.stringify(result, null, 2));
