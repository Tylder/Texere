# OMO Prompt System Architecture

**Last Updated:** 2026-02-15

This document explains how Oh My OpenCode constructs and injects prompts for its 11 agents, enabling
dynamic prompt composition based on available tools, agents, skills, and categories.

---

## Table of Contents

1. [Overview](#overview)
2. [Prompt Construction Pipeline](#prompt-construction-pipeline)
3. [Hook System Architecture](#hook-system-architecture)
4. [Dynamic Prompt Sections](#dynamic-prompt-sections)
5. [Context Injection Mechanisms](#context-injection-mechanisms)
6. [Keyword Detection](#keyword-detection)
7. [Customization Points](#customization-points)
8. [Code Reference](#code-reference)

---

## Overview

OMO uses a **dynamic prompt composition system** that builds agent prompts from reusable sections.
Instead of static prompt strings, prompts are assembled at runtime based on:

- **Available agents** (which agents are enabled/configured)
- **Available tools** (LSP, AST-grep, search, session management)
- **Available skills** (built-in + user-installed)
- **Available categories** (task execution domains with optimized models)
- **Project context** (AGENTS.md, README, rule files)

This architecture enables:

- **Consistency** across agents (shared sections)
- **Flexibility** (enable/disable components via config)
- **Context awareness** (prompts adapt to codebase state)
- **User customization** (override via config, inject skills)

---

## Prompt Construction Pipeline

### High-Level Flow

```
User message → Hook interception → Context injection → Keyword detection → Agent prompt construction → LLM
```

### Detailed Pipeline

1. **Message Interception** (`chat.message` hook)
   - Captures user input before LLM processing
   - Extracts prompt text from message parts
   - Filters system directives (automated messages)

2. **Context Injection** (`tool.execute.after` hook)
   - Tracks file operations (read/write/edit)
   - Injects relevant rule files from `.sisyphus/rules/`
   - Adds project knowledge (AGENTS.md, README)
   - Caches per session to avoid duplicate injection

3. **Keyword Detection** (`chat.message` hook)
   - Scans prompt for mode keywords ([ultrawork], [analyze-mode], etc.)
   - Injects mode-specific instructions
   - Sets model variant (max precision for ultrawork)

4. **Prompt Section Assembly** (Dynamic builders)
   - Builds delegation tables (which agent for what task)
   - Constructs tool/agent selection guides
   - Generates skill evaluation protocols
   - Adds hard blocks and anti-patterns

5. **Final Composition** (Agent factory)
   - Combines base prompt + dynamic sections
   - Applies agent-specific overrides
   - Returns complete `AgentConfig` with prompt

---

## Hook System Architecture

OMO implements **41 lifecycle hooks** across **7 event types** defined by the OpenCode SDK.

### Hook Types (OpenCode SDK)

| Hook Type             | Purpose                                 | Example Use                             |
| --------------------- | --------------------------------------- | --------------------------------------- |
| `chat.message`        | Intercept/transform messages before LLM | Keyword detection, mode injection       |
| `chat.params`         | Modify LLM parameters                   | Temperature, max tokens, stop sequences |
| `tool.execute.before` | Pre-process tool arguments              | Validation, path normalization          |
| `tool.execute.after`  | Post-process tool output                | Context injection, caching              |
| `event`               | React to session lifecycle              | Cache cleanup on session delete         |
| `config`              | Modify plugin configuration             | Dynamic agent registration              |
| `tool`                | Register custom tools                   | Delegation, AST-grep, LSP wrappers      |

**Reference:** `/tmp/opencode/packages/plugin/src/index.ts` (OpenCode SDK definition)

### OMO Hook Implementation

**File:** `/tmp/oh-my-opencode/src/create-hooks.ts`

```typescript
export function createHooks(input: PluginInput): Hooks {
  const hooks = [
    createRulesInjectorHook(input), // Context injection (tool.execute.after, event)
    createKeywordDetectorHook(input), // Keyword detection (chat.message)
    createTodoContinuationEnforcerHook(input), // Todo tracking (chat.message, event)
    createAtlasHook(input), // Atlas workflow (tool, chat.message, event)
    createPrometheusHook(input), // Prometheus planning (tool, chat.message)
    // ... 36 more hooks
  ];
  return mergeHooks(hooks);
}
```

**Key Files:**

- `src/hooks/rules-injector/` - **1,604 LOC** across 9 files (context injection system)
- `src/hooks/keyword-detector/` - **437 LOC** across 7 files (mode detection)
- `src/hooks/todo-continuation-enforcer/` - Todo completion tracking
- `src/hooks/atlas/` - Atlas orchestration workflow
- `src/hooks/prometheus/` - Prometheus planning integration

---

## Dynamic Prompt Sections

### Section Builder Architecture

**File:** `/tmp/oh-my-opencode/src/agents/dynamic-agent-prompt-builder.ts` (433 lines)

This module exports **10 section builder functions** used to construct agent prompts:

| Function                               | Purpose                                   | Output              |
| -------------------------------------- | ----------------------------------------- | ------------------- |
| `buildKeyTriggersSection()`            | Lists triggers for firing specific agents | Markdown table      |
| `buildToolSelectionTable()`            | Cost/usage guide for tools vs agents      | Markdown table      |
| `buildExploreSection()`                | When to use explore agent vs direct tools | Comparison table    |
| `buildLibrarianSection()`              | Trigger phrases for librarian agent       | Markdown list       |
| `buildDelegationTable()`               | Domain → Agent → Trigger mapping          | Markdown table      |
| `buildCategorySkillsDelegationGuide()` | Category + skill selection protocol       | Multi-section guide |
| `buildOracleSection()`                 | Oracle consultation guidelines            | XML-tagged section  |
| `buildHardBlocksSection()`             | Non-negotiable constraints                | Markdown table      |
| `buildAntiPatternsSection()`           | Forbidden patterns                        | Markdown table      |
| `buildUltraworkSection()`              | Available resources for ultrawork mode    | Markdown list       |

### Example: Key Triggers Section

**Code:** `src/agents/dynamic-agent-prompt-builder.ts:67-78`

```typescript
export function buildKeyTriggersSection(
  agents: AvailableAgent[],
  _skills: AvailableSkill[] = [],
): string {
  const keyTriggers = agents
    .filter((a) => a.metadata.keyTrigger)
    .map((a) => `- ${a.metadata.keyTrigger}`);

  if (keyTriggers.length === 0) return '';

  return `### Key Triggers (check BEFORE classification):

${keyTriggers.join('\n')}
- **"Look into" + "create PR"** → Not just research. Full implementation cycle expected.`;
}
```

**Usage in Sisyphus prompt:**

```
### Key Triggers (check BEFORE classification):

- External library/source mentioned → fire `librarian` background
- 2+ modules involved → fire `explore` background
- Unfamiliar or complex request → consult Metis before Prometheus
- Work plan created → invoke Momus for review before execution
```

### Example: Category + Skills Delegation Guide

**Code:** `src/agents/dynamic-agent-prompt-builder.ts:198-311`

This 113-line function generates:

1. **Category table** - Available task execution domains (visual-engineering, ultrabrain, deep,
   quick, etc.)
2. **Built-in skills table** - Plugin-provided skills (playwright, git-master, frontend-ui-ux)
3. **User-installed skills section** (HIGH PRIORITY) - Project/user skills with source attribution
4. **Selection protocol** (3-step process):
   - STEP 1: Select category matching task domain
   - STEP 2: Evaluate ALL skills (built-in AND user-installed)
   - STEP 3: Justify omissions
5. **Delegation pattern** - TypeScript example with anti-pattern warning

**Output structure:**

```markdown
### Category + Skills Delegation System

#### Available Categories (Domain-Optimized Models)

| Category           | Domain / Best For                              |
| ------------------ | ---------------------------------------------- |
| visual-engineering | Frontend, UI/UX, design, styling, animation    |
| ultrabrain         | Use ONLY for genuinely hard, logic-heavy tasks |

...

#### Built-in Skills

| Skill      | Expertise Domain                      |
| ---------- | ------------------------------------- |
| playwright | Browser automation via Playwright MCP |

...

#### User-Installed Skills (HIGH PRIORITY)

| Skill  | Expertise Domain                          | Source  |
| ------ | ----------------------------------------- | ------- |
| texere | Persistent knowledge graph for LLM agents | project |

...

> **CRITICAL**: Ignoring user-installed skills when they match the task domain is a failure.

### MANDATORY: Category + Skill Selection Protocol

[3-step selection process]

### Delegation Pattern

[TypeScript example + anti-pattern]
```

**Key feature:** User-installed skills get **PRIORITY** emphasis to ensure subagents load custom
domain knowledge.

---

## Context Injection Mechanisms

### Rules Injector Hook

**Primary File:** `src/hooks/rules-injector/hook.ts` (88 lines)

**Architecture:**

```
File operation (read/write/edit) → tool.execute.after hook → Find rule files → Inject into context
```

**Tracked tools:** `read`, `write`, `edit`, `multiedit`

**Code:** `src/hooks/rules-injector/hook.ts:30-53`

```typescript
const TRACKED_TOOLS = ['read', 'write', 'edit', 'multiedit'];

export function createRulesInjectorHook(ctx: PluginInput) {
  const toolExecuteAfter = async (input: ToolExecuteInput, output: ToolExecuteOutput) => {
    const toolName = input.tool.toLowerCase();

    if (TRACKED_TOOLS.includes(toolName)) {
      const filePath = getRuleInjectionFilePath(output);
      if (!filePath) return;
      await processFilePathForInjection(filePath, input.sessionID, output);
      return;
    }
  };

  return {
    'tool.execute.after': toolExecuteAfter,
    event: eventHandler, // Session cleanup
  };
}
```

### Rule File Discovery

**File:** `src/hooks/rules-injector/finder.ts`

**Search strategy:**

1. Start from edited file's directory
2. Walk up directory tree to project root
3. At each level, check for `.sisyphus/rules/*.md`
4. Match rule file globs against edited file path
5. Inject matching rules into tool output

**Rule file format (YAML frontmatter):**

```markdown
---
Match:
  - glob: '**/*.ts'
  - glob: 'src/api/**/*.js'
---

# Rule Title

Rule content in markdown...
```

**Example rules:**

- `.sisyphus/rules/modular-code-enforcement.md` - 200 LOC limit, no utils.ts catch-alls
- `.sisyphus/rules/typescript-style.md` - Type safety, explicit return types
- `.sisyphus/rules/testing-conventions.md` - Co-located tests, no mocking

### Session Caching

**File:** `src/hooks/rules-injector/cache.ts`

**Purpose:** Avoid injecting same rules multiple times per session

**Implementation:**

```typescript
const sessionCaches = new Map<string, Set<string>>();

export function createSessionCacheStore() {
  return {
    getSessionCache: (sessionID: string) => {
      if (!sessionCaches.has(sessionID)) {
        sessionCaches.set(sessionID, new Set());
      }
      return sessionCaches.get(sessionID)!;
    },
    clearSessionCache: (sessionID: string) => {
      sessionCaches.delete(sessionID);
    },
  };
}
```

**Cache key format:** `${sessionID}:${filePath}:${ruleIdentifier}`

**Cache invalidation:** On `session.deleted` and `session.compacted` events

### Project Knowledge Injection

In addition to rule files, OMO injects:

- **AGENTS.md** - Project knowledge base (architecture, conventions, anti-patterns)
- **README.md** - Project overview, structure, commands
- **Custom docs** - Any `.md` files referenced in tool outputs

**Injection timing:** After file read/write operations via `tool.execute.after` hook

---

## Keyword Detection

### Mode Keywords

**File:** `src/hooks/keyword-detector/constants.ts`

**Supported modes:**

| Keyword          | Effect                        | Model Variant |
| ---------------- | ----------------------------- | ------------- |
| `[ultrawork]`    | Maximum precision, all agents | `max`         |
| `[analyze-mode]` | Deep analysis, limited tools  | N/A           |
| `[boulder]`      | Continuous work mode          | N/A           |
| `[plan]`         | Planning mode (Prometheus)    | N/A           |

### Detection Logic

**File:** `src/hooks/keyword-detector/hook.ts` (116 lines)

**Flow:**

```typescript
export function createKeywordDetectorHook(ctx: PluginInput) {
  return {
    "chat.message": async (input, output) => {
      const promptText = extractPromptText(output.parts)

      // Skip system directives
      if (isSystemDirective(promptText)) return

      // Remove system reminders to prevent false triggers
      const cleanText = removeSystemReminders(promptText)

      // Detect keywords
      const detectedKeywords = detectKeywordsWithType(cleanText, currentAgent, modelID)

      // Skip for background task sessions (prevents mode injection into subagents)
      if (subagentSessions.has(input.sessionID)) return

      // Inject mode instructions
      const allMessages = detectedKeywords.map(k => k.message).join("\n\n")
      output.parts[textPartIndex].text = `${allMessages}\n\n---\n\n${originalText}`

      // Set model variant for ultrawork
      if (hasUltrawork) {
        output.message.variant = "max"
        ctx.client.tui.showToast({ title: "Ultrawork Mode Activated", ... })
      }
    }
  }
}
```

**Key safety:** `subagentSessions.has(input.sessionID)` prevents mode keywords from being injected
into background task sessions, avoiding unintended restrictions (e.g., `[analyze-mode]` accidentally
triggering Prometheus limits in a quick exploration task).

### Mode Instruction Injection

**Example:** When `[ultrawork]` is detected, the following is prepended to the user's message:

```markdown
[SYSTEM REMINDER - ULTRAWORK MODE]

You are in ULTRAWORK mode. Maximum precision and thoroughness expected.

ALL available agents, tools, categories, and skills are at your disposal.

**Available Resources:**

**Categories:**

- visual-engineering: Frontend, UI/UX, design, styling, animation
- ultrabrain: Use ONLY for genuinely hard, logic-heavy tasks ...

**Built-in Skills:**

- playwright: Browser automation via Playwright MCP ...

**User-Installed Skills (HIGH PRIORITY):**

- texere: Persistent knowledge graph for LLM agents ...

**Agents:**

- explore (multiple): Contextual grep for codebases
- librarian (multiple): Documentation researcher
- oracle: Architecture consultant (read-only) ...

---

[User's original message]
```

**Code:** `src/agents/dynamic-agent-prompt-builder.ts:373-432` (`buildUltraworkSection()`)

---

## Customization Points

### 1. Config Overrides

**File:** `.opencode/oh-my-opencode.jsonc`

**Agent prompt override:**

```jsonc
{
  "agentOverrides": {
    "sisyphus": {
      "prompt": "Custom system prompt for Sisyphus...",
    },
  },
}
```

**Category description override:**

```jsonc
{
  "categories": {
    "visual-engineering": {
      "description": "Custom description for visual-engineering category",
    },
  },
}
```

### 2. Skill Injection

**User-installed skills** (`~/.opencode/skills/`, `.opencode/skills/`)

**Format:** `SKILL.md` with YAML frontmatter

```markdown
---
name: my-custom-skill
description: Specialized knowledge for X domain
compatibility: opencode
---

# Custom Skill Instructions

When this skill is loaded, the following instructions apply:

[Skill content in markdown]
```

**Effect:** Appears in "User-Installed Skills (HIGH PRIORITY)" section of agent prompts.

**Loading:** `task(load_skills=["my-custom-skill"], ...)`

### 3. Rule Files

**Location:** `.sisyphus/rules/*.md`

**Format:** YAML frontmatter with `Match` globs

```markdown
---
Match:
  - glob: 'src/**/*.ts'
---

# Custom Project Rule

[Rule content]
```

**Auto-injection:** When agent reads/edits matching file

### 4. Agent Registration

**Custom agents** (advanced)

**Location:** `~/.opencode/agents/` or `.opencode/agents/`

**Format:** `AGENT.md` with YAML frontmatter

```markdown
---
name: my-agent
description: Custom agent for specialized task
model: anthropic/claude-opus-4.6
temperature: 0.1
---

# Agent Prompt

You are a custom agent...
```

**Effect:** Appears in delegation tables, available via `task(subagent_type="my-agent", ...)`

**Code reference:** `src/agents/custom-agent-summaries.ts` (parsing),
`src/agents/builtin-agents.ts:107-122` (registration)

---

## Code Reference

### Key Files

| File                                         | LOC  | Purpose                      |
| -------------------------------------------- | ---- | ---------------------------- |
| `src/agents/dynamic-agent-prompt-builder.ts` | 433  | 10 section builder functions |
| `src/hooks/rules-injector/hook.ts`           | 88   | Context injection hook       |
| `src/hooks/rules-injector/finder.ts`         | ~200 | Rule file discovery          |
| `src/hooks/rules-injector/injector.ts`       | ~800 | Rule processing pipeline     |
| `src/hooks/keyword-detector/hook.ts`         | 116  | Mode keyword detection       |
| `src/hooks/keyword-detector/detector.ts`     | ~150 | Keyword matching logic       |
| `src/agents/sisyphus.ts`                     | ~300 | Sisyphus agent factory       |
| `src/create-hooks.ts`                        | ~200 | Hook orchestration           |

### Module Architecture

```
src/
├── agents/
│   ├── dynamic-agent-prompt-builder.ts    # Section builders (433 LOC)
│   ├── sisyphus.ts                        # Sisyphus agent (uses builders)
│   ├── oracle.ts                          # Oracle agent
│   ├── librarian.ts                       # Librarian agent
│   └── ... (8 more agents)
├── hooks/
│   ├── rules-injector/
│   │   ├── hook.ts                        # Hook entry point (88 LOC)
│   │   ├── finder.ts                      # Rule file discovery
│   │   ├── injector.ts                    # Rule processing
│   │   ├── cache.ts                       # Session caching
│   │   └── ... (5 more files)
│   ├── keyword-detector/
│   │   ├── hook.ts                        # Hook entry point (116 LOC)
│   │   ├── detector.ts                    # Keyword matching
│   │   ├── constants.ts                   # Mode definitions
│   │   └── ... (4 more files)
│   └── ... (39 more hook directories)
└── create-hooks.ts                        # Hook composition
```

### Agent Metadata Schema

**File:** `src/agents/types.ts`

```typescript
export interface AgentPromptMetadata {
  category: 'utility' | 'research' | 'implementation' | 'consultation';
  cost: 'FREE' | 'CHEAP' | 'EXPENSIVE';
  useWhen?: string[]; // When to use this agent
  avoidWhen?: string[]; // When NOT to use this agent
  keyTrigger?: string; // Trigger phrase for Phase 0
  triggers: Array<{
    domain: string; // Task domain (e.g., "Architecture decisions")
    trigger: string; // Condition (e.g., "Multi-system tradeoffs")
  }>;
}
```

**Example (Oracle):**

```typescript
export const ORACLE_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'consultation',
  cost: 'EXPENSIVE',
  useWhen: [
    'Complex architecture design',
    'After completing significant work',
    '2+ failed fix attempts',
    'Unfamiliar code patterns',
  ],
  avoidWhen: [
    'Simple file operations',
    'First attempt at any fix',
    'Questions answerable from code',
  ],
  keyTrigger: 'Unfamiliar or complex request → consult Metis before Prometheus',
  triggers: [
    { domain: 'Architecture decisions', trigger: 'Multi-system tradeoffs' },
    { domain: 'Self-review', trigger: 'After significant implementation' },
  ],
};
```

**File:** `src/agents/oracle.ts:5-20`

---

## Summary

OMO's prompt system achieves flexibility through:

1. **Dynamic composition** - Prompts assembled from reusable sections
2. **Context awareness** - Rule injection based on file operations
3. **Mode detection** - Keyword triggers for specialized behaviors
4. **Skill system** - User-installed domain expertise injection
5. **Hook architecture** - 41 lifecycle hooks for granular control
6. **Agent metadata** - Declarative triggers for delegation logic

This enables:

- **Consistent** agent behavior (shared sections)
- **Customizable** workflows (config overrides, skills, rules)
- **Adaptive** prompts (available tools/agents influence instructions)
- **Scalable** architecture (add agents/skills without prompt duplication)

**Next:** [04-adding-agents.md](04-adding-agents.md) - Step-by-step guide to creating custom agents
