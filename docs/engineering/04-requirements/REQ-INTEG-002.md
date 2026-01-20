# REQ-INTEG-002: Repo mutation safety

**Status:** Proposed

---

## Statement (MUST form)

Code changes to the repo MUST be applied safely: changes MUST not corrupt state, MUST respect
concurrent modifications, MUST be reversible. Unsafe mutations MUST be detected and prevented.

---

## Driven by

- **PROB-033**: Workspace and repo state are not managed safely

**Rationale:** If mutations are unsafe, code quality or state is corrupted. Safety mechanisms are
essential.

---

## Measurable fit criteria

- Concurrent modifications are handled safely (no corruption)
- Changes can be rolled back if needed
- Unsafe mutations are detected and prevented
- Workspace state remains consistent

---

## Verification method

- **Concurrency test**: Multiple agents modify repo; verify no corruption
- **Rollback test**: Change can be reversed safely
- **Safety detection**: Unsafe mutation is blocked with warning

---

## See also

[REQ-INTEG-001](REQ-INTEG-001.md)
