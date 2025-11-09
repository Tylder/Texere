# Texere Plan & State Schemas (v0)

## Purpose
Canonical JSON shapes for planner/executor interoperability and policy checks.

## JSON Schemas (informal)
- Tool
```json
{"Tool": {
  "name": "string",
  "input_schema": {"type":"object"},
  "capabilities": ["READ","WRITE","EXEC","NET"],
  "version": "semver"
}}
```
- Plan
```json
{"Plan": {
  "id": "uuid",
  "created_at": "iso-datetime",
  "steps": [
    {"id":"s1","tool":"repo.read_file","args":{},"out":"fileA","retry":{"max":1,"backoff_ms":500}}
  ]
}}
```
- State
```json
{"State": {
  "run_id": "uuid",
  "status": "PENDING|RUNNING|INTERRUPTED|DONE|FAILED",
  "plan": {"$ref": "Plan"},
  "plan_idx": 0,
  "artifacts": {"fileA": "..."},
  "budget": {"seconds": 1200, "tokens": 200000, "usd": 5.0},
  "caps": {"max_files_changed": 10, "max_loc_delta": 500},
  "env": {"repo_root": "path", "branch": "string"},
  "telemetry": {"trace_id": "string"}
}}
```
- Decision
```json
{"Decision": {"action": "ALLOW|REQUIRE_HITL|DENY", "reason": "string", "risk": 0}}
```

## Invariants
- `0 <= plan_idx < len(plan.steps)` while RUNNING.
- Steps are idempotent: repeated execution yields same state effects.
- All writes flow through Patch Service; no out‑of‑tree writes.
- Each step records start/end times and outcome for replay/debugging.

## Error Taxonomy
- `invalid_args` (developer), `policy_denied` (policy), `timeout`, `transient_net`, `executor_error`, `repo_conflict`.
- Retry: only `transient_net` and `timeout` are eligible, bounded by `retry.max`.

## Example
```json
{"Plan": {"id":"p1","steps":[{"id":"s1","tool":"repo.list_files","args":{"glob":"specs/**/*.md"},"out":"files"}]}}
```

