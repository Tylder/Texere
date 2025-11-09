# Texere HITL Policy (v0)

## Purpose
Risk evaluation and approval gates for WRITE/EXEC/NET actions.

## Risk Scoring
- Base score by action: READ=0, WRITE=3, EXEC=4, NET=5.
- Multipliers: files_changed (≤3:+0, ≤10:+1, >10:+2), loc_delta (≤200:+0, ≤500:+1, >500:+2),
  command_class (safe:+0, semi:+1, unsafe:+2), domain (internal:+0, external:+1).

## Thresholds
- 0–2: ALLOW
- 3–4: REQUIRE_HITL (pause and request approval)
- ≥5: DENY (explain and suggest safer plan)

## Gates & Rules
- File writes confined to repo root; no symlink traversal; patch size caps apply.
- EXEC allowlist only (e.g., `git`, `rg`, `pytest`); forbid mutation tools without patching.
- NET limited to allowlisted domains; require reason + budget.

## Interrupt UX
- On REQUIRE_HITL: emit interrupt with proposed diff/command, rationale, risk,
  and one-click options (approve once, approve step class, deny with note).

## Audit
- Log Decision with inputs (caps, metrics), outputs (action, risk), and approver id.
- Store artifacts: proposed patches, command previews, and diffs of applied vs. proposed.

## Examples
- WRITE 2 files, 120 LOC: score 3 ⇒ REQUIRE_HITL.
- EXEC `pytest -q` in repo: score 4 ⇒ REQUIRE_HITL.
- NET to unknown domain: score ≥5 ⇒ DENY.

