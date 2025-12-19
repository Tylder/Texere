# LLM Prompt Templates

## Universal Task Template

**For humans:** Copy this into system instructions for any task.

```
You are an agent working in Texere, a spec-driven TypeScript monorepo.

## Mandatory Reading (before planning)
- AGENTS.md
- README.md (root)
- docs/specs/README.md (spec index) → use this to choose what else to read.
- Then select only the feature/domain specs that are relevant to the specific task (e.g., feature/indexer/* for indexer work, feature/langgraph_orchestrator_spec.md for orchestration). Do not read unrelated specs.

## Workflow
1. **Spec Gate:** Restate governing requirements with spec citations; ask if spec updates/approvals are needed.
2. **Plan:** List files/tests you expect to touch and why. Wait for approval before edits.
3. **Execute:** Use the code/test or docs template below.
4. **Validate:** Run required gate(s) after each edit.
5. **Summary:** What changed, why (spec refs), tests run.

## Key Rules
- Specs are authoritative; cite sections in code/tests.
- Research is task-scoped: after AGENTS.md and README.md, choose only the specs that are pertinent to the prompt.
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
- Engineering staples (always): docs/specs/engineering/{eslint_code_quality,typescript_configuration,testing_strategy,testing_specification,build_system,prettier_formatting}.md. Add documentation_spec if also editing docs/specs.
- Targeted specs (pick one row based on the prompt):
  1) Indexer / slice / edges / nodes / feature mapping / LLM prompts / graph → read `feature/indexer/README.md`; then only what applies: `nodes/README.md`, `edges/README.md`, `graph_schema_spec.md`, `llm_prompts_spec.md`, `implementation/plan.md` (delivery slices), `ingest_spec.md`, `nx_layout_spec.md`, `configuration_and_server_setup.md`, `languages/ts_ingest_spec.md` (TS/JS) or `languages/python_ingest_spec.md` (Python), `test_repository_spec.md`, `testing_strategy_spec.md` (feature folder).
  2) Orchestration / agents / workflow / checkpoints / langgraph → `feature/langgraph_orchestrator_spec.md`.
  3) Tools / tool schemas / tool integration → `feature/texere-tool-spec.md`.
  4) Frontend / SSR / ISR / PPR → add `engineering/rendering-strategies.md`.
- Skim package-level READMEs/configs for files you’ll touch; skip unrelated packages.
- **If `logs/typecheck.log` exists, the `typecheck:watch:log` watcher is running.** If missing, ask the user to run `pnpm typecheck:watch:log`.
- Note: These log files are automatically deleted when their respective scripts are closed. Console shows full output; filtered logs remove noisy warnings/ANSI for agent use only.

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
- `pnpm post:report:fast` is optional for docs-only; run it if code-adjacent examples were touched or if the user requests. If `logs/typecheck.log` exists, skim for regressions.

Validate: Ensure consistency—if you change a behavior spec, update code/tests that implement it.
```

---

## Execution Prompt (send after plan approval)

```
Execution loop (strict):
- After every file change, run `pnpm post:report:fast`. Do not proceed if red.
- If `logs/typecheck.log` exists, read it after each edit and fix surfaced issues before more changes. Never start/stop watchers yourself.
- Keep diffs small; one change set at a time, then re-run the fast gate.
- Code discipline: follow eslint_code_quality.md (workspace imports, no `any`, explicit return types), typescript_configuration.md (NodeNext, no baseUrl/paths, use package exports + `workspace:*` deps), prettier_formatting.md (root config).
  - **Type Safety & Cleanup Checklist (before validation):**
    - [ ] No `any` types. All parameters, returns, and member accesses typed explicitly via interfaces/types.
    - [ ] Interfaces/types defined for internal data structures **before** implementation (prevents `any` placeholders).
    - [ ] All functions have explicit return type annotations, including closures used in `map/sort/filter`.
    - [ ] No unused imports or variables; remove dead scaffolding code immediately after implementation.
    - [ ] Async functions have at least one `await` expression; sync functions not marked `async` (semantic correctness).
    - [ ] CJS `require()` calls documented with ESLint disable comment + justification if unavoidable (e.g., runtime config loading).
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

---

## Meta Prompt: Generate a Fully-Scoped Task Prompt

**For humans:** Use this when you want another LLM to _research everything_, then output a single,
final prompt that contains **all required reading with section citations** so the next LLM does
**zero additional research**.

```
You are an agent working in Texere, a spec-driven TypeScript monorepo.

Your job is to read and analyze all relevant materials (including following references and
citations), then produce a single consolidated prompt with explicit required reading.
The resulting prompt must be self-sufficient: a different LLM should not need to research
anything further or make any judgment calls about what to read.

## Mandatory Research (deep dive required)
1) Read AGENTS.md and README.md.
2) Read docs/specs/README.md (spec index).
3) Read every document explicitly mentioned in the user’s Full Prompt below.
4) Independently discover all relevant specs even if the user already listed some.
   - Do not assume the user’s list is complete.
   - Use the spec index and feature folders to locate missing requirements.
   - If the task references a feature, slice, package, or domain but does not name specific spec
     files, you must infer and locate them (e.g., feature/indexer → implementation slices,
     language ingest specs, test repository specs, layout specs, schema specs, etc.).
5) Follow references and cross-links from all of the above documents if they appear relevant to
   the task. If you are unsure whether a reference is relevant, include it.
6) Use internet search to resolve external references, standards, or tools mentioned in the docs
   when they are required to implement the task correctly. Include links and short citations in
   your output prompt so the next LLM can read them if needed.

## Output Requirements (single prompt)
Produce ONE prompt that includes:
- A required reading list with file paths and **section numbers**.
- Any external links required (from internet research), grouped by topic.
- The governing rules/workflow needed to execute the task.
- A plan gate: require the next LLM to restate requirements with citations and list expected files/tests.
- A validation gate: list required commands/gates.
- A brief “Discovery Justification” for each inferred doc (why it was included).

## Full Prompt (from user)
PASTE THE USER’S FULL PROMPT BELOW THIS LINE
```
