# REQ-ORCH-SESSION-002: Checkpoint completeness

**Status:** Proposed

---

## Statement (MUST form)

Checkpoints MUST capture complete epistemic state: facts, hypotheses, assumptions, unknowns,
constraints, decisions, and rationale for each decision. No epistemic content may be lost or
summarized away.

---

## Driven by

- **PROB-001**: Session resets force repo research from scratch
- **PROB-003**: No durable epistemic state (facts, hypotheses, unknowns)

**Rationale:** If checkpoints omit parts of epistemic state (e.g., only save decisions but not their
rationale, or only facts but not unknowns), then session resumption succeeds mechanically but users
cannot understand _why_ prior decisions were made or what gaps remain. This creates silent
assumption drift and prevents learning from prior work.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: LangGraph checkpoint system must support custom serialization
  of complex epistemic state structures

**Rationale:** We use LangGraph checkpoints. The schema must be designed to preserve epistemic state
without information loss.

---

## Measurable fit criteria

- Every element of epistemic state (fact, hypothesis, unknown, constraint, decision, rationale) is
  captured in checkpoint
- Checkpoints are deserializable back to full epistemic state (no post-processing needed)
- Checkpoint size is reasonable (not bloated; not compressed to unreadability)
- Schema supports evolution (old checkpoints remain readable when schema changes)

---

## Verification method

- **Checkpoint audit**: Serialize epistemic state → checkpoint → deserialize → compare; all content
  must round-trip
- **Completeness test**: List all epistemic state elements (facts, hypotheses, unknowns, etc.) and
  verify each appears in checkpoint
- **Schema evolution test**: Create checkpoint with old schema, read with new schema, verify no data
  loss

---

## See also

[REQ-ORCH-SESSION-001](REQ-ORCH-SESSION-001.md),
[REQ-ORCH-EPISTEMIC-001](REQ-ORCH-EPISTEMIC-001.md),
[REQ-ORCH-EPISTEMIC-002](REQ-ORCH-EPISTEMIC-002.md)
