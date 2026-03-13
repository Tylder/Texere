# Oh My OpenCode (OMO) Research Documentation

## Overview

This directory contains comprehensive research and documentation on the **Oh My OpenCode (OMO)**
system - a sophisticated multi-agent orchestration framework built as an OpenCode plugin.

## Research Methodology

This documentation was generated through parallel exploration of both OMO and OpenCode codebases
using:

- **5 background explore agents** searching code patterns across ~1,000 files
- **Comprehensive code analysis** of agent architecture, hooks, tools, and configuration
- **Integration testing** to understand how components interact
- **Documentation synthesis** from in-code comments, existing docs, and implementation details

## Documentation Structure

### [00-overview.md](00-overview.md) — System Overview

**Start here for a high-level understanding**

- What is OMO and why it exists
- System architecture diagram
- 11 specialized agents
- 41 lifecycle hooks
- 25+ tools
- 3-tier MCP system
- Key workflows and principles

### [01-agent-architecture.md](01-agent-architecture.md) — Agent Architecture

**Deep dive into the 11 agents**

- Sisyphus (primary orchestrator)
- Hephaestus (autonomous deep worker)
- Atlas (work plan executor)
- Prometheus (strategic planner)
- Oracle, Librarian, Explore (specialists)
- Metis, Momus (consultants)
- Sisyphus-Junior (category executor)
- Agent modes, capabilities, and delegation patterns
- Configuration and customization

## Key Discoveries

### Multi-Agent Orchestration

OMO implements a **hierarchical agent system** where:

- **Primary agents** (Sisyphus, Hephaestus, Atlas) face users
- **Subagents** (Oracle, Librarian, Explore) handle specialized tasks
- **Category executors** (Sisyphus-Junior) execute delegated work
- **Background execution** enables parallel task processing

### Hook-Based Extension System

**41 hooks across 7 event types**:

- `chat.message` — Message interception
- `tool.execute.before/after` — Tool I/O transformation
- `event` — Session lifecycle
- `experimental.*` — Advanced features

This enables:

- Context injection (AGENTS.md, README, rules)
- Keyword detection (ultrawork, search modes)
- Task enforcement (todo continuation)
- Code quality (comment checking)

### Task Delegation System

**Three execution modes:**

1. **Background** — Fire-and-forget parallel execution
2. **Sync** — Wait for completion
3. **Continuation** — Resume existing sessions

**Concurrency control:**

- Per-model limits (e.g., claude-opus-4: 2)
- Per-provider limits (e.g., anthropic: 10)
- Default limit: 5
- Queue management with slot handoff

### Prompt Construction Pipeline

**Dynamic prompts built from composable sections:**

- Base identity and role
- Task management (todo/task system)
- Available resources (agents, tools, categories, skills)
- Delegation guidance (when to delegate to whom)
- Key triggers (phase 0 decisions)
- Hard blocks and anti-patterns

**Model-specific variants:**

- Claude-optimized prompts
- GPT-optimized prompts
- Auto-detection via isGptModel()

## Architecture Highlights

### Session Hierarchy

```
Parent Session (Sisyphus)
├─ Child Session 1 (Explore)     [background]
├─ Child Session 2 (Librarian)   [background]
└─ Child Session 3 (Atlas)       [sync]
   ├─ Grandchild 1 (Sisyphus-Junior via category="quick")
   └─ Grandchild 2 (Sisyphus-Junior via category="visual")
```

Context flows down: agent, model, tools, directory

### Background Task Lifecycle

```
pending → running → completed
  ↓        ↓          ↓
  └─ error ─ cancelled ─ interrupt
```

**Managed by BackgroundManager (1646 lines):**

- Task queuing and concurrency
- Session creation and prompting
- Polling for completion
- Stale task detection
- Parent notifications
- Resource cleanup

### Skill System

**YAML frontmatter + Markdown documentation:**

```yaml
---
name: git-master
description: 'MUST USE for ANY git operations...'
---
# Git Master Skill

[Markdown documentation with tools, examples, workflows]
```

**3-tier MCP architecture:**

1. Built-in (Exa, Context7, Grep.app)
2. Claude Code compatible (.mcp.json)
3. Skill-embedded (YAML frontmatter)

## Use Cases Documented

### Simple Tasks

```
User: "Fix type error in auth.ts"
→ Sisyphus fixes directly
```

### Complex Research

```
User: "Implement JWT authentication"
→ Sisyphus fires background: Explore + Librarian
→ Uses results to implement
```

### Precise Multi-Step

```
User: "@plan Refactor auth system"
→ Prometheus plans
→ /start-work
→ Atlas executes via Sisyphus-Junior
```

### Autonomous Deep Work

```
User switches to Hephaestus
User: "Implement feature X"
→ Hephaestus researches, plans, implements, verifies
```

## Key Insights

### Design Principles

