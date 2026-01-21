# Meta Documents

System-level documentation about the project itself: how documentation works, build/test
infrastructure, architectural decisions, and other meta-information.

Meta documents are **durable** and evolve via git history. They guide implementation and
understanding of the project's systems and conventions.

## Active Meta Documents

- [`META-documentation-system`](META-documentation-system.md) (system)

## Archived / Deprecated

(None yet)

---

## How to contribute

For system-level documentation that describes how the project works:

- `META-<topic>.md` – Documentation system specs, build system docs, architectural guides, etc.

See `../_templates/META-template.md` for template.

After creating a document:

- [ ] Update this README (add to Active section)
- [ ] DOCUMENT-REGISTRY.md is auto-updated on commit

---

## Naming Convention

- Documentation: `META-documentation-system.md`
- Build: `META-build-system.md`
- Architecture: `META-architecture-decisions.md`

---

## Tips

- Link upward to system Requirements/Specs if applicable
- Update when system changes
- Use git history for versioning
