# Texere — RepoConnector & RepoAdapter Spec (Indexing‑Free, Multi‑Host)

> **Audience:** Engineers and LLM agents.
> **Style:** Machine‑readable shapes + human guidance.
> **Scope:** Access Git repositories uniformly (local and remote) for reads, diffs, minimal VCS primitives, and change
> events. **No indexing** in this layer.

## Glossary (expanded once)

* **HITL, Human‑In‑The‑Loop** — human approval gate for risky actions.
* **MCP, Model Context Protocol** — protocol to expose/consume tools (stdio in v1).
* **PR, Pull Request** — hosted review change request (MR on GitLab).
* **RPC, Remote Procedure Call** — container‑to‑container JSON calls.
* **JSON, JavaScript Object Notation** — wire format for tools/events.

## Design Goals

1. **Host‑agnostic**: same contract for Local, GitHub, Generic Git (GitLab/Bitbucket later).
2. **Indexing‑free**: no parsing/embeddings here; a separate service can subscribe to repo events.
3. **Deterministic + safe**: clear write boundaries; project rules + HITL govern risk.
4. **LLM‑friendly**: stable method names, strict shapes, capability flags, consistent errors.

## Component Roles (final naming)

* **RepoAdapter** — host‑neutral interface (contract) used by nodes/tools.
* **RepoDriver** — concrete backend (e.g., `GitHubRepoDriver`, `LocalRepoDriver`, `GenericGitDriver`).
* **RepoConnector** — registry + cache + events; resolves URL → driver, manages shallow/sparse checkout, emits repo
  events.
* **RepoTools** — agent‑visible tools (LangGraph + MCP) that wrap adapter calls.

## Runtime & Packaging (locked)

* Python **3.11+**, Pydantic **v2**, namespace packages, entry points.
* Primary runtime: **Docker (Linux)**; ARM supported when available, not required.
* OS target v1: **Linux** (Docker). macOS/Windows out of scope.

## Capabilities & Errors

### Capabilities (examples)

```json
{
  "pr": true,
  "branch": true,
  "rate_limits": true,
  "sparse_checkout": true,
  "apply_patch_worktree": false
}
```

If a capability is not supported, the method **raises `NotImplemented`** and tools for that capability are not exposed.

### Error codes (fixed)

`AuthError`, `RateLimit`, `NotFound`, `Conflict`, `ProtectedPath`, `WriteDenied`, `InvalidPatch`, `Timeout`, `Network`,
`NotImplemented`.

**Error shape**:
`{ "code": "RateLimit", "message": "…", "meta": {"path":"…","branch":"…","pr_number":123, "rate_limit_remaining":42, "reset_at":"2025-11-09T12:00:00Z"} }`

## RepoAdapter — Contract (authoritative API)

```python
from typing import Protocol, Literal


class RepoAdapter(Protocol):
    # Identity & capabilities
    def repo_info(self) -> dict: ...

    def capabilities(self) -> dict: ...  # {"pr": bool, "branch": bool, ...}

    # Reads
    def list_files(self, glob: str | None = None, rev: str | None = None) -> list[str]: ...

    def read_file(self, path: str, rev: str | None = None) -> bytes: ...

    def git_diff(self, base: str, head: str | None = None, paths: list[str] | None = None) -> dict: ...

    # VCS primitives (no business rules)
    def create_branch(self, name: str, from_ref: str) -> None: ...

    def apply_patch_worktree(self, unified_diff: str) -> dict: ...  # may raise NotImplemented

    def commit(self, message: str, author: dict) -> str: ...  # returns new commit sha

    def push(self, branch: str) -> None: ...

    def open_pr(self, title: str, body: str, base: str, head: str) -> dict: ...  # may raise NotImplemented

    # Change detection helpers (explicit, testable)
    def fetch(self, depth: int = 1) -> None: ...

    def checkout(self, ref: str) -> None: ...

    def list_changes(self, since_sha: str) -> list[dict]: ...  # [{path,status,old_path?}]
```

### Shapes (strict)

* `repo_info()` →
  `{host:"local|github|gitlab|bitbucket|generic", owner, name, default_branch, cache_path, permissions:{read,write,pr}, rate_limits?:{remaining, reset_at}}`
