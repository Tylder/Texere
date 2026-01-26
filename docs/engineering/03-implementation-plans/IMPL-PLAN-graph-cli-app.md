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
related_reference:
  - REFERENCE-agent-knowledge-requirements
index:
  sections:
    - title: 'TLDR'
      lines: [113, 137]
      summary:
        'Implement extensible interactive CLI that grows with graph features. v0.1 has repo
        ingestion. v1.0+ adds assertion commands using same pattern.'
      token_est: 168
    - title: 'Scope'
      lines: [139, 167]
      summary:
        'Implement extensible interactive CLI that grows with graph features. v0.1 includes repo
        ingestion.'
      token_est: 166
    - title: 'Preconditions'
      lines: [169, 176]
      token_est: 55
    - title: 'Milestones'
      lines: [178, 545]
      token_est: 1477
      subsections:
        - title: 'Milestone 1: App Scaffolding & Setup'
          lines: [180, 281]
          token_est: 385
        - title: 'Milestone 2: REPL Loop & Command Dispatcher'
          lines: [283, 423]
          token_est: 543
        - title: 'Milestone 3: Command Implementations'
          lines: [425, 468]
          token_est: 172
        - title: 'Milestone 4: Ink UI Components'
          lines: [470, 516]
          token_est: 214
        - title: 'Milestone 5: Integration & Testing'
          lines: [518, 545]
          token_est: 163
    - title: 'Total Effort: ~18 hours (2.5 days)'
      lines: [547, 555]
      token_est: 30
    - title: 'Technology Stack'
      lines: [557, 583]
      token_est: 97
    - title: 'Implementation Notes'
      lines: [585, 669]
      token_est: 307
      subsections:
        - title: 'REPL Loop Architecture'
          lines: [587, 633]
          token_est: 167
        - title: 'Error Handling Strategy'
          lines: [635, 640]
          token_est: 50
        - title: 'State Management'
          lines: [642, 654]
          token_est: 46
        - title: 'Command Parsing'
          lines: [656, 669]
          token_est: 42
    - title: 'Success Metrics'
      lines: [671, 680]
      token_est: 64
    - title: 'Risk Register'
      lines: [682, 691]
      token_est: 110
    - title: 'Exit Criteria (Phase 1)'
      lines: [693, 705]
      token_est: 98
    - title: 'Assumptions'
      lines: [707, 714]
      token_est: 49
    - title: 'Future Enhancements (v2.0+)'
      lines: [716, 725]
      token_est: 46
    - title: 'Related Documents'
      lines: [727, 731]
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
- v0.1 commands: `ingest repo`, `dump`, `trace`, `diff`, `project`, `help`, `exit`
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
- Scaffold from `templates/nx/node-app` (CLI app template)
- `package.json` with dependencies (see below)
- `tsconfig.json`, `vitest.config.ts`, `.eslintrc`
- Entry point: `src/index.ts`, `src/cli.ts`
- Dev script: `pnpm -C apps/graph-cli-app dev`

**Expected Directory Structure:**

```
apps/graph-cli-app/
├── src/
│   ├── index.ts                 # Entry point
│   ├── cli.ts                   # GraphCLI class
│   ├── repl.ts                  # REPL loop
│   ├── dispatcher.ts            # Command dispatcher
│   ├── types.ts                 # TypeScript interfaces
│   ├── commands/
│   │   ├── ingest-repo.ts
│   │   ├── dump.ts
│   │   ├── trace.ts
│   │   ├── diff.ts
│   │   ├── project.ts
│   │   ├── help.ts
│   │   └── exit.ts
│   └── ui/
│       ├── components/
│       │   ├── ProgressBox.tsx
│       │   ├── StateBox.tsx
│       │   └── ...other components
│       └── render.ts
├── unit/
│   ├── cli.test.ts
│   ├── dispatcher.test.ts
│   └── commands/
│       ├── ingest-repo.test.ts
│       └── ...other command tests
├── integration/
│   └── workflows.test.ts
├── e2e/
│   └── repl.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
└── README.md
```

**package.json Dependencies:**

```json
{
  "name": "@repo/graph-cli-app",
  "version": "0.1.0",
  "description": "Interactive CLI for testing graph system features",
  "type": "module",
  "scripts": {
    "dev": "node src/index.ts",
    "build": "tsc",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "lint": "eslint src",
    "format": "prettier --write src"
  },
  "dependencies": {
    "@repo/graph-core": "*",
    "@repo/graph-store": "*",
    "@repo/graph-ingest": "*",
    "@repo/graph-projection": "*",
    "commander": "^14.0.2",
    "enquirer": "^2.4.1",
    "ink": "^6.6.0",
    "pastel": "^4.0.0",
    "react": "^19.2.3"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "eslint": "^9.39.2",
    "prettier": "^3.8.1",
    "typescript": "^5.9.3",
    "vitest": "^4.0.18"
  }
}
```

**Verification:**

- [ ] App compiles without errors
- [ ] `pnpm -C apps/graph-cli-app dev` starts without crashing
- [ ] Can import from library packages
- [ ] App structure matches `templates/nx/node-app` defaults

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

