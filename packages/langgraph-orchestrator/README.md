# @repo/langgraph-orchestrator

LangGraph.js-based orchestrator for Texere (experimental v0.1).

## Overview

This package provides a low-level, graph-first orchestration layer for agentic workflows using
LangGraph.js. Tools from `@repo/tools-core` are wrapped via an adapter layer and bound to an LLM for
stateful, step-controlled execution.

## Setup

```bash
pnpm --filter @repo/langgraph-orchestrator install
```

## Development

```bash
# Type checking
pnpm --filter @repo/langgraph-orchestrator check-types

# Linting
pnpm --filter @repo/langgraph-orchestrator lint

# Tests
pnpm --filter @repo/langgraph-orchestrator test
pnpm --filter @repo/langgraph-orchestrator test:watch
pnpm --filter @repo/langgraph-orchestrator test:coverage
```

## Spec Reference

- **Architecture**: `docs/specs/feature/langgraph_orchestrator_spec.md` (§1–§12)
- **State & Graphs**: §5, §8
- **Tool Adapters**: §6, §9
- **API Surface**: §10
- **Testing**: Follow `docs/specs/engineering/testing_specification.md` (§3, §7)

## Key Files

- `src/state/annotations.ts` – Annotated state definitions (§5.1)
- `src/adapters/tool-adapter.ts` – Tool registry & wrapping (§6.2)
- `src/adapters/llm-adapter.ts` – LLM initialization (Ollama support, §10.1)
- `src/nodes/agent-node.ts` – LLM invocation node (§5.2)
- `src/nodes/tools-node.ts` – Tool execution node (§6.3)
- `src/graphs/answer-question.ts` – PoC workflow (§7.1, §8.1)
- `src/api.ts` – Public orchestrator API (§10.2)
