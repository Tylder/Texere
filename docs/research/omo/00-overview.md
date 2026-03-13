# Oh My OpenCode (OMO) System Overview

## What is OMO?

Oh My OpenCode is an **OpenCode plugin** that transforms a single AI agent into a **coordinated
development team** through multi-agent orchestration. It's the "oh-my-zsh" for OpenCode - a
batteries-included plugin system that adds:

- **11 specialized agents** working in parallel
- **41 lifecycle hooks** for deep customization
- **25+ tools** (LSP, AST-Grep, delegation, task management)
- **Full Claude Code compatibility** layer
- **Built-in MCPs** (Exa, Context7, Grep.app)
- **Background task execution** with concurrency control

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   Sisyphus (Primary)       │
        │   Claude Opus 4.6          │
        │   Main Orchestrator        │
        └────────────┬───────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │Explore │  │Library │  │Oracle  │
    │(Fast)  │  │(Docs)  │  │(Arch)  │
    └────────┘  └────────┘  └────────┘
         │           │           │
         └───────────┼───────────┘
                     ▼
        ┌────────────────────────────┐
        │   Atlas (Executor)         │
        │   Work Plan Completion     │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   Sisyphus-Junior          │
        │   Category Executor        │
        │   (quick/visual/deep)      │
        └────────────────────────────┘
```

## Core Components

### 1. Agents (11 specialized)

| Agent                 | Model          | Role                    | Delegation          |
| --------------------- | -------------- | ----------------------- | ------------------- |
| **Sisyphus**          | Opus 4.6       | Primary orchestrator    | Can delegate to all |
| **Hephaestus**        | GPT-5.3 Codex  | Autonomous deep worker  | Cannot delegate     |
| **Atlas**             | Sonnet 4.5     | Work plan executor      | Delegates to Junior |
| **Prometheus**        | Opus 4.6       | Strategic planner       | Delegates to Metis  |
| **Oracle**            | GPT-5.2        | Architecture consultant | Read-only           |
| **Librarian**         | GLM-4.7        | Docs/OSS research       | Read-only           |
| **Explore**           | Grok Fast      | Fast codebase grep      | Read-only           |
| **Multimodal Looker** | Gemini 3 Flash | PDF/image analysis      | Read-only           |
| **Metis**             | Opus 4.6       | Pre-planning analyst    | Delegates research  |
| **Momus**             | GPT-5.2        | Plan validator          | Read-only           |
| **Sisyphus-Junior**   | Sonnet 4.5     | Category executor       | Cannot delegate     |

### 2. Hooks (41 lifecycle hooks)

**7 Event Types:**

- `chat.message` — Intercept user messages
- `tool.execute.before/after` — Modify tool I/O
- `UserPromptSubmit` — Claude Code compatibility
- `PreToolUse/PostToolUse` — Claude Code tools
- `event` — Session lifecycle
- `experimental.session.compacting` — Context preservation

**Key Hooks:**

- **Context Injection** (4): AGENTS.md, README, rules, directory context
- **Message Transform** (5): keyword detection, think mode, context window monitor
- **Task Management** (5): todo enforcement, compaction preservation, resume info
- **Code Quality** (3): comment checker, edit recovery, write guard
- **Orchestration** (6): Ralph Loop, delegation retry, background notifications, Atlas integration

### 3. Tools (25+)

**Search & Exploration:**

- `grep` — Fast text search
- `glob` — File pattern matching
- `ast-grep` — AST-aware code search

**LSP Integration:**

- `lsp_goto_definition` — Jump to definition
- `lsp_find_references` — Find all usages
- `lsp_symbols` — Get symbol outline
- `lsp_diagnostics` — Get errors/warnings
- `lsp_rename` — Rename refactoring

**Agent Delegation:**

- `task()` — Delegate to agents (category or subagent_type)
- `call_omo_agent()` — Direct agent invocation
- `background_output()` — Retrieve background task results
- `background_cancel()` — Cancel running tasks

**Skills & MCPs:**

- `skill` — Load custom skills
- `skill_mcp` — MCP-based skills
- `slashcommand` — Slash commands

**Session Management:**

- `session_list` — List all sessions
- `session_read` — Read session messages
- `session_search` — Search across sessions
- `session_info` — Get session metadata

### 4. Built-in MCPs (3-tier)

**Tier 1: Built-in MCPs**

- **Exa/Tavily** — Web search
- **Context7** — Official documentation
- **Grep.app** — GitHub code search

**Tier 2: Claude Code Compatibility**

- `.mcp.json` with `${VAR}` expansion
- Auto-loaded from `.opencode/`

**Tier 3: Skill-Embedded**

- YAML frontmatter in SKILL.md
- Auto-loaded with skills

### 5. Features

**Background Agents:**

- Fire-and-forget parallel execution
- Concurrency control (per-model, per-provider)
- Task polling and stale detection
- Batched parent notifications

**LSP & AST Tools:**

- Refactoring, rename, diagnostics
- AST-aware code search/replace
- Safe surgical edits

**Context Injection:**

- Auto-inject AGENTS.md, README.md
- Conditional rules (.claude/rules/\*.md)
- Environment context (timezone, date)

**Claude Code Compatibility:**

- Full hook system (PreToolUse, PostToolUse, UserPromptSubmit)
- Command, Agent, Skill, MCP loaders
- Session state tracking

**Productivity Features:**

- Ralph Loop (iterative refinement)
- Todo Enforcer (task completion)
- Comment Checker (code quality)
- Think Mode (extended reasoning)

## Key Workflows

### 1. Simple Task → Direct Execution

```
User: "Fix the type error in auth.ts"
  ↓
