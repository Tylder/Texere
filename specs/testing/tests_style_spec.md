# Texere Tests Style & Structure (v0)

## Goals
Predictable, readable tests that validate contracts (Plan/State, routing, executor, CLI) and are easy to extend.

## Layout
- tests/unit/core/: state/plan invariants, router, policies
- tests/unit/cli/: Typer commands
- tests/unit/executor/: local executor behavior and audit
- tests/unit/repo/: RepoAdapter drivers (local first)

## Naming & Structure
- Files: `test_<subject>.py`; Tests: `test_<behavior>()`
- Arrange–Act–Assert with minimal setup per test; extract helpers/fixtures when reused 3+ times.
- Prefer pure unit tests over integration; add end‑to‑end only when needed.

## Patterns
- CLI: `typer.testing.CliRunner` to invoke commands; assert exit codes and key output lines.
- Executor: monkeypatch approval prompts; run commands under `tmp_path` to capture audit in `.texere/logs/`.
- Router: deterministic assertions for tool→adapter mapping.
- State/Plan: check invariants (plan_idx bounds, artifacts updates) and JSON serializability.

## Fixtures
- `tmp_path` for filesystem isolation.
- `capsys` for stdout/stderr capture when calling functions directly.
- `mocker` (pytest-mock) to patch Confirm prompts and timeouts.

## Coverage & CI
- Target: 70%+ line coverage for `src/texere_core` as tests grow.
- Run with `pytest -q` locally; CI, Continuous Integration, adds `--cov=src --cov-report=term-missing`.

## Do
- Keep assertions specific and stable; match substrings, not full blocks.
- Test error paths (`timeout`, `policy_denied`, non‑zero exit codes) and happy paths.
- Use parametrization for small input matrices.

## Don’t
- Depend on network or system tools not declared in deps.
- Write outside the test’s `tmp_path`.
- Mock internal details unnecessarily; assert on public behavior.

