# 02-Specifications

Defines the build/test contract: interfaces, behavior, invariants, and error handling.

Specifications are **durable** and evolve via git history. They implement one or more Requirements
and are ready for code and tests.

**Key:** One Specification can implement multiple Requirements. One Requirement can be implemented
by multiple Specifications.

## Active Specifications

(None yet)

## Archived

- [`SPEC-test-indexing-full`](SPEC-test-indexing-full.md) (draft) - indexing

---

## How to contribute

For each piece that needs to be built, create one Specification:

- `SPEC-<area>-<topic>.md` – API contract, state machine, error handling, etc.

See `../_templates/SPEC-template.md` for template.

After creating a document:

- [ ] Update this README (add to Active section)
- [ ] Update `../DOCUMENT-REGISTRY.md` (add entry)
- [ ] Include "Implements" section linking to Requirements

---

## Naming Convention

- Search: `SPEC-search-results-pagination.md`
- API: `SPEC-auth-session-handler.md`
- UI: `SPEC-export-dialog.md`
- System: `SPEC-cache-invalidation-system.md`

---

## Tips

- Link upward to Requirements (which REQs does this implement?)
- Include Q&A section with alternatives considered
- Use git history, not filename versioning
- If a Spec is wrong, update it and add Q&A explaining why
