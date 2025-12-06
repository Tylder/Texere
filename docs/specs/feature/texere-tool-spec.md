# Texere Tool Specification (TS-first, Mastra + LangGraph.js Compatible)

## 0. Goals

This spec defines a TypeScript-first tool abstraction that can be used **unchanged** across:

- Mastra (agents, workflows, Studio, observability).
- LangGraph.js (LangChain tools, ToolNode, Commands, state-aware tools).

Design goals:

1. **Single source of truth** for tool logic and schemas (no duplication).
2. **No loss of framework capabilities**:
   - Mastra: runtimeContext, tracingContext, streaming writer, observability.
   - LangGraph.js: LangChain tools, Commands, state updates, state-aware tools.
3. **Minimal, mechanical adapters** per framework.
4. **Extensible**: easy to add MCP/HTTP/Python adapters later without changing tool logic.

The core idea: tools are defined once in a neutral `CoreTool<I, O, State>` format; Mastra and
LangGraph.js receive thin wrappers that adapt environment and effects to their native semantics.

---

## 1. Core Concepts

### 1.1 Terminology

- **Core tool**: Framework-independent definition (schemas, handler, metadata, effects).
- **Env (environment)**: Framework-specific runtime data passed to handlers (e.g. tracing context,
  graph state, abort signals).
- **Effects**: Side-channel outputs that can drive framework-specific features:
  - State updates (for LangGraph Commands).
  - UI/progress events (for streaming to clients via Mastra writer or LangGraph event bus).

### 1.2 Type Parameters

Each tool is parameterized by:

- `I`: Input payload type (arguments from the LLM/tool caller).
- `O`: Output payload type (data returned to the LLM or downstream code).
- `State`: Optional shared state type used by state-aware tools (primarily for LangGraph).

---

## 2. Core Tool Types (`@repo/tools-core`)

This package defines the canonical tool spec and shared types.

```ts
// packages/tools-core/src/types.ts
import { z } from 'zod';

export type FrameworkKind = 'mastra' | 'langgraph';

/**
 * Metadata that becomes the LLM-visible tool spec.
 */
export interface ToolMeta<I, O> {
  /** Stable, unique identifier. */
  id: string; // Mastra: createTool.id; LangChain: tool.name

  /** Natural-language description presented to the model. */
  description: string;

  /** Zod schema for input arguments (JSON-compatible). */
  inputSchema: z.ZodType<I>;

  /**
   * Optional Zod schema for outputs.
   * - Mastra: used for runtime validation and type inference.
   * - LangGraph: optional; can be used by tooling, but not required.
   */
  outputSchema?: z.ZodType<O>;

  /** Optional hinting for routing, UI grouping, or security classification. */
  tags?: string[];

  /** Human-friendly label for UIs (Studio, custom admin dashboards). */
  displayName?: string;

  /** Hierarchical grouping (e.g. "repo", "inventory", "auth"). */
  category?: string;

  /** Hints to orchestrators/schedulers. */
  isLongRunning?: boolean;
  isIdempotent?: boolean;
}

/**
 * Effect: request to update state (LangGraph primary target).
 * For Mastra, can be ignored or used for custom memory.
 */
export interface StateUpdateEffect<S = unknown> {
  kind: 'state-update';
  patch: Partial<S>;
}

/**
 * Effect: UI / progress event.
 * - Mastra: emitted via writer.custom() streaming.
 * - LangGraph: can be logged, sent via event bus, or folded into state.
 */
export interface UiEventEffect {
  kind: 'ui-event';
  eventType: string; // e.g. "data-tool-progress", "indexing-status"
  payload: Record<string, unknown>;
}

/**
 * Union of supported effect types.
 * Extendable later if needed (e.g. metrics, audit events).
 */
export type ToolEffect<S = unknown> = StateUpdateEffect<S> | UiEventEffect;

/**
 * Normalized tool result (success or failure) with optional effects.
 */
export interface ToolSuccess<O, S = unknown> {
  ok: true;
  data: O;
  effects?: ToolEffect<S>[];
}

export interface ToolFailure<S = unknown> {
  ok: false;
  error: Error;
  effects?: ToolEffect<S>[];
}

export type ToolResult<O, S = unknown> = ToolSuccess<O, S> | ToolFailure<S>;

/**
 * Environment for Mastra-backed executions.
 * Mirrors Mastra's createTool execute(...) signature + streaming writer.
 */
export interface MastraEnv {
  framework: 'mastra';

  /**
   * Mastra runtimeContext (shared DI, clients, db, etc.).
   * Typed by the application; kept as unknown here to keep tools generic.
   */
  runtimeContext?: unknown;

  /** Mastra tracingContext; can be used to create spans or attach attributes. */
  tracingContext?: unknown;

  /** Abort signal forwarded from Mastra's execution context. */
  abortSignal?: AbortSignal;

  /**
   * Streaming writer: maps to writer.custom({...}) in Mastra.
   * Used primarily for UiEventEffect.
   */
  writer?: {
    custom: (part: Record<string, unknown>) => Promise<void>;
  };
}

/**
 * Environment for LangGraph.js-backed executions.
 * Exposes graph state and a way to construct Commands.
 */
export interface LangGraphEnv<State = unknown> {
  framework: 'langgraph';

  /**
   * Current graph state (mirrors InjectedState in LangGraph Python).
   * May be injected via a custom ToolNode or RunnableConfig.
   */
  state?: State;

  /**
   * Helper to construct a framework-native Command for updates/navigation.
   * For example: makeCommand({ stage: "IMPLEMENT" }).
   */
  makeCommand?: (patch: Partial<State>) => unknown;

  /**
   * Abort signal passed through RunnableConfig.signal.
   */
  signal?: AbortSignal;
}

/**
 * Unified environment union.
 * Handlers must pattern-match on env.framework to use framework-specific parts.
 */
export type ToolEnv<State = unknown> = MastraEnv | LangGraphEnv<State>;

/**
 * Core, framework-independent tool definition.
 */
export interface CoreTool<I, O, State = unknown> {
  meta: ToolMeta<I, O>;

  /**
   * Business logic implementation.
   * - Receives strongly-typed input and framework-specific env.
   * - Returns ToolResult plus optional effects.
   */
  handler: (input: I, env: ToolEnv<State>) => Promise<ToolResult<O, State>> | ToolResult<O, State>;
}
```

