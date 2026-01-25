---
type: SPEC
status: draft
stability: experimental
created: 2026-01-25
last_updated: 2026-01-25T22:33:14.156Z
area: graph-system
feature: graph-ingestion-repo-ts
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: >-
  Requirements for a TypeScript-first, language-extensible repository indexing and query system
summary_long: >-
  Defines requirements for a language-aware, incremental code graph indexed from repositories, using
  SCIP string identifiers, a hybrid graph+relational store, and a typed agent-facing API with
  sub-100 ms query latency. Covers symbol identity, incremental updates, cross-repo references,
  schema, staleness handling, and language extensibility. Provides evidence and decision rationale.
keywords:
  - requirements
  - graph
  - scip
  - ingestion
  - typescript
index:
  sections:
    - title: 'TLDR'
      lines: [158, 176]
      summary:
        'Build a language-aware index that supports sub-100 ms structural queries, incremental
        updates, cross-repo references, and a typed API using SCIP identifiers.'
      token_est: 115
    - title: 'Scope'
      lines: [178, 203]
      summary:
        'Specifications for symbol identity, incremental indexing, storage schema, cross-repo
        references, rename handling, language extensibility, and agent-facing API with sub-100 ms
        query latency. Excludes semantic/vector search as a core capability.'
      token_est: 146
    - title: 'Context'
      lines: [205, 218]
      token_est: 164
    - title: 'Evidence Summary'
      lines: [220, 352]
      token_est: 1302
      subsections:
        - title: 'Research summary: symbol identity and reference tracking'
          lines: [222, 269]
          token_est: 394
        - title: 'Research summary: incremental indexing'
          lines: [271, 296]
          token_est: 162
        - title: 'Research summary: database models'
          lines: [298, 326]
          token_est: 202
        - title: 'Candidate database libraries and evidence'
          lines: [328, 337]
          token_est: 420
        - title: 'Recommended storage choices'
          lines: [339, 352]
          token_est: 121
    - title: 'REQ-001: Authoritative symbol identity via SCIP'
      lines: [354, 388]
      summary:
        'The system MUST use SCIP string identifiers as authoritative, stable symbol identities
        across languages and repositories.'
      token_est: 232
    - title: 'REQ-002: Incremental indexing pipeline'
      lines: [390, 422]
      summary:
        'The system MUST support incremental indexing with per-file units, ownership sets, and
        staleness tracking.'
      token_est: 229
    - title: 'REQ-003: Hybrid storage model and trust boundary'
      lines: [424, 454]
      summary:
        'The system MUST use a hybrid graph + relational storage model and treat repository text as
        untrusted.'
      token_est: 218
    - title: 'REQ-004: Graph schema, edges, indexes, and constraints'
      lines: [456, 515]
      summary:
        'The property graph MUST implement specified node/edge types, properties, and indexes.'
      token_est: 610
    - title: 'REQ-005: Relational schema for metadata and status'
      lines: [517, 544]
      summary:
        'The relational store MUST include tables for files, commits, packages, and index status.'
      token_est: 151
    - title: 'REQ-006: Cross-repository references and versioning'
      lines: [546, 574]
      summary:
        'The system MUST resolve cross-repo references using package metadata and SCIP registry
        entries.'
      token_est: 185
    - title: 'REQ-007: Handling renames and moves'
      lines: [576, 604]
      summary:
        'The system MUST preserve symbol identity across renames when semantics are unchanged and
        must mark stale units when identities change.'
      token_est: 202
    - title: 'REQ-008: Language extensibility'
      lines: [606, 634]
      summary:
        'The system MUST support multiple languages via indexers that emit SCIP and map to a common
        schema.'
      token_est: 180
    - title: 'REQ-009: Agent-facing API (typed, structural)'
      lines: [636, 828]
      summary:
        'The system MUST expose typed API methods for structural graph queries with no
        natural-language summarization.'
      token_est: 1012
    - title: 'REQ-010: Performance target and query latency'
      lines: [830, 854]
      summary:
        'The system MUST target sub-100 ms query latency with appropriate indexing and caching.'
      token_est: 150
    - title: 'REQ-011: Semantic/vector search is optional and constrained'
      lines: [856, 880]
      summary:
        'Semantic/vector search MUST NOT be part of core design and must respect trust boundary if
        added.'
      token_est: 145
    - title: 'Design Decisions'
      lines: [882, 922]
      token_est: 524
      subsections:
        - title: 'Decision 001: Symbol identity'
          lines: [884, 896]
          token_est: 201
        - title: 'Decision 002: Incremental indexing'
          lines: [898, 909]
          token_est: 173
        - title: 'Decision 003: Storage and database model'
          lines: [911, 922]
          token_est: 147
    - title: 'Blockers'
      lines: [924, 928]
      token_est: 12
    - title: 'Assumptions'
      lines: [930, 937]
      token_est: 101
    - title: 'Unknowns'
      lines: [939, 949]
      token_est: 181
    - title: 'Reference Index (verbatim URLs from source material)'
      lines: [951, 1001]
      token_est: 106
    - title: 'Conclusion'
      lines: [1003, 1009]
      token_est: 84
---

# SPEC-graph-system-graph-ingestion-repo-ts

---

## TLDR

Summary: Build a language-aware index that supports sub-100 ms structural queries, incremental
updates, cross-repo references, and a typed API using SCIP identifiers.

**What:** TypeScript-first, language-extensible repository indexing and query system

**Why:** LLM agents need precise symbol and relationship data without scanning full repositories

**How:** Use SCIP string IDs, incremental indexing (BuilderProgram + Glean-style ownership), and a
hybrid graph+relational store

**Status:** Draft

**Critical path:** finalize requirements -> implement indexers and storage -> expose typed API

**Risk:** identity, incremental correctness, and performance assumptions require validation at scale

---

## Scope

Summary: Specifications for symbol identity, incremental indexing, storage schema, cross-repo
references, rename handling, language extensibility, and agent-facing API with sub-100 ms query
latency. Excludes semantic/vector search as a core capability.

**Includes:**

- TypeScript-first indexing with extensibility to Python and Java
- Authoritative symbol identity and reference tracking
- Incremental indexing and staleness signaling
- Cross-repository references and versioning
- Hybrid storage model (graph + relational)
- Graph schema, relational schema, indexes and constraints
- Typed agent-facing API for structural queries

**Excludes:**

