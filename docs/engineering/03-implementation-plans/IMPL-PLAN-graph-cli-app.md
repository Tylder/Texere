---
type: IMPL-PLAN
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-cli-app
summary_short: >-
  Extensible interactive CLI that grows with graph system—v0.1 has repo ingestion, v1.0+ adds
  assertion commands
summary_long: >-
  Coordinates implementation of an interactive CLI application designed to grow alongside graph
  features. v0.1 implements repo ingestion commands. Extensible command pattern means v1.0 can add
  assertion commands without architectural rewrites. Uses Enquirer for prompts, command dispatcher
  for routing, Ink+Pastel for terminal UI.
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
      lines: [98, 122]
      summary:
        'Implement extensible interactive CLI that grows with graph features. v0.1 has repo
        ingestion. v1.0+ adds assertion commands using same pattern.'
      token_est: 168
    - title: 'Scope'
      lines: [124, 152]
      summary:
        'Implement extensible interactive CLI that grows with graph features. v0.1 includes repo
        ingestion.'
      token_est: 164
    - title: 'Preconditions'
      lines: [154, 161]
      token_est: 55
    - title: 'Milestones'
      lines: [163, 379]
      token_est: 875
      subsections:
        - title: 'Milestone 1: App Scaffolding & Setup'
          lines: [165, 185]
          token_est: 95
        - title: 'Milestone 2: REPL Loop & Command Dispatcher'
          lines: [187, 260]
          token_est: 281
        - title: 'Milestone 3: Command Implementations'
          lines: [262, 305]
          token_est: 167
        - title: 'Milestone 4: Ink UI Components'
          lines: [307, 353]
          token_est: 214
        - title: 'Milestone 5: Integration & Testing'
          lines: [355, 379]
          token_est: 117
    - title: 'Total Effort: ~18 hours (2.5 days)'
      lines: [381, 389]
      token_est: 30
    - title: 'Technology Stack'
      lines: [391, 409]
      token_est: 71
    - title: 'Implementation Notes'
      lines: [411, 464]
      token_est: 175
    - title: 'Success Metrics'
      lines: [466, 475]
      token_est: 64
    - title: 'Risk Register'
      lines: [477, 486]
      token_est: 110
    - title: 'Exit Criteria (Phase 1)'
      lines: [488, 500]
      token_est: 98
    - title: 'Assumptions'
      lines: [502, 509]
      token_est: 49
    - title: 'Future Enhancements (v2.0+)'
      lines: [511, 520]
      token_est: 46
    - title: 'Related Documents'
      lines: [522, 526]
      token_est: 12
---

# IMPL-PLAN-graph-cli-app

---

## TLDR

Summary: Implement extensible interactive CLI that grows with graph features. v0.1 has repo
ingestion. v1.0+ adds assertion commands using same pattern.

**What:** REPL-based CLI for personal testing of graph features as they're implemented.

**Why:** Give hands-on testing tool during development. As features are added to graph libraries,
add CLI commands without architectural rewrites.

**How:** Extensible command pattern: new commands = handler + registration. REPL and dispatcher stay
the same.

**Philosophy:** CLI grows with the graph system. v0.1 ingests repos. v1.0 will add assertions. Same
extensible pattern.

**Status:** Draft

**Critical path:** M1 (setup) → M2 (REPL + dispatcher) → M3 (v0.1 commands) → M4 (Ink UI) → M5
(tests)

**Risk:** If command pattern is rigid, v1.0 features will require rewrites. Mitigate via careful
dispatcher design in M2.

---

## Scope

Summary: Implement extensible interactive CLI that grows with graph features. v0.1 includes repo
ingestion.

**Includes (v0.1):**

- Nx app structure (`apps/graph-cli-app/`)
- Entry point: `pnpm dev` starts REPL
- Extensible command dispatcher (how commands are registered/executed)
- v0.1 commands: `ingest`, `dump`, `trace`, `diff`, `project`, `help`, `exit`
- GraphCLI class (manages in-memory store)
- Ink+Pastel components for terminal output
- Error handling and debug mode

**Includes (Design for future):**

- Clear pattern for adding v1.0 commands (assertions, validation)
- GraphCLI methods stubbed for future features
- Command registration system that works for new commands

**Excludes:**

- v1.0+ assertion commands (added later when assertions are implemented)
- Automated test framework or CI/CD workflows
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

- `src/cli.ts` — GraphCLI class definition
- `src/repl.ts` — Main REPL loop using Enquirer
- `src/dispatcher.ts` — Command parser and router
- `src/types.ts` — Command interface and result types
- Tests: `unit/cli.test.ts`, `unit/repl.test.ts`, `unit/dispatcher.test.ts`

**Code Structure:**

```typescript
// src/cli.ts
class GraphCLI {
  private store: GraphStore;

  async ingestRepo(url: string, options?: { commit?: string; branch?: string }) {
    // Call graph-ingest package, populate store
  }

  getNodes() {
    /* ... */
  }
  getEdges() {
    /* ... */
  }
  trace(nodeId: string, depth?: number) {
    /* ... */
  }
  diff(snap1, snap2) {
    /* ... */
  }
  async runProjection(name: string) {
    /* ... */
  }
  dumpToJSON() {
    /* ... */
  }
  dumpToText() {
    /* ... */
  }
}

// src/repl.ts
async function startRepl() {
  const cli = new GraphCLI();

  while (true) {
    const input = await promptUser('> ');
    const [command, args, flags] = parseInput(input);

    try {
      const result = await dispatcher.execute(command, args, flags, cli);
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