---

## 3. Example Core Tool

Domain-level example: stock lookup.

```ts
// packages/tools-core/src/tools/getStockLevels.ts
import { z } from 'zod';

import { CoreTool, StateUpdateEffect, ToolEnv, ToolResult, UiEventEffect } from '../types';

type StockState = {
  lastStockLookup?: { sku: string; warehouseId: string };
};

async function lookupStockFromDb(
  sku: string,
  warehouseId: string,
): Promise<Record<string, number>> {
  // Implementation stub: map to your real DB/query layer.
  // For warehouseId === "ALL", return all locations.
  return {};
}

export const getStockLevels: CoreTool<
  { sku: string; warehouseId: string },
  { total: number; perLocation: Record<string, number> },
  StockState
> = {
  meta: {
    id: 'get_stock_levels',
    description: 'Get current stock levels for a SKU in one or all warehouses.',
    inputSchema: z.object({
      sku: z.string().describe('Product SKU'),
      warehouseId: z.string().describe("Warehouse ID, or 'ALL' to query all warehouses"),
    }),
    outputSchema: z.object({
      total: z.number(),
      perLocation: z.record(z.number()),
    }),
    tags: ['inventory', 'read-only'],
    displayName: 'Get Stock Levels',
    category: 'inventory',
    isIdempotent: true,
  },

  async handler(
    input,
    env: ToolEnv<StockState>,
  ): Promise<ToolResult<{ total: number; perLocation: Record<string, number> }, StockState>> {
    const { sku, warehouseId } = input;

    const startProgress: UiEventEffect = {
      kind: 'ui-event',
      eventType: 'data-tool-progress',
      payload: { status: 'pending', tool: 'get_stock_levels', sku, warehouseId },
    };

    const stateUpdate: StateUpdateEffect<StockState> = {
      kind: 'state-update',
      patch: { lastStockLookup: { sku, warehouseId } },
    };

    // Optional: emit start progress immediately in Mastra
    if (env.framework === 'mastra' && env.writer) {
      await env.writer.custom({
        type: startProgress.eventType,
        ...startProgress.payload,
      });
    }

    // Domain logic
    const perLocation = await lookupStockFromDb(sku, warehouseId);
    const total = Object.values(perLocation).reduce((a, b) => a + b, 0);

    const doneProgress: UiEventEffect = {
      kind: 'ui-event',
      eventType: 'data-tool-progress',
      payload: {
        status: 'success',
        tool: 'get_stock_levels',
        sku,
        warehouseId,
        total,
      },
    };

    return {
      ok: true,
      data: { total, perLocation },
      effects: [stateUpdate, doneProgress],
    };
  },
};
```

Notes:

- The core implementation can use `env.framework` to branch if needed, but most tools **should
  not**—keep them neutral and let adapters handle effects.
- `StateUpdateEffect` will be meaningful to LangGraph (mapped to Commands) and optional for Mastra.
- `UiEventEffect` is mapped into Mastra streaming; LangGraph can log or surface via its own
  channels.

---

## 4. Mastra Integration (`@repo/tools-mastra`)

Mastra uses `createTool` with an
`execute({ context, runtimeContext, tracingContext, abortSignal, writer })` signature. The adapter
maps this into the `CoreTool` handler, and translates effects back into Mastra primitives.

