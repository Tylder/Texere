# Document Registry

Machine-readable index of all engineering documentation.

Use this registry to:

- Find documents by type, status, or area
- See what Specifications implement which Requirements
- Track project health at a glance
- Identify stale documents needing review

---

## Quick Queries

**Show me all active Specs:**

```
grep "| SPEC.*active" below
```

**Show me all docs in area:pagination:**

```
grep "pagination" below
```

**Show me all Specs implementing REQ-pagination-system:**

```
grep "REQ-pagination-system" below (Specs section)
```

**Show me all blockers with status:in-progress:**

```
grep "In progress" below (Blockers section)
```

---

## Documents by Type

### Ideation

| ID                             | Title                 | Status | Stability    | Area   | Feature           | Modified   |
| ------------------------------ | --------------------- | ------ | ------------ | ------ | ----------------- | ---------- |
| IDEATION-pagination-problems   | Pagination Problems   | draft  | experimental | search | pagination-system | 2025-01-21 |
| IDEATION-pagination-experience | Pagination Experience | draft  | experimental | search | pagination-system | 2025-01-21 |
| IDEATION-pagination-unknowns   | Pagination Unknowns   | draft  | experimental | search | pagination-system | 2025-01-21 |

### Requirements

| ID                    | Title             | Status   | Stability | Area     | Feature           | # REQs | Implemented By                                                              | Modified   |
| --------------------- | ----------------- | -------- | --------- | -------- | ----------------- | ------ | --------------------------------------------------------------------------- | ---------- |
| REQ-pagination-system | Pagination System | approved | stable    | core-api | pagination-system | 3      | SPEC-search-pagination, SPEC-user-list-pagination, SPEC-timeline-pagination | 2025-01-21 |
| (add more as created) |                   |          |           |          |                   |        |                                                                             |            |

### Specifications

| ID                             | Title                     | Status | Stability    | Area     | Feature           | Implements                 | Implemented By              | Depends On                 | Modified   |
| ------------------------------ | ------------------------- | ------ | ------------ | -------- | ----------------- | -------------------------- | --------------------------- | -------------------------- | ---------- |
| SPEC-search-results-pagination | Search Results Pagination | draft  | experimental | search   | pagination-system | REQ-pagination#001,002,003 | IMPL-PLAN-pagination-system | SPEC-shared-pagination-lib | 2025-01-21 |
| SPEC-user-list-pagination      | User List Pagination      | draft  | experimental | users    | pagination-system | REQ-pagination#001,002,003 | IMPL-PLAN-pagination-system | SPEC-shared-pagination-lib | 2025-01-21 |
| SPEC-timeline-pagination       | Timeline Pagination       | draft  | experimental | timeline | pagination-system | REQ-pagination#001,002,003 | IMPL-PLAN-pagination-system | SPEC-shared-pagination-lib | 2025-01-21 |
| (add more as created)          |                           |        |              |          |                   |                            |                             |                            |            |

### Implementation Plans

| ID                          | Title                            | Status | Stability    | Area     | Feature           | Coordinates                            | Covers                     | Blocks | Modified   |
| --------------------------- | -------------------------------- | ------ | ------------ | -------- | ----------------- | -------------------------------------- | -------------------------- | ------ | ---------- |
| IMPL-PLAN-pagination-system | Pagination System Implementation | draft  | experimental | core-api | pagination-system | SPEC-search, SPEC-users, SPEC-timeline | REQ-pagination#001,002,003 | (none) | 2025-01-21 |
| (add more as created)       |                                  |        |              |          |                   |                                        |                            |        |            |

### Initiatives

| ID                    | Title                        | Status | Stability | Area     | Feature           | Ideation Count | REQs           | Specs | Plans | Modified   |
| --------------------- | ---------------------------- | ------ | --------- | -------- | ----------------- | -------------- | -------------- | ----- | ----- | ---------- |
| INIT-pagination       | Pagination System Initiative | active | stable    | core-api | pagination-system | 3              | REQ-pagination | 3     | 1     | 2025-01-21 |
| (add more as created) |                              |        |           |          |                   |                |                |       |       |            |

---

## Status Summary

Quick health check of documentation.

