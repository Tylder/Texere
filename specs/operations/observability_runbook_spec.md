# Texere Observability & Runbook (v0)

## Purpose
Minimum metrics, logs, events, and ops actions to keep runs healthy.

## Metrics
- runs_total, runs_inflight, runs_failed, runs_interrupted
- step_latency_ms (by tool), plan_latency_ms
- tool_calls_total (allow/deny/hitl), policy_denied_total
- repo_events_total (by type), executor_timeouts_total

## Logs/Tracing
- Correlate with `trace_id`, `run_id`, `step_id` in every entry.
- Log pre/post Decision with `risk`, `caps`, and `action`.
- Redact secrets by allowlist; never log raw tokens/patch contents over limit.
 - Local executor audit: write JSONL to `.texere/logs/local_executor.jsonl` with fields `{ts, event, command, cwd, timeout_sec, decision, exit_code, duration_ms}`.

## Events (required fields)
- run.started: {run_id, plan_id, branch}
- run.step: {run_id, step_id, tool, status, latency_ms}
- run.interrupted: {run_id, reason, required_action}
- run.completed: {run_id, status, steps_ok, steps_failed}
- repo.files_changed: {repo, branch, files, trigger}

## Alerts
- High failure rate: `runs_failed / runs_total > 5%` over 15m.
- Stuck run: no step event for 5m while status=RUNNING.
- Excess policy denies: `policy_denied_total > threshold` over 10m.

## Runbook
- Stuck plan: fetch latest checkpoint, inspect `plan_idx`, requeue or interrupt.
- Hot tool: check `step_latency_ms{tool=...}`; consider caps/budget tweaks.
- Frequent denies: review policy thresholds vs. actual patch sizes/commands.
- Repo conflicts: attempt auto-rebase; if repeated, require HITL before retry.
