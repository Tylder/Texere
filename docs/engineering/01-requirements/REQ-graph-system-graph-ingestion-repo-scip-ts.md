---
# REQUIRED FIELDS — DO NOT REMOVE ANY OF THESE
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-ingestion-repo-scip-ts
summary_short: >-
  Requirements for ingesting a TypeScript repository via SCIP into canonical graph nodes
summary_long: >-
  Defines Requirements for cloning a third-party TypeScript repository, generating a SCIP index, and
  mapping it into ArtifactRoot/State/Part nodes with deterministic provenance and retention
  handling. v0.1 scope covers repo ingestion only and excludes lifecycle assertions and projections.
keywords:
  - requirements
  - graph
  - ingestion
implements:
  - IDEATION-PROBLEMS-graph-knowledge-system
related:
  - REQ-graph-ingestion
  - REQ-graph-system-graph-knowledge-system
index:
  sections:
    - title: 'Document Relationships'
      lines: [70, 87]
      summary:
        'Requirements for ingesting a TypeScript repository via SCIP into canonical graph nodes.'
      token_est: 47
    - title: 'TLDR'
      lines: [89, 106]
      summary:
        'Clone a repo at a commit, run scip-typescript, and map files/symbols into ArtifactRoot,
        ArtifactState, and ArtifactPart with deterministic provenance.'
      token_est: 99
    - title: 'Scope'
      lines: [108, 128]
      summary:
        'TypeScript repo ingestion via SCIP into Artifact nodes. Excludes lifecycle assertions,
        projections, and store selection details.'
      token_est: 88
    - title: 'REQ-001: Commit-anchored ingestion'
      lines: [130, 152]
      summary: 'Ingestion MUST be anchored to an immutable commit hash.'
      token_est: 104
    - title: 'REQ-002: SCIP index generation'
      lines: [154, 176]
      summary: 'Ingestion MUST generate a SCIP index for the target repo.'
      token_est: 112
    - title: 'REQ-003: ArtifactPart mapping'
      lines: [178, 204]
      summary: 'Files and symbols MUST be represented as ArtifactParts.'
      token_est: 132
    - title: 'Related Requirements'
      lines: [206, 213]
      summary: 'Repo ingestion must align with ingestion and graph model requirements.'
      token_est: 25
    - title: 'Design Decisions'
      lines: [215, 228]
      token_est: 85
    - title: 'Blockers'
      lines: [230, 234]
      token_est: 39
---

# REQ-graph-ingestion-repo-scip-ts

## Document Relationships

Summary: Requirements for ingesting a TypeScript repository via SCIP into canonical graph nodes.

**Upstream (depends on):**

- REQ-graph-ingestion.md
- REQ-graph-system-graph-knowledge-system.md

**Downstream (depends on this):**

- SPEC-graph-ingestion-repo-scip-ts.md (planned)

**Siblings (related Requirements):**

- REQ-graph-store.md

---

## TLDR

Summary: Clone a repo at a commit, run scip-typescript, and map files/symbols into ArtifactRoot,
ArtifactState, and ArtifactPart with deterministic provenance.

**What:** Repo ingestion pipeline for TypeScript using SCIP

**Why:** Provide auditable, reproducible code-to-graph ingestion for v0.1

**How:** Clone by commit -> index via scip-typescript -> normalize into ArtifactRoot/State/Part

**Status:** Draft

**Critical path:** Define ingestion steps -> define ArtifactPart mapping -> enforce provenance

**Risk:** If SCIP output shape changes, ingestion mapping must be updated

---

## Scope

Summary: TypeScript repo ingestion via SCIP into Artifact nodes. Excludes lifecycle assertions,
projections, and store selection details.

**Includes:**

- Repo cloning at an explicit commit hash
- SCIP index generation via scip-typescript
- File and symbol ArtifactPart creation
- Provenance capture (Agent/Activity)
- Retention mode enforcement for third-party code

**Excludes:**

- Lifecycle assertions (Decision/Requirement/SpecClause)
- Projection outputs
- Non-TypeScript languages
- Storage engine selection

---

## REQ-001: Commit-anchored ingestion

Summary: Ingestion MUST be anchored to an immutable commit hash.

**Statement:**

The ingestion pipeline MUST clone and index a repository at a specific commit hash, and record that
hash in the ArtifactState as the version reference.

**Rationale:**

Commit anchoring ensures deterministic, auditable "as-of" graph states.

**Measurable Fit Criteria:**

- [ ] ArtifactState.version_ref equals the commit hash
- [ ] Re-ingesting the same commit produces identical ArtifactParts

**Verification Method:**

- Ingestion reproducibility test across identical commits

---

## REQ-002: SCIP index generation

Summary: Ingestion MUST generate a SCIP index for the target repo.

**Statement:**

The ingestion pipeline MUST invoke scip-typescript to produce a SCIP index for the repository at the
specified commit.

**Rationale:**

SCIP provides symbol-level data necessary for traceability and impact analysis.

**Measurable Fit Criteria:**

- [ ] SCIP index file is produced for the target commit
- [ ] SCIP tool version is recorded in Activity metadata

**Verification Method:**

- Pipeline test that asserts SCIP index presence and tool metadata

---

## REQ-003: ArtifactPart mapping

Summary: Files and symbols MUST be represented as ArtifactParts.

**Statement:**

The ingestion pipeline MUST create:

- One ArtifactPart per source file (file-level parts)
- One ArtifactPart per SCIP symbol (symbol-level parts) Each symbol part MUST link to its file part
  via a deterministic locator.

**Rationale:**

File and symbol parts are the minimal addressable units for code traceability.

**Measurable Fit Criteria:**

- [ ] Every source file yields a file ArtifactPart
- [ ] Every SCIP symbol yields a symbol ArtifactPart
- [ ] Symbol parts reference their parent file part

**Verification Method:**

- Index-to-graph consistency tests

---

## Related Requirements

Summary: Repo ingestion must align with ingestion and graph model requirements.

- REQ-graph-ingestion.md
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
