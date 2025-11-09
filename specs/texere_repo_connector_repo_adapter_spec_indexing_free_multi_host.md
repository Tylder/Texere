# Texere — RepoConnector & RepoAdapter Spec (indexing‑free, multi‑host)

> **Runtime & packaging (locked)**: Python **3.11+**, Pydantic **v2**, namespace packages, entry points. Container-first: **Docker (Linux)** as the primary runtime; **ARM** supported when available but **not required**.

**Goal**
Provide a host‑agnostic, indexing‑free layer for accessing code repositories. Agents see **RepoTools**; orchestration uses a **RepoConnector** that resolves a URL to a **RepoAdapter** implemented by a concrete **RepoDriver** (GitHub, Local, Generic Git, etc.). All write *policy* (caps/HITL) lives in the Patch Service.

**Naming (final)**

* **RepoAdapter** — host‑agnostic interface (contract).
* **RepoDriver** — concrete backend implementing RepoAdapter (e.g., `GitHubRepoDriver`, `LocalRepoDriver`, `GenericGitDriver`).
* **RepoConnector** — registry + cache + events; resolves URLs to drivers and returns bound RepoAdapter instances.
* **RepoTools** — agent‑visible tools (LangGraph tools and/or MCP, Model Context Protocol) that call the adapter.

**Non‑goals**
No indexing, parsing, symbol maps, embeddings, BM25/FAISS, or retrieval APIs.

---

## 1) Capabilities & Errors

> **OS support (locked)**: Linux (Docker). macOS/Windows not required for v1. ARM is nice-to-have.

### 1.1 Capabilities

Drivers declare support to avoid host‑specific branching:

```json
{
  "pr": true,
  "branch": true,
  "rate_limits": true,
  "sparse_checkout": true,
  "apply_patch_worktree": false
}
```

### 1.2 Normalized errors (all drivers)

`AuthError`, `RateLimit`, `NotFound`, `Conflict`, `ProtectedPath`, `WriteDenied`, `InvalidPatch`, `Timeout`, `Network`, `NotImplemented`.

Each error includes `{code, message, meta}`; `meta` may carry `{path, branch, pr_number, rate_limit_remaining, reset_at}`.

---

## 2) RepoAdapter — Contract

```python
from typing import Protocol, Literal

class RepoAdapter(Protocol):
    # Identity & capabilities
    def repo_info(self) -> dict: ...
    def capabilities(self) -> dict: ...  # e.g., {"pr": True, "branch": True, ...}

    # Reads
    def list_files(self, glob: str | None = None, rev: str | None = None) -> list[str]: ...
    def read_file(self, path: str, rev: str | None = None) -> bytes: ...
    def git_diff(self, base: str, head: str | None = None,
                 paths: list[str] | None = None) -> dict: ...

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

**Shapes (clarified)**

* `repo_info()` → `{host:"local|github|gitlab|bitbucket|generic", owner, name, default_branch, cache_path, permissions:{read,write,pr}, rate_limits?:{remaining, reset_at}}`
* `git_diff(...)` → `{files:[{path,status,add,del,old_path?}], stats:{files,lines_added,lines_removed}}`
* `open_pr(...)` → `{pr_url, pr_number, branch}`
* `list_changes(...)` → `[{path:"src/x.ts", status:"M|A|D|R", old_path?}]`

**Behavior (locked)**
If an operation isn’t supported (e.g., PRs on Generic Git), the adapter **raises `NotImplemented`** and advertises capability `false`.

## 3) RepoConnector — Registry, Cache, Events

RepoConnector — Registry, Cache, Events

### 3.1 Driver resolution

* **URL schemes supported (locked):** `file://`, `gh://org/repo` or `https://github.com/org/repo`, `git+ssh://`, `git+https://`.

```python
# Registry entry: predicate(url) -> bool, ctor(url, **opts) -> RepoAdapter
register_driver("local",    pred=lambda u: u.startswith("file://"),              ctor=LocalRepoDriver)
register_driver("github",   pred=lambda u: "github.com" in u or u.startswith("gh://"), ctor=GitHubRepoDriver)
register_driver("generic",  pred=lambda u: u.startswith(("git+ssh://","git+https://")), ctor=GenericGitDriver)

def from_url(url: str, **opts) -> RepoAdapter:
    for name, (pred, ctor) in DRIVERS.items():
        if pred(url):
            return ctor(url, **opts)
    raise ValueError("No driver for URL")
```

**Extensibility:** drivers self‑register via Python entry points: `texere.repo_drivers`.

### 3.2 Local cache strategy (remotes)

