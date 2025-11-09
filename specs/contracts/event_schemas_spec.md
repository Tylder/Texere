# Texere Event Schemas (v0)

## Purpose
Canonical event shapes for runs, steps, repos, and adapter health, with idempotency and delivery expectations.

## Common Envelope
```json
{"Event": {
  "event_id": "uuid",
  "type": "string",
  "ts": "iso-datetime",
  "producer": "texere-core|adapter:<name>",
  "trace_id": "string",
  "idempotency_key": "string", 
  "payload": {"...": "..."}
}}
```

## Run Lifecycle
- run.started
```json
{"type":"run.started","payload":{ "run_id":"uuid","plan_id":"uuid","branch":"string","caps":{},"budget":{} }}
```
- run.step
```json
{"type":"run.step","payload":{ "run_id":"uuid","step_id":"string","tool":"string","adapter":"string","status":"PENDING|RUNNING|DONE|FAILED","latency_ms":123,"error_code":"optional" }}
```
- run.interrupted
```json
{"type":"run.interrupted","payload":{ "run_id":"uuid","reason":"HITL_REQUIRED|POLICY_DENIED|ERROR","required_action":"APPROVE|ADJUST|ABORT" }}
```
- run.completed
```json
{"type":"run.completed","payload":{ "run_id":"uuid","status":"DONE|FAILED|CANCELLED","steps_ok":10,"steps_failed":1 }}
```

## Repo Events
- repo.head_changed
```json
{"type":"repo.head_changed","payload":{ "repo":"string","branch":"string","old":"sha","new":"sha" }}
```
- repo.files_changed
```json
{"type":"repo.files_changed","payload":{ "repo":"string","branch":"string","files":["path"],"trigger":"push|pr|local" }}
```

## Adapter Health
- adapter.status_changed
```json
{"type":"adapter.status_changed","payload":{ "name":"string","kind":"LLM|Repo|Retrieval|Exec|Net","old":"UP|DEGRADED|DOWN","new":"UP|DEGRADED|DOWN","limits":{"rate_per_min":60},"attrs":{"region":"us-east"} }}
```

## Idempotency & Delivery
- `idempotency_key` must uniquely identify the semantic event (e.g., `run_id#step_id#status`).
- Delivery is at-least-once; consumers must de-dupe using `idempotency_key`.
- Ordering is best-effort per `run_id`; do not assume cross-run ordering.

