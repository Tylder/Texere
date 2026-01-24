---
type: IMPL-PLAN
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-cli-app
summary_short: >-
  Simple interactive CLI implementation: REPL loop with 7 commands for graph testing
summary_long: >-
  Coordinates implementation of a straightforward interactive CLI application with Enquirer for
  prompts, Commander for argument parsing, and Ink+Pastel for terminal UI rendering. Single phase
  (v0.1) implementation focused on core commands: ingest, dump, trace, diff, project, help, exit.
keywords:
  - implementation
  - planning
  - cli
coordinates:
  - SPEC-graph-cli-app
covers:
  - SPEC-graph-cli-app
depends_on:
  - SPEC-graph-system-vertical-slice-v0-1
related:
  - REQ-graph-system-graph-system-architecture
index:
  sections:
    - title: 'TLDR'
      lines: [92, 109]
      summary: 'Implement interactive CLI in single phase (v0.1) with 7 core commands.'
      token_est: 114
    - title: 'Scope'
      lines: [111, 131]
      summary: 'Implement interactive CLI with 7 commands and Ink rendering.'
      token_est: 103
    - title: 'Preconditions'
      lines: [133, 140]
      token_est: 55
    - title: 'Milestones'
      lines: [142, 326]
      token_est: 769
      subsections:
        - title: 'Milestone 1: App Scaffolding & Setup'
          lines: [144, 164]
          token_est: 95
        - title: 'Milestone 2: REPL Loop & Command Dispatcher'
          lines: [166, 207]
          token_est: 175
        - title: 'Milestone 3: Command Implementations'
          lines: [209, 252]
          token_est: 167
        - title: 'Milestone 4: Ink UI Components'
          lines: [254, 300]
          token_est: 214
        - title: 'Milestone 5: Integration & Testing'
          lines: [302, 326]
          token_est: 117
    - title: 'Total Effort: ~18 hours (2.5 days)'
      lines: [328, 336]
      token_est: 30
    - title: 'Technology Stack'
      lines: [338, 356]
      token_est: 71
    - title: 'Implementation Notes'
      lines: [358, 411]
      token_est: 175
    - title: 'Success Metrics'
      lines: [413, 422]
      token_est: 64
    - title: 'Risk Register'
      lines: [424, 433]
      token_est: 110
    - title: 'Exit Criteria (Phase 1)'
      lines: [435, 447]
      token_est: 98
    - title: 'Assumptions'
      lines: [449, 456]
      token_est: 49
    - title: 'Future Enhancements (v2.0+)'
      lines: [458, 467]
      token_est: 46
    - title: 'Related Documents'
      lines: [469, 473]
      token_est: 12
---

# IMPL-PLAN-graph-cli-app

---

## TLDR

Summary: Implement interactive CLI in single phase (v0.1) with 7 core commands.

**What:** REPL-based CLI for manual graph testing using Enquirer, Commander, and Ink.

**Why:** Give developers a hands-on tool for exploring graph features without writing code.

**How:** Command loop → parse input → execute operation → render output → loop

**Status:** Draft

**Critical path:** M1 (setup) → M2 (REPL loop) → M3 (commands) → M4 (Ink UI) → M5 (tests)

**Risk:** If Enquirer/Ink have rendering bugs, CLI experience suffers. Mitigate via early
prototyping.

---

## Scope

Summary: Implement interactive CLI with 7 commands and Ink rendering.

**Includes:**

- Nx app structure (`apps/graph-cli-app/`)
- Entry point: `pnpm dev` starts REPL
- 7 commands: `ingest`, `dump`, `trace`, `diff`, `project`, `help`, `exit`
- Ink+Pastel components for output
- Command parsing and argument validation
- Error handling and debug mode

**Excludes:**

- Scenario registry or automated test framework
- Batch execution or CI/CD workflows
- Database persistence or storage backends
- Web UI or API server

---

## Preconditions

- [ ] Graph v0.1 packages implemented: graph-core, graph-store, graph-ingest, graph-projection
- [ ] All v0.1 library tests passing
- [ ] Nx workspace configured for new `apps/` package
- [ ] Dependencies available: enquirer, commander, ink, pastel, react

---

## Milestones

