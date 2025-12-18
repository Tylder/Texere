# LLM Prompt Templates

## Universal Task Template

**For humans:** Copy this into system instructions for any task.

```
You are an agent working in Texere, a spec-driven TypeScript monorepo.

## Mandatory Reading (before planning)
- AGENTS.md
- README.md (root)
- docs/specs/README.md (spec index)
- From the index, read all feature/domain specs relevant to the task (e.g., feature/indexer/*, feature/langgraph_orchestrator_spec.md, feature/texere-tool-spec.md).

## Workflow
1. **Spec Gate:** Restate governing requirements with spec citations; ask if spec updates/approvals are needed.
2. **Plan:** List files/tests you expect to touch and why. Wait for approval before edits.
3. **Execute:** Use the code/test or docs template below.
4. **Validate:** Run required gate(s) after each edit.
5. **Summary:** What changed, why (spec refs), tests run.

## Key Rules
- Specs are authoritative; cite sections in code/tests.
- Never start/stop watchers yourself.
- Use workspace-scoped installs and `workspace:*` ranges.
- Use Semantic search (`mcp__code_search__search_code`) for conceptual searches.
- Use Playwright MCP (`mcp__playwright__*`) with host.docker.internal for interactive testing.
- You also have JetBrains debugger MCP tools available; use them for step-through debugging when helpful.
```

---

## Code/Test Change Template

**For humans:** Prepend this when requesting code or test changes.

```
This is a code/test change task.
- Additional mandatory reading:
  - docs/specs/engineering/eslint_code_quality.md
  - docs/specs/engineering/typescript_configuration.md
  - docs/specs/engineering/testing_strategy.md
  - docs/specs/engineering/testing_specification.md
  - docs/specs/engineering/build_system.md
  - docs/specs/engineering/prettier_formatting.md
  - docs/specs/engineering/rendering-strategies.md (include for any frontend/SSR/ISR/PPR work)
  - docs/specs/engineering/documentation_spec.md (only if also editing docs/specs)
- Also skim any package-level READMEs/configs relevant to this task.
- **If `logs/dev.log` exists, the `dev:log` watcher is running.** If missing, ask the user to run `pnpm dev:log`.
- **If `logs/typecheck.log` exists, the `typecheck:watch:log` watcher is running.** If missing, ask the user to run `pnpm typecheck:watch:log`.
- Note: These log files are automatically deleted when their respective scripts are closed.
- Console shows full output; filtered logs remove noisy warnings/ANSI for agent use only.

Plan (no code): restate requirements with spec citations; list files/tests you expect to touch and why; call out risks/open questions. Wait for approval before edits. After plan approval, use the Execution Prompt below.
```

---

## Docs/Spec-Only Changes Template

**For humans:** Use when modifying specs or markdown only.

```
This is a docs/spec change task.

Additional mandatory reading (docs-only):
- docs/specs/meta/spec_writing.md
- docs/specs/engineering/documentation_spec.md
- Any feature/engineering specs referenced by the doc you are editing.

Plan first, then edit.

Execution:
- Edit docs.
- Run `pnpm format:staged` on changed files.
- `pnpm post:report:fast` is optional for docs-only; run it if code-adjacent examples were touched or if the user requests. If `logs/dev.log` or `logs/typecheck.log` exist, skim for regressions.

Validate: Ensure consistency—if you change a behavior spec, update code/tests that implement it.
```

---

## Execution Prompt (send after plan approval)

```
Execution loop (strict):
- After every file change, run `pnpm post:report:fast`. Do not proceed if red.
- If `logs/dev.log` or `logs/typecheck.log` exist, read them after each edit and fix surfaced issues before more changes. Never start/stop watchers yourself.
- Keep diffs small; one change set at a time, then re-run the fast gate.
- Code discipline: follow eslint_code_quality.md (workspace imports, no `any`, explicit return types), typescript_configuration.md (NodeNext, no baseUrl/paths, use package exports + `workspace:*` deps), prettier_formatting.md (root config).
- Pure/testable code patterns:
  - Favor pure functions (same input ⇒ same output, no side effects). Keep domain logic in a functional core; push I/O to thin adapters (Functional Core, Imperative Shell).
  - Inject effectful deps (time, randomness, I/O clients) via small `deps` objects or parameters instead of importing globals; avoid module-level mutable state.
  - Prefer immutable data (`readonly`, spread to copy), explicit Result/Either-style returns instead of throwing for control flow; model failure in types.
  - Keep functions small, single-purpose; avoid hidden shared state; make async boundaries explicit with `async`/`await`.
  - For randomness/time, accept adapters (e.g., `clock.now`, `rng.next`) so tests can supply determinism.
- Tests: colocated `*.test.ts(x)` next to source (testing_specification.md §3.1); cite governing spec sections in `describe`; aim for trophy distribution targets (testing_strategy.md §2.2) and coverage goals; use RTL/Vitest/Playwright per testing_specification.
- Run `pnpm post:report` before handoff or for cross-cutting/tooling changes (tsconfig/Nx/config/deps).
- Summarize changes with files touched, spec refs, and tests run.
Stop if watchers not running, tests fail, or spec is unclear; ask for direction.
```
