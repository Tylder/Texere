# 01-Requirements

Defines what MUST be true, independent of implementation.

Requirements are **durable contracts** that drive Specifications and Implementation Plans. They are
immutable by ID—if intent changes, deprecate and create a new requirement ID.

## Active Requirements

- [`REQ-generate-doc-indices`](REQ-generate-doc-indices.md) (section-indexing)
- [`REQ-validate-docs`](REQ-validate-docs.md) (validation-system)

## Archived / Deprecated

- [`REQ-graph-ingestion`](REQ-graph-ingestion.md) (draft) - graph-ingestion
- [`REQ-graph-system-graph-ingestion-repo-scip-ts`](REQ-graph-system-graph-ingestion-repo-scip-ts.md)
  (draft) - graph-ingestion-repo-scip-ts
- [`REQ-graph-lifecycle`](REQ-graph-lifecycle.md) (draft) - graph-lifecycle
- [`REQ-graph-system-graph-lifecycle-assertions`](REQ-graph-system-graph-lifecycle-assertions.md)
  (draft) - graph-lifecycle-assertions
- [`REQ-graph-system-graph-policy-framework`](REQ-graph-system-graph-policy-framework.md) (draft) -
  graph-policy-framework
- [`REQ-graph-projection`](REQ-graph-projection.md) (draft) - graph-projection
- [`REQ-graph-system-graph-projection-current-truth`](REQ-graph-system-graph-projection-current-truth.md)
  (draft) - graph-projection-current-truth
- [`REQ-graph-store`](REQ-graph-store.md) (draft) - graph-store
- [`REQ-graph-system-graph-store-inmemory`](REQ-graph-system-graph-store-inmemory.md) (draft) -
  graph-store-inmemory
- [`REQ-graph-system-graph-system-architecture`](REQ-graph-system-graph-system-architecture.md)
  (draft) - graph-system-architecture
- [`REQ-graph-system-graph-knowledge-system`](REQ-graph-system-graph-knowledge-system.md) (draft) -
  graph-knowledge-system

---

## How to contribute

For each feature or initiative, create one Requirements document:

- `REQ-<feature>.md` – Contains numbered requirements (REQ-001, REQ-002, etc.)

**Important:** Multiple features can implement the same Requirement. For cross-cutting concerns
(like pagination), create one canonical Requirements document and reuse it.

See `../_templates/REQ-template.md` for template.

After creating a document:

- [ ] Update this README (add to Active section)
- [ ] Update `../DOCUMENT-REGISTRY.md` (add entry)

---

## Naming Convention

- Feature-specific: `REQ-export-feature.md`
- Cross-cutting: `REQ-pagination-system.md`
- Infrastructure: `REQ-performance-constraints.md`

Each file contains numbered requirements:

```markdown
## REQ-001: ...

## REQ-002: ...
```
