# 01-Requirements

Defines what MUST be true, independent of implementation.

Requirements are **durable contracts** that drive Specifications and Implementation Plans. They are
immutable by ID—if intent changes, deprecate and create a new requirement ID.

## Active Requirements

- [`REQ-generate-doc-indices`](REQ-generate-doc-indices.md) (section-indexing)
- [`REQ-validate-docs`](REQ-validate-docs.md) (validation-system)

## Archived / Deprecated

- [`REQ-graph_knowledge_system`](REQ-graph_knowledge_system.md) (draft) - graph-knowledge-system

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
