# LLM-Driven Feature Development Workflow

_A structured, enforceable process for adding features to existing codebases using Large Language
Models (LLMs)._

---

## 1. Purpose & Rationale

Traditional LLM-assisted coding often fails due to long upfront plans, late feature wiring, and
last-minute rewrites.  
This workflow emphasizes incremental delivery, early visibility, and test-driven correctness.

---

## 2. Core Principles

### Vertical Slices / Walking Skeleton

Implement a minimal end-to-end version of the feature before expanding complexity.

### Test-Driven Development (TDD)

Tests define behavior and prevent drift.

### Iterative & Incremental Development

Develop in small, verifiable increments.

### Spec-First, But Slice-Oriented

A spec that evolves with each slice.

---

## 3. Workflow Overview

```
SPEC → TESTS → MINIMAL IMPLEMENTATION → REFACTOR → NEXT SLICE
```

---

## 4. Detailed Steps

### Step A — Normalize Feature Request into Vertical Slices

Create a spec containing:

- Context of current behavior
- New behavior broken into slices
- Acceptance criteria
- Test plan
- Constraints
- Diff budget
- Ownership & boundaries: intended Nx tags (domain/layer) + allowed dependency matrix for each new
  lib/app.
- Risks & dependencies: key risks with mitigations, and hard vs soft dependencies (e.g., DB,
  external APIs, queues).

---

### Step B — Write Tests for Slice 1

Only tests.  
They must fail before implementation.  
Testing targets: define required test types (unit/integration/golden/e2e) and expected coverage band
per repo testing strategy.

---

### Step C — Implement Minimal Code to Make Tests Pass

Apply minimal changes, avoid refactors, produce the walking skeleton.

---

### Step D — Safe Refactor

Improve clarity and structure with tests green.

---

### Step E — Repeat B–D for Remaining Slices

Add validations, edge cases, negative tests, performance logic.

---

### Step F — Edge Case Sweep

Add property-based, fuzz, and robustness tests.

---

### Step G — Update Spec, Document Behavior, Strengthen Guardrails

Ensure FEATURE_SPEC.md reflects reality.  
Require tests for all behavior changes.  
Add/update README/ADR snippets per slice: purpose, tags, allowed deps, how to run tests, and links
to governing specs.

---

## 5. Advantages

- Early behavioral validation
- Reduced architectural risk
- Safe refactoring
- Test-backed correctness
- Maintainability over time

---

## 6. Risks & Mitigations

### Risk: Initial skeleton mistakes

Mitigation: allow replacement after spike.

### Risk: Tests outdated

Mitigation: require test updates with spec changes.

### Risk: Underspecification

Mitigation: mandatory spec revision each slice.

---

## 7. When This Works Best

- Adding isolated features to existing repos
- LLM-driven or agent-driven workflows
- CI/CD environments requiring reliability
- Rapid iteration with minimal regressions

---

## 8. Templates

### Slice Template

```
## Slice X — Title

### Purpose
...

### Behavior
...

### Acceptance Criteria
- Given ...
- When ...
- Then ...

### Tests
- Unit:
- Integration:
- Negative:
- Edge:

### Constraints
...
```

### Refactor Permission Template

```
Refactor Allowed: YES/NO
Scope:
- Files:
- Max lines changed:
- Behavior changes: NOT ALLOWED
```

---

## 9. Summary

A disciplined, incremental LLM workflow ensuring:

- small diffs
- early working code
- test-first correctness
- evolving spec
