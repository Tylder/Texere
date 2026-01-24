## 🚨 CRITICAL REQUIREMENTS (MANDATORY)

### **CODE MODIFICATION PROTOCOL**

**⚠️ VIOLATION CONSEQUENCES: Any code modification without following this protocol will be
rejected.**

**CRITICAL**: After **ANY** prompt that modifies, creates, or deletes code:

1. **IMMEDIATELY** execute `pnpm post:report:fast` (fast validation)
2. **VERIFY** all quality gates pass (all checks must succeed)
3. **INCLUDE** validation results in response if there are failures
4. **REPORT** any failures with specific error details
5. **NEVER** respond to user without validation confirmation

**Definition:**

- **Code changes** include edits to source, configs, scripts, build/test tooling, or any file
  outside `/docs`.
- **Docs-only changes** are limited to files under `/docs` and are **not** considered code changes.

**Docs-only validation:**

- Run `pnpm check:docs`

**VALIDATION PROTOCOL:**

**After single code change:**

- Run `pnpm post:report:fast` (format + lint:fix + typecheck + test)

**After major fixes or multiple steps:**

- Run `pnpm post:report` (full validation: format + lint:fix + typecheck + test:coverage + all
  checks)

---

## Project Structure

**Monorepo**: Nx workspace with two provider registry packages

- `@conduit/provider-registry` — core registry (models.dev, metadata, resolution, pure data)
- `@conduit/provider-registry-ai-sdk` — execution adapter (AI SDK, invoke/stream, ModelClient)
- Shared configs: `eslint-config`, `typescript-config`

**Colocated tests**: `.test.ts` files live alongside source code, not in separate `tests/`
directory.

---

## Tooling Stack (from Persona)

**Linting**: `oxlint` (fast Rust-based) + `eslint` (TS rules) — run in parallel

```bash
pnpm lint:fast    # oxlint only
pnpm lint         # oxlint & eslint (parallel)
pnpm lint:fix     # oxlint --fix && eslint --fix
```

**Formatting**: Prettier (cache enabled)

```bash
pnpm format       # write
pnpm format:check # check only
```

**Type checking**: TypeScript with strict project references

```bash
pnpm typecheck
```

**Testing**: Vitest (v8 coverage, 60% thresholds for now)

```bash
pnpm test                 # run once
pnpm test:watch          # watch mode
pnpm test:coverage       # with coverage
```

**Building**: tsc (via `tsc -b tsconfig.lib.json`)

```bash
pnpm build                # all packages
nx build provider-registry # single package
```

---

## User Interaction Guidelines

### Asking Questions

To reduce confusion and misunderstandings, when asking clarifying questions:

1. **Use numbered questions**: List multiple questions as `1.`, `2.`, `3.`, etc.
2. **Use lettered multi-choice answers**: Provide options as `A)`, `B)`, `C)`, etc.
3. **Recommended answer as A**: Always place the recommended option as choice A
4. **Include explanations**:
   - Explain each question clearly so the user understands what you're asking and why
   - Explain each answer option, not just label it
   - Explain why A is recommended

**Example:**

```
1. How should we handle authentication in the new service?
   A) Use JWT with refresh tokens (recommended—aligns with existing auth patterns in the codebase)
   B) Use session-based authentication (simpler but requires server state)
   C) Use API keys only (good for service-to-service, but lacks user-specific features)
   Why A: Our services already use JWT patterns; this maintains consistency across the codebase.
```

### Decision Points

Always ask before making decisions about:

- Project quality standards and validation requirements
- Configuration changes affecting the entire codebase
- Architecture decisions that affect the entire codebase
- Changes to coding conventions or style guides
- Modifications to development workflows or processes
- Any change that establishes new project standards or requirements

### Plan Requests

When asked for a "plan", provide discussion/analysis only. Require explicit approval before any code
modifications. Do not make any edits when plans are requested.

---

## Upstream Tracking (git subtree)

Vendored OpenCode lives at `packages/provider-registry/vendor/opencode/` via `git subtree`.

**Update workflow**:

```bash
git subtree pull --prefix packages/provider-registry/vendor/opencode upstream main
# Update UPSTREAM_OPENCODE_COMMIT in version file
# Run full test suite
pnpm test:coverage
# If breakage, fix wrappers/shims first (avoid patching vendor code)
# Release new version
```

**Guardrails**:

- `vendor/opencode/` is read-only (enforced by CI)
- `vendor-allowlist.json` lists exact consumed paths
- Modifications go in `src/` wrappers, not in `vendor/`

---

## Development Workflow