### Milestone 1: App Scaffolding & Setup

**Goal:** Create app structure and configure tooling.

**Deliverables:**

- `apps/graph-cli-app/` directory with standard Nx structure
- `package.json` with dependencies
- `tsconfig.json`, `vitest.config.ts`, `.eslintrc`
- Entry point: `src/index.ts`, `src/cli.ts`
- Dev script: `pnpm -C apps/graph-cli-app dev`

**Verification:**

- [ ] App compiles without errors
- [ ] `pnpm -C apps/graph-cli-app dev` starts without crashing
- [ ] Can import from library packages

**Effort estimate:** 2 hours

---

### Milestone 2: REPL Loop & Command Dispatcher

**Goal:** Implement main interactive loop and command routing.

**Deliverables:**

- `src/repl.ts` — Main REPL loop using Enquirer
- `src/dispatcher.ts` — Command parser and router
- `src/types.ts` — Command interface and result types
- Tests: `unit/repl.test.ts`, `unit/dispatcher.test.ts`

**Code Structure:**

```typescript
// src/repl.ts
async function startRepl() {
  const app = new GraphApp(store);

  while (true) {
    const input = await promptUser('> ');
    const [command, args, flags] = parseInput(input);

    try {
      const result = await dispatcher.execute(command, args, flags, app);
      renderOutput(result);
    } catch (err) {
      renderError(err);
    }
  }
}
```

**Verification:**

- [ ] REPL loop starts and accepts input
- [ ] Input parsing handles commands and flags
- [ ] Command dispatcher routes to correct handler
- [ ] Graceful handling of invalid input

**Effort estimate:** 3 hours

---

### Milestone 3: Command Implementations

**Goal:** Implement all 7 commands.

**Deliverables:**

- `src/commands/ingest.ts` — `ingest repo <url>`
- `src/commands/dump.ts` — `dump [--format]`
- `src/commands/trace.ts` — `trace <node-id> [--depth]`
- `src/commands/diff.ts` — `diff <snap1> <snap2>`
- `src/commands/project.ts` — `project <name>`
- `src/commands/help.ts` — `help [command]`
- `src/commands/exit.ts` — `exit`
- `src/commands/index.ts` — Command registry
- Tests: `unit/commands.test.ts`

**Command Signatures:**

```typescript
interface Command {
  name: string;
  description: string;
  usage: string;
  execute(args: string[], flags: Record<string, any>, app: GraphApp): Promise<CommandResult>;
}

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: Error;
}
```

**Verification:**

- [ ] All 7 commands parse arguments correctly
- [ ] Commands execute without crashing
- [ ] Error messages are helpful
- [ ] Help text is complete and accurate

**Effort estimate:** 6 hours

---

### Milestone 4: Ink UI Components

**Goal:** Render outputs with beautiful terminal UI.

**Deliverables:**

- `src/ui/components/Box.tsx` — Bordered box container
- `src/ui/components/ProgressBox.tsx` — For ingest progress
- `src/ui/components/StateBox.tsx` — For dump output
- `src/ui/components/TraceBox.tsx` — For trace output
- `src/ui/components/DiffBox.tsx` — For diff output
- `src/ui/components/ProjectionBox.tsx` — For projection results
- `src/ui/render.ts` — Helpers for rendering components
- Tests: `unit/ui.test.ts` (snapshot tests)

**Component Examples:**

```typescript
// src/ui/components/ProgressBox.tsx
export const ProgressBox: React.FC<{
  title: string;
  steps: Array<{ icon: string; text: string; duration?: number }>;
  success: boolean;
  totalDuration: number;
}> = ({ title, steps, success, totalDuration }) => (
  <Box borderStyle="rounded" borderColor={success ? 'green' : 'red'}>
    <Text bold>{title}</Text>
    {steps.map(step => (
      <Text key={step.text}>{step.icon} {step.text}</Text>
    ))}
    <Text color={success ? 'green' : 'red'}>
      {success ? '✓' : '✗'} {totalDuration}ms
    </Text>
  </Box>
);
```

**Verification:**

- [ ] All components render without errors
- [ ] Snapshot tests pass
- [ ] Colors and borders display correctly
- [ ] Components integrate with command outputs

**Effort estimate:** 3 hours

