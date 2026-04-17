# Adding Agents to OMO

**Last Updated:** 2026-02-15

This document provides a step-by-step guide to creating and registering custom agents in Oh My
OpenCode.

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Architecture](#agent-architecture)
3. [Step-by-Step: Add a Built-in Agent](#step-by-step-add-a-built-in-agent)
4. [Step-by-Step: Add a Custom Agent](#step-by-step-add-a-custom-agent)
5. [Agent Factory Pattern](#agent-factory-pattern)
6. [Agent Metadata (For Delegation)](#agent-metadata-for-delegation)
7. [Configuration Schema](#configuration-schema)
8. [Testing Your Agent](#testing-your-agent)
9. [Code Reference](#code-reference)

---

## Overview

OMO supports two types of agent additions:

| Type               | Location                                   | Use Case                                        | Complexity |
| ------------------ | ------------------------------------------ | ----------------------------------------------- | ---------- |
| **Built-in Agent** | `src/agents/*.ts`                          | Core system functionality, shipped with plugin  | Medium     |
| **Custom Agent**   | `~/.opencode/agents/`, `.opencode/agents/` | User-specific workflows, project-specific tools | Low        |

**Built-in agents** require code changes and plugin rebuild. **Custom agents** use YAML frontmatter
files and are loaded dynamically.

This guide covers both approaches.

---

## Agent Architecture

### Agent Components

Every agent consists of:

1. **AgentConfig object** (required)
   - `description`: Short summary (used in delegation tables)
   - `prompt`: System prompt defining behavior
   - `model`: LLM model ID (e.g., `anthropic/claude-opus-4.6`)
   - `temperature`: Creativity level (0.0-1.0)
   - `mode`: `"primary"` (user-facing) or `"subagent"` (delegated-only)
   - `tools`: Tool names available to agent (optional)

2. **Prompt metadata** (optional, for delegation)
   - `category`: "advisor" | "research" | "implementation" | "utility"
   - `cost`: "FREE" | "CHEAP" | "EXPENSIVE"
   - `triggers`: When to use this agent (appears in delegation table)
   - `useWhen`: Positive usage scenarios
   - `avoidWhen`: Anti-patterns to prevent misuse

3. **Factory function** (for built-in agents)
   - Function that returns `AgentConfig`
   - Takes `model` parameter (allows config override)
   - Named `createXAgent(model: string): AgentConfig`

### File Structure (Built-in Agent)

**Single-file agent** (simple):

```
src/agents/my-agent.ts
```

**Directory agent** (complex):

```
src/agents/my-agent/
├── index.ts          # Re-exports
├── agent.ts          # Factory function
├── prompt.ts         # Prompt string
└── metadata.ts       # Metadata object
```

**Recommendation:** Start with single-file, split when >200 LOC (excluding prompt strings).

---

## Step-by-Step: Add a Built-in Agent

### Step 1: Create Agent File

**Location:** `src/agents/my-agent.ts`

**Template:**

```typescript
import type { AgentConfig } from '@opencode-ai/sdk';
import type { AgentMode, AgentPromptMetadata } from './types';

const MODE: AgentMode = 'subagent'; // or "primary"

export const MY_AGENT_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'advisor', // or "research", "implementation", "utility"
  cost: 'CHEAP', // or "FREE", "EXPENSIVE"
  promptAlias: 'MyAgent',
  triggers: [{ domain: 'Task domain', trigger: 'When to use this agent' }],
  useWhen: ['Specific scenario 1', 'Specific scenario 2'],
  avoidWhen: ['Anti-pattern 1', 'Anti-pattern 2'],
};

const MY_AGENT_SYSTEM_PROMPT = `You are a specialized agent for [purpose].

<context>
[Agent's role in the OMO ecosystem]
</context>

<expertise>
Your expertise covers:
- Capability 1
- Capability 2
</expertise>

<output_format>
[How agent should structure responses]
</output_format>
`;

export function createMyAgent(model: string): AgentConfig {
  return {
    description: 'Short description for delegation table',
    mode: MODE,
    model,
    temperature: 0.1, // Adjust based on task (0=deterministic, 1=creative)
    prompt: MY_AGENT_SYSTEM_PROMPT,
    tools: ['read', 'grep', 'glob'], // Optional: restrict tools
  };
}

// Static property for mode checking
createMyAgent.mode = MODE;
```

**Real example:** `src/agents/oracle.ts` (145 lines total, ~100 LOC excluding prompt)

### Step 2: Register in Agent Sources

**File:** `src/agents/builtin-agents.ts`

**Add to `agentSources` object** (line 28):

```typescript
const agentSources: Record<BuiltinAgentName, AgentSource> = {
  sisyphus: createSisyphusAgent,
  hephaestus: createHephaestusAgent,
  oracle: createOracleAgent,
  librarian: createLibrarianAgent,
  explore: createExploreAgent,
  'multimodal-looker': createMultimodalLookerAgent,
  metis: createMetisAgent,
  momus: createMomusAgent,
  atlas: createAtlasAgent as AgentFactory,
  'my-agent': createMyAgent, // ADD THIS LINE
};
```

**Add metadata** (line 46):

```typescript
const agentMetadata: Partial<Record<BuiltinAgentName, AgentPromptMetadata>> = {
  oracle: ORACLE_PROMPT_METADATA,
  librarian: LIBRARIAN_PROMPT_METADATA,
  explore: EXPLORE_PROMPT_METADATA,
  'multimodal-looker': MULTIMODAL_LOOKER_PROMPT_METADATA,
  metis: metisPromptMetadata,
  momus: momusPromptMetadata,
  atlas: atlasPromptMetadata,
  'my-agent': MY_AGENT_PROMPT_METADATA, // ADD THIS LINE
};
```

### Step 3: Update Schema

**File:** `src/config/schema/agent-names.ts`

**Add to `BuiltinAgentNameSchema`** (line 3):

```typescript
export const BuiltinAgentNameSchema = z.enum([
  'sisyphus',
  'hephaestus',
  'prometheus',
  'oracle',
  'librarian',
  'explore',
  'multimodal-looker',
  'metis',
  'momus',
  'atlas',
  'my-agent', // ADD THIS LINE
]);
```

**Add to `OverridableAgentNameSchema`** (line 24):

```typescript
export const OverridableAgentNameSchema = z.enum([
  'build',
  'plan',
  'sisyphus',
  'hephaestus',
  'sisyphus-junior',
  'OpenCode-Builder',
  'prometheus',
  'metis',
  'momus',
  'oracle',
  'librarian',
  'explore',
  'multimodal-looker',
  'atlas',
  'my-agent', // ADD THIS LINE
]);
```

### Step 4: Export Agent

**File:** `src/agents/index.ts`

**Add export:**

```typescript
export { createMyAgent, MY_AGENT_PROMPT_METADATA } from './my-agent';
```

### Step 5: Test and Use

**Rebuild plugin:**

```bash
pnpm build
```

**Invoke agent:**

```typescript
task(
  (subagent_type = 'my-agent'),
  (load_skills = []),
  (run_in_background = false),
  (description = 'Test my agent'),
  (prompt = 'Hello, agent!'),
);
```

**Override model in config:**

`.opencode/oh-my-opencode.jsonc`:

```jsonc
{
  "agentOverrides": {
    "my-agent": {
      "model": "anthropic/claude-sonnet-4.5",
    },
  },
}
```

---

## Step-by-Step: Add a Custom Agent

Custom agents are **simpler** — no code changes required. They use YAML frontmatter files loaded
dynamically.

### Step 1: Create Agent File

**Location:** `~/.opencode/agents/my-agent/AGENT.md` (global) or
`.opencode/agents/my-agent/AGENT.md` (project)

**Format:**

```markdown
---
name: my-agent
description: Custom agent for specialized task X
model: anthropic/claude-opus-4.6
temperature: 0.1
mode: subagent
---

# System Prompt

You are a custom agent specialized in [domain].

## Your Role

[Agent's responsibilities]

## Available Tools

You have access to: [list tools]

## Output Format

[How to structure responses]
```

**YAML frontmatter fields:**

| Field         | Required | Type                        | Example                         |
| ------------- | -------- | --------------------------- | ------------------------------- |
| `name`        | Yes      | string                      | `"my-agent"`                    |
| `description` | Yes      | string                      | `"Custom debugger"`             |
| `model`       | No       | string                      | `"anthropic/claude-sonnet-4.5"` |
| `temperature` | No       | number                      | `0.1`                           |
| `mode`        | No       | `"primary"` \| `"subagent"` | `"subagent"` (default)          |

**Markdown body:** System prompt (everything after `---`)

### Step 2: Use Custom Agent

**Invoke:**

```typescript
task(
  (subagent_type = 'my-agent'),
  (load_skills = []),
  (run_in_background = false),
  (description = 'Test custom agent'),
  (prompt = 'Analyze this error...'),
);
```

**Verify loaded:**

Custom agents appear in Sisyphus's delegation table automatically when discovered.

**Agent discovery locations:**

1. `~/.opencode/agents/` (user-global)
2. `.opencode/agents/` (project-local)
3. Plugin reads `AGENT.md` files in these directories

**Code reference:** `src/agents/custom-agent-summaries.ts` (parsing),
`src/agents/builtin-agents.ts:107-122` (registration)

### Custom Agent Metadata

OMO auto-generates metadata for custom agents:

```typescript
export function buildCustomAgentMetadata(name: string, description: string): AgentPromptMetadata {
  return {
    category: 'utility',
    cost: 'CHEAP',
    promptAlias: name,
    triggers: [{ domain: 'Custom', trigger: description }],
    useWhen: [],
    avoidWhen: [],
  };
}
```

**File:** `src/agents/custom-agent-summaries.ts:23-34`

Custom agents always appear as "CHEAP utility" agents in delegation tables.

---

## Agent Factory Pattern

### Standard Factory

**Pattern:**

```typescript
export function createAgentName(model: string): AgentConfig {
  return {
    description: 'Agent description',
    mode: 'subagent',
    model,
    temperature: 0.1,
    prompt: SYSTEM_PROMPT,
    tools: ['read', 'grep'], // Optional
  };
}

// Static property for mode checking
createAgentName.mode = 'subagent';
```

**Why static property?**

Allows checking agent mode without calling factory:

```typescript
if (createOracleAgent.mode === 'subagent') {
  // Oracle is subagent-only
}
```

**Code reference:** `src/agents/types.ts:22-30` (AgentFactory type)

### Advanced Factory (with Context)

Some agents need orchestrator context (e.g., Atlas):

```typescript
export function createAtlasAgent(ctx: OrchestratorContext): AgentConfig {
  return {
    description: 'Work plan executor',
    mode: 'primary',
    model: ctx.uiSelectedModel ?? ctx.defaultModel,
    temperature: 0.0,
    prompt: buildAtlasPrompt(ctx.availableAgents, ctx.availableSkills),
    tools: ctx.availableTools,
  };
}
```

**File:** `src/agents/atlas/agent.ts:95-110`

**OrchestratorContext type:**

```typescript
interface OrchestratorContext {
  defaultModel: string;
  uiSelectedModel?: string;
  availableAgents: AvailableAgent[];
  availableSkills: AvailableSkill[];
  availableCategories: AvailableCategory[];
  availableTools: string[];
  mergedCategories: CategoriesConfig;
  directory?: string;
}
```

**Usage:** For agents that need dynamic prompts based on system state.

---

## Agent Metadata (For Delegation)

Metadata enables **automatic delegation table generation** in Sisyphus's prompt.

### Metadata Schema

**Type:** `AgentPromptMetadata` (`src/agents/types.ts:32-47`)

```typescript
export interface AgentPromptMetadata {
  category: 'utility' | 'research' | 'implementation' | 'advisor';
  cost: 'FREE' | 'CHEAP' | 'EXPENSIVE';
  promptAlias?: string; // Display name (defaults to agent name)
  keyTrigger?: string; // Phase 0 trigger (e.g., "External library → fire librarian")
  triggers: Array<{
    domain: string; // Task domain (e.g., "Architecture decisions")
    trigger: string; // Condition (e.g., "Multi-system tradeoffs")
  }>;
  useWhen?: string[]; // Positive usage scenarios
  avoidWhen?: string[]; // Anti-patterns
}
```

### Example: Oracle Metadata

**File:** `src/agents/oracle.ts:8-32`

```typescript
export const ORACLE_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'advisor',
  cost: 'EXPENSIVE',
  promptAlias: 'Oracle',
  triggers: [
    { domain: 'Architecture decisions', trigger: 'Multi-system tradeoffs, unfamiliar patterns' },
    { domain: 'Self-review', trigger: 'After completing significant implementation' },
    { domain: 'Hard debugging', trigger: 'After 2+ failed fix attempts' },
  ],
  useWhen: [
    'Complex architecture design',
    'After completing significant work',
    '2+ failed fix attempts',
    'Unfamiliar code patterns',
    'Security/performance concerns',
    'Multi-system tradeoffs',
  ],
  avoidWhen: [
    'Simple file operations (use direct tools)',
    'First attempt at any fix (try yourself first)',
    "Questions answerable from code you've read",
    'Trivial decisions (variable names, formatting)',
    'Things you can infer from existing code patterns',
  ],
};
```

### Effect in Sisyphus Prompt

**Delegation Table:**

```markdown
| Domain                 | Delegate To | Trigger                                     |
| ---------------------- | ----------- | ------------------------------------------- |
| Architecture decisions | `oracle`    | Multi-system tradeoffs, unfamiliar patterns |
| Self-review            | `oracle`    | After completing significant implementation |
| Hard debugging         | `oracle`    | After 2+ failed fix attempts                |
```

**Tool & Agent Selection:**

```markdown
| Resource       | Cost      | When to Use                                                                       |
| -------------- | --------- | --------------------------------------------------------------------------------- |
| `oracle` agent | EXPENSIVE | Read-only, expensive, high-quality reasoning model for debugging and architecture |
```

**Oracle Section:**

```markdown
### WHEN to Consult:

| Trigger                           | Action                       |
| --------------------------------- | ---------------------------- |
| Complex architecture design       | Oracle FIRST, then implement |
| After completing significant work | Oracle FIRST, then implement |
| 2+ failed fix attempts            | Oracle FIRST, then implement |

...

### WHEN NOT to Consult:

- Simple file operations (use direct tools)
- First attempt at any fix (try yourself first) ...
```

**Builder function:** `src/agents/dynamic-agent-prompt-builder.ts:313-339` (`buildOracleSection()`)

---

## Configuration Schema

### Schema File Structure

**File:** `src/config/schema/agent-names.ts` (45 lines)

**Three schemas:**

1. **BuiltinAgentNameSchema** - Agents that exist in code (line 3)
2. **BuiltinSkillNameSchema** - Skills that exist in code (line 16)
3. **OverridableAgentNameSchema** - Agents configurable via `.opencode/oh-my-opencode.jsonc`
   (line 24)

**Zod validation:**

```typescript
import { z } from 'zod';

export const BuiltinAgentNameSchema = z.enum([
  'sisyphus',
  'hephaestus',
  // ...
]);

export const OverridableAgentNameSchema = z.enum([
  'build',
  'plan',
  'sisyphus',
  // ...
]);

export type AgentName = z.infer<typeof BuiltinAgentNameSchema>;
```

**Why two schemas?**

- **BuiltinAgentNameSchema**: Internal validation (knows which agents exist)
- **OverridableAgentNameSchema**: User-facing (knows which agents can be customized)

Some agents (e.g., `build`, `plan`) are configurable but not built-in (they're dynamically created).

### Config Override Schema

**File:** `src/config/schema/index.ts`

**Agent override structure:**

```typescript
const AgentOverrideSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  prompt: z.string().optional(),
  description: z.string().optional(),
});

const ConfigSchema = z.object({
  agentOverrides: z.record(OverridableAgentNameSchema, AgentOverrideSchema).optional(),
  disabledAgents: z.array(z.string()).optional(),
  // ...
});
```

**User config example:**

`.opencode/oh-my-opencode.jsonc`:

```jsonc
{
  "agentOverrides": {
    "oracle": {
      "model": "anthropic/claude-opus-4.6",
      "temperature": 0.0,
      "prompt": "Custom Oracle prompt...",
    },
  },
  "disabledAgents": ["multimodal-looker"],
}
```

---

## Testing Your Agent

### 1. Unit Test (Optional)

**Location:** `src/agents/my-agent.test.ts`

**Template:**

```typescript
import { describe, it, expect } from 'vitest';
import { createMyAgent } from './my-agent';

describe('createMyAgent', () => {
  it('returns valid AgentConfig', () => {
    const config = createMyAgent('anthropic/claude-sonnet-4.5');

    expect(config.description).toBeDefined();
    expect(config.mode).toBe('subagent');
    expect(config.model).toBe('anthropic/claude-sonnet-4.5');
    expect(config.prompt).toContain('You are a specialized agent');
  });

  it('has correct mode property', () => {
    expect(createMyAgent.mode).toBe('subagent');
  });
});
```

### 2. Integration Test (Manual)

**Build plugin:**

```bash
pnpm build
```

**Launch OpenCode:**

```bash
opencode
```

**Invoke agent:**

```
@sisyphus Delegate a test task to my-agent: "Analyze the package.json file"
```

**Expected flow:**

1. Sisyphus calls `task(subagent_type="my-agent", ...)`
2. Background manager launches agent
3. Agent executes with prompt + available tools
4. Result returned to Sisyphus

**Verify:**

- Agent appears in delegation table (check Sisyphus prompt via debug mode)
- Agent executes without errors
- Agent output matches expected format

### 3. Check Delegation Table

**Enable debug logging:**

`.opencode/oh-my-opencode.jsonc`:

```jsonc
{
  "debug": true,
}
```

**Look for:** "Building Sisyphus prompt with X agents" in logs

**Verify metadata:**

```
Tool & Agent Selection:
| Resource | Cost | When to Use |
|----------|------|-------------|
| my-agent | CHEAP | [Your description] |
```

---

## Code Reference

### Key Files for Agent Addition

| File                                         | Purpose              | Lines |
| -------------------------------------------- | -------------------- | ----- |
| `src/agents/builtin-agents.ts`               | Agent registry       | 183   |
| `src/agents/types.ts`                        | Type definitions     | ~100  |
| `src/config/schema/agent-names.ts`           | Validation schemas   | 45    |
| `src/agents/dynamic-agent-prompt-builder.ts` | Section builders     | 433   |
| `src/agents/custom-agent-summaries.ts`       | Custom agent parsing | ~100  |

### Example Agents (Study These)

**Simple subagent:**

- **explore** (`src/agents/explore.ts`) - 115 lines total, ~50 LOC
- **librarian** (`src/agents/librarian.ts`) - 111 lines total, ~60 LOC

**Complex subagent:**

- **oracle** (`src/agents/oracle.ts`) - 145 lines total, ~100 LOC
- **metis** (`src/agents/metis.ts`) - 312 lines total, ~150 LOC (excluding prompt)

**Primary agent:**

- **sisyphus** (`src/agents/sisyphus.ts`) - 516 lines total (heavily dynamic)
- **atlas** (`src/agents/atlas/`) - Directory structure, 95+ lines in `agent.ts`

**Custom agent:**

- `.opencode/agents/*/AGENT.md` - YAML frontmatter format

### Registration Flow

```
1. src/agents/my-agent.ts                   → Define factory + metadata
2. src/agents/builtin-agents.ts:28          → Add to agentSources
3. src/agents/builtin-agents.ts:46          → Add to agentMetadata
4. src/config/schema/agent-names.ts:3       → Add to BuiltinAgentNameSchema
5. src/config/schema/agent-names.ts:24      → Add to OverridableAgentNameSchema
6. src/agents/index.ts                      → Export factory
7. pnpm build                               → Rebuild plugin
8. task(subagent_type="my-agent", ...)      → Use agent
```

### Metadata → Prompt Flow

```
1. src/agents/my-agent.ts                              → Define MY_AGENT_PROMPT_METADATA
2. src/agents/builtin-agents.ts:46                     → Register in agentMetadata
3. src/agents/builtin-agents.ts:56 (createBuiltinAgents) → Collect into availableAgents
4. src/agents/sisyphus.ts                              → Pass availableAgents to builders
5. src/agents/dynamic-agent-prompt-builder.ts          → Build delegation sections
6. Sisyphus prompt                                     → Include delegation table
```

---

## Summary

**Built-in agent (5 steps):**

1. Create `src/agents/my-agent.ts` with factory + metadata
2. Register in `src/agents/builtin-agents.ts` (`agentSources`, `agentMetadata`)
3. Update `src/config/schema/agent-names.ts` (both enums)
4. Export in `src/agents/index.ts`
5. Rebuild plugin (`pnpm build`)

**Custom agent (1 step):**

1. Create `~/.opencode/agents/my-agent/AGENT.md` with YAML frontmatter + markdown prompt

**Key considerations:**

- **Mode:** `"primary"` (user-facing) vs `"subagent"` (delegate-only)
- **Cost:** Affects delegation table ordering (FREE → CHEAP → EXPENSIVE)
- **Metadata:** Powers Sisyphus's delegation logic (triggers, useWhen, avoidWhen)
- **Tools:** Restrict via `tools` array if needed (default: all tools)
- **Temperature:** 0.0-0.2 (deterministic), 0.5-0.7 (balanced), 0.8-1.0 (creative)

**Next:** [05-plugin-integration.md](05-plugin-integration.md) - How OMO integrates with OpenCode
SDK