1. Make code changes
2. Run `pnpm format:fix` if format issues
3. Run `pnpm lint:fix` if lint issues
4. Run `pnpm test` to verify tests pass
5. Run `pnpm typecheck` to verify types
6. Run `pnpm build` to verify build succeeds
7. **Only then** respond to user with completion

**Never** commit or mark done without all quality gates passing.

---

## Serena MCP Usage Guide

Serena is an IDE-like coding toolkit providing semantic code retrieval and editing through language
servers. Unlike grep-based or file-reading approaches, Serena enables symbol-level operations (find,
refactor, navigate) across the codebase efficiently.

### When to Use Serena

**Best for:**

- Finding all references to a symbol across the codebase
- Refactoring symbols with confidence (rename, move, delete)
- Navigating complex codebases without reading entire files
- Understanding code relationships (call hierarchies, type hierarchies)
- Large or complex projects where token efficiency matters

### Core Serena Tools

**Symbol Finding & Navigation:**

- `find_symbol` — Search for symbols (functions, classes, methods) by name; supports
  partial/substring matching (no wildcards/regex—use `search_for_pattern` for complex patterns)
- `find_referencing_symbols` — Find all usages of a symbol across the codebase
- `get_symbols_overview` — Get a bird's-eye view of top-level symbols in a file (use before deep
  dives)

**Code Retrieval & Search:**

- `list_dir` — List files/directories (scoped search instead of reading entire trees)
- `search_for_pattern` — Search with regex patterns (use when `find_symbol` substring matching isn't
  enough)
- `read_memory` — Access project memories (architecture, conventions, known issues)

**Code Editing:**

- `replace_symbol_body` — Replace a symbol's entire definition (use after retrieving it via
  `find_symbol`)
- `insert_after_symbol` / `insert_before_symbol` — Insert code at symbol boundaries
- `rename_symbol` — Rename a symbol everywhere (language-server backed, not regex)

**Project Management:**

- `activate_project` — Set the active project before using other tools
- `write_memory` — Document architecture, conventions, gotchas for future sessions
- `list_memories` — View available project memories

### Workflow Pattern

1. **Activate project** — `activate_project` with the project path
2. **Check onboarding** — `check_onboarding_performed` to load project metadata if available
3. **Get overview** — `get_symbols_overview` on the target file to understand structure
4. **Find symbols** — Use `find_symbol` (by name pattern) or `find_referencing_symbols` (for usages)
5. **Retrieve** — `read_memory` for context (conventions, architecture) before editing
6. **Edit** — Use `replace_symbol_body`, `rename_symbol`, or insert tools
7. **Document** — `write_memory` for task continuations or decisions if approaching context limits

### Memory Best Practices

Memories live in `.serena/memories/` (one per file) and help with:

- **Architecture overviews** — System design, module relationships, patterns used
- **Development workflows** — Build commands, test procedures, deployment steps
- **Coding conventions** — Style, naming, documentation requirements
- **Known issues & gotchas** — Technical debt, workarounds, platform-specific issues
- **Task continuations** — Progress summaries for multi-session work

**When to create a memory:**

- Task approaching context limits → Create continuation memory with progress, decisions, next steps
- Complex codebase → Document architecture patterns and module relationships
- Repeated conventions → Write coding style guide once, reference always

**When to read a memory:**

- Before starting work on a file/module, list memories and load relevant ones
- Look for "architecture", "conventions", "workflow" keywords in memory names

### Practical Example: Finding & Refactoring

```
Goal: Rename function `validateInput` to `validateUserInput` everywhere

1. activate_project(".")
2. find_symbol("validateInput", ".", include_body=True)  // Get definition + usage count
3. find_referencing_symbols("validateInput", "src/utils.ts")  // See all call sites
4. rename_symbol("validateInput", "src/utils.ts", "validateUserInput")  // LSP-backed, safe rename
```

**Token efficiency:**

- Always use `find_symbol` + `get_symbols_overview` instead of reading entire files
- Use `list_memories` to offload context to persistent storage
- For very large tasks, create intermediate memories: `write_memory("progress_summary", ...)`

---

## Shared Configurations

All packages inherit from:

- `@repo/eslint-config` — base ESLint rules (strict, oxlint-compatible)
- `@repo/typescript-config/node-library.json` — strict TypeScript settings

Avoid overriding unless absolutely necessary. Document any deviations.

---

## Phase 0 (Current)

- Project skeleton with Nx monorepo ✓
- Lint, format, typecheck, test setup ✓
- Both packages scaffolded with stubs ✓
- Quality gates configured ✓

**Next**: Phase 1 (vendor OpenCode via git subtree)
