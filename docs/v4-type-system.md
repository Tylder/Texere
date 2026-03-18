# Texere v4 — Type System Reference

**Status:** Decided (derived from Oracle debate 2026-03-18)  
**Purpose:** Canonical reference for how to use every surviving node role and edge type, and why
every cut type is not needed.

---

## Design Principles

1. **Every type must be unambiguous.** If a reasonable LLM could place the same knowledge in two
   different types, one of them gets cut.

2. **Every edge must enable a traversal query.** If the relationship is only meaningful as text in
   content, it is not a graph edge — it is content. Semantic search handles it.

3. **Tags and content carry intent. Types carry structure.** Use types for what the graph needs to
   traverse. Use tags for filtering. Use content for everything else.

---

## At a Glance

### Node Roles: 10 kept, 10 cut

| Role           | Type      |         | Cut — use instead                                      |
| -------------- | --------- | ------- | ------------------------------------------------------ |
| `requirement`  | Knowledge | ✅ Keep |                                                        |
| `decision`     | Knowledge | ✅ Keep |                                                        |
| `principle`    | Knowledge | ✅ Keep |                                                        |
| `finding`      | Knowledge | ✅ Keep |                                                        |
| `pitfall`      | Knowledge | ❌ Cut  | → `principle` + tag `pitfall`                          |
| `constraint`   | Knowledge | ❌ Cut  | → `requirement`                                        |
| `error`        | Issue     | ❌ Cut  | → `finding` or `decision` (transient state — not here) |
| `problem`      | Issue     | ❌ Cut  | → `finding` or `decision` (transient state — not here) |
| `command`      | Action    | ✅ Keep |                                                        |
| `solution`     | Action    | ❌ Cut  | → `decision` with context                              |
| `task`         | Action    | ❌ Cut  | → `decision` once done; task trackers for open work    |
| `workflow`     | Action    | ✅ Keep |                                                        |
| `example`      | Artifact  | ✅ Keep |                                                        |
| `technology`   | Artifact  | ✅ Keep |                                                        |
| `code_pattern` | Artifact  | ❌ Cut  | → `example` + tag `code`                               |
| `concept`      | Artifact  | ❌ Cut  | → `principle`, `finding`, or `decision`                |
| `file_path`    | Source    | ✅ Keep |                                                        |
| `web_url`      | Source    | ✅ Keep |                                                        |
| `repository`   | Source    | ✅ Keep |                                                        |
| `api_doc`      | Source    | ✅ Keep |                                                        |

### Edge Types: 8 kept, 3 cut

| Edge             |         | Cut — use instead                           |
| ---------------- | ------- | ------------------------------------------- |
| `REPLACES`       | ✅ Keep |                                             |
| `RESOLVES`       | ✅ Keep |                                             |
| `DEPENDS_ON`     | ✅ Keep |                                             |
| `CONTRADICTS`    | ✅ Keep |                                             |
| `ANCHORED_TO`    | ✅ Keep |                                             |
| `BASED_ON`       | ✅ Keep |                                             |
| `EXAMPLE_OF`     | ✅ Keep |                                             |
| `ALTERNATIVE_TO` | ✅ Keep |                                             |
| `CAUSES`         | ❌ Cut  | → `BASED_ON` (reverse traversal equivalent) |
| `RELATED_TO`     | ❌ Cut  | → pick the specific edge, or omit entirely  |
| `PART_OF`        | ❌ Cut  | → `DEPENDS_ON`                              |

---

## Node Roles (16)

### Knowledge

> Use `texere_store_knowledge`. These are the core intellectual content of the graph — what is
> known, decided, and required.

---

#### `requirement`

**What it is:** A behavioral or quality rule the system _must_ satisfy. The source of truth for what
the system is supposed to do.

**Use when:** The statement takes the form "the system must X", "X shall Y", or "X must not Z".
Covers functional requirements, performance requirements, compliance rules, and externally imposed
limits. If it is a rule the system is obligated to satisfy, it is a requirement.

**Do not use when:** You are recording _how_ to satisfy it (→ `decision`), a general principle
guiding design (→ `principle`), or an observation about behavior (→ `finding`).

**Example:**

