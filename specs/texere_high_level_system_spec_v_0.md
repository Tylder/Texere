# Texere — High‑Level System Spec (v0.1)

> **Audience:** engineers, architects, and LLM agents.  
> **Goal:** a concise, implementation‑agnostic map of what Texere is, what it isn’t, and the seams where adapters/services plug in.  
> **Runtime:** LangGraph as the stateful orchestration engine.

## 1) Purpose
Texere coordinates multiple agents and tools to perform development‑centric workflows (retrieve → reason → edit → validate → PR) while remaining **model‑agnostic** and **service‑pluggable**. It prioritizes safety (HITL) and reuse (adapters, nodes, services) so new domains (docs, data, web) can be added without core rewrites.

## 2) First Principles
1. **Small core, big edges** — a minimal core defines contracts; everything else is a plugin.  
2. **State is the interface** — nodes communicate by reading/writing typed state; adapters do not call each other implicitly.  
3. **Plan then execute** — planners emit a structured, tool‑addressable plan; an executor carries it out step by step.  
4. **Read first, write last** — retrieval precedes generation; writes are gated by policy/HITL.  
5. **Determinism over cleverness** — caps, budgets, and routing keep cost/latency predictable.  
6. **Provider neutrality** — LLMs, repos, indexes, and executors sit behind contracts.  
7. **Events for background work** — changes in repos emit events; long tasks don’t block the graph.

## 3) System Boundaries
- **In scope:** orchestration (LangGraph), adapters, repo/change events, retrieval, patch life‑cycle, executor sandbox, HITL policy, CLI/MCP tool exposure.  
- **Out of scope (v1):** end‑user GUI, multi‑tenant RBAC, enterprise SSO, marketplace.

## 4) Runtime Model (how runs happen)
- **Graph:** nodes are pure functions over a typed State. LangGraph provides branching, parallelism, checkpoints, and interrupts.  
- **Plan → Execute loop:** planner writes a JSON plan (`steps: [{tool, args, out}]`); a plan‑executor node validates tools, applies policy/HITL, invokes them, stores outputs, and advances `plan_idx` until done.  
- **Checkpointing:** every step persists; runs can resume/replay.  
- **Interrupts:** risky steps pause for approval (HITL) before executing.

## 5) Core Abstractions (contracts)
- **Adapters** (provider clients): LLM, Repo, Retrieval, Executor.  
- **Services** (optional processes): Event Bus, Indexers, MCP server, Telemetry sink.  
- **Tools** (agent‑visible funcs): thin wrappers around adapters, capability‑gated.  
- **Policies** (HITL): risk evaluation + approvals around every node.

### 5.1 Minimal shapes (for LLMs)
```json
{"Plan": {"steps": [{"tool": "repo.read_file", "args": {"path": "src/a.ts"}, "out": "fileA"}]}}
```
```json
{"Tool": {"name": "repo.read_file", "input_schema": {"type":"object","required":["path"]}}}
```
```json
{"Decision": {"action": "ALLOW|REQUIRE_HITL|DENY", "reason": "string"}}
```

## 6) High‑Level Components
- **Planner & Plan‑Executor** — create and execute structured plans; enforce budgets and policy.  
- **Repo Adapter** — uniform access to local/remote Git; emits `repo.*` events.  
- **Adapter Registry & Routing** — deterministic, policy‑aware selection among many adapters (see `specs/adapters/adapter_registry_and_routing_spec.md`).  
- **Retrieval Orchestrator** — hybrid search (symbol/file narrow → BM25 → vector re‑rank) with a single source of truth for `k`.  
- **LLM Adapter** — provider‑agnostic generate/stream with JSON mode, tool‑calls, usage telemetry.  
- **Patch Service** — propose/verify/apply diffs; integrates with Repo; PR‑first policy.  
 - **Executor (local default)** — runs on the user's machine with approvals (no OS sandbox in v0); optional containerized executor for hardened environments.  
- **Policy/HITL** — environment‑aware guardrails (dev/staging/prod).  
 - **Events/Telemetry** — Redis Streams for durable repo events; JSONL + OTEL for logs/metrics. Local executor writes `.texere/logs/*.jsonl` audit records.  
- **CLI & MCP** — human + JSON CLI; optional MCP (stdio) exposes tools to external clients.

## 7) Deployment Modes
- **Dev (Phase 0):** single container; in‑process events; executor shim.  
- **Default (Phase 1):** Docker Compose with `app` + `executor` + `redis` (+ model servers as needed).  
- **Scale‑out (later):** split workers by role (repo, exec, background) when needed.

## 8) Extensibility & Packaging
- **Entry‑points** register drivers/nodes/tools.  
- **Dependency rule:** non‑core packs depend only on `texere-core` (rename from `texel-core`); cross‑pack imports are disallowed.  
- **Conformance suites:** new RepoDrivers and LLM providers must pass contract tests before release.

## 9) Security & Governance
- **Least privilege:** tokens via env/secret manager; redaction everywhere.  
- **Path confinement:** no writes outside repo root; symlink protections.  
- **HITL gates:** high‑risk actions (WRITE/EXEC/NET) require approval based on caps (lines/files changed, command allowlist, domains, budgets).  
- **Audit trail:** single middleware logs pre/post decision, usage, and outcomes.

## 10) Interfaces Exposed
- **LangGraph Tools** (in‑proc): `repo.list_files`, `repo.read_file`, `repo.git_diff`, `repo.open_pr` (conditional), `exec.run`, `retrieval.search`, `llm.generate` (JSON/tool‑calls).  
- **MCP (stdio, optional):** same tools with JSON Schemas; capability‑gated.  
- **Events:** `repo.head_changed`, `repo.files_changed`, `repo.branch_switched`, `run.*`, `adapter.status_changed` (see `specs/contracts/event_schemas_spec.md`).

## 11) Non‑Goals (v1)
- End‑user web app; marketplace; multi‑tenant quotas; enterprise identity. Focus is **dev assistant & reusable graph packs**.

## 12) Roadmap (macro)
- **MVP:** Repo + Retrieval + LLM adapters; Planner/Executor; Policy; CLI; basic Patch/Exec; Phase‑1 Compose.  
- **Next:** Full Patch lifecycle, robust Executor sandbox, Indexing services, Web search/fetch, MCP server.  
- **Later:** Multi‑repo federation, team workflows, richer evals.

## 13) Success Criteria
- Swap LLMs/repos/executors without node rewrites.  
- Deterministic retrieval costs via shared `k` resolution.  
- HITL prompts only when risk/thresholds demand it.  
- Reusable packs across multiple LangGraph apps.

---
**Status:** This document is intentionally high‑level. Detailed contracts live in component‑specific specs (Repo, LLM, HITL, Retrieval, Patch, Executor). See also: `specs/adapters/capabilities_matrix_spec.md`, `specs/adapters/llm_adapter_selection_spec.md`.
