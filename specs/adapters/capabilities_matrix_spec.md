# Texere Capabilities Matrix (v0)

## Purpose
Normalize capability tags across adapters to enable consistent routing and policy.

## Capability Tags
- READ: Non-mutating operations (e.g., `repo.read_file`, `retrieval.search`).
- WRITE: Mutations to repo or artifacts (e.g., `repo.apply_patch`).
- EXEC: Command execution in sandbox (e.g., `exec.run`).
- NET: Outbound network access (e.g., `net.fetch`).

## Tool → Capabilities
- repo.list_files → READ
- repo.read_file → READ
- repo.apply_patch → WRITE
- repo.git_diff → READ
- exec.run → EXEC
- retrieval.search → READ
- llm.generate → READ (content gen) + NET when provider requires outbound
- net.fetch → NET

## Policy Notes
- WRITE/EXEC/NET require risk evaluation; may hit HITL.
- READ operations can still be denied by policy (e.g., secret paths).

## Selection Hints
- Prefer local Repo adapter for READ; remote only when needed.
- For LLM: select by `attrs.region`, cost, context window; pin by run if consistency matters.
- For Retrieval: prefer index freshness over raw recall when latency-critical.