- Semantic or vector search as a core capability (optional later module only)
- Natural-language summarization in API responses

**In separate docs:**

- Not specified in source material

---

## Context

Modern software repositories contain tens of thousands of files and millions of lines of code. LLM
agents must answer structural questions such as "Where is this symbol referenced?" and "What tests
cover this code path?" without scanning every file. The system aims to build and maintain a
language-aware index that can return high-signal, precise data under 100 ms. The design is
constrained by requirements in the user brief: authoritative symbol identity, incremental indexing,
cross-repository references, stability across renames, language extensibility, explicit type
relationships, sub-100 ms query latency, and a trust boundary that treats repository text as
untrusted. Claims and decisions are grounded in official documentation, compiler source code,
academic papers, and public specifications. Where the literature is silent, limitations are marked
as unknown.

---

## Evidence Summary

### Research summary: symbol identity and reference tracking

- TypeScript compiler exposes `Symbol` with fields including `id`, `name`, `declarations`,
  `exports`, `members`, and `owner` (source: https://ts2jsdoc.js.org/typescript/ts.Symbol.html). The
  `TypeChecker` API provides `getFullyQualifiedName(symbol: ts.Symbol)` for FQNs (source:
  https://ts2jsdoc.js.org/typescript/ts.TypeChecker.html). FQN uniqueness across files/overloads is
  not guaranteed; numeric `id` values are only stable within a single program instance. Language
  service uses file versions and `ScriptSnapshot` for incremental changes (source:
  https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API). Anchor references used in
  the source material include https://ts2jsdoc.js.org/typescript/ts.Symbol.html#:~:text=" and
  https://ts2jsdoc.js.org/typescript/ts.TypeChecker.html#:~:text=Returns%3A%20, plus a real-world
  report of duplicate names in the TypeScript ecosystem (source:
  https://github.com/dsherret/ts-morph/issues/1662#:~:text=Issue%20body%20actions).
- Java (javac) `Symbol` represents variables, methods, types, and packages. `getQualifiedName()`
  yields symbol names, with class symbols returning a fully qualified name computed from the owner
  name (sources:
  https://raw.githubusercontent.com/openjdk-bots/jdk17u/7c5ded84dccba1d7f558cc381b2366d75790be75/src/jdk.compiler/share/classes/com/sun/tools/javac/code/Symbol.java#:~:text=%2F,return%20name
  and
  https://raw.githubusercontent.com/openjdk-bots/jdk17u/7c5ded84dccba1d7f558cc381b2366d75790be75/src/jdk.compiler/share/classes/com/sun/tools/javac/code/Symbol.java#:~:text=%28owner,name%29%3B).
  A Java class or interface type is uniquely determined by FQN and class loader (source:
  https://openjdk.org/groups/hotspot/docs/RuntimeOverview.html). FQN is stable across file renames
  if package/class names do not change. Anchor reference used in the source material:
  https://openjdk.org/groups/hotspot/docs/RuntimeOverview.html#:~:text=A%20class%20or%20interface%20name,in%20two%20distinct%20class%20types.
- Python `symtable` exposes compiler-generated symbol tables. `SymbolTable` has `get_id()` and
  `get_name()` and enumerates nested tables/symbols (source:
  https://docs.python.org/3/library/symtable.html). `Symbol` includes inspection methods
  (referenced, imported, parameter, global, etc.). Python has no global symbol ID across modules;
  identity is scoped by module/function/class and name. Stable cross-module identity must be
  synthesized from module FQN + qualified name; persistence across refactors is unknown. Anchor
  references used in the source material include
  https://docs.python.org/3/library/symtable.html#:~:text=strings and
  https://docs.python.org/3/library/symtable.html#:~:text=class%20symtable.
- LSIF encodes LSP info with numeric IDs but lacks symbol semantics; indexes are large and
  incremental updates are difficult (source:
  https://microsoft.github.io/language-server-protocol/overviews/lsif/overview/). Anchor reference:
  https://microsoft.github.io/language-server-protocol/overviews/lsif/overview/#:~:text=level%2C%20LSIF%20models%20the%20data,consistent%20with%20the%20LSP%20approach.
  Sourcegraph's SCIP introduces human-readable string IDs composed of scheme, package
  (name/version), and descriptors; local symbols are document-scoped (source:
  https://github.com/sourcegraph/scip/blob/main/scip.proto). Anchor references used in the source
  material include
  https://github.com/sourcegraph/scip/blob/main/scip.proto#:~:text=%3A%3A%3D%20%3Csimple,%2F%2F%20Unit%20of
  and
  https://github.com/sourcegraph/scip/blob/main/scip.proto#:~:text=Relationships%20to%20other%20symbols%20%28e,Go%20struct%20has%20the%20symbol.
  Descriptive string IDs improve incremental indexing and cross-language navigation (source:
  https://sourcegraph.com/blog/announcing-scip). Anchor references used in the source material
  include https://sourcegraph.com/blog/announcing-scip#:~:text=,a%20subset%20of%20the%20documents
  and
  https://sourcegraph.com/blog/announcing-scip#:~:text=Most%20of%20these%20issues%20boil,concept%20of%20%E2%80%98monikers%E2%80%99%20and%20%E2%80%98resultSet%E2%80%99.

### Research summary: incremental indexing

- TypeScript BuilderProgram (introduced in 2.7) monitors filesystem changes and reuses cached
  results to recheck only changed files (source:
  https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API). Language service
  `getScriptVersion()` and snapshots enable incremental updates (source:
  https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API). Anchor references used in
  the source material include
  https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#:~:text=LanguageService%20object,service%20to%20query%20for%20changes
  and
  https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#:~:text=Writing%20an%20incremental%20program%20watcher.
  Project references allow building only affected projects (source:
  https://www.typescriptlang.org/docs/handbook/project-references.html). Anchor reference:
  https://www.typescriptlang.org/docs/handbook/project-references.html#:~:text=Project%20references%20allows%20you%20to,0%20and%20newer.
- Glean uses ownership sets (units) per file/module and overlays incremental DBs; hiding a unit
  removes facts and derived facts that depend on it (source: https://glean.software/docs). Anchor
  references used in the source material include
  https://glean.software/blog/incremental/#:~:text=To%20produce%20a%20modified%20DB%2C,Like%20this
  and
  https://glean.software/docs/implementation/incrementality/#:~:text=In%20general%20the%20owner%20of,which%20has%20the%20following%20form.
  This yields O(changes) updates.
- SCIP indexers can re-emit only changed files; scip-clang uses package name/version to manage
  cross-repo IDs and navigation (sources:
  https://github.com/sourcegraph/scip-clang/blob/main/docs/CrossRepo.md and
  https://sourcegraph.com/blog/announcing-scip). Anchor reference:
  https://github.com/sourcegraph/scip-clang/blob/main/docs/CrossRepo.md#:~:text=,not%20be%20reused%20over%20time.

### Research summary: database models

- OOPSLA 2013 study: relational/deductive systems trade off scale vs detail; graph model is more
  natural for source code and scales to millions of LOC (source:
  https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf). Anchor reference:
  https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf#:~:text=Existing%20systems%20are%20implemented%20on,code%20detail.
- Graph databases offer index-free adjacency (direct pointers), improving traversal performance
  (source: https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf) and outperform relational traversal
  in connected data (source: https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf). Anchor reference:
  https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf#:~:text=and%20graph%20databases%20which%20we,by%20a%20factor%20of%20ten.
- Graph databases allow semi-structured data and schema evolution (source:
  https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf), enabling overlays like AST, type hierarchy,
  control-flow (source: https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf). Anchor references used
  in the source material include
  https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf#:~:text=Second%2C%20relational%20databases%20depend%20on,altering%20the%20structure%20of%20records
  and
  https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf#:~:text=like%20graph%20structures%20such%20as,queried%20using%20graph%20traversal%20operations.
- Graph queries via Cypher/Gremlin are more performant than SQL recursion for highly connected data
  (sources: https://memgraph.com and https://technology.amis.nl). Anchor references used in the
  source material include
  https://memgraph.com/blog/graph-database-vs-relational-database#:~:text=The%20above%20dataset%20is%20naturally,these%20kinds%20of%20use%20cases
  and
  https://memgraph.com/blog/graph-database-vs-relational-database#:~:text=data%20is%20spread%20across%20multiple,the%20solution%20to%20go%20with,
  plus
  https://technology.amis.nl/database/querying-connected-data-in-graph-databases-with-neo4j/#:~:text=For%20visualizing%20and%20studying%20complex,added%20value%20in%20the%20data.
  Relationships are stored alongside nodes for constant-time neighbor traversal (source:
  https://memgraph.com). Relational models are suitable for file metadata/caching, not deep
  traversals. Additional source anchor used in the material for relational trade-offs:
  https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf#:~:text=Typically%2C%20source,On%20the%20other%201.

### Candidate database libraries and evidence

| Library    | Type                                    | Evidence / quoted statements                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Notes                                                                                                                          |
| ---------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| JanusGraph | Distributed property graph database     | Designed for graphs beyond a single machine; supports very large graphs, concurrent transactions, complex traversals in milliseconds; supports geo/numeric/full-text search and TinkerPop model (source: https://docs.janusgraph.org). Anchor references: https://docs.janusgraph.org/#:~:text=JanusGraph%20is%20designed%20to%20support,its%20underlying%2C%20supported%20persistence%20solutions and https://docs.janusgraph.org/#:~:text=,the%20infamous%20super%20node%20problem.                                                                                                                                                                                                                                                                                                    | Apache 2.0; integrates with Cassandra, HBase, Bigtable, BerkeleyDB; suitable for large-scale distributed indexing.             |
| Neo4j      | Native property graph database          | Graph DBs are ideal for many-layer connections; queries small, elegant, faster, consistent; relationships are first-class (source: https://technology.amis.nl). Cypher queries can outperform SQL recursion on large datasets (source: https://memgraph.com).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Mature ecosystem; self-managed or Aura; appropriate for medium-sized repos and single-node deployments.                        |
| Dgraph     | Distributed graph database              | Designed for highly connected data; scalable storage/query with sharding; low-latency queries for billions of nodes; ACID transactions; traversal via DQL with recursive queries (source: https://docs.dgraph.io). Anchor references: https://docs.dgraph.io/dgraph-overview/#:~:text=Dgraph%20is%20a%20distributed%20graph,querying%20complex%20relationships%20between%20entities, https://docs.dgraph.io/dgraph-overview/#:text=Distributed%20Architecture, and https://docs.dgraph.io/dgraph-overview/#:~:text=Dgraph%20uses%20DQL%2C%20a%20query,data%20in%20a%20single%20request.                                                                                                                                                                                                  | Go-based; open-source; suitable for distributed scaling and strong consistency.                                                |
| ArangoDB   | Multi-model database                    | Native multi-model (key/value, graph, document) with a single declarative query language; edge index on `_from`/`_to` enables constant lookup; supports horizontal scaling (source: https://statusneo.com). Anchor references: https://statusneo.com/arangodb-a-graph-database/#:~:text=ArangoDB%20enables%20efficient%20and%20scalable,process%20graph%20queries%20very%20efficiently, https://statusneo.com/arangodb-a-graph-database/#:~:text=The%20graph%20capabilities%20of%20ArangoDB,are%20both%20full%20JSON%20documents, https://statusneo.com/arangodb-a-graph-database/#:~:text=Unlike%20many%20NoSQL%20databases%2C%20ArangoDB,with%20all%20three%20data%20models, and https://statusneo.com/arangodb-a-graph-database/#:~:text=this%20approach%20combined%20with%20the,AQL. | Community/enterprise; supports graph traversals, shortest paths, pattern matching; useful when mixing graph and document data. |
| Apache AGE | PostgreSQL extension for property graph | Enables graph data processing inside PostgreSQL; graph modeling and algorithms such as variable-length traversal; SQL + graph features with PostgreSQL transactions (source: https://age.apache.org). Anchor references: https://age.apache.org/#:~:text=Apache%20AGE%E2%84%A2%20is%20a%20PostgreSQL,that%20provides%20graph%20database%20functionality and https://age.apache.org/#:~:text=PostgreSQL%2C%20a%20popular%20relational%20database%2C,querying%20capabilities%20and%20transaction%20support.                                                                                                                                                                                                                                                                                | Useful for PostgreSQL environments; inherits relational engine performance limits.                                             |
| SQLite     | Relational database                     | Small, fast, reliable, ACID, zero-config; full SQL engine with indexes/JSON; single-file DB, no server (source: https://sqlite.org). Anchor references: https://sqlite.org/features.html#:~:text=%2A%20Zero,implementation%20with%20advanced%20capabilities%20like, https://sqlite.org/features.html#:~:text=,26%3A%20no%20external%20dependencies, https://sqlite.org/features.html#:~:text=,no%20setup%20or%20administration%20needed, and https://sqlite.org/features.html#:~:text=,sized%20strings%20and%20blobs.%20%28See.                                                                                                                                                                                                                                                          | Embedded store for metadata and caches; not for large graph queries.                                                           |

### Recommended storage choices

- Primary storage for code graph should be a native property graph database. JanusGraph for
  multi-machine scale and distributed backends (source: https://docs.janusgraph.org), Neo4j for
  simpler single-node deployments with strong tooling (source: https://technology.amis.nl).
- Dgraph/ArangoDB are viable alternatives depending on multi-model or distributed requirements
  (sources: https://docs.dgraph.io, https://statusneo.com).
- A relational database should store file metadata and caching info; SQLite is suitable due to
  reliability and zero-config (source: https://sqlite.org).
- Real-world experience indicates recursive SQL traversals in PostgreSQL must be bounded or replaced
  with precomputed indexes for performance (source:
  https://sourcegraph.com/blog/optimizing-a-code-intelligence-commit-graph-part-2#:~:text=Turns%20out%20that%20claim%20was,calculating%20visible%20uploads%20on%20demand).

---

## REQ-001: Authoritative symbol identity via SCIP

Summary: The system MUST use SCIP string identifiers as authoritative, stable symbol identities
across languages and repositories.

**Statement:**

The system MUST identify each global symbol by a SCIP string ID composed of
`(scheme, packageName, packageVersion, descriptors...)`. Local symbols MUST be scoped to a document
and MUST NOT be exported as global identifiers.

**Rationale:**

TypeScript `Symbol.id` and FQN are not globally stable across compilation sessions or modules, and
LSIF uses opaque numeric IDs. SCIP string IDs are human-readable, stable with package metadata, and
Designed for incremental and cross-repo navigation (sources:
https://ts2jsdoc.js.org/typescript/ts.Symbol.html,
https://ts2jsdoc.js.org/typescript/ts.TypeChecker.html,
https://microsoft.github.io/language-server-protocol/overviews/lsif/overview/,
https://github.com/sourcegraph/scip/blob/main/scip.proto,
https://sourcegraph.com/blog/announcing-scip).

**Measurable Fit Criteria:**

- [ ] Each global symbol has a SCIP ID with scheme, package name, package version, and descriptors.
- [ ] Local-only symbols are scoped to a document and are not referenced outside it.
- [ ] For TypeScript, scheme is `tsc`, package is NPM name/version; for Python and Java, scheme
      reflects language/build (e.g., `python`, `javac`).

**Verification Method:**

- Audit of produced `.scip` documents verifies scheme/package/descriptors.
- Schema validation confirms local/global scoping rules.

---

## REQ-002: Incremental indexing pipeline

Summary: The system MUST support incremental indexing with per-file units, ownership sets, and
staleness tracking.

**Statement:**

The indexer MUST support incremental updates by re-emitting changed files only, using TypeScript
BuilderProgram/watch APIs where available, SCIP per-file documents as units, and Glean-style
ownership sets to hide/replace units. Any failed compilation or index error MUST mark the affected
unit as stale and propagate a `stale` flag in query results.

**Rationale:**

BuilderProgram and language service snapshots support incremental TypeScript updates; Glean
ownership sets enable O(changes) update time by hiding old units; SCIP supports re-emitting only
changed documents (sources: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API,
https://www.typescriptlang.org/docs/handbook/project-references.html, https://glean.software/docs,
https://sourcegraph.com/blog/announcing-scip,
https://github.com/sourcegraph/scip-clang/blob/main/docs/CrossRepo.md).

**Measurable Fit Criteria:**

- [ ] Each file maps to a unit; updates hide old unit facts and insert new ones.
- [ ] Incremental update touches only changed units; unchanged units remain intact.
- [ ] `stale` flag is set when compilation/indexing fails.

**Verification Method:**

- Incremental update test modifies a single file and confirms only related units change.
- Error injection test ensures `stale` is surfaced in query responses.

---

## REQ-003: Hybrid storage model and trust boundary

Summary: The system MUST use a hybrid graph + relational storage model and treat repository text as
untrusted.

**Statement:**

The primary store for symbol/type relationships MUST be a property graph database. A relational
Database MUST store non-graph metadata such as commits, file metadata, and indexer status.
Repository text MUST be treated as untrusted and stored only in file storage; authoritative facts
MUST come from compiler-derived semantics.

**Rationale:**

Graph databases provide index-free adjacency and efficient traversals for highly connected code
graphs; relational storage is appropriate for metadata and caching (sources:
https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf, https://memgraph.com,
https://technology.amis.nl).

**Measurable Fit Criteria:**

- [ ] Graph store contains symbol/type/file nodes and relationship edges.
- [ ] Relational store contains commit metadata, file metadata, package metadata, and index status.
- [ ] Repository text is stored separately and is not treated as authoritative.

**Verification Method:**

- Storage schema inspection confirms separation of graph vs relational data.
- Security review verifies trust boundary and data provenance rules.

---

## REQ-004: Graph schema, edges, indexes, and constraints

Summary: The property graph MUST implement specified node/edge types, properties, and indexes.

**Statement:**

The graph MUST include node types `File`, `Symbol`, `Type`, `Commit`, and `Package`, with the
properties and meanings listed below. The graph MUST include the edge types listed below with their
properties and semantics. The graph MUST implement symbol/type indexes and uniqueness constraints as
specified.

**Node types:**

| Node label | Properties                                                                                                                  | Description                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `File`     | `fileId` (unit ID), `path`, `packageName`, `commitSha`, `language`, `stale`                                                 | Source file for a commit; `fileId` is unique; `language` required for indexer dispatch.                                            |
| `Symbol`   | `symbolId` (SCIP string ID), `kind` (class, method, etc.), `visibility` (public/private), `packageName`, `version`, `stale` | Globally unique symbol; may appear in multiple files via re-exports; `packageName` + `version` disambiguate cross-repo references. |
| `Type`     | `typeId` (SCIP symbol ID), `kind` (interface, class, union, etc.), `packageName`, `version`                                 | Type definition; separate from symbol for aliases/generics.                                                                        |
| `Commit`   | `commitSha`, `timestamp`, `author`, `message`                                                                               | Repository commit for versioning packages.                                                                                         |
| `Package`  | `name`, `version`, `language`, `sourceRepo`, `scipUrl`                                                                      | External package or root repository.                                                                                               |

**Edge types:**

| Relationship    | Source -> Target       | Properties                                                     | Meaning                                                       |
| --------------- | ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| `DEFINES`       | `File` -> `Symbol`     | `range` (start/end), `definitionKind` (declaration/definition) | File declares/defines symbol at location.                     |
| `REFERS_TO`     | `File` -> `Symbol`     | `range`, `referenceKind` (call/read/write/type)                | File references a symbol; distinguishes type-only references. |
| `DECLARES_TYPE` | `Symbol` -> `Type`     | (none)                                                         | Symbol has given type (e.g., `Promise<T>`).                   |
| `IMPLEMENTS`    | `Symbol` -> `Symbol`   | `relationKind` (implements/overrides)                          | Interface implementation or override.                         |
| `INHERITS_FROM` | `Type` -> `Type`       | (none)                                                         | Type extends/inherits from another type.                      |
| `EXPORTS`       | `File` -> `Symbol`     | (none)                                                         | File re-exports symbol.                                       |
| `HAS_CHILD`     | `Symbol` -> `Symbol`   | `descriptor` (e.g., method name)                               | Nested scope (class members, etc.).                           |
| `DEPENDS_ON`    | `Package` -> `Package` | `versionRange`                                                 | External dependency relation.                                 |
| `INDEXED_AT`    | `Symbol` -> `Commit`   | (none)                                                         | Commit at which symbol was indexed.                           |

**Indexes and constraints:**

- Node indexes on `Symbol.symbolId` and `Type.typeId` for constant-time lookups.
- Composite index on `File.packageName`, `File.path`, `File.commitSha` for uniqueness and path
  queries.
- Edge indexes on `REFERS_TO` and `DEFINES` keyed by `Symbol.symbolId` for reference/definition
  lookups.
- Graph uniqueness constraint: only one `Symbol` node per `(symbolId, packageName, version)`.

**Rationale:**

A property graph schema with explicit nodes/edges supports required traversals (definitions,
references, inheritance, type relationships) efficiently (source:
https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf).

**Measurable Fit Criteria:**

- [ ] Graph nodes and edges match the required labels, properties, and meanings.
- [ ] Indexes and uniqueness constraints exist and are enforced.

**Verification Method:**

- Schema introspection and database tests validate constraints and indexes.

---

## REQ-005: Relational schema for metadata and status

Summary: The relational store MUST include tables for files, commits, packages, and index status.

**Statement:**

The relational schema MUST include:

- `files` with columns `file_id` (PK), `path`, `package_name`, `commit_sha`, `language`,
  `content_hash`, `stale`.
- `commits` with columns `commit_sha` (PK), `timestamp`, `author`, `message`.
- `packages` with columns `package_name`, `version`, `language`, `scip_url`.
- `index_status` with columns `file_id`, `status`, `indexed_at`, `error_message`.

**Rationale:**

Metadata and caching information are naturally tabular; content hash supports cache invalidation.

**Measurable Fit Criteria:**

- [ ] Tables and columns match required names and meanings.
- [ ] `content_hash` is used for cache invalidation and rename detection.

**Verification Method:**

- Schema migration tests validate table and column presence.

---

## REQ-006: Cross-repository references and versioning

Summary: The system MUST resolve cross-repo references using package metadata and SCIP registry
entries.

**Statement:**

When processing imports, the indexer MUST resolve symbols to `(packageName, symbolId)` and represent
cross-repo references with `REFERS_TO` edges to `Symbol` nodes from external packages. External
dependencies MUST be represented as `Package` nodes with name/version. `DEPENDS_ON` edges MUST
capture version ranges. The system MUST maintain a registry of SCIP packages and avoid cloning
entire dependency trees.

**Rationale:**

Cross-repo navigation relies on package metadata and published SCIP indexes (source:
https://github.com/sourcegraph/scip-clang/blob/main/docs/CrossRepo.md).

**Measurable Fit Criteria:**

- [ ] Import statements are resolved to `(packageName, symbolId)` pairs.
- [ ] External packages are represented by `Package` nodes and `DEPENDS_ON` edges.
- [ ] Cross-repo references point to symbols in external packages.

**Verification Method:**

- Index an example repo with external dependencies and validate graph edges.

---

## REQ-007: Handling renames and moves

Summary: The system MUST preserve symbol identity across renames when semantics are unchanged and
must mark stale units when identities change.

**Statement:**

Symbol identity MUST be derived from compiler semantics rather than file paths. Renaming files
without changing module/package names MUST preserve symbol IDs for Java; for TypeScript and Python,
module path changes MAY update symbol IDs. The indexer MUST detect file renames by comparing
`content_hash`, update `File` nodes, and mark old units as stale; query responses MUST surface
`stale` flags.

**Rationale:**

Java identity is FQN + class loader (source:
https://openjdk.org/groups/hotspot/docs/RuntimeOverview.html). TypeScript/Python identities depend
on module paths. `content_hash` allows rename detection.

**Measurable Fit Criteria:**

- [ ] File moves with unchanged module/package names preserve symbol IDs when applicable.
- [ ] Old file units are marked stale and replaced with new units on rename.

**Verification Method:**

- Rename a file and confirm `content_hash` detection and `stale` flag behavior.

---

## REQ-008: Language extensibility

Summary: The system MUST support multiple languages via indexers that emit SCIP and map to a common
schema.

**Statement:**

Each language MUST provide a language-specific indexer that outputs SCIP documents and maps
constructs to the common schema. TypeScript uses `scip-typescript`; Python uses `symtable`; Java
uses `javac` with `getQualifiedName()` and type relations. Indexers MUST distinguish local vs global
symbols, map to `DECLARES_TYPE`, `IMPLEMENTS`, `INHERITS_FROM`, and `HAS_CHILD`, and mark unknown
relationships as `unknown` where static typing is unavailable.

**Rationale:**

A common schema allows uniform agent queries; language-specific indexers preserve semantics
(sources: https://docs.python.org/3/library/symtable.html,
https://raw.githubusercontent.com/openjdk-bots/jdk17u/7c5ded84dccba1d7f558cc381b2366d75790be75/src/jdk.compiler/share/classes/com/sun/tools/javac/code/Symbol.java).

**Measurable Fit Criteria:**

- [ ] Each supported language emits SCIP documents with consistent schema mapping.
- [ ] Unknown or missing type relationships are explicitly marked.

**Verification Method:**

- Run indexers on sample repos in each language and validate schema consistency.

---

## REQ-009: Agent-facing API (typed, structural)

Summary: The system MUST expose typed API methods for structural graph queries with no
natural-language summarization.

**Statement:**

The system MUST expose the following methods, returning plain objects/arrays with a `stale` flag:

```ts
// Return all places where the symbol is referenced.
function getSymbolReferences(
  symbolId: string,
  opts?: {
    includeIndirect?: boolean; // include re-exports, overrides, interface implementations
    includeTypes?: boolean; // include type-only references
  },
): Promise<{
  references: Array<{
    fileId: string;
    range: { start: number; end: number };
    referenceKind: 'call' | 'read' | 'write' | 'type';
    indirect: boolean;
  }>;
  stale: boolean;
}>;
```

Indexed data accessed: `REFERS_TO` edges from `File` to `Symbol`; `IMPLEMENTS` and `INHERITS_FROM`
edges when `includeIndirect` is true; `EXPORTS` edges for re-exports. Notes: indirect references are
found by following `IMPLEMENTS`/`INHERITS_FROM` to implementations; type-only references are
included when `includeTypes` is set.

```ts
// Return the canonical declaration or definition of a symbol.
function getSymbolDefinition(symbolId: string): Promise<{
  definitions: Array<{
    fileId: string;
    range: { start: number; end: number };
    definitionKind: 'declaration' | 'definition' | 'ambient';
  }>;
  stale: boolean;
}>;
```

Indexed data accessed: `DEFINES` edges where `definitionKind` denotes declaration vs definition;
`File.stale` flag; package metadata for ambient declarations. Notes: ambient declarations come from
dependency packages; multiple definitions (e.g., overloads) are returned.

```ts
// Return concrete implementations of an abstract symbol (interface, abstract class, overload).
function getSymbolImplementations(symbolId: string): Promise<{
  implementations: Array<{
    implementationId: string;
    fileId: string;
    range: { start: number; end: number };
    relationKind: 'implements' | 'overrides';
  }>;
  stale: boolean;
}>;
```

Indexed data accessed: `IMPLEMENTS` edges from implementers; `INHERITS_FROM` edges for overrides;
`Symbol.kind` indicates interface/abstract method.

```ts
// Return other symbols that this symbol depends on, grouped by relationship kind.
function getSymbolDependencies(symbolId: string): Promise<{
  dependencies: Array<{
    targetSymbolId: string;
    relationship: 'call' | 'read' | 'write' | 'type' | 'inherit' | 'configuration';
  }>;
  stale: boolean;
}>;
```

Indexed data accessed: outgoing `REFERS_TO` edges from all definitions; `DECLARES_TYPE` edges for
type dependencies; `INHERITS_FROM` edges; optional `configuration` edges if recorded.

```ts
// Return symbols or files that would be impacted if this symbol changes.
function getImpactOfChange(symbolId: string): Promise<{
  impacted: Array<{
    impactedSymbolId: string;
    relationship: 'calledBy' | 'overriddenBy' | 'implements' | 'reExportedBy' | 'testedBy';
  }>;
  stale: boolean;
}>;
```

Indexed data accessed: reverse of `REFERS_TO`, `IMPLEMENTS`, `INHERITS_FROM`, `EXPORTS`; test
coverage uses `REFERS_TO` from test files and may require a `test` flag in `File` nodes.

```ts
// Find implementations of similar features (same interface or base class).
function findSimilarImplementations(symbolId: string): Promise<{
  similar: Array<{
    implementationId: string;
    relationKind: 'implementsSameInterface' | 'extendsSameBase';
  }>;
  stale: boolean;
}>;
```

Indexed data accessed: all `IMPLEMENTS` and `INHERITS_FROM` edges where the target matches the
interface/base class. Similarity is structural only; no semantic matching.

```ts
// List external dependencies used in the code path reachable from this symbol.
function getExternalDependencies(symbolId: string): Promise<{
  dependencies: Array<{
    packageName: string;
    version: string;
    symbols: string[]; // symbol IDs from the dependency
  }>;
  stale: boolean;
}>;
```

Indexed data accessed: `REFERS_TO` edges to symbols with different `packageName`; `DEPENDS_ON` edges
from current package; traversal may follow `REFERS_TO` recursively to configurable depth.

```ts
// Return test files and test symbols that reference this symbol.
function getTestsForSymbol(symbolId: string): Promise<{
  tests: Array<{
    testFileId: string;
    testSymbolId: string | null;
    range: { start: number; end: number };
    coverageKind: 'direct' | 'indirect';
  }>;
  untestedPaths: Array<{
    fileId: string;
    reason: string; // e.g. not referenced in any test
  }>;
  stale: boolean;
}>;
```

Indexed data accessed: `REFERS_TO` edges from test files; call graph edges to identify indirect
coverage; `untestedPaths` derived by subtracting covered call graph nodes from reachable nodes. When
type/control-flow info is incomplete, reason may be "unknown coverage".

```ts
// Identify the minimal set of touch points to add or extend a feature.
function getRequiredModifications(featureInterfaceId: string): Promise<{
  touchPoints: Array<{
    symbolId: string;
    reason: 'implementInterface' | 'updateFactory' | 'addTest' | 'extendDocumentation';
  }>;
  stale: boolean;
}>;
```

Indexed data accessed: for interface/abstract class, find implementations and patterns (factory/DI)
using `IMPLEMENTS` and `REFERS_TO`. Only returns symbol IDs and reasons; may be incomplete if
patterns vary.

```ts
// Return module boundaries, layering rules and known violations for the symbol.
function getArchitecturalConstraints(symbolId: string): Promise<{
  constraints: Array<{
    ruleId: string;
    description: string;
    violated: boolean;
    violatingReference: {
      fileId: string;
      range: { start: number; end: number };
    } | null;
  }>;
  stale: boolean;
}>;
```

Indexed data accessed: configuration file (e.g., `layering.yaml`) parsed by indexer as graph rules;
violations detected by traversing `REFERS_TO` edges across forbidden layers. Results marked stale if
incremental correctness is uncertain.

**Rationale:**

Agents require precise structural data without summarization, keyed by authoritative `symbolId`.

**Measurable Fit Criteria:**

- [ ] Each method returns only typed structures (no natural-language summaries).
- [ ] Each method exposes a `stale` flag.
- [ ] Indexed data accessed matches declared relationships.

**Verification Method:**

- Contract tests per API method validate shape, data sources, and stale flag.

---

## REQ-010: Performance target and query latency

Summary: The system MUST target sub-100 ms query latency with appropriate indexing and caching.

**Statement:**

The system MUST target query latency under 100 ms for structural queries in typical repository
sizes, relying on appropriate indexing, caching, and hardware provisioning. For very large monorepos
or complex queries, tuning or materialized views MAY be required.

**Rationale:**

Performance assumptions are required to meet agent response needs; empirical validation is required
at scale.

**Measurable Fit Criteria:**

- [ ] Baseline structural queries meet <100 ms targets on representative repositories.
- [ ] Performance is monitored and tuned for scale.

**Verification Method:**

- Performance benchmarks and load tests for representative graph sizes.

---

## REQ-011: Semantic/vector search is optional and constrained

Summary: Semantic/vector search MUST NOT be part of core design and must respect trust boundary if
added.

**Statement:**

Semantic/vector search is not part of the core system. If added as an optional module, embeddings
MUST be derived from compiler-checked text, and its value MUST be empirically validated.

**Rationale:**

Structural graph queries already cover core requirements at scale; vector search is optional and
must respect trust boundaries (source: https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf).

**Measurable Fit Criteria:**

- [ ] Core system functions without vector search.
- [ ] Optional vector search uses compiler-checked text only.

**Verification Method:**

- Architecture review confirms optional module boundaries and data provenance.

---

## Design Decisions

### Decision 001: Symbol identity

| Candidate                      | Evidence / limitations                                                                                                                                                                                                                                                      | Decision                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| TypeScript `Symbol.id` and FQN | IDs scoped to a program instance; FQNs not guaranteed unique; duplicates reported (sources: https://ts2jsdoc.js.org/typescript/ts.Symbol.html, https://ts2jsdoc.js.org/typescript/ts.TypeChecker.html, https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) | Rejected; not stable or unique across sessions. |
| LSIF                           | Numeric IDs; lacks type semantics; incremental indexing complex (sources: https://microsoft.github.io/language-server-protocol/overviews/lsif/overview/, https://sourcegraph.com/blog/announcing-scip)                                                                      | Rejected.                                       |
| Path-based identifiers         | Unique but unstable under renames; not authoritative; violates trust boundary                                                                                                                                                                                               | Rejected.                                       |
| SCIP string IDs                | Scheme + package + descriptors; globally unique with package metadata; records relationships; supports incremental updates (sources: https://github.com/sourcegraph/scip/blob/main/scip.proto, https://sourcegraph.com/blog/announcing-scip)                                | Selected.                                       |

Decision: Use SCIP IDs as authoritative. For TypeScript, scheme `tsc` with NPM package name/version;
for other languages, scheme encodes language/build (`python`, `javac`). For languages without
official packaging (e.g., Python scripts), `packageName` is derived from module/repo and a synthetic
version (e.g., commit SHA).

### Decision 002: Incremental indexing

| Candidate                      | Evidence / limitations                                                                                                                                                                 | Decision                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Full re-index on each commit   | Simple but violates incremental requirement and sub-100 ms target                                                                                                                      | Rejected.                                  |
| TypeScript incremental builder | Re-checks only changed files but does not persist results or handle cross-repo references (sources: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)               | Partially used for TS semantic generation. |
| Glean-style incremental DB     | Ownership sets hide/replace facts for O(changes) updates (sources: https://glean.software/docs)                                                                                        | Selected.                                  |
| SCIP incremental indexing      | Re-emit changed documents; relies on package versioning (sources: https://sourcegraph.com/blog/announcing-scip, https://github.com/sourcegraph/scip-clang/blob/main/docs/CrossRepo.md) | Selected.                                  |

Decision: Use BuilderProgram/watch for TS changes, generate per-file `.scip` units via
`scip-typescript`, maintain ownership sets, and mark stale units on errors. Cross-repo linking uses
package metadata and published SCIP indexes.

### Decision 003: Storage and database model

| Candidate                 | Evidence / limitations                                                                                                                                  | Decision                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Pure relational DB        | Traversal requires joins; graph DBs outperform for connected data; schema evolution costly (source: https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf) | Rejected for primary storage.      |
| Property graph DB         | Index-free adjacency; scalable for code graphs; supports schema evolution (source: https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf)                  | Selected for symbol relationships. |
| Hybrid graph + relational | Metadata fits relational; relationships need graph traversal                                                                                            | Selected.                          |

Decision: Implement hybrid storage with a property graph for code relationships and relational store
for metadata/caching. Repository text remains untrusted and stored only as file content.

---

## Blockers

- None identified in source material.

---

## Assumptions

| Assumption                                                                           | Validation Method                                 | Confidence | Impact if Wrong                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------- | ---------- | -------------------------------------------- |
| Sub-100 ms latency assumes appropriate indexing, caching, and hardware provisioning. | Performance benchmarking at representative scale. | Medium     | Requires tuning or materialized views.       |
| Graph DBs scale to millions of LOC for code queries.                                 | Load tests and empirical measurements.            | Medium     | May require alternative storage or sharding. |

---

## Unknowns

| Question                                           | Impact                                           | Resolution Criteria                                    | Owner | ETA |
| -------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------ | ----- | --- |
| TypeScript FQN uniqueness without SCIP.            | Symbol identity collisions.                      | Verify uniqueness in large repos; continue using SCIP. | TBD   | TBD |
| Python symbol stability across versions/refactors. | Cross-version identity drift.                    | Evaluate across Python versions and refactors.         | TBD   | TBD |
| Language coverage beyond TypeScript/Python/Java.   | Additional semantics and relationships required. | Availability of SCIP indexers for new languages.       | TBD   | TBD |
| Control-flow and data-flow completeness.           | Partial answers for coverage/impact.             | Indexers that compute control/data flow.               | TBD   | TBD |
| Performance at very large scale.                   | Query latency may exceed target.                 | Empirical measurement and tuning.                      | TBD   | TBD |

---

## Reference Index (verbatim URLs from source material)

The URLs below are captured verbatim from the source material to preserve citation fidelity. Use the
Evidence Summary sections for context on how each source is applied.

```text
http://www.w3.org/2000/svg"
https://age.apache.org/#:~:text=Apache%20AGE%E2%84%A2%20is%20a%20PostgreSQL,that%20provides%20graph%20database%20functionality"
https://age.apache.org/#:~:text=PostgreSQL%2C%20a%20popular%20relational%20database%2C,querying%20capabilities%20and%20transaction%20support"
https://docs.dgraph.io/dgraph-overview/#:~:text=Dgraph%20is%20a%20distributed%20graph,querying%20complex%20relationships%20between%20entities"
https://docs.dgraph.io/dgraph-overview/#:~:text=Dgraph%20uses%20DQL%2C%20a%20query,data%20in%20a%20single%20request"
https://docs.dgraph.io/dgraph-overview/#:~:text=Distributed%20Architecture"
https://docs.janusgraph.org/#:~:text=,the%20infamous%20super%20node%20problem"
https://docs.janusgraph.org/#:~:text=JanusGraph%20is%20designed%20to%20support,its%20underlying%2C%20supported%20persistence%20solutions"
https://docs.python.org/3/library/symtable.html#:~:text=class%20symtable"
https://docs.python.org/3/library/symtable.html#:~:text=strings"
https://github.com/dsherret/ts-morph/issues/1662#:~:text=Issue%20body%20actions"
https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#:~:text=LanguageService%20object,service%20to%20query%20for%20changes"
https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#:~:text=Writing%20an%20incremental%20program%20watcher"
https://github.com/sourcegraph/scip-clang/blob/main/docs/CrossRepo.md#:~:text=,not%20be%20reused%20over%20time"
https://github.com/sourcegraph/scip/blob/main/scip.proto#:~:text=%3A%3A%3D%20%3Csimple,%2F%2F%20Unit%20of"
https://github.com/sourcegraph/scip/blob/main/scip.proto#:~:text=Relationships%20to%20other%20symbols%20%28e,Go%20struct%20has%20the%20symbol"
https://glean.software/blog/incremental/#:~:text=To%20produce%20a%20modified%20DB%2C,Like%20this"
https://glean.software/docs/implementation/incrementality/#:~:text=In%20general%20the%20owner%20of,which%20has%20the%20following%20form"
https://memgraph.com/blog/graph-database-vs-relational-database#:~:text=The%20above%20dataset%20is%20naturally,these%20kinds%20of%20use%20cases"
https://memgraph.com/blog/graph-database-vs-relational-database#:~:text=data%20is%20spread%20across%20multiple,the%20solution%20to%20go%20with"
https://microsoft.github.io/language-server-protocol/overviews/lsif/overview/#:~:text=level%2C%20LSIF%20models%20the%20data,consistent%20with%20the%20LSP%20approach"
https://openjdk.org/groups/hotspot/docs/RuntimeOverview.html#:~:text=A%20class%20or%20interface%20name,in%20two%20distinct%20class%20types"
https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf#:~:text=Existing%20systems%20are%20implemented%20on,code%20detail"
https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf#:~:text=Second%2C%20relational%20databases%20depend%20on,altering%20the%20structure%20of%20records"
https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf#:~:text=Typically%2C%20source,On%20the%20other%201"
https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf#:~:text=and%20graph%20databases%20which%20we,by%20a%20factor%20of%20ten"
https://people.inf.elte.hu/kiss/14kor/oopsla13.pdf#:~:text=like%20graph%20structures%20such%20as,queried%20using%20graph%20traversal%20operations"
https://raw.githubusercontent.com/openjdk-bots/jdk17u/7c5ded84dccba1d7f558cc381b2366d75790be75/src/jdk.compiler/share/classes/com/sun/tools/javac/code/Symbol.java#:~:text=%28owner,name%29%3B"
https://raw.githubusercontent.com/openjdk-bots/jdk17u/7c5ded84dccba1d7f558cc381b2366d75790be75/src/jdk.compiler/share/classes/com/sun/tools/javac/code/Symbol.java#:~:text=%2F,return%20name"
https://sourcegraph.com/blog/announcing-scip#:~:text=,a%20subset%20of%20the%20documents"
https://sourcegraph.com/blog/announcing-scip#:~:text=Most%20of%20these%20issues%20boil,concept%20of%20%E2%80%98monikers%E2%80%99%20and%20%E2%80%98resultSet%E2%80%99"
https://sourcegraph.com/blog/optimizing-a-code-intelligence-commit-graph-part-2#:~:text=Turns%20out%20that%20claim%20was,calculating%20visible%20uploads%20on%20demand"
https://sqlite.org/features.html#:~:text=%2A%20Zero,implementation%20with%20advanced%20capabilities%20like"
https://sqlite.org/features.html#:~:text=,26%3A%20no%20external%20dependencies"
https://sqlite.org/features.html#:~:text=,no%20setup%20or%20administration%20needed"
https://sqlite.org/features.html#:~:text=,sized%20strings%20and%20blobs.%20%28See"
https://statusneo.com/arangodb-a-graph-database/#:~:text=ArangoDB%20enables%20efficient%20and%20scalable,process%20graph%20queries%20very%20efficiently"
https://statusneo.com/arangodb-a-graph-database/#:~:text=The%20graph%20capabilities%20of%20ArangoDB,are%20both%20full%20JSON%20documents"
https://statusneo.com/arangodb-a-graph-database/#:~:text=Unlike%20many%20NoSQL%20databases%2C%20ArangoDB,with%20all%20three%20data%20models"
https://statusneo.com/arangodb-a-graph-database/#:~:text=this%20approach%20combined%20with%20the,AQL"
https://technology.amis.nl/database/querying-connected-data-in-graph-databases-with-neo4j/#:~:text=For%20visualizing%20and%20studying%20complex,added%20value%20in%20the%20data"
https://ts2jsdoc.js.org/typescript/ts.Symbol.html#:~:text="
https://ts2jsdoc.js.org/typescript/ts.TypeChecker.html#:~:text=Returns%3A%20"
https://www.typescriptlang.org/docs/handbook/project-references.html#:~:text=Project%20references%20allows%20you%20to,0%20and%20newer"
```

## Conclusion

This REQ defines a TypeScript-first, language-extensible repository indexing and query system for
LLM agents. It adopts SCIP string IDs for authoritative symbol identity, incremental indexing via
BuilderProgram and Glean-style ownership sets, and a hybrid graph + relational storage model. The
system supports cross-repo references, rename handling, explicit type relationships, and a typed
agent-facing API. Limitations and unknowns are captured for future validation.
