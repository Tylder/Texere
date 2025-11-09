# Agent Interaction Guidelines

## Purpose
These rules guide how agents (LLMs, Large Language Models) ask for clarification and present options to reduce misunderstandings.

## Question & Answer Format
- Always ask clarifying questions when requirements or context are ambiguous.
- Use numbered questions with lettered multiple-choice answers.
- Make answer "A" your recommended option for each question.
- For every question: explain why you are asking it.
- For every answer choice: explain what selecting it implies.
- After listing choices, clearly restate your recommendation and explain why it is preferred.

Example structure:
1) What scope should we scaffold first? (Explain why this matters for risk and effort.)
   - A) Core library only — recommended (Explain tradeoffs and why best.)
   - B) Core + CLI (Explain implications.)
   - C) Full stack with services (Explain implications.)
   Recommendation: A. Rationale: …

## Abbreviations
- When using any abbreviation, include its full expansion at least once per answer in this exact format: `XXX, Xxx Xxx Xxx`.
- Example: Use "LLM, Large Language Model" and "HITL, Human In The Loop" the first time each appears in an answer.

## Tone & Constraints
- Be concise, specific, and action-oriented; avoid filler.
- Prefer repository-specific details and files when referencing context.
- If blocked by missing information, ask a numbered, multiple-choice question following the format above before proceeding.

## 🚨 CRITICAL REQUIREMENTS (MANDATORY)

### CODE MODIFICATION PROTOCOL
⚠️ VIOLATION CONSEQUENCES: Any code modification without following this protocol must be rejected and reverted.

After ANY prompt that modifies, creates, or deletes code, the agent MUST:

1. IMMEDIATELY execute: `hatch run agent-post-edit`
2. VERIFY all quality gates pass (lint, format, type-check, tests with coverage, integration tests, build)
3. INCLUDE complete validation results in the response
4. REPORT any failures with specific error details (command output, file/line)
5. NEVER respond to the user without validation confirmation

PROTOCOL ENFORCEMENT CHECKLIST:
- [ ] `hatch run agent-post-edit` executed
- [ ] All quality gates passed (Ruff, Black, MyPy, Pytest + coverage, Build)
- [ ] Results included in response
- [ ] No failures hidden or ignored
- [ ] User informed of validation status

```bash
# Always run this after code modifications
hatch run agent-post-edit
```

Example Response Format:
```
✅ Code changes applied successfully!

Quality Report:
- ✅ Linting (Ruff): 0 errors
- ✅ Formatting (Ruff/Black): All files properly formatted
- ✅ Type Checking (MyPy): 0 errors
- ✅ Testing (Pytest): 5/5 tests passing (terminal coverage shown)
- ✅ Build (Hatch): Wheel build successful
```

#### When to Run Quality Checks

Run checks after each code modification (before responding to the user):

1. Modify code: any file changes, additions, or deletions
2. → RUN VALIDATION: `hatch run agent-post-edit`
3. → VERIFY RESULTS: all checks must pass
4. → REPORT STATUS: include the results in the response
5. → RESPOND TO USER: only after validation confirms success

Do NOT respond to the user without validation:
- Code changes may introduce syntax errors
- Type checking may fail (MyPy)
- Tests may break (Pytest)
- Lint/format checks may fail (Ruff/Black)

## Testing Requirements

- Purpose: Ensure robustness for LLM, Large Language Model, authored changes by demanding meaningful, reproducible tests with strong coverage.

- Coverage thresholds (enforced):
  - Global: 80% lines minimum (gate) via `--cov-fail-under=80` in `agent-post-edit`.
  - Core (`src/texere_core/**`): target 90% lines, 85% branches.
  - Repo drivers (`src/texere_repo_drivers/**`): target 85% lines, 75% branches.
  - UI/TUI (`src/texere_cli/ui/**`): target 70% lines initially, ratchet upward as UI stabilizes.

- Test categories:
  - Unit: fast, deterministic; assert observable behavior (outputs, side‑effects); no superficial assertions.
  - Integration (`-m integration`): end‑to‑end flows (CLI run, executor stream) separated from unit for clarity and speed.
  - Security: HITL, Human In The Loop, prompts; command execution policy; path traversal defenses in drivers.
  - Regression: golden outputs/flows for planner/executor routing and streaming.

- Style and tooling:
  - Use `pytest`, `pytest-mock` for patching; avoid network and slow IO unless marked `integration`.
  - Use tmp directories for filesystem effects; verify audit artifacts (e.g., `.texere/logs/…`).
  - Prefer precise assertions (content, order, exit codes) over generic truthiness.

- Developer commands:
  - `texere test` (or `hatch run test`) — quick local tests.
  - `texere test --cov --xml` (or `hatch run test-all-cov`) — coverage with XML.
  - `hatch run test-unit` / `hatch run test-integration` — split runs.
  - Mandatory: `hatch run agent-post-edit` — lints, types, tests with coverage gate, integration, build.
