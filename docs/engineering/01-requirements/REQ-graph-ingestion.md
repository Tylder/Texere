---
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-ingestion
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: >-
  High-level requirements for ingestion pipelines and source connectors
summary_long: >-
  Defines high-level Requirements for ingestion of code and external sources into canonical graph
  nodes, including connectors, decomposition rules, provenance, and retention policies. Detailed
  source-specific rules are delegated to subordinate REQs/SPECs.
keywords:
  - requirements
  - graph
  - ingestion
implements:
  - IDEATION-PROBLEMS-graph-knowledge-system
related:
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-system-graph-policy-framework
index:
  sections:
    - title: 'TLDR'
      lines: [108, 123]
      token_est: 119
    - title: 'Scope'
      lines: [125, 143]
      token_est: 91
    - title: 'Definitions'
      lines: [145, 160]
      token_est: 125
    - title: 'REQ-001 Connector contract'
      lines: [162, 181]
      token_est: 104
    - title: 'REQ-002 Deterministic policy selection'
      lines: [183, 194]
      token_est: 39
    - title: 'REQ-003 Run summary (readiness, completeness, counts)'
      lines: [196, 217]
      token_est: 111
    - title: 'REQ-004 Capability declaration (profile-defined registry)'
      lines: [219, 236]
      token_est: 89
    - title: 'REQ-005 Policy decision record'
      lines: [238, 253]
      token_est: 60
    - title: 'REQ-006 Retention, materialization, and authority'
      lines: [255, 294]
      token_est: 176
    - title: 'REQ-007 Locator normalization (profile-declared citable categories)'
      lines: [296, 315]
      token_est: 77
    - title: 'REQ-008 Range model (typed)'
      lines: [317, 350]
      token_est: 115
    - title: 'REQ-009 Profiles and query obligations'
      lines: [352, 370]
      token_est: 90
    - title: 'REQ-009A Profile specification template (normative)'
      lines: [372, 385]
      token_est: 104
    - title: 'REQ-010 Optional enrichments'
      lines: [387, 404]
      token_est: 82
    - title: 'REQ-011 Incremental ingestion (high-churn sources)'
      lines: [406, 418]
      token_est: 65
    - title: 'REQ-012 Update semantics (immutability vs mutable-by-latest)'
      lines: [420, 432]
      token_est: 80
    - title: 'REQ-013 Deletions, tombstones, and garbage collection'
      lines: [434, 446]
      token_est: 65
    - title: 'REQ-014 Incremental correctness guardrails'
      lines: [448, 461]
      token_est: 63
    - title: 'REQ-015 Working set and dual-lane storage (high-churn sources)'
      lines: [463, 474]
      token_est: 62
    - title: 'REQ-016 Agent query lens (working vs snapshot)'
      lines: [476, 488]
      token_est: 68
    - title: 'REQ-017 Atomic application of ingestion runs'
      lines: [490, 501]
      token_est: 59
    - title: 'REQ-018 Ownership boundary (profile-declared)'
      lines: [503, 512]
      token_est: 51
    - title: 'Related Requirements'
      lines: [514, 521]
      summary: 'Ingestion must align with architecture and graph model constraints.'
      token_est: 24
    - title: 'Design Decisions'
      lines: [523, 536]
      token_est: 85
    - title: 'Blockers'
      lines: [538, 542]
      token_est: 39
---

# REQ-graph-ingestion

## TLDR

This document defines the **source-agnostic ingestion envelope**: connector contract, deterministic
policy selection, run metadata, retention/materialization/authority rules, locator normalization,
profile contracts, and incremental update consistency.

Agents MUST be able to:

- identify **what was ingested**, **with which policy**, and **with what completeness/status**
- identify **capabilities** available per profile via a **profile-defined capability manifest**
- identify whether content is **reference-only** vs **materialized**, and where **authoritative
  content** lives
- retrieve stable **locators** (source + snapshot + path_or_url + optional range)
- query against a declared **lens** (working/latest vs snapshot/as-of) when supported

---

## Scope

### Includes

- Connector contract and lifecycle
- Policy-driven parameterization and policy decision records
- Run summary and audit metadata
- Retention, content materialization, and content authority rules
- Locator and range normalization
- Profile declaration and query obligations
- Incremental ingestion semantics and correctness guardrails
- Atomic application of run updates

### Excludes

- Source-specific parsing/decomposition rules (profile-specific REQs)
- Storage engine choice (Neo4j vs other)

---

## Definitions

- **Connector**: ingester implementation that reads a source snapshot and writes profile outputs
  under this envelope.
- **IngestionRun**: one execution of a connector under a resolved policy.
- **IngestionPolicy**: graph-stored rules selecting connector(s), scope, lens,
  retention/materialization/authority, and enrichments.
