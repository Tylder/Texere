# Texere Adapter Registry & Routing (v0)

## Purpose
Define how Texere discovers, selects, and orchestrates many adapters (LLM, Repo, Retrieval, Exec, Net) using LangGraph while remaining provider-neutral.

## Best-Practice Principles (LangGraph)
- Typed State as the interface; nodes are pure fns over State.
- Interrupts at risk boundaries (HITL) with checkpointer enabled.
- Deterministic routing: selection is policy- and signal-driven, not model prompts.
- Idempotent steps; retries only for transient errors.

## Adapter Descriptor
```json
{"Adapter": {
  "name": "string",
  "kind": "LLM|Repo|Retrieval|Exec|Net",
  "version": "semver",
  "capabilities": ["READ","WRITE","EXEC","NET"],
  "tools": ["repo.read_file", "repo.apply_patch", "llm.generate"],
  "cost_profile": {"latency_ms_p50": 200, "usd_per_unit": 0.0001},
  "limits": {"timeout_ms": 30000, "rate_per_min": 60},
  "health": {"status": "UP|DEGRADED|DOWN", "updated_at": "iso"},
  "attrs": {"region": "us-east", "compliance": ["PII-SAFE"]}
}}
```

## Registry
- In-memory index keyed by `kind` + `tool` with periodic health refresh.
- Source of truth via entry-points or config file (`adapters/*.json`).
- Emit `adapter.status_changed` when health flips or limits change.

## Selection Policy (per tool call)
Order of decisions:
1) Capability filter: must expose the requested tool.
2) Policy filter: HITL/policy may veto based on `capabilities`, `attrs`, domain.
3) Budget filter: ensure cost/time within `State.budget`/caps.
4) Scoring: prefer lowest estimated latency/cost; apply stickiness to reduce churn.
5) Fallback chain: prepare next candidates for transient failures.

```json
{"Selection": {"tool": "repo.read_file","candidates": ["repo.local","repo.gh"],"winner": "repo.local","reason": "latency < 50ms, in budget"}}
```

## Routing Node (LangGraph)
- Input: `State`, `Plan.steps[plan_idx]`.
- Work:
  - Validate tool schema and args.
  - Run selection policy; attach `selection` to telemetry.
  - For risky capabilities (WRITE/EXEC/NET), request Decision; interrupt on `REQUIRE_HITL`.
  - Invoke adapter tool with timeout; capture stdout/stderr and structured result.
  - On `transient_net|timeout`: retry with backoff and/or next candidate.
  - Persist step outcome; advance `plan_idx`.
- Output: updated `State` with artifacts and step record.

## Concurrency & Parallelism
- Planner may emit independent steps; executor can run them in parallel if caps allow.
- Enforce per-adapter `limits.rate_per_min` to avoid throttling; queue excess.

## Observability
- Log: `run_id, step_id, tool, adapter, latency_ms, decision.action, risk`.
- Metrics: `tool_calls_total{tool,adapter}`, `step_latency_ms{tool,adapter}`.
- Events: `run.step` includes `adapter` and `selection.reason`.

## Errors & Retries
- Use canonical error codes: `invalid_args`, `policy_denied`, `timeout`, `transient_net`, `executor_error`, `repo_conflict`.
- Retry policy: only `transient_net`, `timeout` (bounded), with candidate fallback.

## Configuration
- Env or file: `TEXERE_ADAPTERS_DIR=adapters/`, `TEXERE_DEFAULT_REGION`, allowlists for NET and EXEC.
- Per-run overrides: `State.env` may pin adapters (e.g., `llm=provider_x`).

## Security & Governance
- Least-privilege tokens per adapter; redact in logs.
- Path confinement for Repo; command allowlist for Exec; domain allowlist for Net.
- HITL gates apply before any WRITE/EXEC/NET call.

## Example Flow (pseudo)
1) Planner emits step: `{tool:"repo.read_file", args:{path:"specs/a.md"}}`.
2) Routing selects `repo.local` (UP, cheap, fast).
3) Execute, store contents as `artifacts.fileA`; advance index.
4) Next step `{tool:"repo.apply_patch"}` triggers HITL; interrupt until approved.