> "Sessions must expire after 12 hours of inactivity." "The API must respond within 200ms at p95."
> "No user data may leave the EU region."

---

#### `decision`

**What it is:** A choice made between alternatives, with rationale. The ADR of the graph.

**Use when:** The statement takes the form "we chose X over Y because Z", or "we will use X".
Records architectural choices, technology selections, approach decisions — anything where
alternatives existed and a deliberate choice was made.

**Do not use when:** You are recording what must be true (→ `requirement`), a general rule to follow
(→ `principle`), or an observation that informed the choice (→ `finding`).

**Example:**

> "We use rolling idle expiration rather than absolute session timeout. Rationale: simpler to
> implement and aligns with user expectation that active use keeps sessions alive." "We chose SQLite
> over PostgreSQL for the graph store. Rationale: zero operational overhead, single-file
> portability, sufficient for target scale."

---

#### `principle`

**What it is:** A rule or guideline that _should always_ be followed — prescriptive direction that
applies across decisions and implementations.

**Use when:** The statement takes the form "always do X", "prefer X over Y", "never do Z". Design
guidelines, architectural guidelines, anti-patterns expressed as rules, security policies, coding
standards. If it generalizes across many specific decisions, it is a principle.

**Do not use when:** It is a specific system obligation (→ `requirement`), a specific choice already
made (→ `decision`), or an empirical observation (→ `finding`).

**Example:**

> "Never store authentication tokens in localStorage." "Prefer append-only data models over in-place
> updates." "All external inputs must be validated before reaching the database layer."

---

#### `finding`

**What it is:** An empirical observation or discovery — something learned through investigation,
measurement, or experience.

**Use when:** The statement takes the form "we discovered that X", "investigation showed Y",
"testing revealed Z". Post-mortem results, performance measurements, research conclusions, patterns
observed in production. If it is something you _found out_, it is a finding.

**Do not use when:** You are expressing a rule derived from the observation (→ `principle`), a
problem being tracked (→ `problem`), or a requirement it implies (→ `requirement`).

**Example:**

> "Batch sizes over 50 cause measurable GC pressure in the embedding pipeline." "FTS5 BM25 scoring
> returns worse results than hybrid mode for queries shorter than 3 tokens." "The REPLACES traversal
> is the hottest query path — 60% of all reads touch it."

---

#### `pitfall`

**What it is:** A known trap or mistake that is easy to make and costly to fix. A specific warning
about a specific failure mode.

**Use when:** The statement takes the form "watch out for X", "don't do Y because Z", "this breaks
when". Named footguns, gotchas with real consequences, mistakes the team or LLM has made or nearly
made. More specific than a principle — a pitfall is about a concrete wrong path, not a general rule.

**Do not use when:** The guidance generalizes into a rule (→ `principle`), the mistake is actively
being tracked as an open issue (→ `problem`), or it is a general bad practice without a specific
failure mode.

**Example:**

> "FTS5 tokenizes on '/' and '.', so searching for file paths like `src/auth/session.ts` does not
> work as expected — path components are matched individually." "Calling `flushPending()` before
> every query adds 30–200ms latency. Only flush before semantic searches, not keyword searches."
> "REPLACES edges auto-invalidate the source node. Creating a REPLACES edge to the wrong target will
> silently soft-delete a live node."

---

### Issue

> Use `texere_store_issue`. These are things that are _wrong_ or _broken_ — active problems
> requiring attention.

---

#### `error`

**What it is:** A specific, reproducible technical failure — an exception, assertion failure,
compilation error, or runtime crash.

**Use when:** There is a specific error message, stack trace, or reproducible failure condition. The
node content should include the error, how to reproduce it, and what the expected behavior is.

**Do not use when:** The failure is broad and doesn't have a specific error message (→ `problem`),
or it is a pattern of failure documented as a lesson learned (→ `pitfall`).

**Example:**

> "TypeError: Cannot read properties of undefined (reading 'id') at storeNode (nodes.ts:42). Occurs
> when `temp_id` references a node that was not included in the same batch."

---

#### `problem`

**What it is:** A broader issue without a specific technical failure — degraded performance, a
design flaw, an unclear requirement, a systemic risk, or anything that needs addressing but does not
have a stack trace.

