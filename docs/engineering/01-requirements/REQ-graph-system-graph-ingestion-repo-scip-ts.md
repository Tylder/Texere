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
implemented_by:
  - SPEC-graph-ingestion-repo-scip-ts
implements:
  - IDEATION-PROBLEMS-graph-knowledge-system
related:
  - REQ-graph-ingestion
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-system-graph-policy-framework
index:
  sections:
    - title: "TLDR"
      lines: [88, 105]
      summary: 'Clone a repo at a commit, run scip-typescript, and map files/symbols into ArtifactRoot, ArtifactState, and ArtifactPart with deterministic provenance.'
      token_est: 99
    - title: "Scope"
      lines: [107, 127]
      summary: 'TypeScript repo ingestion via SCIP into Artifact nodes. Excludes lifecycle assertions, projections, and store selection details.'
      token_est: 88
    - title: "REQ-001: Commit-anchored ingestion"
      lines: [129, 151]
      summary: 'Ingestion MUST be anchored to an immutable commit hash.'
      token_est: 104
    - title: "REQ-002: SCIP index generation"
      lines: [153, 175]
      summary: 'Ingestion MUST generate a SCIP index for the target repo.'
      token_est: 112
    - title: "REQ-003: Install policy"
      lines: [177, 200]
      summary: 'Ingestion MUST install dependencies using the repo's declared package manager.'
      token_est: 123
    - title: "REQ-004: ArtifactPart mapping"
      lines: [202, 229]
      summary: 'Files and symbols MUST be represented as ArtifactParts.'
      token_est: 132
    - title: "REQ-005: Locator format"
      lines: [231, 253]
      summary: 'Symbol locators MUST use SCIP identifiers.'
      token_est: 97
    - title: "REQ-006: Toolchain provenance"
      lines: [255, 278]
      summary: 'The ingestion run MUST record toolchain versions.'
      token_est: 115
    - title: "REQ-007: Failure policy"
      lines: [280, 303]
      summary: 'SCIP index generation failures MUST fail the ingestion.'
      token_est: 111
    - title: "REQ-008: Retention mode for third-party code"
      lines: [305, 326]
      summary: 'Retention mode MUST default to link-only for third-party repositories.'
      token_est: 88
    - title: "REQ-009: Monorepo coverage"
      lines: [328, 350]
      summary: 'Monorepo ingestion MUST index all packages by default.'
      token_est: 97
    - title: "Related Requirements"
      lines: [352, 359]
      summary: 'Repo ingestion must align with ingestion and graph model requirements.'
      token_est: 25
    - title: "Design Decisions"
      lines: [361, 374]
      token_est: 85
    - title: "Blockers"
      lines: [376, 380]
      token_est: 39
---

# REQ-graph-ingestion-repo-scip-ts

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

## REQ-003: Install policy

Summary: Ingestion MUST install dependencies using the repo's declared package manager.

**Statement:**

The ingestion pipeline MUST install dependencies using the repo's lockfile and declared package
manager before running scip-typescript, unless a policy override is explicitly configured.

**Rationale:**

Dependency installation is required for TypeScript to resolve cross-file symbols reliably.

**Measurable Fit Criteria:**

- [ ] The pipeline detects the repo's package manager and lockfile
- [ ] Dependency install is executed before indexing
- [ ] Install failures abort ingestion

**Verification Method:**

- Integration tests on repos with external dependencies

---

## REQ-004: ArtifactPart mapping

Summary: Files and symbols MUST be represented as ArtifactParts.

**Statement:**

The ingestion pipeline MUST create:

- One ArtifactPart per source file (file-level parts)
- One ArtifactPart per SCIP symbol (symbol-level parts)

Each symbol part MUST link to its file part via a deterministic locator.

**Rationale:**

File and symbol parts are the minimal addressable units for code traceability.

**Measurable Fit Criteria:**

- [ ] Every source file yields a file ArtifactPart
- [ ] Every SCIP symbol yields a symbol ArtifactPart
- [ ] Symbol parts reference their parent file part

**Verification Method:**

- Index-to-graph consistency tests

---

## REQ-005: Locator format

Summary: Symbol locators MUST use SCIP identifiers.

**Statement:**

Symbol ArtifactParts MUST use a locator of the form `path#scip_symbol`, where `scip_symbol` is the
fully qualified SCIP symbol identifier.

**Rationale:**

SCIP identifiers are stable and unambiguous across files and languages.

**Measurable Fit Criteria:**

- [ ] All symbol ArtifactParts include a `path#scip_symbol` locator
- [ ] Locator uniqueness holds across files in the repo

**Verification Method:**

- Locator format validation tests

---

## REQ-006: Toolchain provenance

Summary: The ingestion run MUST record toolchain versions.

**Statement:**

The ingestion pipeline MUST record versions for scip-typescript, node, and the package manager used
to generate the index, and attach them to the Activity metadata.

**Rationale:**

Toolchain versions are required to reproduce and audit ingestion output.

**Measurable Fit Criteria:**

- [ ] Activity metadata includes scip-typescript version
- [ ] Activity metadata includes node version
- [ ] Activity metadata includes package manager and version

**Verification Method:**

- Activity metadata inspection in integration tests

---

## REQ-007: Failure policy

Summary: SCIP index generation failures MUST fail the ingestion.

**Statement:**

If scip-typescript fails to produce a valid index for the target commit, the ingestion MUST fail and
MUST NOT write partial ArtifactParts for that run.

**Rationale:**

Partial ingestion without symbol coverage undermines traceability and produces misleading graph
state.

**Measurable Fit Criteria:**

- [ ] Failed SCIP runs do not create ArtifactState records
- [ ] Errors are reported with command output and exit status

**Verification Method:**

- Failure-path integration tests

---

## REQ-008: Retention mode for third-party code

Summary: Retention mode MUST default to link-only for third-party repositories.

**Statement:**

The ingestion pipeline MUST default to link-only retention for third-party repositories unless
explicitly overridden by policy.

**Rationale:**

Link-only retention minimizes IP risk while preserving provenance for external sources.

**Measurable Fit Criteria:**

- [ ] ArtifactParts from third-party repos have retention_mode=link-only by default

**Verification Method:**

- Retention policy tests

---

## REQ-009: Monorepo coverage

Summary: Monorepo ingestion MUST index all packages by default.

**Statement:**

For repositories with multiple packages, the ingestion pipeline MUST index all packages unless a
configured allowlist limits scope.

**Rationale:**

Partial indexing can omit symbol definitions and break cross-file queries.

**Measurable Fit Criteria:**

- [ ] All packages with tsconfig entries are indexed by default
- [ ] Allowlist configuration limits scope when provided

**Verification Method:**

- Monorepo indexing tests

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