// src/dispatcher.ts
class CommandDispatcher {
  private commands: Map<string, CommandDefinition> = new Map();

  register(name: string, def: CommandDefinition): void {
    this.commands.set(name, def);
  }

  async execute(input: string, cli: GraphCLI): Promise<CommandResult> {
    const { command, args, flags } = this.parseInput(input);
    const def = this.commands.get(command);

    if (!def) {
      return {
        success: false,
        message: `Unknown command: ${command}. Type 'help' for available commands.`,
      };
    }

    try {
      return await def.handler.execute(args, flags, cli);
    } catch (err) {
      return {
        success: false,
        message: `Error: ${err.message}`,
        error: err,
      };
    }
  }

  private parseInput(input: string): {
    command: string;
    args: string[];
    flags: Record<string, any>;
  } {
    const tokens = input.trim().split(/\s+/);
    const command = tokens.slice(0, 2).join(' '); // Support "ingest repo"
    const args: string[] = [];
    const flags: Record<string, any> = {};

    for (let i = 2; i < tokens.length; i++) {
      if (tokens[i].startsWith('--')) {
        const key = tokens[i].slice(2);
        const value = tokens[i + 1]?.startsWith('--') ? true : tokens[++i];
        flags[key] = value;
      } else {
        args.push(tokens[i]);
      }
    }

    return { command, args, flags };
  }
}

// src/repl.ts
async function startRepl() {
  const cli = new GraphCLI();
  const dispatcher = new CommandDispatcher();

  // Register all commands
  dispatcher.register('ingest repo', {
    handler: ingestRepoCommand,
    description: 'Ingest a repository',
    usage: 'ingest repo <source> [--commit <ref>] [--branch <branch>]',
  });
  dispatcher.register('dump', {
    handler: dumpCommand,
    description: 'Display current graph state',
    usage: 'dump [--format json|text]',
  });
  // ... register other commands

  while (true) {
    const input = await promptUser('> ');

    try {
      const result = await dispatcher.execute(input, cli);
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

- `src/commands/ingest.ts` — `ingest repo <source>` (URL or local path)
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
  execute(args: string[], flags: Record<string, any>, app: GraphCLI): Promise<CommandResult>;
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

- [ ] Unit: 80%+ coverage for commands, dispatcher, GraphCLI
- [ ] Integration: Happy path + error cases for workflows
- [ ] E2E: REPL loop with simulated user input
- [ ] Manual: Verify REPL feels good to use

**Verification:**

- [ ] `pnpm -C apps/graph-cli-app test` passes
- [ ] Coverage >80%
- [ ] REPL is responsive and intuitive
- [ ] Test layout and tooling align with `SPEC-tooling-testing-implementation-specification`
- [ ] Test distribution expectations align with `SPEC-tooling-testing-trophy-strategy`

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

- **Enquirer** v2.4.1 — Interactive prompts
- **Commander** v14.0.2 — Argument parsing (for --flags)

**Terminal UI:**

- **Ink** v6.6.0 — React rendering to terminal
- **Pastel** v4.0.0 — Terminal colors
- **React** v19.2.3 — Component framework

**Testing:**

- **Vitest** v4.0.18 — Test runner
- **TypeScript** v5.9.3 — Type checking
- **ESLint** v9.39.2 — Linting
- **Prettier** v3.8.1 — Code formatting

**Tooling Alignment:**

- `SPEC-tooling-nx-composite-projects.md`
- `SPEC-tooling-testing-implementation-specification.md`
- `SPEC-tooling-testing-trophy-strategy.md`

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
Execute (async/await) — await ingestRepo(), runProjection()
    ↓
Render Output (via Ink)
    ↓
Loop
```

**Important:** Commands like `ingestRepo()` and `runProjection()` are async. The REPL loop must use
`await`:

```typescript
// src/repl.ts
async function startRepl() {
  // ...
  while (true) {
    const input = await promptUser('> ');

    try {
      const result = await dispatcher.execute(input, cli); // MUST await!
      renderOutput(result);
    } catch (err) {
      renderError(err);
    }
  }
}
```

**Progress Handling:** For long-running commands (ingest, project), show progress indicators via Ink
while awaiting:

```typescript
// While awaiting ingestRepo:
// 1. Show "⏳ Ingesting..." Ink box
// 2. Await the async operation
// 3. When complete, show results box
```

### Error Handling Strategy

- Invalid command → Show usage
- Missing args → Show arg requirements
- Runtime error → Show error message + suggest `--debug` for details
- `--debug` flag → Full stacktrace + verbose logging

### State Management

Single GraphCLI instance lives for the session:

```typescript
const cli = new GraphCLI();

// After ingest:
cli.store.getAllNodes().length; // 47

// Commands query/manipulate same cli instance
// On exit: discard all state
```

### Command Parsing

Use Commander-like parsing:

```bash
> ingest repo https://github.com/foo/bar --commit v1.0
> ingest repo ./path/to/local/repo --commit v1.0
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
