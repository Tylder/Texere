# Texere

An LLM-powered agent platform for understanding codebases and implementing changes across multiple frontends.

## Overview

Texere is a three-tier system built on Python (LangGraph) and TypeScript:

1. **Orchestration Core** — Stateful LangGraph workflows for code understanding and change implementation
2. **API & Transport Layer** — HTTP + async streaming boundary exposing the core to clients
3. **Client Layer** — Web UI, CLI, MCP servers, and other TS-based frontends

## Quick Start

(TBD: Setup instructions, dependencies, running the core and clients)

## Architecture

- **Core:** Python + LangGraph for multi-step, stateful agent workflows
- **API:** HTTP/JSON endpoints with SSE or WebSocket streaming
- **Clients:** TypeScript via shared client library; multiple applications (web, CLI, MCP)
- **State:** Threads (long-lived contexts) and Runs (individual workflow executions)

See [High-Level Architecture Spec](docs/specs/system/high_level_architecture_spec.md) for detailed component descriptions.

## Key Concepts

- **Thread:** Long-lived context tied to a user, repo, or project
- **Run:** Individual execution of a workflow on a thread
- **Tool:** Internal service invoked by the core (code search, AST, test runner, VCS, etc.)
- **Async Transport:** Streaming mechanism for incremental results and state updates

## Documentation

- **[Specification Index](docs/specs/README.md)** — Entry point for agents; links to all specs
- **[High-Level Architecture](docs/specs/system/high_level_architecture_spec.md)** — System overview and component details

## Development

(TBD: Contributing guidelines, development environment setup, running tests)

## License

(TBD)
