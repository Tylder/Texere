# IDEATION-<feature>-experience

**Status:** Draft

**Date Started:** YYYY-MM-DD

---

## Overview

Brief description of who will use this and what we want their experience to be like.

Example: "Define how data analysts and engineers will export data, focusing on clarity, progress
visibility, and error handling."

---

## Persona 1: <Name>

**Role / Context:** Who is this person and why do they use the system?

Example: "Alice is a data analyst. She runs regular reports and exports data for stakeholders. She
values speed and clear feedback."

**Goals:** What does this persona want to achieve?

- Export datasets for reporting
- Get results quickly
- Understand what's happening if something goes wrong

**Pain Points:** What frustrates them today?

- Exports timeout on large datasets
- No visibility into progress
- Generic error messages don't help debugging

---

## Primary Journey 1: <Happy Path>

Step-by-step workflow for the happy path (everything works).

**Steps:**

1. Alice navigates to the export dialog
2. She selects data range (Q1 2025) and format (CSV)
3. She clicks Export
4. She sees progress: "Preparing data... (40%)"
5. Within 30 seconds, she sees "Download" button
6. She downloads the file and opens it in Excel

**Success Signal:** Alice can export data and start analyzing in < 2 minutes.

---

## Primary Journey 2: <Alternate Happy Path>

[Repeat structure if a second journey is important]

Example: "Bob (engineer) integrates exports via API and needs to poll for results."

---

## Experience Invariants

Rules that should **always** be true.

- Users should always see progress (never a blank screen for >2 seconds)
- Errors should always explain what went wrong (never generic 500 errors)
- Users should always know if an export is running, queued, or complete

---

## Failure & Recovery

What happens when things go wrong? How do users recover?

### Scenario: Export Fails Midway

- User sees: "Export failed at 60%. Retry?" with error details
- User can: Retry, cancel, download partial results, contact support
- System records: Why it failed (memory, timeout, invalid data?)

### Scenario: Network Drops

- User sees: "Connection lost. Your export is still running. Check back in 5 minutes."
- User can: Close the tab and return later; status is preserved
- System records: Export state so retry can resume

---

## Success Signals

Concrete, measurable signs that the experience is good.

- Alice exports data and starts analysis in < 2 minutes
- Bob polls the API and receives results within 30 seconds for typical datasets
- Both see clear error messages when something goes wrong (not generic 500s)
- No export is lost due to page refresh or network hiccup

---

## Experience Assumptions

Beliefs about what will make users happy (to validate later).

- Users prefer async exports with email/download link over waiting on a page
- Users tolerate a slight delay if they see progress
- Users will retry exports if the error is clear

---

## Open Questions

Things to clarify with users / stakeholders.

- Should we support export scheduling (e.g., "export every Monday")?
- Do users need export history / audit trail?
- What's an acceptable wait time before showing progress?