**Use when:** Something is wrong or suboptimal but it is not a discrete crash or error. Design
concerns, performance degradation, missing functionality, ambiguous specifications.

**Do not use when:** There is a specific error message (→ `error`), the lesson has already been
extracted (→ `pitfall`), or it is a gap in requirements (→ `requirement`).

**Example:**

> "Vector search degrades significantly past 20k nodes — linear scan becomes user-visible. No ANN
> index currently in place." "The `search_graph` tool returns results ordered by seed index then
> depth, discarding original relevance scores. This makes downstream ranking by authority
> unreliable."

---

### Action

> Use `texere_store_action`. These are things to _do_ — executable steps, recorded resolutions, and
> documented processes.

---

#### `command`

**What it is:** A specific, executable shell or CLI command.

**Use when:** The content _is_ the command — ready to copy and run. Not a description of what to do,
but the literal command that does it.

**Do not use when:** It describes a process with multiple steps (→ `workflow`), or a unit of work
that is not directly executable (→ `task`).

**Example:**

> `pnpm test:integration --reporter=verbose`
> `sqlite3 texere.db "SELECT COUNT(*) FROM nodes WHERE invalidated_at IS NULL;"`
> `git log --oneline --follow -- packages/graph/src/search.ts`

---

#### `solution`

**What it is:** A recorded resolution to a specific problem or error. The answer to a specific
issue, linked via a `RESOLVES` edge.

**Use when:** You are recording _how a specific problem was fixed_. The node should describe the
resolution clearly enough to apply it again. Always link with `RESOLVES` to the problem or error it
addresses.

**Do not use when:** It is a general approach or guideline (→ `principle`), a step in an ongoing
process (→ `task`), or a reusable pattern (→ `example`).

**Example:**

> "Increased the sqlite WAL checkpoint interval from 1000 to 4000 pages. This reduced write
> contention during bulk embedding inserts by ~60%." _(links via RESOLVES → problem: "write
> contention during embedding pipeline")_

---

#### `task`

**What it is:** A unit of work to be done — a TODO, an action item, a step to take.

