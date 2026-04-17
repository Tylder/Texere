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

4. **No manually-assigned relevance scores.** `importance` is removed from the schema. An LLM
   storing a node has no calibrated reference frame for a 0–1 float, so the field either saturates
   at 1.0 or becomes noise. Differentiation between nodes is handled by: tags (categorical,
   explicit), graph structure (connection count), recency (`created_at`), and semantic search
   ranking. `confidence` is kept — it is epistemics ("how certain is this claim"), not relevance,
   and has a clear meaning an LLM can reason about.

---

## At a Glance

### Node Roles: 10 kept, 10 cut

| Role           | Type      |         | Use when / Instead use                                                                                                 |
| -------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `requirement`  | Knowledge | ✅ Keep | System **must** do X. "Must", "shall", "required to." Obligations, quality targets, compliance.                        |
| `decision`     | Knowledge | ✅ Keep | We **chose** X over Y, and here's why. ADR-style. Also: resolved bugs with rationale.                                  |
| `principle`    | Knowledge | ✅ Keep | We **always/never** do X. Prescriptive rules that apply across all decisions. Covers pitfalls too — add tag `pitfall`. |
| `finding`      | Knowledge | ✅ Keep | We **discovered** X. Empirical, past-tense. "Investigation showed…", "we measured that…"                               |
| `pitfall`      | Knowledge | ❌ Cut  | → `principle` + tag `pitfall`                                                                                          |
| `constraint`   | Knowledge | ❌ Cut  | → `requirement`                                                                                                        |
| `error`        | Issue     | ❌ Cut  | → `finding` or `decision` — transient state, not durable knowledge                                                     |
| `problem`      | Issue     | ❌ Cut  | → `finding` or `decision` — use a bug tracker for open issues                                                          |
| `command`      | Action    | ✅ Keep | Content **is** the executable command. Copy-paste ready. Single invocation.                                            |
| `solution`     | Action    | ❌ Cut  | → `decision` with context — a resolved problem is a decision with rationale                                            |
| `task`         | Action    | ❌ Cut  | → `decision` once done; open work → task tracker                                                                       |
| `workflow`     | Action    | ✅ Keep | Repeatable, **ordered procedure** with named stages. Release process, migration, playbook.                             |
| `example`      | Artifact  | ✅ Keep | Content **is** a concrete artifact — actual code, config, output. Demonstrates, doesn't describe.                      |
| `technology`   | Artifact  | ✅ Keep | **Reference profile** of a tool — capabilities, limits, fit criteria. Not a decision to use it.                        |
| `code_pattern` | Artifact  | ❌ Cut  | → `example` + tag `code`                                                                                               |
| `concept`      | Artifact  | ❌ Cut  | → `principle`, `finding`, or `decision`                                                                                |
| `file_path`    | Source    | ✅ Keep | A file in the **local codebase**. Primary target of `ANCHORED_TO` edges.                                               |
| `web_url`      | Source    | ✅ Keep | Any **external URL**. Default when in doubt.                                                                           |
| `repository`   | Source    | ✅ Keep | An **external repo** as a whole — not a specific file within it.                                                       |
| `api_doc`      | Source    | ✅ Keep | **Official API reference** — stable, authoritative. Not a guide or article.                                            |

### Edge Types: 9 kept, 3 cut

| Edge             |         | Direction            | Use when / Instead use                                                                           |
| ---------------- | ------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| `REPLACES`       | ✅ Keep | new → old            | A node's **content changes**. Revised requirement, reversed decision. Auto-invalidates old node. |
| `RESOLVES`       | ✅ Keep | decision → req       | X **fulfils** Y. "This is the answer to this requirement." Not a precondition — a fulfilment.    |
| `VERIFIED_BY`    | ✅ Keep | requirement → source | This requirement is **verified by** this test file. Enables "untested requirements" gap query.   |
| `DEPENDS_ON`     | ✅ Keep | dependent → dep      | X **requires** Y. Technical deps, prerequisites, workflow composition.                           |
| `CONTRADICTS`    | ✅ Keep | bidirectional        | X and Y are in **logical conflict** — both cannot be true or followed simultaneously.            |
| `ANCHORED_TO`    | ✅ Keep | knowledge → source   | This knowledge is **implemented in / located in** this file or URL.                              |
| `BASED_ON`       | ✅ Keep | derived → source     | X **traces its lineage** to Y. Intellectual provenance — "this came from that."                  |
| `EXAMPLE_OF`     | ✅ Keep | example → concept    | X **is a concrete instance** of Y. Links examples to the principle or finding they illustrate.   |
| `ALTERNATIVE_TO` | ✅ Keep | bidirectional        | X and Y are **competing valid options** — either could work, one was chosen.                     |
| `CAUSES`         | ❌ Cut  |                      | → `BASED_ON` reverse traversal — same relationship, opposite direction, inconsistent graphs      |
| `RELATED_TO`     | ❌ Cut  |                      | → pick the specific edge, or omit — if it matters it has a name                                  |
| `PART_OF`        | ❌ Cut  |                      | → `DEPENDS_ON`                                                                                   |

