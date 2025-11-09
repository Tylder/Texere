# Texere — RepoConnector & RepoAdapter Spec (indexing‑free, multi‑host)

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

    # Change detection
    def list_changes(self, since_sha: str) -> list[dict]: ...  # [{path,status,old_path?}]
```

**Shapes**

* `repo_info()` → `{host:"local|github|gitlab|bitbucket|generic", owner, name, default_branch, cache_path, permissions:{read,write,pr}}`
* `git_diff(...)` → `{files:[{path,status,add,del,old_path?}], stats:{files,lines_added,lines_removed}}`
* `open_pr(...)` → `{pr_url, pr_number, branch}`
* `list_changes(...)` → `[{path:"src/x.ts", status:"M|A|D|R", old_path?}]`

**Behavior**
If an operation isn’t supported (e.g., PRs on Generic Git), the adapter **raises `NotImplemented`** and advertises capability `false`.

---

## 3) RepoConnector — Registry, Cache, Events

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
* **Protected branches** list honored locally; never push to `main`/`release/*` unless caller is Patch Service and policy allows.
* **Submodules**: read‑only by default.
* **Binaries/LFS**: driver never parses; Patch Service decides write policy.
* **Secrets**: tokens in OS keychain/secret manager; logs redact secrets.

---

## 6) Config (host‑neutral)

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

**Example tool specs**

* `repo.list_files(glob?, rev?) -> [paths]`
* `repo.read_file(path, rev?) -> {path, content, rev}`
* `repo.git_diff(base, head?, paths?) -> {files, stats}`
* `repo.open_pr(title, body, base, head) -> {pr_url, pr_number}` *(only when `capabilities().pr`)*

**Capability gating:** tools are only registered when the adapter reports support. Unsupported calls fail fast with `NotImplemented`.

---

## 8) Telemetry & Performance

* Record per‑call: `run_id, repo_id, op, duration_ms, bytes_read, driver, rate_limit_remaining`.
* Targets (warm cache):

  * `read_file` p50 < 20 ms (p95 < 50 ms)
  * `list_files` p50 < 200 ms for 10k files
  * `git_diff` p50 < 150 ms for 200‑file diffs

---

## 9) Testing & Conformance

A shared test suite validates any RepoDriver implementation:

* **Parity tests:** for a seeded test repo, `list/read/diff` match across Local/GitHub/Generic for the same ref.
* **Branch lifecycle:** create → commit → push → (open_pr if supported).
* **Error normalization:** auth failure, rate limit, conflict, protected branch, invalid patch.
* **Security cases:** symlink escape attempt denied; submodule write denied by default.
* **Performance checks:** basic p50/p95 thresholds.

Conformance runners discover drivers via entry points and run the same suite.

---

## 10) Interaction with other components

* **Patch Service**: owns verify/apply policy and HITL; calls RepoAdapter primitives to enact changes.
* **Indexing Service**: subscribes to `repo.files_changed` events or polls `list_changes(since_sha)`; **RepoConnector does not index**.
* **Retrieval**: hydrates snippet text via `read_file(path, rev)` through RepoAdapter, not from index blobs.

---

## 11) Example lifecycle flows

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

## 12) Open questions (defaults to recommended if unspecified)

1. **Registry mechanism** — Use Python entry points group `texere.repo_drivers`.
2. **Unsupported ops** — Raise `NotImplemented`; tools gated by `capabilities()`.
3. **Default write policy** — PR‑first for remotes; Patch Service enforces caps/HITL.

---

**Summary**
This spec standardizes a modern, agent‑friendly repository layer: agents see **RepoTools**, orchestration uses a **RepoConnector** to obtain a host‑neutral **RepoAdapter**, and concrete **RepoDrivers** handle Git mechanics. It is indexing‑free, capability‑gated, and ready for GitHub first while remaining easy to extend to any Git host.

---

## 13) Implementation guidance & OSS building blocks (do not reinvent)

This section lists open‑source libraries and projects we will leverage or study. The goal is to keep the **RepoConnector/RepoAdapter** thin and standardized while delegating heavy lifting to mature OSS.

### 13.1 Local Git plumbing (for RepoDrivers)

* **PyGit2** (libgit2 bindings) — high‑performance diffs/branching/commits; preferred for Local/GitHub/Generic drivers.
* **Dulwich** (pure‑Python Git) — fallback for environments that cannot install libgit2; slower but zero native deps.

**Driver policy:** Prefer PyGit2; provide a Dulwich code path when native deps are disallowed. Expose a config toggle `repo.driver_impl = "pygit2"|"dulwich"`.

### 13.2 Git host SDKs (PR/MR flows)

* **PyGitHub** — GitHub REST v3 client for branches/PRs/rate limits; maps to `open_pr`, `create_branch`, etc.
* **python‑gitlab** — GitLab API client; maps to merge request equivalents.

**Driver policy:** Host‑specific SDKs are used **inside** drivers; the Adapter contract remains host‑neutral. Rate‑limit data should be surfaced via `repo_info().permissions`/`capabilities()` or error `meta`.

### 13.3 Clone & cache strategy references

* Use **shallow/partial clone** (`--depth=1 --filter=blob:none`) and **sparse checkout** where possible.
* Connector must be able to **escalate depth on demand** (e.g., for deep rename detection).

### 13.4 Agent projects to study (tool schemas & flows)

* **Aider** — reference for patch/commit ergonomics and reviewable diffs; informs Patch Service UX.
* **SWE‑agent**, **OpenHands** — end‑to‑end issue→PR agents; good patterns for tool JSON schemas and safety checks.

---

## 14) Entry‑point registry (driver plug‑ins)

Drivers self‑register via Python entry points so third parties can add hosts without core changes.

**`pyproject.toml` in a driver package**

```toml
[project.entry-points."texere.repo_drivers"]
"github" = "texere.repo.drivers.github:driver_entry"
"local"  = "texere.repo.drivers.local:driver_entry"
"generic"= "texere.repo.drivers.genericgit:driver_entry"
```

**Connector loader**

```python
import importlib.metadata as md
DRIVERS = {}

def load_repo_drivers():
    for ep in md.entry_points(group="texere.repo_drivers"):
        name, (pred, ctor) = ep.load()  # returns (predicate, constructor)
        DRIVERS[name] = (pred, ctor)
```

**Contract for `driver_entry`**

```python
# returns: (predicate: Callable[[str], bool], ctor: Callable[..., RepoAdapter])
```

---

## 15) Capability gating & tool exposure

* **RepoTools** are registered **conditionally** based on `adapter.capabilities()`.
* Unsupported operations **must** raise `NotImplemented` and **must not** be exposed as tools.
* For hosts without PRs, `repo.open_pr` is omitted; Patch Service must choose an alternate workflow.

---

## 16) Conformance test suite (for any RepoDriver)

A shared runner executes the same tests against all discovered drivers:

* **Parity:** `list_files/read_file/git_diff` produce equivalent results for the same ref across drivers.
* **Branch lifecycle:** create→commit→push; `open_pr` only where supported.
* **Errors:** standardized codes for auth failure, rate‑limit, conflict, protected branch, invalid patch, timeout/network.
* **Security:** deny symlink escapes; submodule writes disabled by default.
* **Performance:** basic p50/p95 thresholds (see §8).

Drivers must publish a small **test fixture repo** (or use the provided one) to validate behavior.

---

## 17) Telemetry additions

* Capture `driver_impl` (pygit2/dulwich) and `host` (github/gitlab/local/generic) on each call.
* For host SDK calls, include `rate_limit_remaining` and `reset_at` when available in `meta`.
* Emit `repo.rate_limit_low` event when below a configurable threshold to give agents a chance to back off.

---

## 18) Security notes (expanded)

* Tokens are only read via configured env/secret managers and never stored in the cache directory.
* All paths are resolved against the repo root; attempts to write via symlinked paths are rejected with `ProtectedPath`.
* Submodules remain read‑only unless the driver advertises `capabilities().get("submodule_write") == True` and policy allows it (default: False).

---

## 19) MCP exposure (optional but recommended)

Expose **RepoTools** over **MCP, Model Context Protocol** so any MCP‑capable client can discover them.

* Tools: `repo.list_files`, `repo.read_file`, `repo.git_diff`, conditionally `repo.open_pr`.
* Include **capability metadata** in MCP tool descriptions so clients can self‑adapt.
* Rate‑limit telemetry is returned in tool `meta` fields for budgeting.

---

## 20) Configuration keys (additions)

```toml
[repo]
# choose low‑level git implementation; default pygit2
impl = "pygit2"  # or "dulwich"

[limits]
# shallow/partial clone tuning
max_fetch_depth = 1
allow_depth_escalation = true

[telemetry]
rate_limit_warn_threshold = 100  # emit repo.rate_limit_low when below
```

---

## 21) Non‑functional requirements (updated)

* **Portability:** drivers must function without invoking external `git` binaries when `impl = "dulwich"` is selected.
* **Extensibility:** adding a new host requires only a new driver package that registers via entry points and passes the conformance suite.
* **Observability:** rate‑limit and host/driver fields are first‑class telemetry dimensions.