* `git_diff(...)` → `{files:[{path,status,add,del,old_path?}], stats:{files,lines_added,lines_removed}}`
* `open_pr(...)` → `{pr_url, pr_number, branch}`
* `list_changes(...)` → `[{path:"src/x.ts", status:"M|A|D|R", old_path?}]`

## RepoConnector — Registry, Cache, Events

### URL support (v1)

`file://`, `gh://org/repo` or `https://github.com/org/repo`, `git+ssh://`, `git+https://`.

### Driver registry (entry points)

Python entry‑points group `texere.repo_drivers`. Each driver exposes
`(predicate(url)->bool, ctor(url, **opts)->RepoAdapter)`.

### Local cache strategy (remotes)

* **Shallow/partial clone:** `git clone --depth=1 --filter=blob:none <url>`
* **Sparse checkout:** optional `scopes` persisted in repo config; per‑run overrides must be a **subset**.
* **Depth escalation:** start at `depth=1`; escalate on demand (e.g., to 50) for history‑dependent ops; **log**
  escalations.
* **Refresh:** `git fetch --depth=1 && git checkout <branch>`
  All reads/diffs use the **working tree cache**.

### Events & Transport (locked)

* **Phase 0:** in‑process pub/sub.
* **Phase 1:** **Redis Streams** (durable) with consumer groups.

**Event types** (at‑least‑once, per‑repo ordering):

* `repo.head_changed` — `{repo_id, old, new, branch, timestamp, event_id}`
* `repo.files_changed` — `{repo_id, base, head, changes:[{path,status,old_path?}], timestamp, event_id}`
* `repo.branch_switched` — `{repo_id, branch, timestamp, event_id}`

**IDs & retention:** `event_id = "{repo_id}#{monotonic_int}"`. Dev keeps last **1,000** per repo in memory. Prod (Redis)
retention **7 days**.

### Change detection

* **Local:** filesystem watcher (watchdog), **250 ms** debounce; verify via `git status`/`rev‑parse` before emit.
* **Remote:** poll active branch every **30–45 s** (±20% jitter), default branch every **3–5 min**, slow to **5–10 min**
  when idle; exponential backoff on errors.
* **Rate‑limit policy:** warn at `remaining ≤ 100`; emit `repo.rate_limit_low` with `reset_at`; **double polling
  interval** on warning.

## RepoDrivers — Behavior Notes

* **GitHubRepoDriver:** local cache; PR‑first by default; rate limits surfaced via `repo_info/capabilities` and error
  `meta`; PAT/OAuth via env/secret manager; redacted logs.
* **LocalRepoDriver:** operates on local working tree; `apply_patch_worktree` supported; `open_pr` = `NotImplemented`.
* **GenericGitDriver (git+ssh / git+https):** clone/pull/branch/commit/push; `open_pr` = `NotImplemented`.
  (GitLab/Bitbucket drivers follow this pattern.)

## Security & Safety

* **Project rules + HITL** are the **source of truth** for risky actions (e.g., PR‑only vs direct push). Repo layer
  enforces local checks and **never bypasses** project policy.
* Confinement to repo root; resolve symlinks; **deny writes via symlinked paths**.
* **Protected branches** respected; default conventions below.
* **Submodules** read‑only by default.
* **Binaries/LFS** not parsed; Patch Service decides write policy.
* **Secrets:** tokens via env/secret manager only; never persisted; redacted in logs.

## Config (host‑neutral; TOML)

```toml
[runtime]
python = "3.11+"
container = true
arch_arm_optional = true

[repo]
url = "gh://org/repo"              # or file://, git+ssh://, git+https://
default_branch = "main"
scopes = ["services/foo/**"]       # sparse checkout paths (optional)
cache_dir = "~/.texere/cache"

[auth]
use_secret_manager = true
token_env = "GITHUB_TOKEN"         # or GITLAB_TOKEN, etc.

[write_policy]
managed_by_project_rules = true     # PR/direct push decided by project rules + HITL
pr_only_default = true
protected_branches = ["main", "release/*"]

[branching]
branch_pattern = "texere/run-{run_id}"
commit_format = "feat: {summary} [run_id={run_id}]"

[limits]
max_fetch_depth = 1
allow_depth_escalation = true

[telemetry]
rate_limit_warn_threshold = 100
retention_days = 7
```