---

## Node Roles (10)

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

**Do not use when:** You are expressing a rule derived from the observation (→ `principle`), or a
requirement it implies (→ `requirement`).

**Example:**

> "Batch sizes over 50 cause measurable GC pressure in the embedding pipeline." "FTS5 BM25 scoring
> returns worse results than hybrid mode for queries shorter than 3 tokens." "The REPLACES traversal
> is the hottest query path — 60% of all reads touch it."

---

### Action

> Use `texere_store_action`. These are durable procedural artifacts — things to run or repeat. Open
> work items and one-off tasks belong in a task tracker, not here.

---

#### `command`

**What it is:** A specific, executable shell or CLI command.

**Use when:** The content _is_ the command — ready to copy and run. Not a description of what to do,
but the literal command that does it.

**Do not use when:** It describes a process with multiple steps (→ `workflow`).

**Example:**

> `pnpm test:integration --reporter=verbose`
> `sqlite3 texere.db "SELECT COUNT(*) FROM nodes WHERE invalidated_at IS NULL;"`
> `git log --oneline --follow -- packages/graph/src/search.ts`

---

#### `workflow`

**What it is:** A documented multi-step process — a repeatable procedure with sequenced stages.

**Use when:** The node describes _how to do something_ as an ordered procedure, not just what to do.
Release processes, onboarding sequences, debugging playbooks, recurring operational procedures. If
it has named stages and an order, it is a workflow.

**Do not use when:** It is a single executable command (→ `command`), a general rule (→
`principle`), or it refers to an agent orchestration pattern (out of scope for Texere).

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

> Use `texere_store_source`. Provenance anchors — they point to _where_ something comes from. Always
> connect via `ANCHORED_TO` (this knowledge is implemented here) or `BASED_ON` (this knowledge was
> derived from here).

---

#### `file_path`

**What it is:** A specific file in the local codebase.

**Use when:** Anchoring a requirement, decision, or principle to the file that implements it.
Primary target of `ANCHORED_TO` edges. The `title` should be the path.

**Example:** `packages/graph/src/search.ts`

---

#### `web_url`

**What it is:** Any external URL — documentation pages, articles, specifications, tool homepages,
research papers. Default choice when in doubt.

**Example:** `https://www.sqlite.org/fts5.html`

---

#### `repository`

**What it is:** An external code repository as a whole — not a specific file within it.

**Use when:** Referencing a dependency repo, reference implementation, or upstream source.

**Example:** `https://github.com/tursodatabase/libsql`

---

#### `api_doc`

**What it is:** Official API reference documentation for a specific library, framework, or service.
Structured reference material — not a tutorial, guide, or general documentation page.

**Use when:** The URL is the authoritative, stable API reference. Signals higher authority than
`web_url` for retrieval ranking.

**Do not use when:** It is a guide, article, or general docs page (→ `web_url`).

**Example:** `https://bun.sh/docs/api/sqlite`

---

## Edge Types (8)

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

### `VERIFIED_BY`

**Direction:** requirement → source/file*path *(X is verified by Y)\_

**Meaning:** This requirement has test coverage in this file. Distinct from `ANCHORED_TO` —
requirements are not _implemented in_ test files, they are _verified by_ them.

**Use when:** Linking a requirement to the test file that asserts it is met. The key query this
enables: _"find all requirements with no outgoing `VERIFIED_BY` edge"_ — untested requirements.

**Do not use when:** The file _implements_ the requirement (→ `ANCHORED_TO`). VERIFIED_BY is only
for test files asserting that a requirement holds.

**Example:**

> `session-expiry-requirement VERIFIED_BY src/auth/session.test.ts`

---

### `RESOLVES`

**Direction:** decision/workflow/command → requirement _(X fulfils Y)_

**Meaning:** X is the answer to Y. Not a precondition — a fulfilment. The decision or procedure
satisfies the requirement.

**Use when:** A decision implements a requirement. A workflow satisfies a requirement. The key query
this enables: _"find all requirements with no incoming RESOLVES edge"_ — unimplemented requirements.

**Do not use when:** X merely depends on Y existing (→ `DEPENDS_ON`). RESOLVES = "I am the answer."
DEPENDS_ON = "I need this to exist."

**Example:**

