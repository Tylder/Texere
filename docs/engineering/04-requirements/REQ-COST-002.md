# REQ-COST-002: Predictable resource usage

**Status:** Proposed

---

## Statement (MUST form)

Context and latency MUST remain predictable as repo size increases. System MUST NOT degrade linearly
with repo size (e.g., always re-reading entire codebase).

---

## Driven by

- **PROB-012**: Model capacity is spent re-reading identical source material
- **PROB-036**: Scaling and performance are not architected

**Rationale:** As repos grow, system should scale sublinearly or logarithmically, not linearly.
Predictability enables planning.

---

## Measurable fit criteria

- Context usage does not grow linearly with repo size (e.g., capping at 50k tokens for 1M-line repo)
- Latency growth is sublinear (not 10x slower for 10x larger repo)
- Resource usage is predictable and can be bounded

---

## Verification method

- **Scaling test**: Run on small repo → large repo; measure context and latency growth
- **Predictability test**: Verify scaling follows documented model (e.g., logarithmic)

---

## See also

[REQ-COST-001](REQ-COST-001.md)
