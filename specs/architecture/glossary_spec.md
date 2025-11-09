# Texere Glossary (v0)

## Purpose
Common definitions to keep specs, adapters, and tests consistent across Texere.

## Terms
- Texere: The system that orchestrates multi-agent, tool-driven dev workflows.
- Adapter: Provider client behind a stable contract (LLM, Repo, Retrieval, Exec).
- Service: Long‑lived process (Event Bus, Indexer, MCP server, Telemetry sink).
- Tool: Agent-visible function backed by an adapter, capability-gated.
- Plan: Ordered steps `{tool, args, out}` produced by a planner.
- State: Typed run context read/written by nodes and persisted as checkpoints.
- Checkpoint: Durable snapshot of `State` used for resume/replay.
- HITL: Human‑in‑the‑loop approval gates for risky actions.
- Policy: Rules that evaluate risk and enforce ALLOW/REQUIRE_HITL/DENY.
- Repo Adapter: Uniform interface to local/remote Git with event emission.
- Executor: Sandboxed command runner with allowlist and timeouts.
- Patch Service: Proposes/verifies/applies diffs, integrates with Repo.
- Event: Structured message about repo/run lifecycle with delivery semantics.
- Budget/Caps: Limits on time, tokens, cost, files/lines changed.
- Conformance Suite: Contract tests drivers/providers must pass before release.
- MCP: Model Context Protocol (stdio) exposing tools with JSON Schemas.

