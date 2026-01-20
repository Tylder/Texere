# REQ Linking Strategy

**Decision:** How requirements trace to problems and decisions, and how traceability is maintained.

---

## Linking Principles

### 1. Many-to-One: Multiple Problems → One REQ

**Rationale:** Related problems often need a single obligation. Creating separate REQs for each
problem creates redundancy and maintenance burden.

**Example:**

- PROB-001 (session resets force repo research)
- PROB-034 (task interruption/resumability)
- PROB-010 (no safe separation of baseline/history)

All three address **session continuity**. Rather than three separate REQs ("sessions persist",
"resumable", "baseline vs history separated"), one REQ captures all three obligations:

- **REQ-ORCH-SESSION-001**: "Session state including epistemic state MUST persist across user
  sessions and support task resumption"

**Rule:** Group related problems into one REQ. Problem groupings are determined by shared concern,
not problem numbers.

---

### 2. Many-to-One: Multiple ADRs → One REQ

**Rationale:** A REQ may be constrained by multiple decisions. Making this visible prevents future
ADRs from conflicting with REQs.

**Example:**

- REQ-ORCH-SESSION-002 ("Checkpoints MUST capture full epistemic state") is constrained by:
  - **ADR-orchestration-langgraph-ts** (we use LangGraph checkpoints)
  - (Future) ADR-schema-evolution (how do we handle schema changes?)
  - (Future) ADR-checkpoint-storage (where/how are checkpoints stored?)

**Rule:** Link REQ to all ADRs that materially constrain how the REQ can be satisfied.

---

### 3. Explicit Links with Rationale

**Format for REQ traceability sections:**

```markdown
## Driven by (PROBDEF)

- PROB-001 (Session resets force repo research)
- PROB-034 (Task interruption and resumability)
- PROB-010 (No safe separation between baseline and history)

**Rationale:** These three problems share the core requirement: session state (including in-progress
work, decisions, and epistemic understanding) must survive session boundaries and be resumable.

## Constrained by (ADR)

- ADR-orchestration-langgraph-ts (LangGraph checkpoint system)

**Rationale:** We committed to LangGraph's checkpoint mechanism. This REQ assumes checkpoints can
capture and restore complex epistemic state. If we later change the storage model, this REQ's
implementation may change, but the obligation remains.
```

**Benefits:**

- Human-readable intent
- Shows why the link exists
- Easy to scan
- Captures assumptions

---

### 4. Bidirectional Linking

**Pattern:** PROBDEF and ADR point forward to REQs; REQs point backward to PROBDEF and ADR.

**In PROBDEF:**

```markdown
### PROB-001 — Session resets force repo research from scratch

...

**See also:** REQ-ORCH-SESSION-001, REQ-ORCH-SESSION-002, REQ-ORCH-SESSION-003
```

**In ADR:**

```markdown
### Consequences

...

**Requires REQs to be satisfied:**

- REQ-ORCH-SESSION-002 (checkpoints must capture epistemic state)
- REQ-ORCH-EPISTEMIC-001 (separation between facts/hypotheses/unknowns)
- REQ-OBS-004 (graph inspection must be available)
```

**Benefits:**

- Users can navigate from problem → REQ or decision → REQ
- Catches missed REQs early
- Creates a web of traceability

---

### 5. REQ-INDEX.md as Single Source of Truth for Mapping

**Purpose:** Before individual REQ files are written, REQ-INDEX.md serves as the canonical
traceability matrix.

**Updates to PROBDEF and ADR don't require immediate individual REQ edits; the index is the source
of truth for "what does this problem/decision require?"**

**Structure:**

```
| REQ ID | Title | Problem(s) | ADR(s) | Category | Status |
```

---

## Rules for this Project

1. **One obligation per REQ file** (immutable by ID)
2. **Multiple problems per REQ allowed** (if problems are closely related)
3. **Multiple ADRs per REQ allowed** (if multiple decisions constrain it)
4. **Bidirectional links maintained** (PROBDEF/ADR → REQ and REQ → PROBDEF/ADR)
5. **REQ-INDEX.md is updated first** before individual REQ files are written
6. **Rationale is always stated** (not just lists of IDs)
7. **Forward links (REQ→ADR)** use "Constrained by"; this acknowledges that the decision limits
   implementation options but doesn't change the obligation

---

## Maintenance

- When a PROBDEF is created/updated, add a "See also: REQ-…" section
- When an ADR is created, list the REQs it constrains in a "Requires REQs" section
- When a REQ is deprecated, update all backward-pointing links in PROBDEF/ADR

---

## Example: REQ Traceability (What We'll See in Each REQ)

```markdown
# REQ-ORCH-SESSION-001: Session state persistence

**Status:** Proposed

## Statement (MUST form)

Session state, including all epistemic state (facts, hypotheses, unknowns, constraints, decisions,
and their rationale), MUST persist across user sessions and support task resumption without loss of
context.

## Driven by

- PROB-001: Session resets force repo research from scratch
- PROB-034: Task interruption and resumability failures cause repeated work
- PROB-010: No safe separation between "current baseline" and historical record

**Rationale:** These three problems stem from a shared root cause: when sessions end, the system's
state is lost. Users must re-establish what was known, what was tried, and what remains unknown.
This requirement ensures that session boundaries do not cause work loss or repeated discovery.

## Constrained by

- ADR-orchestration-langgraph-ts: LangGraph checkpoint system must store and restore full state

**Rationale:** We committed to LangGraph. Its checkpoint mechanism must be capable of preserving
complete epistemic state, or this REQ cannot be satisfied. If we later discover checkpoints are
insufficient, we must either (a) extend the checkpoint schema or (b) reconsider the orchestration
choice (ADR).

## Measurable Fit Criteria

- A paused 4-hour task can be resumed 24 hours later
- Resume context includes: prior decisions, their rationale, unknowns from the pause point, next
  safe steps
- User can determine the next step without re-reading chat history or re-running prior analyses

## Verification Method

- Integration test: create a task, pause it, wait, resume it, verify state is correct
- User experience test: time to re-orient after resumption (goal: < 5 min for 4h task)

## See Also

[REQ-ORCH-SESSION-002](REQ-ORCH-SESSION-002.md), [REQ-ORCH-SESSION-003](REQ-ORCH-SESSION-003.md),
[REQ-ORCH-EPISTEMIC-001](REQ-ORCH-EPISTEMIC-001.md)
```

This is what we'll write for each REQ.