| Status   | Type      | Count | Examples                    |
| -------- | --------- | ----- | --------------------------- |
| draft    | IDEATION  | 3     | IDEATION-pagination-\*      |
| draft    | REQ       | 0     | —                           |
| draft    | SPEC      | 3     | SPEC-\*-pagination          |
| draft    | IMPL-PLAN | 1     | IMPL-PLAN-pagination-system |
| approved | REQ       | 1     | REQ-pagination-system       |
| active   | INIT      | 1     | INIT-pagination             |

---

## Blockers

Issues that block multiple documents or initiatives.

| Blocker                           | Impacts                                                              | Status         | ETA        | Owner       |
| --------------------------------- | -------------------------------------------------------------------- | -------------- | ---------- | ----------- |
| Database indexing                 | SPEC-search-pagination (perf test), IMPL-PLAN-pagination-system (M2) | In progress    | 2025-02-01 | DB Team     |
| SPEC-shared-pagination-lib review | IMPL-PLAN-pagination-system (M1)                                     | Pending review | 2025-01-24 | Design Lead |
| Performance test infrastructure   | IMPL-PLAN-pagination-system (M5)                                     | Requested      | 2025-01-25 | DevOps      |

---

## Dependencies

Many-to-many relationships for querying.

**One Requirement, Multiple Specs:**

REQ-pagination-system (approved) ├── SPEC-search-results-pagination (draft) ├──
SPEC-user-list-pagination (draft) └── SPEC-timeline-pagination (draft)

**One Plan, Multiple Specs:**

IMPL-PLAN-pagination-system (draft) ├── SPEC-search-results-pagination ├── SPEC-user-list-pagination
└── SPEC-timeline-pagination

**Cross-cutting Dependencies:**

SPEC-shared-pagination-lib ├── SPEC-search-results-pagination (depends on) ├──
SPEC-user-list-pagination (depends on) └── SPEC-timeline-pagination (depends on)

---

## Area & Feature Index

Organize documents by area and feature.

### Area: search

**Pagination System:**

- IDEATION-pagination-problems
- IDEATION-pagination-experience
- IDEATION-pagination-unknowns
- REQ-pagination-system (approved)
- SPEC-search-results-pagination (draft)
- IMPL-PLAN-pagination-system (draft)
- INIT-pagination (active)

### Area: users

**Pagination System:**

- SPEC-user-list-pagination (draft)
- (IMPL-PLAN-pagination-system covers this)

### Area: timeline

**Pagination System:**

- SPEC-timeline-pagination (draft)
- (IMPL-PLAN-pagination-system covers this)

---

## Review Schedule

Documents needing review soon.

| Document                       | Next Review | Status   | Owner |
| ------------------------------ | ----------- | -------- | ----- |
| IDEATION-pagination-problems   | 2025-02-01  | draft    | Alice |
| IDEATION-pagination-experience | 2025-02-01  | draft    | Alice |
| IDEATION-pagination-unknowns   | 2025-02-01  | draft    | Alice |
| REQ-pagination-system          | 2025-02-21  | approved | Bob   |
| SPEC-search-results-pagination | 2025-02-21  | draft    | Alice |
| SPEC-user-list-pagination      | 2025-02-21  | draft    | Bob   |
| SPEC-timeline-pagination       | 2025-02-21  | draft    | Carol |
| IMPL-PLAN-pagination-system    | 2025-02-21  | draft    | Alice |
| INIT-pagination                | 2025-02-21  | active   | Alice |

---

## How to Update This Registry

1. **When you create a new document:** Add an entry to the appropriate "Documents by Type" table
2. **When you change status:** Update the status field in the relevant table
3. **When you change stability:** Update the stability field
4. **When a blocker is resolved:** Update the Blockers section
5. **When document relationships change:** Update the Dependencies section

This registry is the source of truth for document metadata. Keep it current for LLM queries to work
reliably.

---

## For LLMs and Agents

This registry is machine-readable. You can:

1. **Parse as markdown table** to extract metadata
2. **Query by status** (show me all active docs)
3. **Query by area** (show me all search-related docs)
4. **Traverse dependencies** (what implements this REQ?)
5. **Find blockers** (what's blocking this document?)

Each entry includes: type, status, stability, area, feature, date modified.

Use this to understand document relationships and project health without reading full documents.
