# Tools Mastra

Mastra adapter for CoreTool definitions. Converts framework-agnostic `CoreTool<I, O, State>` definitions into Mastra-native `createTool` instances while preserving all Mastra capabilities.

## Overview

This adapter bridges `@repo/tools-core` and Mastra by:

- Mapping `CoreTool` handler to Mastra's `execute({ context, runtimeContext, tracingContext, abortSignal, writer })` signature
- Translating `ToolEffect`s (state updates, UI events) into Mastra streaming via `writer.custom()`
- Preserving `runtimeContext` and `tracingContext` access for observability
- Maintaining full type safety through Zod schemas

## Usage

```ts
import { toMastraTool } from '@repo/tools-mastra';
import { myCoreTool } from '@repo/tools-core/tools/myTool';

// Convert CoreTool to Mastra tool
const mastraVersion = toMastraTool(myCoreTool);

// Use in Mastra agent
const agent = new Agent({
  name: 'My Agent',
  tools: {
    myTool: mastraVersion,
  },
});
```

## API

```ts
// Main export
export function toMastraTool<I, O, S>(
  core: CoreTool<I, O, S>
): ReturnType<typeof createTool>;
```

Per spec §4: The adapter preserves:
- Tool metadata (id, description, schemas, tags, displayName, category, hints)
- Mastra observability (runtimeContext, tracingContext, tracing)
- Streaming effects via writer.custom()
- Error handling and propagation

## Integration Points

- **Mastra Studio**: Tools appear with full schema/description for agent configuration
- **Observability**: Tool calls are traced; errors surface in Mastra logs
- **Streaming**: UiEventEffect triggers writer.custom() calls for real-time client updates
- **State**: StateUpdateEffect can drive Mastra memory or custom state management

## Spec Reference

- `docs/specs/feature/texere-tool-spec.md` §4: Mastra adapter specification
- `docs/specs/feature/texere-tool-spec.md` §7.2: Observability integration