---

### Milestone 5: Integration & Testing

**Goal:** Test REPL with real workflows.

**Deliverables:**

- `unit/` tests for all modules (fixtures, commands, UI)
- `integration/` tests for workflows (ingest → dump → project)
- Manual testing guide

**Test Coverage:**

- [ ] Unit: 80%+ coverage
- [ ] Integration: Happy path + error cases
- [ ] Manual: Verify REPL feels good to use

**Verification:**

- [ ] `pnpm -C apps/graph-cli-app test` passes
- [ ] Coverage >80%
- [ ] REPL is responsive and intuitive

**Effort estimate:** 4 hours

---

## Total Effort: ~18 hours (2.5 days)

- M1: 2h
- M2: 3h
- M3: 6h
- M4: 3h
- M5: 4h

---

## Technology Stack

**CLI Framework:**

- **Enquirer** v2.4.0 — Interactive prompts
- **Commander** v12.0.0 — Argument parsing (for --flags)

**Terminal UI:**

- **Ink** v5.0.0 — React rendering to terminal
- **Pastel** v1.0.0 — Terminal colors
- **React** v18.0.0 — Component framework

**Testing:**

- **Vitest** v1.0.0 — Test runner
- **@testing-library/react** — Component testing

---

## Implementation Notes

### REPL Loop Architecture

```
User Input
    ↓
Parse (command, args, flags)
    ↓
Validate Arguments
    ↓
Dispatch to Command Handler
    ↓
Execute (uses GraphApp)
    ↓
Render Output (via Ink)
    ↓
Loop
```

### Error Handling Strategy

- Invalid command → Show usage
- Missing args → Show arg requirements
- Runtime error → Show error message + suggest `--debug` for details
- `--debug` flag → Full stacktrace + verbose logging

### State Management

Single GraphApp instance lives for the session:

```typescript
const app = new GraphApp(inMemoryStore);

// After ingest:
app.store.nodes.length; // 47

// Commands query/manipulate same app instance
// On exit: discard all state
```

### Command Parsing

Use Commander-like parsing:

```bash
> ingest repo https://github.com/foo/bar --commit v1.0
  command: "ingest"
  subcommand: "repo"
  args: ["https://github.com/foo/bar"]
  flags: { commit: "v1.0" }
```

---

## Success Metrics

- [ ] All 7 commands work end-to-end
- [ ] REPL is responsive (<500ms per command)
- [ ] Outputs are readable and beautiful
- [ ] Error messages are helpful
- [ ] Code coverage >80%
- [ ] Developer feedback is positive

---

## Risk Register

| Risk                          | Probability | Impact | Mitigation                          |
| ----------------------------- | ----------- | ------ | ----------------------------------- |
| Enquirer/Ink rendering bugs   | Medium      | High   | Prototype early, test across shells |
| Slow ingest operation         | Low         | Medium | Cache cloned repos, set timeout     |
| Confusing command syntax      | Medium      | High   | Document with examples, good help   |
| Memory leaks on long sessions | Low         | Medium | Monitor with --debug, add cleanup   |

---

## Exit Criteria (Phase 1)

All of the following must pass:

- [ ] `pnpm -C apps/graph-cli-app dev` starts REPL successfully
- [ ] All 7 commands work with valid input
- [ ] Invalid input shows helpful error messages
- [ ] `pnpm -C apps/graph-cli-app test` passes
- [ ] Coverage >80%
- [ ] User can ingest a real repo and explore it
- [ ] README documents all commands with examples

---

## Assumptions

- Graph v0.1 packages are complete and tested
- Enquirer/Commander/Ink are stable and well-maintained
- In-memory graph store is sufficient for v0.1 (no persistence needed)
- Developers have basic CLI familiarity (comfortable with terminals)

---

## Future Enhancements (v2.0+)

- Script file execution (`ingest-and-project.script`)
- Data persistence (save/load sessions)
- Advanced queries (GraphQL-like syntax)
- Database backend integration
- Web UI mirror
- Interactive node exploration (arrow keys, search)

---

## Related Documents

- SPEC-graph-cli-app.md
- REQ-graph-system-graph-system-architecture.md
- SPEC-graph-system-vertical-slice-v0-1.md
