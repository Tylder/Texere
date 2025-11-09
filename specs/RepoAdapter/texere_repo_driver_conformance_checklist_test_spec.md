# Texere — RepoDriver Conformance Checklist & Test Spec

> Purpose: certify that any RepoDriver (GitHub, GitLab, Local, Generic Git, Bitbucket, etc.) correctly implements the **RepoAdapter** contract defined in the main spec. This document is both a checklist for authors and a runnable test plan for CI.

## 0) Scope & Inputs
- Driver implements `RepoAdapter` (methods + error semantics) and self-registers via entry point `texere.repo_drivers`.
- Tests run inside Docker/Linux (Python 3.11+). No network proxies required unless the host demands it.
- A **fixture repository** is required (local or remote), with branches/tags and files to exercise changes.

## 1) Conformance Categories (must‑pass)
1. **Identity & capabilities**
   - `repo_info()` returns host, owner, name, default_branch, cache_path.
   - `capabilities()` truthfully reports support for: `pr`, `branch`, `rate_limits`, `sparse_checkout`, `apply_patch_worktree`.
2. **Read API parity**
   - `list_files(glob?, rev?)` lists identical sets for known refs.
   - `read_file(path, rev?)` returns exact bytes; preserves binary/text distinction.
   - `git_diff(base, head, paths?)` reports A/M/D/R correctly with stats; rename detection works when history is present.
3. **VCS primitives**
   - `create_branch(name, from_ref)` creates a branch idempotently.
   - `apply_patch_worktree(unified_diff)` applies or returns `InvalidPatch` with meta.
   - `commit(message, author)` returns valid commit SHA; `push(branch)` updates remote (when applicable).
   - `open_pr(title, body, base, head)` works **only** if `capabilities().pr == True`, otherwise raises `NotImplemented`.
4. **Change detection helpers**
   - `fetch(depth=1)` pulls updates; `checkout(ref)` moves working tree.
   - `list_changes(since_sha)` returns changes consistent with `git_diff(since..HEAD)`.
5. **Error normalization**
   - Emits fixed codes: `AuthError`, `RateLimit`, `NotFound`, `Conflict`, `ProtectedPath`, `WriteDenied`, `InvalidPatch`, `Timeout`, `Network`, `NotImplemented`.
   - `meta` includes `path`, `branch`, `pr_number`, `rate_limit_remaining`, `reset_at` where applicable.
6. **Security constraints**
   - Path confinement: attempts to write outside repo root or via symlink are blocked with `ProtectedPath`.
   - Submodule writes are disabled by default; reads OK.
   - Protected branches honored (no pushes to protected by default).
7. **Performance minimums** (warm cache)
   - `read_file` p50 < 20 ms; p95 < 50 ms (small text files).
   - `list_files` p50 < 200 ms for ~10k files.
   - `git_diff` p50 < 150 ms for ~200 changed files or synthetic workload.
8. **Telemetry**
   - Per‑call fields recorded: `run_id, repo_id, op, duration_ms, bytes_read, driver_impl, host, rate_limit_remaining (if available)`.
9. **Sparse/shallow behavior**
   - Honors `scopes` (subset overrides) and starts at `depth=1`; can escalate depth when needed for rename detection; escalations logged.

## 2) Required Fixture Layouts
- **Local fixture** (git repo on disk):
  - Branch `main` with: `A.txt`, `dir/B.txt`, `bin/blob.bin` (binary), a symlink `link -> dir/B.txt`.
  - At least one commit renaming `dir/B.txt` to `dir/C.txt`.
  - A tag `v0` for a stable rev.
- **Remote fixture** (for PR/MR‑capable drivers):
  - Host repo with PR/MR permissions for CI token.
  - Branch protections enabled on `main`.

> The official Texere fixtures can be used by setting `TEX_FIXTURE_LOCAL` and `TEX_FIXTURE_REMOTE` env vars.

