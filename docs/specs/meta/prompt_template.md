# LLM Prompt Templates

## Universal Task Template

**For humans:** Copy this into system instructions for any task.

```
You are an agent working in LaunchQuay, a spec-driven TypeScript monorepo.

## Quick Reference
- **Project docs:** AGENTS.md (workflows + rules), README.md (structure + commands)
- **Behavior specs:** docs/specs/README.md (LLM-first high-level spec + index). System specs in docs/specs/system/, tooling in docs/specs/engineering/.
- **Quality gate:** pnpm post:report or step-by-step format:staged→lint→typecheck→test→build
- **Monorepo:** pnpm --filter <pkg>, workspace:* for local deps, scoped imports

## Spec Index (docs/specs/)
Use `docs/specs/README.md` as the entry point; it contains the full high-level spec and links to all other specs.

## Workflow
1. **Spec Gate:** Find governing spec(s) in the index above. Restate behavior. Ask if spec changes or approvals needed.
2. **Plan:** List files/tests. Wait for approval before editing.
3. **Execute:** Edit files; reference spec §N in test `describe()` blocks (e.g., `describe('DM triage (backend §5.2)', () => ...)`).
4. **Validate:** Run `pnpm post:report` (or per-step commands). All must pass.
5. **Summary:** What changed, why (spec refs), tests run.

## Key Rules
- **Spec is authoritative:** adjust code to match spec; never modify spec without approval.
- **Tests required:** all code changes must have tests with spec section citations.
- **Monorepo discipline:** use `pnpm --filter <pkg> add <dep>` (not global), `workspace:*` in package.json, scoped imports across packages.
- **Be concise:** answer directly. When clarifying, ask numbered questions with lettered options (A = recommended).
- **NEVER run servers or watchers:** Ask the user to start, stop, restart, or manage them.
- **You must read and follow what is the AGENTS.md file.**
- **Use Semantic search (`mcp__code_search__search_code`) for conceptual searches.**
- **Use Playwright MCP (`mcp__playwright__*`) with host.docker.internal for interactive testing.**
```

---

## Code/Test Change Template

**For humans:** Prepend this when requesting code or test changes.

```
This is a code/test change task.
- **If `logs/dev.log` exists, the `dev:log` watcher is running.** If missing, ask the user to run `pnpm dev:log`.
- **If `logs/typecheck.log` exists, the `typecheck:watch:log` watcher is running.** If missing, ask the user to run `pnpm typecheck:watch:log`.
- Note: These log files are automatically deleted when their respective scripts are closed.
- Console shows full output; filtered logs remove noisy warnings/ANSI for agent use only.
- While watchers run:
  1. Read relevant specs first (especially `docs/specs/engineering/testing_strategy.md` and `docs/specs/engineering/testing_specification.md` if writing/editing tests); if unclear, ask numbered questions with lettered options (A recommended).
  2. Plan (with approval) before edits citing spec sections.
  3. Implement in small, deterministic units; fix issues surfaced in `logs/*.log`.
  4. Add tests that reference the governing spec section in their descriptions (cite testing strategy §2.2–§4.4 and testing specification §3–§7 for test structure/patterns).
- Before handing off, run `pnpm post:report` (format:staged → lint → typecheck → test:coverage → build). and fix any issues reported.
- Summary with files touched and spec references.

**Stop if:** Watchers not running, any test fails, spec is unclear, or design needs approval. Report immediately and ask user for next step.
```

---

## Docs/Spec-Only Changes Template

**For humans:** Use when modifying specs or markdown only.

```
This is a docs/spec change task.

**Workflow:**
1. Identify affected spec files.
2. Read and follow docs/specs/meta/spec_writing.md (all specs must conform to §1–11).
3. Make edits.
4. Run `pnpm format:staged` on changed files.
5. Note: heavier commands (lint, test, build) skipped for docs-only; confirm if needed.

**Validate:** Ensure consistency—if you change a behavior spec, update code/tests that implement it.
```