## RepoTools — Agent‑Visible Tools

* Transport: LangGraph tools (in‑proc); **MCP (stdio)** in v1, HTTP/SSE later with same schemas.
* Only register tools allowed by `capabilities()`; unsupported calls raise `NotImplemented`.

**Core tool shapes**

* `repo.list_files(glob?, rev?) -> [paths]`
* `repo.read_file(path, rev?) -> {path, content, rev}`
* `repo.git_diff(base, head?, paths?) -> {files, stats}`
* `repo.open_pr(title, body, base, head) -> {pr_url, pr_number}` *(only if `capabilities.pr`)*

## Telemetry & Performance (locked)

* **Sink:** JSONL local + optional OpenTelemetry exporter; secrets redacted; retention 7–30 days.
* Per‑call fields:
  `run_id, repo_id, op, duration_ms, bytes_read, driver_impl(pygit2|dulwich), host(github|gitlab|local|generic), rate_limit_remaining`.
* Emit `repo.rate_limit_low` with `reset_at` on threshold.

**Targets:** `read_file` p50 < 20 ms (p95 < 50 ms); `list_files` p50 < 200 ms for 10k files; `git_diff` p50 < 150 ms
for ~200 files; PR path ~3 s typical (network‑dependent).

## Conformance Suite (required)

* **Parity:** `list_files/read_file/git_diff` equivalence across drivers on the same ref.
* **Branch lifecycle:** create → commit → push; `open_pr` only where supported.
* **Errors:** normalized codes + required `meta` fields.
* **Security:** deny symlink escapes; submodule writes disabled by default.
* **Performance:** respect targets above.
* **Runner:** discovers drivers via entry points; outputs JSON report.

## Interaction With Other Components

* **Patch Service:** owns verify/apply + HITL; calls adapter primitives; enforces project rules.
* **Indexing Service:** subscribes to `repo.*` events or polls `list_changes`; **not** part of this layer.
* **Retrieval:** hydrates text via `read_file(path, rev)`; do not store full texts in indexes.

## Examples

**Read & diff**

1. `repo.list_files("src/**")`
2. `repo.git_diff(base=prev_sha, head="HEAD")`
3. Emit `repo.files_changed` with `{base, head, changes}`

**PR path (under project rules + HITL)**

1. `create_branch("texere/run-<id>", from_ref="main")`
2. `apply_patch_worktree(unified_diff)` (Local/GitHub)
3. `commit("feat: {summary} [run_id={id}]")`; `push(branch)`
4. `open_pr(title, body, base="main", head="texere/run-<id>")`

## Locked Decisions (summary)

* Event bus: Phase 0 in‑proc; Phase 1 Redis Streams (7‑day retention).
* Local detection: FS watcher + debounce + git verification.
* Remote polling: active 30–45 s (jitter); default 3–5 min; idle 5–10 min; backoff on errors.
* Adapter helpers exposed: `fetch(depth)`, `checkout(ref)`.
* MCP transport: **stdio** now; HTTP/SSE later.
* Sparse scopes: persisted; per‑run overrides are subsets.
* Depth escalation: allowed and logged.
* Rate‑limit warning: ≤100; emit event; double polling interval.
* Unsupported ops: capability‑gated; raise `NotImplemented`.
* Errors: fixed codes + required `meta`.
* Branch/commit conventions: `texere/run-{run_id}`, `feat: {summary} [run_id={run_id}]`.
* PR policy: **project rules + HITL** own risk; repo layer enforces local checks only.
* Windows: out of scope v1 (Docker/Linux).

## Security Posture

* Least‑privilege tokens via env/secret manager; never persisted.
* No writes outside repo root; deny symlink write paths.
* No bypass of project rules; HITL required for risky ops.

---

**Status:** Ready to implement. Drivers may be added via entry points; must pass the conformance suite before release.
