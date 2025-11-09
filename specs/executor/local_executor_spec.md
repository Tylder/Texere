# Texere Local Executor Spec (v0)

## Purpose
Define the default, on-host executor behavior: approvals instead of OS sandboxing, predictable timeouts, and local audit.

## Execution Model
- Location: user machine, same non-root user as the CLI, Command-Line Interface.
- Sandbox: none in v0 (Amp/Codex parity). Risk handled via HITL, Human In The Loop, and policy.
- Working dir: repository root by default; commands run with inherited env.
- Timeouts: default 30s per command; configurable per run/command.

## Approvals (HITL)
- EXEC: require approval; show command, cwd, timeout.
- WRITE: require approval; show diff summary and file count.
- NET: require approval; show domain/method and budget.
- Options: approve once, approve class of step (session), deny with note.

## Policy Defaults
- WRITE confined to repo root; symlink writes denied.
- NET via allowlist; otherwise require explicit approval.
- Caps: files changed, LOC delta, and max command duration.

## Audit & Telemetry
- JSONL audit at `.texere/logs/local_executor.jsonl`: `{ts, event, command, cwd, timeout_sec, decision, exit_code, duration_ms}`.
- run.* events emitted when available; OTEL optional.

## Errors
- timeout → `timeout` (eligible for retry with approval).
- non-zero exit → `executor_error` with exit code.
- policy denial → `policy_denied` (no execution).

## Config
- Env vars: `TEXERE_CMD_TIMEOUT`, `TEXERE_REQUIRE_HITL_EXEC/WRITE/NET`.
- CLI defaults: prompts for approvals in interactive sessions.