* **Shallow, partial clone**: `git clone --depth=1 --filter=blob:none <url>`
* **Sparse checkout** (optional scopes): `git sparse-checkout set <paths>`; **scopes persisted** in repo config; per‑run overrides must be a **subset**.
* **Depth escalation**: start at depth=1; **escalate on demand** (e.g., to 50) for history‑dependent ops (rename detection). All escalations are logged in telemetry.
* **Refresh**: `git fetch --depth=1 && git checkout <branch>`
  All reads/diffs use the **working tree** in the cache for speed and rename detection.

### 3.3 Events & Transport (locked)

**Transport:** Phase 0 = in‑process pub/sub; Phase 1 = Redis Streams (durable). Unified `RepoEvents` interface supports both.

**Event types** (at‑least‑once, ordered per repo):

* `repo.head_changed` — `{repo_id, old, new, branch, timestamp, event_id}`
* `repo.files_changed` — `{repo_id, base, head, changes:[{path,status,old_path?}], timestamp, event_id}`
* `repo.branch_switched` — `{repo_id, branch, timestamp, event_id}`

**IDs & retention:** `event_id = "{repo_id}#{monotonic_int}"`. Dev (in‑proc): keep last **1,000** per repo in memory. Prod (Redis): **7‑day** retention; consumers use groups/offsets.

**Local change detection:** LocalRepoDriver uses a filesystem watcher (watchdog) with **250 ms debounce**; verifies with `git status`/`rev‑parse` before emitting events.

**Remote change detection (polling):** Active branch every **30–45 s** (±20% jitter); default branch every **3–5 min**; slow to **5–10 min** when idle; exponential backoff on errors. Depth **1** by default; escalate as needed (see §3.2).
`—`{repo_id, branch, timestamp}`

### 3.1 Driver resolution

```python
# Registry entry: predicate(url) -> bool, ctor(url, **opts) -> RepoAdapter
register_driver("local",    pred=lambda u: u.startswith("file://"),              ctor=LocalRepoDriver)
register_driver("github",   pred=lambda u: "github.com" in u or u.startswith("gh://"), ctor=GitHubRepoDriver)
register_driver("generic",  pred=lambda u: u.startswith(("git+ssh://","git+https://")), ctor=GenericGitDriver)

def from_url(url: str, **opts) -> RepoAdapter:
    for name, (pred, ctor) in DRIVERS.items():
        if pred(url):
            return ctor(url, **opts)
    raise ValueError("No driver for URL")