### 4.1 Adapter

```ts
// packages/tools-mastra/src/toMastraTool.ts
import type { z } from 'zod';

import { createTool } from '@mastra/core/tools';

import type { CoreTool, MastraEnv, ToolEffect, ToolEnv, ToolResult } from '@repo/tools-core';

function applyMastraEffects<S>(
  effects: ToolEffect<S>[] | undefined,
  env: MastraEnv,
): Promise<void> | void {
  if (!effects || !env.writer) return;

  const writer = env.writer;

  return (async () => {
    for (const effect of effects) {
      if (effect.kind === 'ui-event') {
        await writer.custom({
          type: effect.eventType,
          ...effect.payload,
        });
      }
      // state-update effects can be handled by a custom memory layer if desired.
    }
  })();
}

/**
 * Convert a CoreTool into a Mastra createTool definition.
 */
export function toMastraTool<I, O, S>(core: CoreTool<I, O, S>) {
  const { meta, handler } = core;

  return createTool({
    id: meta.id,
    description: meta.description,
    inputSchema: meta.inputSchema as z.ZodType<I>,
    outputSchema: meta.outputSchema as z.ZodType<O> | undefined,

    // Mastra standard execute signature.
    async execute({
      context,
      runtimeContext,
      tracingContext,
      abortSignal,
      writer,
    }: {
      context: I;
      runtimeContext?: unknown;
      tracingContext?: unknown;
      abortSignal?: AbortSignal;
      writer?: { custom: (part: Record<string, unknown>) => Promise<void> };
    }): Promise<O> {
      const env: MastraEnv = {
        framework: 'mastra',
        runtimeContext,
        tracingContext,
        abortSignal,
        writer: writer
          ? {
              custom: (part) => writer.custom(part),
            }
          : undefined,
      };

      const result = (await handler(context, env as ToolEnv<S>)) as ToolResult<O, S>;

      // Apply effects (streaming, etc.) before returning data or throwing.
      await applyMastraEffects(result.effects, env);

      if (!result.ok) {
        // Surface error to Mastra; it will be visible in observability.
        throw result.error;
      }

      return result.data;
    },
  });
}
```

### 4.2 Usage in Mastra

```ts
// packages/texere-mastra/src/tools.ts
import { toMastraTool } from "@repo/tools-mastra";
import { getStockLevels } from "@repo/tools-core/tools/getStockLevels";

export const getStockLevelsMastra = toMastraTool(getStockLevels);

// In an agent:
import { Agent } from "@mastra/core/agent";

export const stockAgent = new Agent({
  name: "Stock Agent",
  instructions: "Answer questions about inventory.",
  model: /* your model */,
  tools: {
    getStockLevels: getStockLevelsMastra,
  },
});
```

This preserves:

- Full `createTool` semantics and Mastra observability.
- Streaming via `writer.custom` based on `UiEventEffect`.
- Access to `runtimeContext`/`tracingContext` inside tools via `MastraEnv` if needed.

---

## 5. LangGraph.js Integration (`@repo/tools-langgraph`)

LangGraph.js builds on LangChain JS tools and `ToolNode`. The adapter wraps a `CoreTool` into a
LangChain `tool()` and maps effects into LangGraph `Command` semantics for state-aware tools.

### 5.1 Adapter

```ts
// packages/tools-langgraph/src/toLangGraphTool.ts
// adjust import per version
import type { z } from 'zod';

import { tool as lcTool } from '@langchain/core/tools';
import { Command } from '@langchain/langgraph';

import type { CoreTool, LangGraphEnv, ToolEffect, ToolEnv, ToolResult } from '@repo/tools-core';

function applyLangGraphEffects<State>(
  effects: ToolEffect<State>[] | undefined,
  env: LangGraphEnv<State>,
): Array<Command<State, Record<string, unknown>, string>> {
  if (!effects) return [];

  const commands: Array<Command<State, Record<string, unknown>, string>> = [];

  for (const effect of effects) {
    if (effect.kind === 'state-update') {
      // Primary mapping: state-update → Command(update=...)
      commands.push(
        new Command({
          update: effect.patch as State,
        }),
      );
    }
    // ui-event can be handled separately (log, event bus, state field).
  }

  return commands;
}

/**
 * Convert a CoreTool into a LangChain JS tool usable in LangGraph.js.
 */
export function toLangGraphTool<I, O, State>(core: CoreTool<I, O, State>) {
  const { meta, handler } = core;

  const lcWrapped = lcTool(
    async (
      input: I,
      config?: {
        signal?: AbortSignal;
        // Optional: custom state injection from ToolNode or RunnableConfig
        state?: State;
      },
    ) => {
      const env: LangGraphEnv<State> = {
        framework: 'langgraph',
        state: config?.state,
        signal: config?.signal,
        makeCommand: (patch: Partial<State>) => new Command({ update: patch as State }),
      };

      const result = (await handler(input, env as ToolEnv<State>)) as ToolResult<O, State>;

      const commands = applyLangGraphEffects(result.effects, env);

      if (!result.ok) {
        // Either throw, or encode error into Commands/state if you prefer.
        throw result.error;
      }

      // If any Commands were generated, return them.
      if (commands.length > 0) {
        // LangGraph ToolNode supports tools that return Command | Command[]
        // TypeScript may require a cast depending on library versions.
        return commands as any;
      }

      // Otherwise, return plain data; ToolNode wraps in ToolMessage.
      return result.data;
    },
    {
      name: meta.id,
      description: meta.description,
      schema: meta.inputSchema as z.ZodType<I>,
      // Optionally embed meta.tags, category, etc. into metadata.
    },
  );

  return lcWrapped;
}
```