Sisyphus reads file, fixes error, runs diagnostics
```

### 2. Complex Task → Background Research

```
User: "Implement JWT authentication"
  ↓
Sisyphus fires background tasks:
  - task(subagent_type="explore", run_in_background=true, prompt="Find auth patterns")
  - task(subagent_type="librarian", run_in_background=true, prompt="Find JWT docs")
  ↓
Sisyphus continues with other work
  ↓
Notifications arrive when tasks complete
  ↓
Sisyphus uses results to implement
```

### 3. Precise Multi-Step → Prometheus + Atlas

```
User: "@plan Refactor the auth system"
  ↓
Prometheus (planner):
  - Interviews user for requirements
  - Fires explore/librarian for research
  - Generates detailed plan → .sisyphus/plans/refactor-auth.md
  ↓
User: "/start-work"
  ↓
Atlas (executor):
  - Reads plan from .sisyphus/plans/
  - Creates boulder.json (task tracker)
  - Delegates each task via task(category="...", ...)
  - Verifies completion
  - Continues until all done
```

## File Structure

```
oh-my-opencode/
├── src/
│   ├── agents/              # 11 AI agents
│   │   ├── sisyphus.ts      # Main orchestrator
│   │   ├── atlas/           # Work plan executor
│   │   ├── prometheus/      # Strategic planner
│   │   ├── oracle.ts        # Architecture consultant
│   │   ├── librarian.ts     # Docs researcher
│   │   ├── explore.ts       # Codebase grep
│   │   └── ...
│   │
│   ├── hooks/               # 41 lifecycle hooks
│   │   ├── keyword-detector/
│   │   ├── todo-continuation-enforcer/
│   │   ├── comment-checker/
│   │   ├── rules-injector/
│   │   └── ...
│   │
│   ├── tools/               # 25+ tools
│   │   ├── delegate-task/   # Task delegation
│   │   ├── lsp/             # LSP integration
│   │   ├── ast-grep/        # AST search
│   │   └── ...
│   │
│   ├── features/            # Major subsystems
│   │   ├── background-agent/ # Parallel execution
│   │   ├── builtin-skills/   # Playwright, git-master
│   │   ├── claude-code-*-loader/ # CC compatibility
│   │   └── ...
│   │
│   ├── config/              # Zod configuration schema
│   ├── plugin/              # Plugin interface composition
│   ├── mcp/                 # Built-in MCPs
│   └── index.ts             # Main plugin entry
│
├── docs/                    # Documentation
├── .opencode/               # Example configs
└── packages/                # Platform-specific binaries
```

## Configuration

**Project Config:** `.opencode/oh-my-opencode.jsonc` **User Config:**
`~/.config/opencode/oh-my-opencode.jsonc`

```jsonc
{
  // Agent overrides
  "agents": {
    "oracle": {
      "model": "anthropic/claude-opus-4-6",
      "temperature": 0.1,
    },
  },

  // Disabled hooks
  "disabled_hooks": ["comment-checker", "ralph-loop"],

  // Background tasks
  "backgroundTask": {
    "defaultConcurrency": 5,
    "providerConcurrency": {
      "anthropic": 10,
    },
  },

  // MCPs
  "mcps": {
    "my-mcp": {
      "command": "node",
      "args": ["./my-mcp.js"],
    },
  },
}
```

## Next Steps

For detailed documentation, see:

- **[Agent Architecture](01-agent-architecture.md)** — 11 agents, roles, delegation patterns
- **[Agent Communication](02-agent-communication.md)** — Task delegation, session continuity,
  concurrency
- **[Prompt System](03-prompt-system.md)** — Prompt construction, injection, hooks, customization
- **[Adding Agents](04-adding-agents.md)** — Step-by-step guide for custom agents
- **[Plugin Integration](05-plugin-integration.md)** — OpenCode SDK hooks, tool registration
- **[Skill System](06-skill-system.md)** — Skills, MCPs, custom skill creation
- **[Orchestration Patterns](07-orchestration-patterns.md)** — Common workflows, best practices

## Key Principles

1. **Specialization over generalization** — Each agent has a specific role
2. **Parallel by default** — Background tasks maximize throughput
3. **Context preservation** — Session hierarchy maintains state across agents
4. **Immutable design** — Hooks don't mutate, they transform
5. **Type safety** — Zod schemas validate everything
6. **Modular architecture** — 200 LOC hard limit per file
7. **TDD mandatory** — RED-GREEN-REFACTOR workflow

## Resources

- **Repository:** https://github.com/code-yeongyu/oh-my-opencode
- **OpenCode:** https://github.com/anomalyco/opencode
- **Discord:** https://discord.gg/PUwSMR9XNk
- **Docs:** https://github.com/code-yeongyu/oh-my-opencode/tree/master/docs
