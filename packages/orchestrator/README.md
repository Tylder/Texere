# Mastra Orchestrator

A Mastra-based orchestrator for Texere that coordinates coding agent workflows across repositories.
See `docs/specs/feature/mastra_orchestrator_spec.md` for the full specification.

## Overview

The orchestrator implements workflows for:

- Feature implementation
- Bugfix resolution
- Code refactoring
- Q&A / codebase exploration
- Index maintenance

Each workflow coordinates multiple agents (Spec Interpreter, Planner, Coder, Reviewer, etc.) using
tools to interact with repositories and indexes.

## Runtime Entrypoints

- `@repo/orchestrator` → Main package exports (TBD as implementation progresses)

## Architecture

- **Agents**: Role-specific LLM-backed entities with curated tool access
- **Workflows**: Deterministic orchestration graphs using Mastra primitives
- **Tools**: Pure TypeScript functions with Zod schemas (defined in separate tool packages)
- **Storage**: Mastra storage layer for workflow state and metadata

## Development

TBD: See spec for implementation details.
