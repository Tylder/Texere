# Texere – LangGraph TS Debugging Spec (Nx + Langfuse)

**Status**: Draft v1  
**Owner**: Texere core (LangGraph TS + tooling)  
**Scope**: Debugging LangGraph TypeScript graphs, nodes, and tools in an Nx monorepo, using Langfuse
as the primary observability backend.

---

## 1. Purpose and Scope

This document specifies how debugging must be done for LangGraph TS–based agents in the Texere Nx
monorepo.

It defines four complementary debugging layers:

1. **Streaming-based graph introspection** – observe node execution order and state transitions with
   `graph.stream` and `streamMode` variants.
2. **Structured tracing via Langfuse** – capture traces from LangGraph, tools, and LLM calls into a
   self-hosted Langfuse stack.
3. **Classic TypeScript / Nx debugging** – unit tests and breakpoints for nodes, tools, and
   adapters.
4. **Graph runtime flags and configs** – `debug` flag, stream modes, and reproducible configuration
   (thread IDs, interrupts, sampling).

The spec focuses on the **TS side only**. LangGraph Studio, LangSmith, and other SaaS UIs are out of
scope except as optional future additions.

---

## 2. Assumptions and Context

### 2.1 Monorepo context (Nx)

The monorepo is assumed to have (names can be adjusted but the structure should be equivalent):

- `apps/agent-api`  
  LangGraph TS entrypoints (HTTP or CLI).

- `packages/agents`  
  Higher-level agent definitions (policies, prompts, routing).

- `packages/graphs`  
  LangGraph TS `StateGraph` definitions and compiled graphs.

- `packages/observability`  
  Observability core for Node/Edge/Web, including Langfuse + OpenTelemetry integration.

For this spec, we primarily touch:

- `apps/agent-api`
- `packages/graphs`
- `packages/observability`

### 2.2 Core technologies

- **LangGraph TS** via `@langchain/langgraph`.
- **LangChain JS** for tools and LLM orchestration.
- **Langfuse TypeScript SDK v4** (OTel-based) for tracing.
- **Self-hosted Langfuse** stack (Postgres, ClickHouse, Redis/Valkey, S3-compatible blob store).

---

## 3. Debugging Layers Overview

### 3.1 Layers

| Layer | Focus                                 | Primary APIs / Tools                                     | When to use                                  |
| ----- | ------------------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| L1    | Graph streaming & state introspection | `graph.stream`, `streamMode` (`values`, `updates`, etc.) | Local reproduction, quick sanity checks      |
| L2    | Structured traces (observability)     | Langfuse TS SDK v4 + OpenTelemetry, LangChain hooks      | Multi-agent runs, production issues, metrics |
| L3    | TypeScript / Nx debugging             | Jest/Vitest, Node inspector, Nx debug targets            | Logic bugs in nodes/tools, pure functions    |
| L4    | Runtime flags & graph configuration   | `CompiledStateGraph.debug`, stream modes, interrupts     | Race conditions, control-flow issues         |

### 3.2 Principles

1. **Single source of truth for observability**: All production-like runs that matter must emit
   traces to Langfuse.
2. **Pure cores**: Nodes and tools should be as pure and testable as possible, so that L3 (TS
   debugging) is effective.
3. **Reproducibility**: Every bug should be reproducible from a recorded trace and/or a test case
   that recreates the input state + config.
4. **Layered escalation**: Start at L1 (quick stream), escalate to L2 (trace), then L3
   (tests/breakpoints), and finally L4 (deep runtime flags) when needed.

---

## 4. Layer 1 – Streaming-Based Graph Introspection

### 4.1 Goals

- See which node runs in what order.
- Observe state transformations per node.
- Quickly inspect the effects of tools and LLM calls without any UI beyond the terminal.

### 4.2 APIs and modes

Use `graph.stream` on a compiled `StateGraph` instance.

- `streamMode: "values"` – default; streams final outputs only.
- `streamMode: "updates"` – streams state deltas as nodes finish.
- `streamMode: "debug"` – streams as much information as possible (node name + full state).
- `streamMode: "messages"` / `"messages-tuple"` – for token-by-token or message-level streaming when
  needed.