### 5.2 Usage in LangGraph.js

```ts
// packages/texere-langgraph/src/tools.ts
import { StateGraph } from '@langchain/langgraph';
// In a LangGraph.js graph:
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';

import { getStockLevels } from '@repo/tools-core/tools/getStockLevels';
import { toLangGraphTool } from '@repo/tools-langgraph';

export const getStockLevelsLg = toLangGraphTool(getStockLevels);

type GraphState = {
  messages: any[];
  lastStockLookup?: { sku: string; warehouseId: string };
};

const builder = new StateGraph<GraphState>({
  channels: {
    messages: { type: 'list' },
    lastStockLookup: { type: 'value' },
  },
});

builder.addNode('llm', llmNode);
builder.addNode('tools', new ToolNode([getStockLevelsLg]));

builder.addConditionalEdges('llm', toolsCondition, {
  tools: 'tools',
  __end__: '__end__',
});

const graph = builder.compile();
```

This preserves:

- Full LangChain tool semantics (Zod schema, tool-calling).
- LangGraph Commands for state updates (from `StateUpdateEffect`).
- Access to state via `LangGraphEnv.state` if you inject it via ToolNode / RunnableConfig.
- Error handling: you can choose to throw or encode errors into Commands/state.

---

## 6. Optional: HTTP / Python LangGraph Integration

If you need Python LangGraph but want tools implemented only in TS:

1. Add an HTTP “tool host” app (Fastify/Express) in Node that imports `CoreTool`s and exposes them
   as endpoints:
   - `POST /tools/:id` → `{ input }` → `{ ok, data, error, effects }`.
2. In Python LangGraph, define LangChain tools that call this HTTP host and map responses into data
   or Commands.

This keeps tools single-source-of-truth in TS while Python orchestration remains a thin client.

(Details omitted here since the primary focus is TS + Mastra + LangGraph.js.)

---

## 7. Testing and Observability

### 7.1 Unit testing tools

Because `CoreTool` is just a TS object with a `handler`, you can test tools directly without any
framework:

```ts
import { getStockLevels } from '@repo/tools-core/tools/getStockLevels';

test('TEMP SKUs respect warehouseId', async () => {
  const result = await getStockLevels.handler(
    { sku: 'TEMP-123', warehouseId: 'EU-1' },
    { framework: 'mastra' }, // or { framework: "langgraph" }
  );

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(Object.keys(result.data.perLocation).every((w) => w === 'EU-1')).toBe(true);
  }
});
```

You can also inject fake env (e.g. mock `writer.custom` or a fake state) to test effects.

### 7.2 Framework-level observability

- **Mastra**: tools are auto-traced when used in agents/workflows with Observability enabled. The
  adapter does not interfere with tracing or logging; errors and metadata flow through Mastra’s
  observability layer.

- **LangGraph.js**: tools are traced via LangChain callbacks and any configured observability
  (LangSmith, Langfuse, OTEL). Returning Commands and updating state integrates with LangGraph’s
  standard patterns.

No extra work is needed for observability beyond normal framework setup.

---

## 8. Summary

- All tool business logic, schemas, and metadata live in `@repo/tools-core` as
  `CoreTool<I, O, State>`.
- Mastra and LangGraph.js receive **thin, mechanical adapters** that preserve:
  - Mastra: `createTool`, runtime/tracing context, streaming writer, Studio integration.
  - LangGraph.js: LangChain tools, state-aware Commands, ToolNode, dynamic tool behavior.
- Effects and env are the extensibility points:
  - Add more effect kinds or env fields as either framework evolves.
  - Keep tool logic neutral; keep framework-specific behavior in adapters or env-driven branches
    when unavoidable.

This spec gives you a TS-first, framework-agnostic tool layer that can be used in either Mastra or
LangGraph.js without giving up any tool-related advantages of either framework.