```

**Extensibility:** new drivers self‑register via Python entry points: `texere.repo_drivers`.

### 3.2 Local cache strategy (remotes)

* **Shallow, partial clone**: `git clone --depth=1 --filter=blob:none <url>`
* **Sparse checkout** (optional scopes): `git sparse-checkout set <paths>`
* **Refresh**: `git fetch --depth=1 && git checkout <branch>`
  All reads/diffs use the **working tree** in the cache for speed and rename detection.

### 3.3 Events (in‑process bus for MVP)

* `repo.head_changed` — `{repo_id, old, new, branch, timestamp}`
* `repo.files_changed` — `{repo_id, base, head, changes:[...], timestamp}`
* `repo.branch_switched` — `{repo_id, branch, timestamp}`

Later you can back with Redis streams or another queue; contract stays the same.

---

## 4) RepoDrivers — Behavior Notes

### 4.1 GitHubRepoDriver

* Uses local cache (above).
* **Writes** are **PR‑first** by default; final policy comes from project rules + HITL.
* Surfaces rate limits via `repo_info().permissions / capabilities` and `meta` on errors.
* Auth via PAT/OAuth (least privilege), never logged, redacted in errors.

### 4.2 LocalRepoDriver

* Operates directly on a local working tree.
* `apply_patch_worktree` supported.
* `open_pr` **NotImplemented**; capability `pr=false`.

### 4.3 GenericGitDriver (git+ssh / git+https)

* Clone/pull/branch/commit/push supported.
* `open_pr` **NotImplemented**; `capabilities()["pr"] == false`.

(Drivers for GitLab/Bitbucket follow the same pattern.)

### 4.1 GitHubRepoDriver

* Uses local cache (above).
* **Writes** are **PR‑first**: create branch → apply patch (in cache) → commit → push → open PR.
* Surfaces rate limits via `repo_info().permissions / capabilities` and `meta` on errors.
* Auth via PAT/OAuth (least privilege), never logged, redacted in errors.

### 4.2 LocalRepoDriver

* Operates directly on a local working tree.
* `apply_patch_worktree` supported.
* `open_pr` **NotImplemented**; capability `pr=false`.

### 4.3 GenericGitDriver (git+ssh / git+https)

* Clone/pull/branch/commit/push supported.
* `open_pr` **NotImplemented**; `capabilities()["pr"] == false`.

(Drivers for GitLab/Bitbucket follow the same pattern.)

---

## 5) Security & Safety

* **Path confinement** to repo root; resolve symlinks; deny writes via symlinks.

* **Protected branches** are governed by **project rules** and **HITL, Human-In-The-Loop** policy. RepoConnector/Adapter enforces local checks (never bypass policy), but risk decisions (e.g., PR-only, protected branches) are **owned by project-level rules**.

* **Submodules**: read‑only by default.

* **Binaries/LFS**: driver never parses; Patch Service decides write policy.

* **Secrets**: tokens in OS keychain/secret manager or environment; logs redact secrets.

* **Path confinement** to repo root; resolve symlinks; deny writes via symlinks.

* **Protected branches** list honored locally; never push to `main`/`release/*` unless caller is Patch Service and policy allows.

* **Submodules**: read‑only by default.

* **Binaries/LFS**: driver never parses; Patch Service decides write policy.

* **Secrets**: tokens in OS keychain/secret manager; logs redact secrets.

---

## 6) Config (host‑neutral)

```toml
# Runtime
[runtime]
python = "3.11+"
container = true            # built for Docker/Linux
arch_arm_optional = true    # ARM is supported when available, not required

[repo]
url = "gh://org/repo"              # file://, git+ssh://, git+https://, gh://
default_branch = "main"
scopes = ["services/foo/**"]       # optional sparse checkout paths
cache_dir = "~/.texere/cache"

[auth]
# Tokens via env or secret manager; never persisted
use_secret_manager = true
 token_env = "GITHUB_TOKEN"         # or GITLAB_TOKEN, etc.

[write_policy]
# Enforced by project rules + HITL (Patch Service), not here
managed_by_project_rules = true
pr_only_default = true
protected_branches = ["main", "release/*"]

[branching]
# Commit/branch conventions (locked)
branch_pattern = "texere/run-{run_id}"
commit_format = "feat: {summary} [run_id={run_id}]"
```

```toml
[repo]
url = "gh://org/repo"              # file://, git+ssh://, git+https://, gh://
default_branch = "main"
scopes = ["services/foo/**"]       # optional sparse checkout paths
cache_dir = "~/.texere/cache"

[auth]
token_env = "GITHUB_TOKEN"         # or GITLAB_TOKEN, etc.

[write_policy]                      # Enforced by Patch Service, not here
pr_only = true
protected_branches = ["main", "release/*"]
```

---

## 7) RepoTools — Agent‑Visible Tools (LangGraph/MCP)

Expose safe, read‑first operations as tools; write tools are mediated by Patch Service.

**Transport (locked):**

* **LangGraph tools**: in-process.
* **MCP, Model Context Protocol**: **STDIO in v1**. HTTP/SSE transport is planned for v1.x with identical tool schemas.

**Capability gating:** tools are only registered when the adapter reports support. Unsupported calls fail fast with `NotImplemented`. ** tools are only registered when the adapter reports support. Unsupported calls fail fast with `NotImplemented`.

Expose safe, read‑first operations as tools; write tools are mediated by Patch Service.

**Example tool specs**

* `repo.list_files(glob?, rev?) -> [paths]`
* `repo.read_file(path, rev?) -> {path, content, rev}`
* `repo.git_diff(base, head?, paths?) -> {files, stats}`
* `repo.open_pr(title, body, base, head) -> {pr_url, pr_number}` *(only when `capabilities().pr`)*

**Capability gating:** tools are only registered when the adapter reports support. Unsupported calls fail fast with `NotImplemented`.

---

## 8) Telemetry & Performance

* **Sink (locked):** JSONL locally + optional OpenTelemetry exporter; secrets redacted; retention 7–30 days.
* Record per‑call: `run_id, repo_id, op, duration_ms, bytes_read, driver_impl (pygit2|dulwich), host (github|gitlab|local|generic), rate_limit_remaining`.
* Emit `repo.rate_limit_low` when below configured threshold; include `reset_at` if available.

**Targets (accepted):**

* `read_file` p50 < 20 ms (p95 < 50 ms)

* `list_files` p50 < 200 ms for 10k files

* `git_diff` p50 < 150 ms for 200‑file diffs

* PR path (create branch → apply patch → commit → push → open PR): ~3 s typical, network dependent

* Record per‑call: `run_id, repo_id, op, duration_ms, bytes_read, driver, rate_limit_remaining`.

* Targets (warm cache):

  * `read_file` p50 < 20 ms (p95 < 50 ms)
  * `list_files` p50 < 200 ms for 10k files
  * `git_diff` p50 < 150 ms for 200‑file diffs

---

## 9) Testing & Conformance

**Requirement (locked):** All RepoDrivers MUST pass a shared suite:

* **Parity:** `list_files/read_file/git_diff` equivalent results for the same ref across drivers.
* **Branch lifecycle:** create→commit→push; `open_pr` only where supported.
* **Errors:** standardized codes for auth failure, rate‑limit (with backoff), conflict, protected branch, invalid patch, timeout/network.
* **Security:** deny symlink escapes; submodule writes disabled by default.
* **Performance:** basic p50/p95 thresholds (see §8).

Provide a small **fixture repo** or use the provided one to validate behavior.

A shared test suite validates any RepoDriver implementation:

* **Parity tests:** for a seeded test repo, `list/read/diff` match across Local/GitHub/Generic for the same ref.
* **Branch lifecycle:** create → commit → push → (open_pr if supported).
* **Error normalization:** auth failure, rate limit, conflict, protected branch, invalid patch.
* **Security cases:** symlink escape attempt denied; submodule write denied by default.
* **Performance checks:** basic p50/p95 thresholds.

Conformance runners discover drivers via entry points and run the same suite.

---

## 10) Interaction with other components

* **Patch Service**: owns verify/apply policy and **HITL, Human-In-The-Loop** via project rules; calls RepoAdapter primitives to enact changes.

* **Indexing Service**: subscribes to `repo.files_changed` events or polls `list_changes(since_sha)`; **RepoConnector does not index**.

* **Retrieval**: hydrates snippet text via `read_file(path, rev)` through RepoAdapter, not from index blobs.

* **Patch Service**: owns verify/apply policy and HITL; calls RepoAdapter primitives to enact changes.

* **Indexing Service**: subscribes to `repo.files_changed` events or polls `list_changes(since_sha)`; **RepoConnector does not index**.

* **Retrieval**: hydrates snippet text via `read_file(path, rev)` through RepoAdapter, not from index blobs.

---

## 11) Example lifecycle flows

**A) Read & diff (agent question)**

1. Agent calls `repo.list_files("src/**")` via RepoTools.
2. Agent calls `repo.git_diff(base=prev_sha, head="HEAD")` for context.
3. Adapter returns normalized diff; telemetry recorded.

**B) PR creation (invoked by Patch Service under project rules)**

1. Patch Service → `create_branch("texere/run-<id>", from_ref="main")`.
2. `apply_patch_worktree(unified_diff)` (Local/GitHub).
3. `commit("feat: <summary> [run_id=<id>]")`; `push(branch)`.
4. If supported: `open_pr(title, body, base="main", head="texere/run-<id>")`.

**C) Event emission**

* After `git fetch`/`checkout`, driver computes diffs and emits `repo.files_changed` with `{base, head, changes}`.

**A) Read & diff (agent question)**

1. Agent calls `repo.list_files("src/**")` via RepoTools.
2. Agent calls `repo.git_diff(base=prev_sha, head="HEAD")` for context.
3. Adapter returns normalized diff; telemetry recorded.

**B) PR creation (invoked by Patch Service)**

1. Patch Service → `create_branch("texere/run-<id>", from_ref="main")`.
2. `apply_patch_worktree(unified_diff)` (Local/GitHub).
3. `commit("feat: apply patch [run_id=<id>]")`; `push(branch)`.
4. If supported: `open_pr(title, body, base="main", head="texere/run-<id>")`.

**C) Event emission**

* After `git fetch`/`checkout`, driver computes diffs and emits `repo.files_changed` with `{base, head, changes}`.

---

## 12) Locked decisions (formerly open items)

* **Event bus (v1):** Phase 0 in‑proc pub/sub; Phase 1 Redis Streams with 7‑day retention and consumer groups.
* **Local detection:** filesystem watcher + debounce + `git` verification.
* **Remote polling cadence:** active branch 30–45 s (±20% jitter); default 3–5 min; idle 5–10 min; backoff on errors.
* **Adapter helpers:** `fetch(depth)` and `checkout(ref)` exposed on RepoAdapter.
* **MCP transport:** STDIO now; HTTP/SSE later.
* **Sparse scopes:** persisted in config; per‑run overrides must be subsets.
* **Depth escalation:** start at 1; escalate on demand; log escalations.
* **Event IDs/retention:** `{repo_id}#<monotonic>`; dev keep last 1,000; prod 7 days.
* **Rate‑limit threshold:** warn at ≤100 remaining; emit `repo.rate_limit_low` with `reset_at`; increase polling interval 2× on warning.
* **Unsupported ops:** gated by capabilities; raise `NotImplemented`; don’t expose the tool.
* **Errors:** fixed codes with required `meta` fields.
* **Branch/commit conventions:** `texere/run-{run_id}` + `feat: {summary} [run_id={run_id}]` (project may override but must keep tokens).
* **PR policy source:** project rules + HITL; repo layer enforces local checks and never bypasses policy.
* **Windows:** out of scope v1 (Docker/Linux); normalize LF in memory; preserve original EOL on write.
* **Conformance runner:** drivers via entry points; shared parity/error/security/perf suite; JSON report output.