- **Profile**: named output contract defining emitted graph shape and guaranteed queries.
- **Lens**: query view (at minimum `working/latest`; optionally `snapshot/as-of`).
- **Locator**: normalized pointer: `source_ref`, `snapshot_id`, `path_or_url`, optional `range`.
- **Range**: typed span coordinate (see REQ-008).
- **Content materialization mode**: `reference-only | materialized | hybrid`.
- **Content authority mode**:
  `external-authoritative | snapshot-authoritative | graph-authoritative`.

---

## REQ-001 Connector contract

**Requirement**

Each connector MUST implement a common interface with:

- **Inputs**: `source_ref`, `policy_ref`, `snapshot_id`, `run_id`, optional `credentials_ref`,
  optional `requested_profiles`.
- **Outputs**: run summary (REQ-003), capability declaration (REQ-004), policy decision record
  (REQ-005), and profile outputs (REQ-009).
- **Idempotency**: identical `(source_ref, snapshot_id, policy_ref, connector_version)` MUST not
  produce contradictory duplicates.
- **Status model**: connectors MUST classify runs as `complete | partial | failed | skipped`.

**Validation**

- Interface conformance tests
- Integration tests across at least two connectors

---

## REQ-002 Deterministic policy selection

**Requirement**

Ingestion behavior MUST be resolved from IngestionPolicy stored in the graph. Selection MUST be
deterministic and explainable.

**Validation**

- Policy selection determinism tests

---

## REQ-003 Run summary (readiness, completeness, counts)

**Requirement**

Each IngestionRun MUST write a run summary with, at minimum:

- `run_id`, `connector_id`, `connector_version`
- `source_ref`, `snapshot_id`, `started_at`, `finished_at`
- `status`: `complete | partial | failed | skipped`
- `profiles_emitted`: name + version
- `retention_mode` applied
- per emitted profile: `content_materialization_mode` and `content_authority_mode`
- counts by profile for key entities
- `failures`: error code + message + affected scope
- `skips`: reason + affected scope

**Validation**

- Run-summary schema validation
- Fault-injection tests producing partial/failed outcomes

---

## REQ-004 Capability declaration (profile-defined registry)

**Requirement**

Each run MUST declare capabilities per emitted profile using a typed, versioned registry:

- reference the profile capability manifest (profile name + profile version + manifest version)
- provide typed values required by the manifest
- represent unsupported capabilities explicitly (e.g., `unsupported`)

The ingestion envelope MUST NOT hardcode source-specific capability IDs.

**Validation**

- Manifest schema validation
- Capability-to-output consistency checks

---

## REQ-005 Policy decision record

**Requirement**

Each run MUST write a policy decision record capturing:

- selected IngestionPolicy
- selection inputs and tie-break outcomes
- resolved parameters: scope selectors, lens policy, retention mode, materialization mode, authority
  mode, enrichments

**Validation**

- Determinism tests across identical inputs

---

## REQ-006 Retention, materialization, and authority

**Requirement**

### Retention

Retention mode MUST be enforced and recorded:

- `link-only`: locators/metadata only
- `excerpt`: bounded excerpts/spans allowed
- `hashed`: hashes for verification; raw content may be absent
- `full`: raw content may be retained

### Materialization

Each profile MUST declare a content materialization mode and each run MUST record the mode used:

- `reference-only`
- `materialized`
- `hybrid`

Profiles MUST define which node categories may carry stored content payloads and any normalization
rules.

### Authority

Each profile MUST declare a content authority mode and each run MUST record the mode used:

- `external-authoritative`
- `snapshot-authoritative`
- `graph-authoritative`

If authoritative content is not stored in-graph, the system MUST still provide stable locators
(REQ-007) and provenance linking to the authoritative snapshot.

**Validation**

- Retention/materialization conformance tests per mode

---

## REQ-007 Locator normalization (profile-declared citable categories)

**Requirement**

Profiles MUST declare citable node categories. For each citable category, connectors MUST emit
locators with:

- `source_ref`
- `snapshot_id`
- `path_or_url`
- `range` when applicable

Profiles MUST declare how source-native coordinates map into the normalized range model.

**Validation**

- Locator schema validation
- Profile conformance tests for declared citable categories

---

## REQ-008 Range model (typed)

**Requirement**

Ranges MUST be represented as a typed structure:

- `range_kind`: `line_col | byte_offset | dom | opaque`

For `line_col`:

- `start_line`, `start_col`, `end_line`, `end_col`
- 0-based indices
- end is exclusive

For `byte_offset`:

- `start_byte`, `end_byte` (0-based, end exclusive)

For `dom`:

- `selector` (e.g., CSS/XPath as declared by profile)
- optional `start_offset`, `end_offset` relative to the selected node

For `opaque`:

- profile-defined pointer string

Profiles MUST declare which range kinds they support for citable categories.

**Validation**

- Range schema validation tests

---

## REQ-009 Profiles and query obligations

**Requirement**