> `rolling-idle-expiration-decision RESOLVES session-expiry-requirement`
> `migration-workflow RESOLVES schema-versioning-requirement`

---

### `DEPENDS_ON`

**Direction:** dependent → dependency _(X requires Y)_

**Meaning:** X requires Y to function, exist, or be valid. Functional dependency.

**Use when:** Technical dependencies, prerequisite relationships, "this cannot happen without that."
Also covers composition: a workflow that builds on another workflow uses `DEPENDS_ON`. Covers what
`PART_OF` used to cover.

**Do not use when:** X was intellectually derived from Y (→ `BASED_ON`), or X is implemented in Y (→
`ANCHORED_TO`).

**Example:**

> `auth-service DEPENDS_ON session-store` `deploy-workflow DEPENDS_ON build-workflow`

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

### ~~`pitfall`~~ → use `principle` + tag `pitfall`

A pitfall is a negatively-framed principle. "Never use `as any` because it bypasses type checking"
and "always use explicit types" are the same knowledge at different polarities. LLMs will split
identical content between pitfall and principle based on sentence framing, not semantic content.

Use `principle` and add a `pitfall` tag for retrieval. The tag preserves the "watch out" signal
without creating a parallel bucket that LLMs populate inconsistently.

---

### ~~Issue type~~ (~~`error`~~, ~~`problem`~~) → use `finding` or `decision`

Texere stores medium-to-long term durable knowledge only. Error and problem are transient states —
they describe something currently wrong, which belongs in a bug tracker, not a knowledge graph.

By the time something is worth writing into Texere, it has already been synthesised into knowledge:

- "We discovered the session store leaks memory under load" → `finding`
- "We switched to TTL-based cleanup because of the memory leak" → `decision`
- "Watch out for memory leaks with this connection pattern" → `principle` + tag `pitfall`

The raw event (error, stack trace, open problem) is not the knowledge. The understanding of it is.

---

### ~~`solution`~~ → use `decision`

A resolved problem is a decision with context. "We fixed the write contention by increasing the WAL
checkpoint interval" is a decision — it records what was chosen and why. The bug is just the
rationale, not a separate node.

`solution` required a `problem` node to link to via `RESOLVES`. With the Issue type gone, solution
has no anchor.

---

### ~~`task`~~ → use a task tracker; completed work → `decision`

A task is future-oriented work. Once done, it has zero informational value — it transforms into a
decision or disappears. There is no clean line between a durable task and a transient one: anything
genuinely durable is already a `requirement` (standing obligation) or `principle` (standing rule).

Open work belongs in a task tracker. Completed work that shaped the codebase becomes a `decision`.

---

### ~~`constraint`~~ → use `requirement`

A constraint is a requirement with negative framing. "Must not exceed 100ms" is a requirement. "No
cloud services" is a requirement. LLMs assign them randomly because the same fact fits both. Use
`requirement` for all system obligations and express specifics in content or tags (`compliance`,
`external`).

---

### ~~`concept`~~ → use `principle`, `finding`, or `decision`

"Concept" has no phrasing signature — anything can be called a concept. In practice it becomes a
drain bucket. Every concept is actually a principle (prescriptive), finding (empirical), or decision
(choice). If it doesn't fit any of those, the node probably shouldn't exist.

---

### ~~`code_pattern`~~ → use `example` + tag `code`

A code pattern is a code example. The distinction is one of intent, not structure — LLMs will not
distinguish them reliably and the same snippet ends up split across both roles. Use `example` and
tag with `code` or `pattern` if filtering matters.

---

### ~~`CAUSES`~~ → use `BASED_ON` (reverse traversal)

`CAUSES` and `BASED_ON` encode the same relationship in opposite directions. "finding CAUSES
decision" and "decision BASED_ON finding" are semantically identical. Over time the graph
accumulates the same relationship in both directions inconsistently, making traversal unreliable.

`BASED_ON` is the survivor — its direction is unambiguous (subject is derived, object is the prior
source). Reverse traversal on `BASED_ON` edges answers the same "what did this lead to?" question
that `CAUSES` would have answered.

---

### ~~`RELATED_TO`~~ → pick the specific edge, or omit

If the relationship matters enough to store as a graph edge, it is specific enough to name. If it is
not specific enough to name, it is not structurally important — semantic search handles content
similarity without any edge. `RELATED_TO` is permission to be vague in a system that requires
precision.

---

### ~~`PART_OF`~~ → use `DEPENDS_ON`

`PART_OF` (compositional membership) and `DEPENDS_ON` (functional dependency) produce identical
traversal results for the knowledge graph use case. LLMs confuse them ~40% of the time. `DEPENDS_ON`
absorbs both — a workflow that builds on another workflow `DEPENDS_ON` it.
