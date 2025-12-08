# Texere Indexer – v1 Ingest Specification (Fully Updated)

This document is the **authoritative, complete, v1 ingest specification** for the Texere Indexer.  
It incorporates **all decisions** from the Q&A session:

- **1.1B** – v1 supports **TypeScript/JavaScript + Python**.
- **1.2A** – Python indexer uses **basic analysis** only.
- **2.1C** – LLMs used for **features, test–feature mapping, endpoint–feature mapping**.
- **2.2B** – LLM determinism is **best‑effort**, not strict.
- **3.1 (custom)** – For own repos, index **latest commit per configured branch**; for dependencies,
  index **only the versions actually depended on**.
- **3.2A** – Rename = **delete + add** in v1.
- **4.1A** – v1 runtime is **local or single-node**.
- **4.2A** – **Soft performance budget**; correctness > speed.
- **5.1C** – Testing requires **unit, integration, and golden files**.

No information from previous versions has been removed unless superseded by explicit decisions.

---

# 1. Overview

The ingest system populates the **Texere Knowledge Graph** and **vector embeddings** from a
repository Snapshot (commit).  
It is **incremental**, **language‑agnostic**, and uses a unified structure (`FileIndexResult`).

### v1 supports:

- Git-based incremental detection.
- **TypeScript/JavaScript and Python indexers**.
- Symbol extraction, references, calls.
- Endpoints, schema entities, test cases.
- LLM-assisted feature mapping + test↔feature + endpoint↔feature.

### Snapshot retention rules:

- **Own repos**: index **only the latest commit** of each configured branch (e.g. `main`,
  `develop`).
- **Dependencies**: index **only the specific versions** referenced in lockfiles (e.g.
  `package-lock.json`, `poetry.lock`).

Output flows through `indexer/core` to **Neo4j** (graph) and **Qdrant** (vectors).

---

# 2. Ingest Responsibilities

## 2.1 Snapshot-level orchestration

- Entry point: `indexSnapshot({ codebaseId, commitHash }): Promise<void>`.
- Resolve Snapshot + its parent from Git.
- Compute changed files via Git diff.
- Run the appropriate language indexers.
- Run higher-level extractors.
- Persist graph + embeddings.

## 2.2 Per-language indexing

Each indexer implements `LanguageIndexer` and outputs **only** `FileIndexResult[]`.

Input:

- Snapshot ID
- Codebase root
- Changed file paths

Output:

- Symbols
- Calls
- References
- Endpoints
- Test cases

## 2.3 Higher‑level extraction

Derived from `FileIndexResult` + repo config + LLM assistance:

- Endpoints
- Schema entities
- Test cases
- Feature mapping (config + heuristics + LLM)
- **Test ↔ Feature associations (LLM)**
- **Endpoint ↔ Feature associations (LLM)**

**Design rule:** _missed links are worse than bad links._  
Ambiguity → prefer generating a plausible association.

## 2.4 Persistence via `indexer/core`

- Upsert Codebase → Snapshot → File → Symbol hierarchy.
- Create edges: CALLS, REFERENCES, IMPLEMENTS, TESTS, DOCUMENTS, BELONGS_TO_FEATURE,
  SERVES_ENDPOINT, etc.
- Generate embeddings for symbols/docs and store in Qdrant.

## 2.5 Incremental behaviour

- Only files reported by Git diff are reindexed.
- Deleted files are marked removed in Snapshot.
- **Renames are treated as delete + add (no continuity tracking in v1).**
- Unchanged files reuse prior graph state.

---

# 3. Core Types

All indexers must output **exactly** this structure.

```ts
interface FileIndexResult {
  filePath: string;
  language: string; // 'ts', 'tsx', 'js', 'py'
  symbols: SymbolIndex[];
  calls: CallIndex[];
  references: ReferenceIndex[];
  endpoints?: EndpointIndex[];
  testCases?: TestCaseIndex[];
}
```

```ts
interface SymbolIndex {
  id: string; // stable per Snapshot; path + name + range
  name: string;
  kind: 'function' | 'class' | 'method' | 'const' | 'type' | 'other';
  range: { startLine: number; startCol: number; endLine: number; endCol: number };
}
```

```ts
interface CallIndex {
  callerSymbolId: string;
  calleeSymbolId: string;
  location: { filePath: string; line: number; col: number };
}
```

```ts
interface ReferenceIndex {
  fromSymbolId: string;
  toSymbolId: string;
  location: { filePath: string; line: number; col: number };
}
```

```ts
interface EndpointIndex {
  verb: string; // 'GET', 'POST', ...
  path: string;
  handlerSymbolId: string;
}
```

```ts
interface TestCaseIndex {
  id: string;
  name: string;
  location: { filePath: string; line: number; col: number };
}
```