**Use when:** Something needs to happen and you want it tracked in the graph. Can be atomic ("add
is_current flag to nodes table") or multi-step ("migrate existing databases to v4 schema").
Future-oriented.

**Do not use when:** It is already resolved (→ `solution`), it is a literal shell command (→
`command`), or it is a documented repeatable process (→ `workflow`).

**Example:**

> "Add `is_current BOOLEAN DEFAULT TRUE` column to nodes table." "Backfill is_current flag by
> traversing all REPLACES edges in existing databases."

---

#### `workflow`

**What it is:** A documented multi-step process — a repeatable procedure with sequenced stages.

**Use when:** The node describes _how to do something_ as an ordered procedure, not just what to do.
Release processes, onboarding sequences, debugging playbooks, recurring operational procedures. If
it has named stages and an order, it is a workflow.

**Do not use when:** It is a single unit of work (→ `task`), a general principle (→ `principle`), or
it refers to an agent orchestration pattern (out of scope for Texere).

**Example:**

> "Schema migration workflow: (1) run migration script, (2) verify row counts, (3) rebuild FTS5
> index, (4) re-embed pending nodes, (5) validate search results."

---

### Artifact

> Use `texere_store_artifact`. Non-propositional, entity-centric nodes — concrete things you look up
> by _what they are_, not abstract claims about the world. Knowledge nodes make assertions; Artifact
> nodes demonstrate or describe.

---

#### `example`

**What it is:** A concrete instance that illustrates a concept, approach, or pattern. Includes code
snippets, configuration samples, query examples, and any concrete case that demonstrates something
abstract.

**Use when:** The content shows a specific working instance of something. Code samples, real query
patterns, configuration examples, worked-through cases. If it demonstrates by _being_ a concrete
thing rather than _describing_ an abstract thing, it is an example.

**Link:** Use `EXAMPLE_OF` to connect it to the principle, finding, or requirement it illustrates.

**Example:**

> _(A code block showing the RRF fusion formula with inline weights)_ _(A working SQLite query for
> the is_current backfill)_ _(A concrete node + edge creation showing the REPLACES pattern)_

---

#### `technology`

**What it is:** A durable reference profile of a concrete tool, library, or service — its
capabilities, limitations, trade-offs, and fit criteria. Not a decision to use it, not a link to its
docs, but a structured summary of _what it is and how it behaves_.

**Use when:** You want to capture reusable knowledge about a technology as a lookup target:
"everything an agent needs to evaluate whether X fits a use case." The content should cover
capabilities, known limitations, performance characteristics, and when it is / is not appropriate.

**Do not use when:**

- You are recording that you _chose_ this technology (→ `Knowledge/decision`)
- You are linking to its official documentation (→ `Source` + tag `api_doc`)
- You are recording a specific observation about its behavior (→ `Knowledge/finding`)
- You are prescribing when to use it (→ `Knowledge/principle`)

**The distinction from `finding`:** A finding is a context-specific discovery. "SQLite WAL mode
reduced write contention by 60% in our pipeline" is a finding. "SQLite: embedded relational DB,
single-writer, WAL mode, FTS5 built-in, ~1TB practical limit, no network overhead" is a technology
profile.

**Example:**

> Title: "SQLite" Content: "Embedded relational database. Single file, zero config, zero network.
> WAL journal mode enables concurrent reads + single writer. FTS5 for full-text search. Practical
> limit ~1TB. Not suitable for high-concurrency writes or multi-process write access. Best fit:
> local tools, embedded agents, single-user applications."

---

### Source

> Use `texere_store_source`. Provenance anchors — they point to _where_ something comes from. Use
> `ANCHORED_TO` or `BASED_ON` edges to connect knowledge nodes to source nodes.
>
> **One role only: `source`.** Use tags to express content type — `file_path`, `web_url`,
> `repository`, `api_doc`. The structural distinction between code location and document reference
> is already carried by the edge type (`ANCHORED_TO` = code, `BASED_ON` = document).

---

#### `source`

**What it is:** A provenance anchor pointing to a specific external location — a file, a URL, a
repository, or an API reference page.

**Use when:** You need to link a knowledge node to its implementation location or origin. Always
connect via `ANCHORED_TO` (this knowledge is implemented/located here) or `BASED_ON` (this knowledge
was derived from here).

**Tag conventions — always include one:**

| Tag          | Use for                                                      |
| ------------ | ------------------------------------------------------------ |
| `file_path`  | A file in the local codebase: `packages/graph/src/search.ts` |
| `web_url`    | Any external URL — articles, guides, specs, homepages        |
| `repository` | An external code repository as a whole                       |
| `api_doc`    | Official API reference documentation (stable, authoritative) |

**Why tags instead of roles:** All Source nodes are structurally identical — they are reference
pointers. The sub-type distinction (`web_url` vs `api_doc`) is content formatting, not graph
structure. No traversal query changes based on sub-type. Authority signals belong in
`importance`/`confidence` fields, not in role. Tags are composable and do not require LLMs to make a
binary choice between `web_url` and `api_doc` for the same URL.

**Examples:**

> `packages/graph/src/search.ts` — tag: `file_path` `https://www.sqlite.org/fts5.html` — tag:
> `web_url` `https://github.com/tursodatabase/libsql` — tag: `repository`
> `https://bun.sh/docs/api/sqlite` — tags: `api_doc`, `web_url`

---

## Edge Types (9)

---

### `REPLACES`

**Direction:** new → old _(new node replaces old node)_

**Meaning:** X is the current version of Y. Y is now superseded.

**Auto-effect:** Creating a REPLACES edge automatically sets `invalidated_at` on the target node
(Y). Y is soft-deleted. X becomes the current version.

**Use when:** A knowledge claim changes — a requirement is revised, a decision is reversed, a
principle is updated. Always create a new node and link it via REPLACES rather than editing the old
one. This preserves history.

**Example:**

> `updated-session-requirement REPLACES original-session-requirement`

---

### `RESOLVES`

**Direction:** solution/task/decision → problem/error _(X closes Y)_

**Meaning:** X fixes, addresses, or closes Y.

**Use when:** A solution answers a problem. A task addresses an error. A decision eliminates an open
question. The canonical query this enables: _"find all problems with no incoming RESOLVES edge"_ —
the open-work list.

**Example:**

> `wal-checkpoint-solution RESOLVES write-contention-problem`
> `is-current-flag-task RESOLVES head-node-performance-problem`

---

### `DEPENDS_ON`

**Direction:** dependent → dependency _(X requires Y)_

**Meaning:** X requires Y to function, exist, or be valid. Functional dependency.

**Use when:** Technical dependencies, prerequisite relationships, "this cannot happen without that."
Also used for workflow composition: a task that belongs to a workflow depends on the workflow (the
workflow is its context). Covers what `PART_OF` used to cover.

**Do not use when:** X was intellectually derived from Y (→ `BASED_ON`), or X is implemented in Y (→
`ANCHORED_TO`).

**Example:**

> `auth-service DEPENDS_ON session-store` `deploy-task DEPENDS_ON build-task`

---

### `CAUSES`

**Direction:** cause → effect _(X leads to Y)_

**Meaning:** X produces Y as a consequence.

**Use when:** Root cause analysis, problem chains, consequence mapping. "This error causes that
failure." "This missing index causes slow queries."

**Example:**

> `missing-vec-index CAUSES slow-semantic-search-problem`
> `large-batch-size CAUSES gc-pressure-finding`

---

### `CONTRADICTS`

**Direction:** bidirectional _(X and Y are in conflict)_

**Meaning:** X and Y are in logical or factual conflict. Both cannot be true or followed
simultaneously.

**Use when:** Two requirements conflict with each other. A finding contradicts a principle. A
decision violates a requirement. Reserve for genuine logical conflict — not for competing options
that are both valid.

**Do not use when:** X and Y are competing valid approaches (→ `ALTERNATIVE_TO`).

**Example:**

> `requirement-no-cloud CONTRADICTS requirement-use-managed-db`
> `finding-idle-timeout-sufficient CONTRADICTS requirement-absolute-timeout`

---

### `ALTERNATIVE_TO`

**Direction:** bidirectional _(X and Y are competing options)_

**Meaning:** X and Y are valid alternatives for the same problem — substitutable approaches that
solve the same thing differently.

**Use when:** Documenting options considered during a decision. Two approaches that could each work.
The alternatives that were weighed before a decision was made. Link both alternatives to the
decision that chose between them.

**Do not use when:** X and Y genuinely conflict and cannot coexist (→ `CONTRADICTS`).

**Example:**

> `postgres-option ALTERNATIVE_TO sqlite-option`
> `rolling-idle-timeout ALTERNATIVE_TO absolute-session-timeout`

---

### `ANCHORED_TO`

**Direction:** knowledge → source _(X is implemented in / located in Y)_

**Meaning:** X is specifically implemented by, defined in, or located in source Y. Links abstract
knowledge to concrete code locations.

**Use when:** A requirement is implemented in a specific file. A decision manifests as a specific
constant or function. A principle is enforced in a specific module. Target is always a `Source` node
(`file_path`, `web_url`, etc.).

**Do not use when:** X was intellectually derived from Y (→ `BASED_ON`). ANCHORED*TO is about
\_location*, not _lineage_.

**Example:**

> `session-requirement ANCHORED_TO packages/graph/src/search.ts`
> `rrf-fusion-decision ANCHORED_TO IDLE_TIMEOUT_MS-symbol`

---

### `BASED_ON`

**Direction:** derived → source _(X traces its lineage to Y)_

**Meaning:** X's content was derived from, informed by, or traces its intellectual lineage to Y.
Provenance — _where the knowledge came from_.

**Use when:** A decision was informed by a finding. A principle came from external research. A
solution was adapted from documentation. The relationship is intellectual lineage, not functional
dependency.

**Do not use when:** X requires Y to function (→ `DEPENDS_ON`), or X is implemented _in_ Y (→
`ANCHORED_TO`).

**Critical distinction from DEPENDS_ON:** BASED*ON tracks where knowledge \_came from*. DEPENDS*ON
tracks what something \_needs to work*. When a source document is updated or invalidated, traversing
BASED_ON finds every downstream node that may need re-evaluation. That traversal would be polluted
by functional dependencies if both used DEPENDS_ON.

**Example:**

> `rrf-fusion-decision BASED_ON research-paper-source`
> `wal-checkpoint-solution BASED_ON sqlite-documentation-source`

---

### `EXAMPLE_OF`

**Direction:** example → concept/pattern _(X is a concrete instance of Y)_

**Meaning:** X is a specific, concrete realization of the abstract thing Y describes.

**Use when:** Linking an `Artifact/example` node to the principle, finding, requirement, or decision
it illustrates. The primary retrieval this enables: _"find all examples of this pattern"_ — a direct
graph traversal rather than a semantic search that returns related-but-not-
specifically-illustrative content.

**Example:**

> `rrf-code-snippet EXAMPLE_OF hybrid-search-finding`
> `replaces-pattern-snippet EXAMPLE_OF immutability-principle`

---

## Cut Types — Why They Are Not Needed

---

### ~~`constraint`~~ → use `requirement`

A constraint IS a requirement with negative framing. "Must not exceed 100ms" is a requirement. "No
cloud services due to compliance" is a requirement. The word "constraint" implies externally imposed
limits while "requirement" implies desired behavior — but in practice the same fact fits both, and
LLMs will assign them randomly.

`requirement` is the single bucket for all system obligations, positive or negative, internal or
external. If the distinction between a compliance constraint and a functional requirement matters in
a specific context, express it in content or tags (`compliance`, `external`).

---

### ~~`concept`~~ → use `principle`, `finding`, or `decision`

"Concept" has no phrasing signature. Anything can be called a concept. In practice, LLMs use
`concept` as a drain bucket for nodes that don't clearly fit elsewhere — which means the role
becomes noise.

Every concept is actually one of:

- Something the team _should do_ → `principle`
- Something the team _discovered_ → `finding`
- Something the team _chose_ → `decision`
- Something that _illustrates_ an approach → `example` (Artifact)

If you cannot place it in one of those, ask whether the node should exist at all.

---

### ~~`code_pattern`~~ → use `example`

A code pattern is a code example. The distinction between "reusable pattern" and "concrete example"
is one of intent, not structure, and LLMs will not distinguish them reliably. The result is a split
population: code snippets filed under `code_pattern`, similar snippets filed under `example`, with
queries against either missing half the relevant nodes.

Use `Artifact/example` for all code samples. Tag with `code`, `pattern`, or `snippet` if filtering
by content type matters.

---

### ~~`web_url` / `file_path` / `repository` / `api_doc`~~ → use `source` + tags

The four Source sub-roles are content conventions, not structural distinctions. No traversal query
changes based on which sub-type a Source node has. The structural distinction that matters — code
location vs. document reference — is already carried by the edge type: `ANCHORED_TO` points to code,
`BASED_ON` points to documents.

`api_doc` was the strongest candidate to keep as a role — an authority signal for retrieval ranking.
But authority belongs in the `importance` and `confidence` fields, not an enum value. `web_url` vs
`api_doc` is exactly the LLM hesitation case (is this official enough to be `api_doc`?) that the
design principles require merging.

Use a single `source` role and tag with `file_path`, `web_url`, `repository`, or `api_doc`. Tags are
composable (a file inside a repo can carry both), do not require binary judgment, and produce
identical filtering behaviour via a tag JOIN.

---

### ~~`RELATED_TO`~~ → force a specific edge

If the relationship matters enough to record as a graph edge, it is specific enough to name. If it
is not specific enough to name, it is not structurally important — and semantic search handles
content similarity without any edge at all.

`RELATED_TO` is permission to be vague in a system that requires precision. Its existence means LLMs
will reach for it under uncertainty instead of choosing the correct specific type. Every
`RELATED_TO` edge in the graph is a traversal that tells you nothing.

---

### ~~`PART_OF`~~ → use `DEPENDS_ON`

`PART_OF` encodes compositional membership: "this task is part of this workflow." `DEPENDS_ON`
encodes functional dependency: "this task depends on this workflow." In practice, these produce
identical traversal results — and LLMs confuse them approximately 40% of the time.

Model workflow composition as `task DEPENDS_ON workflow` (the task depends on the workflow for its
context) or document the composition in the workflow node's content. `DEPENDS_ON` already handles
structural relationships cleanly.
