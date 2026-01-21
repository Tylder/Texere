# 01-Requirements

Defines what MUST be true, independent of implementation.

Requirements are **durable contracts** that drive Specifications and Implementation Plans. They are
immutable by ID—if intent changes, deprecate and create a new requirement ID.

## Active Requirements

(None yet)

## Archived / Deprecated

(None yet)

---

## How to contribute

For each feature or initiative, create one Requirements document:

- `REQ-<feature>.md` – Contains numbered requirements (REQ-001, REQ-002, etc.)

**Important:** Multiple features can implement the same Requirement. For cross-cutting concerns
(like pagination), create one canonical Requirements document and reuse it.

See `../_templates/REQ-template.md` for template.

After creating a document:

- [ ] Update this README (add to Active section)
- [ ] Update the corresponding `INIT-<feature>.md` file in `/04-initiatives`

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