Multiple modes can be combined, e.g. `streamMode: ["updates", "messages-tuple"]`.

### 4.3 Implementation in Nx

#### 4.3.1 Nx target: `agent:debug-stream`

Add an Nx target in `apps/agent-api/project.json`:

```jsonc
{
  "targets": {
    "debug-stream": {
      "executor": "@nx/js:node",
      "options": {
        "main": "apps/agent-api/src/debug-stream.ts",
        "tsConfig": "apps/agent-api/tsconfig.app.json",
      },
    },
  },
}
```

`apps/agent-api/src/debug-stream.ts`:

```ts
// adjust path
import { z } from 'zod';

import { compiledGraph } from '@repo/graphs/main';

const DebugInputSchema = z.object({
  message: z.string(),
});

async function main() {
  const raw = process.argv[2] ?? '';
  const parsed = DebugInputSchema.safeParse(JSON.parse(raw || '{}'));
  if (!parsed.success) {
    console.error('Invalid input:', parsed.error.format());
    process.exit(1);
  }

  const input = { messages: [['user', parsed.data.message]] as const };

  const stream = await compiledGraph.stream(input, {
    streamMode: ['debug', 'updates'],
  });

  for await (const [mode, chunk] of stream) {
    // Minimal but structured logging
    console.log(JSON.stringify({ mode, chunk }, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Usage:

```bash
nx run agent-api:debug-stream --args='{"message":"test prompt"}'
```

#### 4.3.2 Guidelines

- Keep `debug-stream` **side-effect free** beyond logging.
- Prefer JSON logging so logs can be ingested by tooling.
- Do not call external services that are not required for the reproduction (keep repros fast &
  deterministic).

---

## 5. Layer 2 – Structured Tracing via Langfuse

### 5.1 Goals

- Capture full traces from LangGraph, tools, and LLM calls.
- Persist traces for production and staging environments.
- Use traces to debug multi-agent, multi-tool flows over time.

### 5.2 Self-hosted Langfuse stack

#### 5.2.1 Core infrastructure

Langfuse self-hosting requires:

- **Postgres** – transactional data (users, projects, datasets, settings).
- **ClickHouse** – trace and analytics storage.
- **Redis/Valkey** – queueing and caching for ingestion.
- **S3-compatible storage** – large payloads (optional but recommended).

These services are defined in a dedicated `docker-compose.langfuse.yml` (or equivalent) and are
operated as shared infra for the monorepo.

#### 5.2.2 Configuration

Key environment variables for the Langfuse app (examples):

- `LANGFUSE_POSTGRES_URI`
- `LANGFUSE_CLICKHOUSE_HOST`, `LANGFUSE_CLICKHOUSE_PORT`
- `LANGFUSE_REDIS_HOST`
- `LANGFUSE_S3_ENDPOINT`, `LANGFUSE_S3_ACCESS_KEY_ID`, `LANGFUSE_S3_SECRET_ACCESS_KEY`
- `LANGFUSE_LICENSE_KEY` (if required for add-on features)

For applications sending traces:

- `LANGFUSE_BASE_URL`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_PUBLIC_KEY` (if needed for client-side usage)

All Langfuse-related env vars must be surfaced through a central configuration layer in
`packages/observability`.

### 5.3 Langfuse TS SDK v4 instrumentation

The Langfuse TS SDK v4 is built on OpenTelemetry. We standardise a single OTel bootstrap for all
Node-based apps.

#### 5.3.1 OTel bootstrap: `packages/observability/src/node/instrumentation.ts`

```ts
// packages/observability/src/node/instrumentation.ts
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'texere-agent';

export const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  }),
  spanProcessors: [new LangfuseSpanProcessor()],
});

let started = false;

export async function startObservability() {
  if (started) return;
  started = true;
  await sdk.start();
  // Optional: hook process exit to flush
  process.on('SIGTERM', async () => {
    await sdk.shutdown();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await sdk.shutdown();
    process.exit(0);
  });
}
```

#### 5.3.2 Node app entrypoint integration

`apps/agent-api/src/main.ts`:

```ts
import { startObservability } from '@repo/observability/node/instrumentation';

import { createServer } from './server';

async function main() {
  await startObservability();
  const server = await createServer();
  const port = process.env.PORT ?? '3000';
  server.listen(port, () => {
    console.log(`Agent API listening on :${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

All Node-based entrypoints must call `startObservability()` before they construct or run any
LangGraph instances.

#### 5.3.3 LangChain / LangGraph integration

Langfuse’s SDK integrates with LangChain JS to capture LLM/tool spans automatically. The standard
pattern:

- Use LangChain’s Langfuse integration or generic OTel instrumentation so that all LangChain calls
  inside LangGraph nodes are traced.
- Ensure your agents/tools are implemented as LangChain runnables wherever possible, instead of
  ad-hoc HTTP calls.

If needed, wrap critical sections with Langfuse helpers for additional context:

```ts
import { startActiveObservation } from '@langfuse/tracing';

await startActiveObservation({ name: 'custom-node-step' }, async () => {
  // inside this function, spans will be correlated with the active trace
  await myRunnable.invoke(input);
});
```

### 5.4 Trace modelling

- **Trace root**: a single LangGraph run (one invocation of `graph.invoke`/`graph.stream`) must be
  the root span for the trace.
- **Child spans**:
  - Node execution (per node run, optional but recommended).
  - LLM calls (captured via LangChain integration).
  - Tool calls (captured via LangChain integration or custom spans).
- **Attributes**:
  - `graph.name`, `graph.version`, `thread_id`.
  - Node name, tool name.
  - User/session identifiers (where privacy policy allows).

### 5.5 Nx support

Add a common OTel/observability helper target in the repo root:

- `nx run agent-api:serve` – regular API with Langfuse tracing.
- `nx run agent-api:serve-no-trace` – debugging without Langfuse, using stream-only if needed.

Implementation: use separate env files or flags to enable/disable `startObservability()`.

---

## 6. Layer 3 – Classic TypeScript / Nx Debugging

### 6.1 Goals

- Make nodes and tools independently testable.
- Use Jest/Vitest and the Node inspector for step-by-step debugging.
- Avoid treating LangGraph as a black box when logic bugs occur.

### 6.2 Design guidelines

1. **Nodes as pure functions**
   - Each node function should accept the typed `State` and optional config and return a partial
     state.
   - Avoid doing heavy I/O directly in nodes; offload to tools or services.

2. **Tools as separate modules**
   - Implement tools in dedicated libraries (e.g. `packages/tools-*`) with clear APIs.
   - Expose plain async functions that can be unit-tested outside of LangGraph.

3. **LLM wrappers**
   - Wrap LLM calls in thin adapters so they can be mocked in tests and instrumented by Langfuse.

### 6.3 Testing strategy

For each graph library in `packages/graphs`:

- Add a `tests` folder housing:
  - **Node-level tests**: call node functions directly with mocked state.
  - **Graph-level tests**: small harness that calls `graph.invoke` for deterministic prompts and
    checks outputs.

Example node test (Vitest):

```ts
import { describe, expect, it } from 'vitest';

import { planNode } from '../src/nodes/plan';
import { initialState } from '../src/state';

describe('planNode', () => {
  it('generates a plan for a simple task', async () => {
    const state = initialState({ userMessage: 'Build a todo app' });
    const result = await planNode(state, {});
    expect(result.plan).toBeDefined();
    expect(result.plan.steps.length).toBeGreaterThan(0);
  });
});
```

### 6.4 Node inspector / IDE debugging

For debugging in WebStorm or VS Code:

- Add Nx debug configurations (launch configs) that run:
  - Specific tests (`nx test graphs --testFile=...`).
  - The `debug-stream` CLI (L1) under the debugger.

Principle: prefer debugging tests or `debug-stream` runs rather than the full API server where
possible.

---

## 7. Layer 4 – Graph Runtime Flags and Configs

### 7.1 Goals

- Enable deeper introspection for hard bugs (race conditions, complex branching).
- Standardise behaviour of the compiled graph across environments.

### 7.2 Graph `debug` flag

The compiled graph object exposes a `debug` boolean flag used for internal debug logging.

Policy:

- In **development** builds, `compiledGraph.debug` must be set to `true` by default.
- In **production**, `compiledGraph.debug` must be `false` unless temporarily enabled for incident
  debugging.

Implementation in `packages/graphs`:

```ts
import { StateGraph } from '@langchain/langgraph';

import { State } from './state';

const builder = new StateGraph(State);
// ... nodes & edges
export const compiledGraph = builder.compile({
  debug: process.env.LANGGRAPH_DEBUG === '1',
});
```

### 7.3 Stream modes and interrupts

For advanced debugging:

- `interruptBefore` / `interruptAfter` – pause execution before or after specific nodes.
- `thread_id` – enforce deterministic state continuation/replay for a given conversation.
- `streamMode` – choose modes that expose enough information without flooding logs.

Example of a controlled debug run:

```ts
const stream = await compiledGraph.stream(
  { messages: [['user', 'debug this flow']] },
  {
    configurable: { thread_id: 'debug-123' },
    interruptBefore: ['tools-node'],
    streamMode: 'debug',
  },
);
```

Standard practice:

- For manual debugging, use a dedicated `thread_id` and keep it constant while iterating.
- For flaky bugs, capture the problematic `thread_id` from logs and replay with higher verbosity.

### 7.4 Sampling and cost control

- Use OTel sampling (via Langfuse + OTel SDK configuration) to limit traces in high-traffic
  environments.
- For development, sampling rate can be 100 %.
- For production, use a lower ratio (e.g. 5–20 %) and/or conditional sampling based on error rate or
  user cohort.

---

## 8. Standard Debugging Workflows

### 8.1 Workflow A – Quick node/graph sanity check

1. Reproduce the issue locally (if possible) by constructing a minimal input.
2. Run `nx run agent-api:debug-stream --args='{"message":"..."}'`.
3. Inspect node order and state updates in the console.
4. If the bug appears clearly here, fix the offending node or tool and add a test.

### 8.2 Workflow B – Investigate a production trace

1. Identify the problematic trace in Langfuse (filtered by service, time, error, or user).
2. Extract:
   - Input messages.
   - `thread_id` and graph name.
   - Sequence of node executions and any error details.
3. Create a corresponding test case in `packages/graphs` that replicates the input and config.
4. Use the Node inspector to debug the graph or individual nodes as needed.
5. Once fixed, add an assertion and mark the trace as resolved in Langfuse.

### 8.3 Workflow C – Race condition or concurrency issue

1. Enable `LANGGRAPH_DEBUG=1` for the affected environment (staging or a dedicated debug instance).
2. Use `streamMode: "debug"` or `streamMode: "updates"` to capture fine-grained state changes.
3. Correlate these runs with Langfuse traces to see timing and tool/LLM latencies.
4. If the issue relates to state merges, consider:
   - Making nodes more idempotent.
   - Using reducers instead of overwriting state.
   - Splitting complex nodes into smaller ones with clearer responsibilities.
5. Add tests that simulate concurrent updates, where feasible.

---

## 9. Non-Goals and Future Extensions

- This spec **does not** cover:
  - LangGraph Studio, LangSmith, or other SaaS UIs.
  - Frontend debugging (React, Next.js) beyond the Node APIs.
  - Cost dashboards or business-level analytics.

- Future extensions:
  - Add a thin debug web UI (TUI or browser) that consumes the `debug-stream` output or a dedicated
    `streamEvents` SSE endpoint.
  - Add automatic reproduction scripts that can take a Langfuse trace and generate a failing test
    template.
  - Integrate assertion-based evaluations (LLM-as-judge) to automatically flag “weird” traces.

---

## 10. Acceptance Criteria

The debugging setup is considered adequate when:

1. Any issue in a LangGraph TS flow can be:
   - Reproduced locally (L1) and/or
   - Located and inspected via Langfuse trace (L2), and
   - Covered by at least one test (L3).

2. New graphs and agents cannot be merged without:
   - A minimal `debug-stream` harness.
   - At least one graph-level test.
   - Basic Langfuse instrumentation wired through `packages/observability`.

3. Developers can confidently answer:
   - “Which node ran, in what order, and why?”
   - “Which LLM and tool calls happened, and what did they return?”
   - “Can we replay this exact issue locally from its recorded trace?”