1. **Specialization over generalization** — Each agent has specific expertise
2. **Parallel by default** — Background tasks maximize throughput
3. **Context preservation** — Session hierarchy maintains state
4. **Immutable design** — Hooks transform, don't mutate
5. **Type safety** — Zod schemas validate everything
6. **Modular architecture** — 200 LOC hard limit per file
7. **TDD mandatory** — RED-GREEN-REFACTOR workflow

### Anti-Patterns Discovered

**From code analysis and documentation:**

- ❌ Single commit from multiple files → SPLIT COMMITS
- ❌ Agents working alone when specialists available
- ❌ Synchronous waiting for explore/librarian
- ❌ Empty catch blocks
- ❌ Type error suppression (as any, @ts-ignore)
- ❌ Deleting failing tests
- ❌ Shotgun debugging (random changes)

### Configuration Best Practices

**Project config:** `.opencode/oh-my-opencode.jsonc` **User config:**
`~/.config/opencode/oh-my-opencode.jsonc`

**Recommended overrides:**

```jsonc
{
  "backgroundTask": {
    "defaultConcurrency": 5,
    "providerConcurrency": {
      "anthropic": 10,
      "openai": 3,
    },
  },
  "agents": {
    "oracle": {
      "temperature": 0.05,
    },
  },
  "disabled_hooks": [],
}
```

## Tools and Techniques Used

### Research Tools

- **Background Explore Agents** — Parallel codebase searches
- **LSP Analysis** — Symbol resolution and type checking
- **AST-Grep** — Pattern-based code search
- **Grep** — Text search across 1,069 TypeScript files
- **Code Reading** — Manual analysis of key files
- **Documentation Synthesis** — Combining code + docs + tests

### Code Patterns Identified

**Agent Factory Pattern:**

```typescript
export function createAgentName(model: string): AgentConfig {
  return {
    description: '...',
    mode: 'subagent',
    model,
    temperature: 0.1,
    tools: { write: false, edit: false },
    prompt: AGENT_PROMPT,
  };
}
createAgentName.mode = 'subagent'; // Static property
```

**Hook Creation Pattern:**

```typescript
export function createHookName(args: HookArgs) {
  if (!args.isHookEnabled('hook-name')) return null;

  return {
    'chat.message': async (input, output) => {
      // Transform logic
    },
  };
}
```

**Tool Definition Pattern:**

```typescript
export const toolName = tool({
  description: 'Tool description',
  args: {
    param: z.string(),
  },
  execute: async (args, context) => {
    // Tool logic
    return 'result';
  },
});
```

## File Statistics

**OMO Codebase:**

- **1,069 TypeScript files**
- **176 test files**
- **117,000+ lines of code**
- **41 hooks**
- **25+ tools**
- **11 agents**
- **3 MCP tiers**

**Key Files:**

- `src/features/background-agent/manager.ts` — 1,646 lines (task lifecycle)
- `src/hooks/anthropic-context-window-limit-recovery/` — 2,232 lines (recovery strategies)
- `src/hooks/claude-code-hooks/` — 2,110 lines (CC compatibility)
- `src/hooks/todo-continuation-enforcer/` — 2,061 lines (boulder mechanism)
- `src/hooks/atlas/` — 1,976 lines (orchestration)

## Next Steps

### For Users

1. Install OMO: `npm install -g oh-my-opencode`
2. Configure: Create `.opencode/oh-my-opencode.jsonc`
3. Use: Type `ulw` or `ultrawork` in prompts
4. Learn: Read [00-overview.md](00-overview.md)

### For Developers

1. Study: Read [01-agent-architecture.md](01-agent-architecture.md)
2. Explore: Review the agent coordination research results
3. Extend: Add custom agents, hooks, tools, or skills
4. Contribute: Submit PRs to OMO repository

### For Researchers

1. **Agent Communication Protocols** — See background task results
2. **Prompt Engineering** — See prompt injection research results
3. **Plugin Architecture** — See plugin integration research results
4. **Skill System** — See skill and MCP research results

## Research Artifacts

All research results are preserved in this directory:

- Background task results (5 comprehensive analyses)
- Code exploration findings
- Architecture diagrams
- Configuration patterns
- Best practices and anti-patterns

## Credits

**Research Date:** February 15, 2026

**Research Method:** Multi-agent parallel exploration

**Codebases Analyzed:**

- oh-my-opencode (v3.5.5)
- opencode (v1.0.x)

**Tools Used:**

- 5 parallel explore agents
- LSP analysis
- AST-Grep
- Grep/ripgrep
- Manual code reading

## License

This documentation is provided for educational and research purposes. OMO is licensed under SUL-1.0
(Sisyphus Use License). OpenCode is licensed under MIT.

## References

- **OMO Repository:** https://github.com/code-yeongyu/oh-my-opencode
- **OpenCode Repository:** https://github.com/anomalyco/opencode
- **OMO Discord:** https://discord.gg/PUwSMR9XNk
- **Original Docs:** https://github.com/code-yeongyu/oh-my-opencode/tree/master/docs
