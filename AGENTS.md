# Repository Guide for LLM Agents

## Read First

- Start with `README.md` for setup, commands, and repo layout.
- Specs entrypoint: `docs/specs/README.md` (LLM-first high-level spec + index).
  `docs/specs/high_level_spec.md` is only a stub for legacy links.

## Development Workflow (fast feedback)

- **NEVER attempt to run, start, stop, or restart servers or watchers.** Ask the user to manage
  them.
- User runs one watcher for feature work:
  - `pnpm typecheck:watch:log` – type checking; writes filtered logs to `logs/typecheck.log`.
- **If `logs/typecheck.log` exists, the `typecheck:watch:log` watcher is running.** If missing, ask
  the user to run `pnpm typecheck:watch:log`.
- Note: These log files are automatically deleted when their respective scripts are closed.
- After adding, moving, or renaming a project, run `nx sync` to refresh Nx + TypeScript references
  (keeps root `tsconfig.json` and IDE graph accurate).
- Console shows full output; filtered logs remove noisy warnings/ANSI for agent use only.
- While watchers run:
  1. Read relevant specs first; if unclear, ask numbered questions with lettered options (A
     recommended).
  2. Plan steps citing spec sections.
  3. Implement in small, deterministic units; fix issues surfaced in `logs/*.log`.
  4. Add tests that reference the governing spec section in their descriptions.
  5. After every file you modify (even within a batch), run `pnpm post:report:fast` for quick
     feedback (format + oxlint + typecheck + test coverage; ~30s); proceed only when it’s green.
- End of feature/section: run `pnpm post:report` for full validation (format + lint + typecheck +
  test:coverage + build; ~60s) and fix any issues reported.

## Working Style

- Prefer workspace-scoped installs: `pnpm --filter <package> add <dep>`.
- Import shared code via aliases like `@repo/ui`.
- Keep code, specs, and docs in sync; update `README.md` when workflows change.
- Add new env vars to `.env.example`; never commit secrets.

## Testing

**CRITICAL: Always consult testing specs when writing or editing tests.**

- **Testing Strategy** (`docs/specs/engineering/testing_strategy.md`): High-level philosophy,
  testing trophy distribution (§2.2), what to test by level (§4.1–4.4)
- **Testing Specification** (`docs/specs/engineering/testing_specification.md`): Detailed setup,
  colocated patterns (§3.1), vitest config (§3.2–3.5), coverage targets (§7.1–7.2)
- **Distribution targets**: Unit 60-75% (§2.2.1), Integration 15-25% (§2.2.2), E2E 5-10% (§2.2.3)
- **Test placement**: Colocated `*.test.tsx` in same directory as source (§3.1.1), NOT `__tests__/`
  folders
- **Test structure**: Reference spec section in test description (e.g.,
  `describe('Button (testing_specification §3.6.1)', () => ...)`)
- Vitest with globals + jsdom; React Testing Library for components; Playwright for E2E
- For new packages, wire `test` and `test:coverage` scripts so Nx can fan out

## Git Hooks

- Husky pre-commit runs `pnpm format:staged`; keep it fast and non-interactive.

## Spec Discipline

- Specs are authoritative. If code and spec diverge, change code (or update spec only if
  instructed).
- Spec-first workflow: read spec → plan → implement → test referencing spec sections.
- Cite sources in specs and code comments where helpful for verification.
- For concept overview: see `docs/specs/README.md` (high-level spec + role-based reading orders);
  for implementation: domain specs in `docs/specs/{system,engineering,meta}/`.
- **When writing or editing tests**: ALWAYS read `testing_strategy.md` (§2.2–§4.4) and
  `testing_specification.md` (§3–§7) first. Cite distribution targets and structure in test
  descriptions.

## Local Development Site Access (Docker/MCP)

- The site runs on `localhost:3000` in WSL2.
- When accessing from within Docker containers (e.g., Playwright MCP), use
  `http://host.docker.internal:3000/` instead of `localhost:3000`.
- This resolves to the WSL2 host from inside the container's network namespace.

### Taking Screenshots