Each connector output MUST declare one or more profiles. Each profile MUST define:

- profile name + version
- emitted node/edge inventory (minimum set)
- uniqueness/upsert keys for entities used by the profile
- citable categories + locator guarantees (REQ-007/REQ-008)
- incremental update semantics and invalidation triggers (REQ-012/REQ-013)
- capability manifest (REQ-004)
- black-box query obligations

**Validation**

- Profile conformance tests

---

## REQ-009A Profile specification template (normative)

Each profile specification document MUST include:

1. **Identity & keys** (canonical IDs; upsert keys; rename/move semantics)
2. **Node & edge inventory** (minimum + optional)
3. **Materialization & authority** (modes; payload categories; access rules)
4. **Citable categories & ranges** (locator guarantees; range kinds)
5. **Query obligations** (canonical query shapes; outputs; error modes)
6. **Incremental semantics** (ownership boundary; removal semantics; scope expansion)
7. **Invalidation & guardrails** (triggers; reporting)
8. **Capability manifest** (IDs; types; versions; dependencies)

---

## REQ-010 Optional enrichments

**Requirement**

Optional enrichments MAY be enabled by policy. When enabled, enrichments:

- MUST be additive (must not invalidate baseline identifiers)
- MUST follow the same snapshot identity rules
- MUST be declared via capabilities (REQ-004)
- MUST remain compatible with profile query obligations

Enrichment classes (profiles define concrete enrichments):

- cross-reference enrichment
- structural enrichment
- semantic enrichment

---

## REQ-011 Incremental ingestion (high-churn sources)

**Requirement**

For sources that support change detection, connectors MUST support incremental ingestion that:

- identifies the delta between prior and new `snapshot_id`
- reprocesses changed scope plus any required dependent scope
- preserves profile query obligations after update

Incremental ingestion MUST be policy-controllable.

---

## REQ-012 Update semantics (immutability vs mutable-by-latest)

**Requirement**

Update semantics MUST be policy-selectable per profile and/or node category:

- **immutable-by-snapshot**: records are snapshot-scoped; older snapshots remain queryable
- **mutable-by-latest**: upsert-in-place represents the latest state for a logical entity

When mutable-by-latest is used, runs MUST record sufficient audit metadata to trace the working
state back to a producing `snapshot_id` and run.

---

## REQ-013 Deletions, tombstones, and garbage collection

**Requirement**

Profiles MUST define removal semantics compatible with their update semantics:

- immutable-by-snapshot: removals are absence (optional tombstones)
- mutable-by-latest: removals are delete or tombstone such that stale entities are not observed as
  current

GC MAY be supported if policy-controlled and retention-safe.

---

## REQ-014 Incremental correctness guardrails

**Requirement**

When incremental ingestion is enabled, connectors MUST implement at least one policy-selectable
guardrail defined by profile:

- equivalence sampling vs full rebuild
- dependency closure expansion
- invalidation rules forcing scope widening/full rebuild

Divergence MUST be recorded as `partial` or `failed`.

---

## REQ-015 Working set and dual-lane storage (high-churn sources)

**Requirement**

For high-churn sources, the system MUST support:

- a **working/latest** state optimized for low-latency queries
- an append-only audit lane of runs/policies/status

The system MUST allow agents to determine which `snapshot_id` produced the current working state.

---

## REQ-016 Agent query lens (working vs snapshot)

**Requirement**

Agents MUST be able to request:

- **working/latest lens**: current state + producing `snapshot_id`
- **snapshot/as-of lens**: specific `snapshot_id` view only if retained by policy/profile

If snapshot history is not retained, the system MUST surface this deterministically (via capability
or error code).

---

## REQ-017 Atomic application of ingestion runs

**Requirement**

For each profile and lens, updates from a run MUST become visible atomically (transaction or
staging + pointer swap). Failed atomic application MUST result in `partial` or `failed`.

**Validation**

- Concurrency tests with reads during ingestion

---

## REQ-018 Ownership boundary (profile-declared)

**Requirement**

For incremental updates, each profile MUST declare an ownership boundary (minimum granularity) used
to remove/recompute derived facts for changed units.

Connectors MUST record update scope and removed/inserted counts in the run summary.

---

## Related Requirements

Summary: Ingestion must align with architecture and graph model constraints.

- REQ-graph-system-graph-system-architecture.md
- REQ-graph-system-graph-knowledge-system.md

---

## Design Decisions

| Field                  | Decision 001  |
| ---------------------- | ------------- |
| **Title**              | Not specified |
| **Options Considered** | Not specified |
| **Chosen**             | Not specified |
| **Rationale**          | Not specified |
| **Tradeoffs**          | Not specified |
| **Blocked**            | Not specified |
| **Expires**            | Not specified |
| **Decision Date**      | Not specified |

---

## Blockers

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | N/A    | N/A           | N/A    |
