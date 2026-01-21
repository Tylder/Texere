# IDEATION-<feature>-unknowns

**Status:** Draft

**Date Started:** YYYY-MM-DD

---

## Overview

Captured uncertainties that need resolving before moving to Requirements and design.

Example: "Open questions about export strategy (async vs sync, format support, retention)."

---

## Unknown 1: <Question>

**Question:** Clear, specific question that needs answering.

Example: "Should exports be asynchronous (queued, email results) or synchronous (wait for
download)?"

**Why It Matters:** What downstream decisions depend on this?

- Affects API design (polling vs. streaming vs. immediate response)
- Affects user experience (async needs background jobs + notifications)
- Affects infrastructure (queue system, storage)

**Possible Answers:** Candidate responses (don't pick yet; just brainstorm).

- A) Synchronous: user waits, gets immediate download (simple, but timeouts for large data)
- B) Asynchronous: queued, email link when ready (better UX, needs job system)
- C) Hybrid: sync for small exports, async for large ones (best UX, but complex)

**Closure Criteria:** How will we know the answer? What information would resolve this?

- User research with 5+ data analysts on their workflow preferences
- Performance testing to see timeout thresholds
- Stakeholder sign-off on infrastructure budget (queue system cost?)

**Status:**

- [ ] Open
- [ ] In progress (describe work being done)
- [ ] Resolved (decision: Option B; captured in Requirements)

---

## Unknown 2: <Question>

**Question:** Example: "What file formats must we support?"

**Why It Matters:**

- Affects development scope (CSV is simple, Parquet is complex)
- Affects maintenance burden (more formats = more edge cases)
- Affects user adoption (some workflows require specific formats)

**Possible Answers:**

- A) CSV only (80% of use cases, simplest)
- B) CSV + JSON (covers reporting + API use)
- C) CSV + JSON + Parquet + Excel (future-proof, but much more work)

**Closure Criteria:**

- Survey users on their format needs
- Estimate development effort for each format
- Check competitor support

**Status:**

- [ ] Open
- [ ] In progress
- [ ] Resolved

---

## Unknown 3: <Question>

[Repeat structure]

---

## Blocking Questions

Unknowns that **must** be resolved before proceeding. If any of these are unresolved, we can't start
Requirements.

- [ ] Unknown 1 (async vs sync)
- [ ] Unknown 2 (format support)

---

## Nice-to-Know Questions

Unknowns that would be nice to clarify but don't block Requirements.

- Should we support export scheduling?
- Should we track export history?
- Do we need export templates?

---

## Next Steps

What work needs to happen to close these unknowns?

- [ ] User research session with 5+ power users (target: end of week)
- [ ] Spike on Parquet library options (1 day)
- [ ] Check competitors' export offerings (1 hour)
- [ ] Stakeholder review of async infrastructure cost (2 hours)

---

## Resolved Unknowns

Keep track of questions that have been answered (for audit trail).

### Resolved: "Should we support recurring exports?"

**Decision:** No, not in v1. Add as REQ-FUTURE if needed.

**Why:** Scope, complexity, unclear user need. Can be added later without rework.

**Date Resolved:** YYYY-MM-DD