- Use Playwright MCP to navigate and screenshot the running site.
- Screenshots save to `/tmp/playwright-output/` (Playwright's restricted output directory).
- Copy screenshots to repo root with:
  `cp /tmp/playwright-output/<filename>.png <repo-root>/<filename>.png`
- Or use Bash to copy directly after taking the screenshot.

## Code Search Tools Guide

### Semantic Search (`mcp__code_search__search_code`)

**When to use:** For conceptual or functional searches when exact code patterns are unknown.

**Examples:**

- "How does authentication work?" → search for `authentication` concepts
- "Where is the referral tracking logic?" → find code related to `referral tracking`
- "Find all places we handle theme switching" → search `theme switching implementation`

**Usage:**

- Minimal: `search_code("authentication")`
- Full: `search_code("authentication", k=10, file_pattern="**/*.ts", enrich_context=true)`
- Parameters:
  - `query`: Natural-language description (required)
  - `k`: Number of results (default: 5; max useful ~20)
  - `file_pattern`: Restrict to file types (e.g., `**/*.ts`, `apps/web/**/*.tsx`)
  - `enrich_context`: Include surrounding code context (default: true; set false for 10x speed if
    context not needed)
  - `search_mode`: `"auto"` (default) or `"keyword"`

**Returns:** Ranked results with file paths, line numbers, similarity scores, and code snippets.

### Grep (`Grep`)

**When to use:** For exact text matches, specific function/variable names, or regex patterns.

**Examples:**

- Find all calls to `handleAuth()` → `Grep("handleAuth")`
- Find error handling in TypeScript files → `Grep("throw new", glob="**/*.ts")`
- Find TODO comments in a specific directory → `Grep("TODO:", path="src/components")`

**Usage:**

- Exact string: `Grep("functionName", literal=true)`
- Regex pattern: `Grep("ERROR:\\s+\\w+", caseSensitive=true)`
- Scoped search: `Grep("export interface", path="src/types")`

**Parameters:**

- `pattern`: Regex or literal string (required)
- `path` or `glob`: Narrow search scope (use one or the other)
- `literal`: Treat pattern as exact string (default: false)
- `caseSensitive`: Case-sensitive match (default: false)

**Returns:** Up to 100 matches across files; results grouped by file with line numbers.

### Finder (`finder`)

**When to use:** For multi-step searches requiring semantic understanding across multiple areas.

**Examples:**

- "Find every place we validate JWT authentication headers"
- "Where do we handle file-watcher retry logic?"
- "Find all API error response builders"

**Usage:**

- Define precise engineering question with concrete artifacts/patterns
- Agent searches multiple areas and correlates results
- `finder("Find every place we build an HTTP error response")`

**Parameters:**

- `query`: Precise engineering request (not vague exploration)

**Decision Tree:**

```
Search task?
├─ Know exact file/function name?
│  └─ Use Grep (fast, literal match)
├─ Know exact code pattern (regex)?
│  └─ Use Grep with regex
├─ Need to understand functionality/behavior?
│  └─ Use Semantic Search (search_code)
└─ Need to correlate multiple code areas?
   └─ Use Finder (multi-step, semantic)
```

### Playwright MCP (`mcp__playwright__*`)

**When to use:** To interact with the running web app (navigate, click, fill forms, take
screenshots).

**Prerequisites:**

1. Site must be running on `localhost:3000` (or `http://host.docker.internal:3000/` in Docker)
2. Use `http://host.docker.internal:3000/` when inside Docker containers (Playwright MCP)
3. Use `localhost:3000` when running locally

**Common Tasks:**

| Task                 | Method                     | Example                                                     |
| -------------------- | -------------------------- | ----------------------------------------------------------- |
| Navigate to page     | `browser_navigate`         | `navigate("http://host.docker.internal:3000/contact")`      |
| Take screenshot      | `browser_take_screenshot`  | Capture current viewport or full page                       |
| Click element        | `browser_click`            | Click button, link, or interactive element                  |
| Fill form            | `browser_fill_form`        | Set field values before submission                          |
| Hover element        | `browser_hover`            | Trigger hover states or tooltips                            |
| Take snapshot        | `browser_snapshot`         | Accessibility snapshot (better than screenshot for actions) |
| Wait for text        | `browser_wait_for`         | Wait for content to appear or disappear                     |
| Drag & drop          | `browser_drag`             | Drag between two elements                                   |
| Select option        | `browser_select_option`    | Choose from dropdowns                                       |
| Type text            | `browser_type`             | Type into input with optional slow typing for handlers      |
| Press key            | `browser_press_key`        | Keyboard actions (Enter, Escape, ArrowDown, etc.)           |
| Get console messages | `browser_console_messages` | Debug console errors or logs                                |
| Get network requests | `browser_network_requests` | Inspect XHR/fetch calls                                     |
| Handle dialog        | `browser_handle_dialog`    | Accept/reject alerts, confirms, prompts                     |

**Usage Pattern:**

```
1. Use browser_snapshot() to see current page state
2. Identify element using accessibility labels or ref from snapshot
3. Perform action (click, fill, type, etc.)
4. Take screenshot or snapshot to verify result
5. Repeat until test/verification complete
```

**Key Points:**

- Always use `http://host.docker.internal:3000/` inside Docker (not `localhost:3000`)
- Screenshots save to `/tmp/playwright-output/` (container-restricted directory)
- Copy screenshots to repo with:
  `cp /tmp/playwright-output/<filename>.png <repo-root>/<filename>.png`
- Use `browser_snapshot()` for interaction planning (accessibility-aware); use
  `browser_take_screenshot()` for visual verification
- Element refs from snapshot are exact; use them in actions for reliability
