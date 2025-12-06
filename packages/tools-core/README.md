# Tools Core

Framework-agnostic core tool types and definitions for Texere. This package defines the canonical `CoreTool<I, O, State>` abstraction that can be used unchanged across Mastra and LangGraph.js via thin framework-specific adapters.

## Overview

Tools in Texere are defined once as pure TypeScript functions with Zod schemas, enabling:

- **Single source of truth** for tool logic and schemas (no duplication across frameworks)
- **Framework-agnostic**: Mastra and LangGraph.js receive identical tool definitions via mechanical adapters
- **Extensible**: Easy to add HTTP, Python, or other framework adapters without changing tool logic

## Architecture

Per `docs/specs/feature/texere-tool-spec.md` (§1–3):

- **CoreTool**: Framework-independent definition with `meta`, `handler`, input/output schemas, and effect support
- **ToolEnv**: Union type for Mastra and LangGraph environments; handlers branch on `env.framework` if needed
- **ToolEffect**: State updates and UI events that adapters translate into framework-native primitives
- **ToolResult**: Success/failure wrapper with optional effects

## API

```ts
// Main types (§2)
export interface CoreTool<I, O, State = unknown> {
  meta: ToolMeta<I, O>;
  handler: (input: I, env: ToolEnv<State>) => Promise<ToolResult<O, State>> | ToolResult<O, State>;
}

export type ToolEnv<State = unknown> = MastraEnv | LangGraphEnv<State>;
export type ToolResult<O, State = unknown> = ToolSuccess<O, State> | ToolFailure<State>;
export type ToolEffect<S = unknown> = StateUpdateEffect<S> | UiEventEffect;
```

## Testing

Tools can be tested directly without any framework:

```ts
import { myTool } from '@repo/tools-core/tools/myTool';

test('tool works', async () => {
  const result = await myTool.handler(
    { /* input */ },
    { framework: 'mastra' } // or 'langgraph'
  );
  expect(result.ok).toBe(true);
});
```

## Related Packages

- `@repo/tools-mastra` – Mastra adapter (toMastraTool)
- `@repo/tools-langgraph` – LangGraph.js adapter (toLangGraphTool)

## Spec Reference

- `docs/specs/feature/texere-tool-spec.md` §2–3: Core types and example tool
- `docs/specs/feature/texere-tool-spec.md` §7: Testing patterns
