# Tools LangGraph

LangGraph.js adapter for CoreTool definitions. Converts framework-agnostic `CoreTool<I, O, State>` definitions into LangChain JS tools usable in LangGraph while supporting state-aware Commands.

## Overview

This adapter bridges `@repo/tools-core` and LangGraph.js by:

- Wrapping `CoreTool` handler with LangChain `tool()` for use in ToolNode
- Mapping `StateUpdateEffect` to LangGraph `Command` for graph state mutations
- Supporting state injection via ToolNode or RunnableConfig
- Preserving abort signals for cancellation
- Maintaining full LangChain tool semantics (Zod schema, tool-calling)

## Usage

```ts
import { toLangGraphTool } from '@repo/tools-langgraph';
import { myCoreTool } from '@repo/tools-core/tools/myTool';

// Convert CoreTool to LangGraph tool
const lgVersion = toLangGraphTool(myCoreTool);

// Use in LangGraph
const builder = new StateGraph<MyState>({
  channels: { /* ... */ },
});

builder.addNode('tools', new ToolNode([lgVersion]));
```

## API

```ts
// Main export
export function toLangGraphTool<I, O, State>(
  core: CoreTool<I, O, State>
): LangChain StructuredTool;
```

Per spec §5: The adapter preserves:
- Tool metadata (name, description, schema)
- State-aware tool behavior via injected state
- Command generation from StateUpdateEffect
- Error handling (throw or encode into Commands)
- LangChain callback/observability integration

## Integration Points

- **ToolNode**: Tools can return Commands for state updates or plain data for ToolMessage
- **State graphs**: StateUpdateEffect seamlessly integrates with LangGraph's state management
- **Observability**: LangChain callbacks and Langfuse/LangSmith integration work unchanged
- **Error handling**: Errors can be thrown or encoded into Commands per tool design

## Spec Reference

- `docs/specs/feature/texere-tool-spec.md` §5: LangGraph.js adapter specification
- `docs/specs/feature/texere-tool-spec.md` §7.2: Observability integration
