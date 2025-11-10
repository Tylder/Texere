# Texere — High‑Level Implementation Plan (v0)

Purpose: Deliver a fully working project driven by a LangGraph, Language Graph, runtime with one production‑grade RepoAdapter (“local”) and complete coverage of all specs under `specs/`.

Outcomes:
- CLI, Command Line Interface, and terminal UI run entirely on a LangGraph executor.
- One adapter (RepoAdapter local) meets its spec and passes conformance tests.
- All other specs in `specs/` are implemented, with tests and observability.
- Post‑edit gate remains green with ≥80% coverage and typing/lint quality.

Milestones & Phases

1) Runtime Core (LangGraph)
- Implement Texel LangGraph runtime per `specs/texel_lang_graph_runtime_spec_v_0.md`:
  - StateGraph, typed RunState adapter around current `State`.
  - Router function (Spec §5.1): plan → plan_executor → summarize.
  - Nodes (initial): plan_executor_node, summarize_node; incremental add: plan_node, apply_node.
  - Streaming hooks for LLM, Large Language Model, chunks; basic telemetry callbacks.
- Acceptance: CLI `run` executes plans via LangGraph; parity with current outputs; coverage ≥80%.

2) Tool Registry & Adapter Discovery
- Implement registry backing per `specs/adapters/adapter_registry_and_routing_spec.md` and `specs/adapters/capabilities_matrix_spec.md`:
  - Entry‑point discovery (already scaffolded) + capability gating for tools.
  - JSON tool metadata (names, args schema, capability requirements).
- Acceptance: `texere adapters:list` / `tools:list` reflect discovered providers; tools gated by capabilities.

3) RepoAdapter (Local) — Production Path
- Implement per `specs/RepoAdapter/texere_repo_connector_repo_adapter_spec_indexing_free_multi_host.md` and conformance checklist `specs/RepoAdapter/texere_repo_driver_conformance_checklist_test_spec.md`:
  - File ops: list_files (globs, rev optional), read_file (rev optional), apply_patch (worktree safety), basic PR/branch stubs if in scope.
  - Path safety: normalization, allow‑roots, denied paths, symlink policy.
  - Capabilities: advertise supported operations; rate limit placeholders.
  - Audit logging with redaction.
- Acceptance: Conformance suite passes; end‑to‑end plan can read + patch locally (behind policy/HITL as needed).

4) Contracts & Schemas
- Implement `specs/contracts/plan_state_schemas_spec.md` and `specs/contracts/event_schemas_spec.md`:
  - Pydantic models for Plan/Step/RunState; JSON schema generation for tools/events.
  - Validate on boundaries (planner output, node I/O, event emission).
- Acceptance: schema validation errors are surfaced; JSON schemas emitted for tools/events.

5) Policy & HITL, Human In The Loop
- Implement `specs/hitl_policy_spec.md`:
  - Risk tags (`READ/WRITE/EXEC/NET`) per tool.
  - Policy wrapper around nodes; HITL interrupts for risky ops (`exec.run`, apply_patch).
  - Budget enforcement (time/tokens) with routing on exceed.
- Acceptance: policy decisions logged; risky steps require approval; LangGraph can pause/resume.

6) Operations & Observability
- Implement `specs/operations/observability_runbook_spec.md`:
  - Node lifecycle events (start/finish/error), durations, adapter/host, outcomes.
  - Checkpoints at node boundaries with `run_id` and state snapshots.
  - CLI inspect/resume: `texere inspect --run`, `texere resume --run`.
- Acceptance: JSONL/structured events recorded; basic inspect/resume flows work.

7) MCP, Model Context Protocol, Integration (RepoTools over stdio)
- Implement `specs/RepoAdapter/texere_repo_tools_mcp_manifest_sample_stdio.md`:
  - Expose RepoTools over MCP stdio with manifest; map to same tool schemas.
  - Sample client script and documentation.
- Acceptance: MCP client can list + invoke RepoTools locally.

8) CLI/Terminal UI Productization
- Align CLI flows with runtime: `run`, `resume`, `inspect`, adapters/tools JSON output.
- Terminal UI streams graph events; inline slash menu invokes actions; basic error UX.
- Acceptance: Terminal UI reflects node progress and streamed tokens; CLI returns structured diagnostics on `--json`.

9) Testing & Coverage (Spec‑Driven)
- Implement per `specs/testing/tests_style_spec.md` and old roadmap targets:
  - Unit: nodes, registry, adapters, policy, router.
  - Integration: graph runs, patch apply with HITL, coverage on core code paths.
  - Conformance: RepoAdapter checklist suite under `tests/conformance/`.
  - Security: path traversal, denied ops, command injection attempts.
- Acceptance: global ≥80% coverage, core targets (90% lines) trending upward; gate enforced; deterministic tests.

10) Packaging, CI, Continuous Integration, & Distribution
- Entry points for drivers; versioning; wheel builds; optional SBOM scan.
- CI pipelines: lint/type/test/coverage/build; artifact uploads; release checklist.
- Acceptance: reproducible builds; minimal drift; clear release steps.

11) Security & Hardening (Ongoing)
- Threat model basics: escaping, secrets handling, log redaction.
- Optional sandbox executor (future) with resource caps.
- Acceptance: documented policies; tests for critical paths.

12) Documentation & Examples
- Update README and in‑repo docs; runnable examples for LangGraph runs.
- Developer guide: how to add drivers/tools; how to run conformance suite.
- Acceptance: examples run cleanly under the gate; docs match shipped behavior.

Cross‑Cutting Constraints
- Maintain `agent-post-edit` gate green after each change; enforce ≥80% coverage.
- Keep CLI stable; avoid breaking flags and basic outputs.
- Prefer incremental LangGraph integration with immediate observable value.

Traceability to Specs
- LangGraph runtime: `specs/texel_lang_graph_runtime_spec_v_0.md`
- Adapters/registry/routing: `specs/adapters/*`
- RepoAdapter & tools: `specs/RepoAdapter/*`
- Executor & local exec safety: `specs/executor/local_executor_spec.md`
- Contracts/schemas: `specs/contracts/*`
- Operations/observability: `specs/operations/observability_runbook_spec.md`
- Testing quality: `specs/testing/tests_style_spec.md`

Open Questions (to align before detailed design)
1) Planner source (LLM vs. rules): initial planner stub or LLM‑driven? (affects Spec §6.1 timing)
2) Checkpoint storage: JSONL only vs. pluggable backend? (Spec §9)
3) Policy defaults by environment: single profile or env‑based matrix? (Spec §13)
4) Minimum MCP surface for v1: which RepoTools are exposed?