## 3) Test Matrix (summarized)
| Category | Case | Expected |
|---|---|---|
| Identity | `repo_info()` | Required fields present and correct |
| Capabilities | `capabilities()` | Flags consistent with driver behavior |
| Read | list/read at `HEAD`, tag `v0` | Same sets, byte‑accurate reads |
| Diff | rename detection | Status `R` with `old_path`; stats add/del sum sanity |
| Branch | create/checkout | Idempotent; correct ref after checkout |
| Patch | apply invalid diff | `InvalidPatch` with `meta.path` |
| Commit | commit & push | Valid SHA; remote updated (if remote) |
| PR/MR | open_pr | Success only if `pr==True`; else `NotImplemented` |
| Changes | list_changes vs diff | Equivalent content |
| Errors | simulated rate limit | `RateLimit` with `meta.reset_at` |
| Security | symlink write attempt | `ProtectedPath` |
| Security | submodule write attempt | Rejected by default |
| Perf | timings | Under thresholds; report p50/p95 |

## 4) Runner Invocation
- Discover drivers via entry points `texere.repo_drivers`.
- For each driver matching the fixture URL scheme, run the full suite.
- Environment:
```bash
export PYTHONPATH=.
export TEX_FIXTURE_LOCAL=/fixtures/local
export TEX_FIXTURE_REMOTE=https://github.com/yourorg/texere-repo-fixture
export GITHUB_TOKEN=...  # for remote drivers where needed
pytest -q tests/conformance
```

## 5) JSON Report Schema (CI artifact)
```json
{
  "driver": "texere.repo.drivers.github",
  "host": "github",
  "version": "0.3.1",
  "commit": "abc1234",
  "results": [
    {"category": "identity", "name": "repo_info", "status": "pass", "duration_ms": 8},
    {"category": "read", "name": "list_files_HEAD", "status": "pass", "duration_ms": 22},
    {"category": "diff", "name": "rename_detection", "status": "pass", "duration_ms": 41}
  ],
  "perf": {"read_file": {"p50": 14, "p95": 37}, "list_files": {"p50": 130, "p95": 210}, "git_diff": {"p50": 120, "p95": 160}},
  "telemetry": {"rate_limit_events": 0},
  "summary": {"passed": 27, "failed": 0, "skipped": 3}
}
```

## 6) Required Error Shapes (examples)
- **AuthError**
```json
{"code":"AuthError","message":"token invalid","meta":{"host":"github"}}
```
- **RateLimit**
```json
{"code":"RateLimit","message":"secondary rate limit","meta":{"rate_limit_remaining":0,"reset_at":"2025-11-09T12:00:00Z"}}
```
- **InvalidPatch**
```json
{"code":"InvalidPatch","message":"hunk failed","meta":{"path":"src/a.ts"}}
```
- **NotImplemented**
```json
{"code":"NotImplemented","message":"open_pr not supported on this driver","meta":{"host":"generic"}}
```

## 7) Capability Gating Rules (assertions)
- If `capabilities().pr == False` then `open_pr()` **must** raise `NotImplemented` and the tool **must not** be registered.
- If `capabilities().apply_patch_worktree == False`, applying a patch raises `NotImplemented` unless the driver transparently supports a safe equivalent.

## 8) Sparse/Depth Behavior (assertions)
- When `scopes` are configured, `list_files()` returns **only** paths within scopes.
- Driver starts at `depth=1`; any escalation (e.g., to 50) to satisfy rename detection is **logged** (the test asserts a telemetry record exists).

## 9) Security Behavior (assertions)
- Writes through symlink target paths return `ProtectedPath`.
- Attempts to push to protected branches are blocked with `WriteDenied` or `ProtectedPath`.
- Submodule write attempts fail by default.

## 10) Publishing Checklist (for driver authors)
- [ ] Implements every `RepoAdapter` method or raises `NotImplemented` where unsupported.
- [ ] Entry‑point registered under `texere.repo_drivers` and auto‑discovered.
- [ ] Passes **all** conformance tests; JSON report attached to PR.
- [ ] Documents required environment (tokens/scopes) and rate‑limit behavior.
- [ ] Provides README with supported URL schemes and capability flags.

## 11) Example `pyproject.toml` (entry point)
```toml
[project.entry-points."texere.repo_drivers"]
"github" = "texere.repo.drivers.github:driver_entry"
"local"  = "texere.repo.drivers.local:driver_entry"
"generic"= "texere.repo.drivers.genericgit:driver_entry"
```

## 12) Exit Criteria
A driver is **certified** when:
- All must‑pass categories succeed.
- Performance targets are met (or justified with waivers for slow hosts).
- No security violations occur in tests.
- CI publishes a passing JSON report.

**Status:** Ready to use in CI and as a PR template