---

## 3.6 Language Indexer Registry

A central registry defines which indexers are active in v1.

```ts
export function getLanguageIndexers(): LanguageIndexer[];
```

- `indexSnapshot` must call this registry rather than hard-coding indexers.
- Ensures pluggable architecture for future languages.

# 4. `LanguageIndexer` Interface

```ts
export interface LanguageIndexer {
  languageIds: string[]; // e.g. ['ts', 'tsx'] or ['py']

  canHandleFile(path: string): boolean;

  indexFiles(args: {
    codebaseRoot: string;
    snapshotId: string;
    filePaths: string[];
  }): Promise<FileIndexResult[]>;
}
```

### Requirements:

- Must handle syntax errors gracefully.
- Must obey Snapshot-scoped symbol ID rules.
- Must **not** emit references to files outside the provided set.
- Must detect tests and endpoints when applicable.

---

# 5. v1 Language Indexers

## 5.1 TypeScript Indexer (`ts-indexer.ts`)

- Backend: TypeScript compiler API (optional SCIP internal use).
- Performs:
  - AST traversal.
  - Symbol extraction.
  - Basic reference resolution.
  - Call graph extraction.
  - Endpoint detection (framework heuristics).
  - Test detection (`it`, `test`, `describe`).

## 5.2 Python Indexer (`py-indexer.ts`)

- Node wrapper calling a Python sidecar (`libcst` or `ast`).
- **Basic analysis only (per 1.2A)**:
  - Symbol extraction.
  - Simple call extraction.
  - Simple reference extraction.
  - Pytest-style test detection.
  - Optional simple endpoint heuristics.
- No deep type or flow analysis in v1.

---

# 6. Snapshot Indexing Flow

Implemented in `index-snapshot.ts`.

## 6.1 Snapshot selection & retention (per 3.1)

- Own repos:
  - Config lists tracked branches.
  - Ingest stores **only the latest commit** of each tracked branch.
- Third-party dependencies:
  - Index **only the exact versions used** in lockfiles.
  - No historic indexing.

## 6.2 Steps

1. **Resolve Snapshot**
2. **Compute Git diff**: added / modified / deleted / renamed
3. **Group by language**
4. **Run indexers**
5. **Higher-level extraction** (with LLM support)
6. **Persist graph + vectors**
7. **Incremental behaviour**
   - Deleted → mark removed.
   - Renamed → **delete + add**.
   - Unchanged → reuse.

---

## 6.3 Error Handling Semantics

- **File-level failures** (parse errors, invalid syntax):
  - Logged; file is skipped; Snapshot continues.
- **Indexer-level failures** (TS indexer crash, Python sidecar failure):
  - Mark Snapshot as `index_failed`.
  - Do **not** write partial graph updates.
  - Worker may retry according to configuration.
- **LLM failures**:
  - Skip only the affected mapping (feature/test/endpoint).
  - Never fail the Snapshot due to LLM errors.

## 6.4 Embedding Scope (v1)

- Embed only **top-level symbols**, **endpoint handlers**, **test cases**, and **feature/spec
  text**.
- Do **not** embed local variables or trivial symbols.
- Embeddings generated only for changed entities per Snapshot.

## 6.5 Security & Privacy Safeguards

- Never send files matching denylist patterns (e.g. `.env`, secrets) to LLM components.
- Avoid logging full code content; log metadata only.
- Configurable allow/deny lists for sensitive paths.

# 7. Runtime & Worker Model (per 4.1A)

- v1 assumes **local or single-node** execution.
- BullMQ is optional.
- Design must not block future horizontal scaling but must not assume it.

---

# 8. Guarantees in v1

- Deterministic output for non-LLM paths.
- Symbol IDs stable within a Snapshot.
- Git is truth for incremental detection.
- LLM usage (per 2.1C):
  - Feature mapping.
  - Test ↔ Feature mapping.
  - Endpoint ↔ Feature mapping.
- LLM determinism: **best-effort** (per 2.2B), not strict.

---

# 9. Non-Goals in v1

- Full interprocedural type inference.
- Deep Python resolution.
- Multi-language type resolution.
- Real-time continuous indexing.
- Broad LLM interpretation beyond the explicitly allowed roles.

---

# 10. Testing & Quality Requirements (per 5.1C)

v1 ingest **must** include:

### Unit tests

- Git diff logic
- Per-language indexers
- Higher-level extractors
- Graph write adapters

### Integration tests

- Synthetic repos for TS/JS and Python
- Validate graph correctness end-to-end

### Golden files / snapshots

- Golden `FileIndexResult` for selected files
- Optional golden graph slices

This provides **unit coverage + integration coverage + regression detection** via golden tests.

---

# End of v1 Ingest Specification
