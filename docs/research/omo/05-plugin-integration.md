# OMO Plugin Integration with OpenCode SDK

**Last Updated:** 2026-02-15

This document explains how Oh My OpenCode integrates with the OpenCode SDK, implementing lifecycle
hooks, extending the plugin interface, and registering custom tools.

---

## Table of Contents

1. [Overview](#overview)
2. [OpenCode SDK Interface](#opencode-sdk-interface)
3. [OMO Hook Implementation](#omo-hook-implementation)
4. [Hook Composition Architecture](#hook-composition-architecture)
5. [Tool Registration](#tool-registration)
6. [Extension Points](#extension-points)
7. [Plugin Lifecycle](#plugin-lifecycle)
8. [Code Reference](#code-reference)

---

## Overview

**OpenCode** is a CLI-based AI coding assistant with a plugin architecture. Plugins extend OpenCode
by:

- **Intercepting and transforming messages** before they reach the LLM
- **Modifying tool outputs** to inject context
- **Registering custom tools** for specialized tasks
- **Reacting to session lifecycle events** (creation, deletion, compaction)

**Oh My OpenCode** is an OpenCode plugin that transforms the single-agent experience into a
**multi-agent orchestration system**.

### Integration Architecture

```
OpenCode CLI
    ↓
OpenCode SDK (defines 18 hook types)
    ↓
OMO Plugin (implements 41 hooks across 7 event types)
    ↓
11 AI Agents (Sisyphus, Oracle, Librarian, etc.)
```

**Key files:**

- **OpenCode SDK:** `/tmp/opencode/packages/plugin/src/index.ts` (232 lines)
- **OMO Entry Point:** `/tmp/oh-my-opencode/src/index.ts` (plugin factory)
- **OMO Hook Composition:** `/tmp/oh-my-opencode/src/create-hooks.ts` (62 lines)
- **OMO Interface Assembly:** `/tmp/oh-my-opencode/src/plugin-interface.ts` (66 lines)

---

## OpenCode SDK Interface

### Plugin Type Definition

**File:** `/tmp/opencode/packages/plugin/src/index.ts:35`

```typescript
export type Plugin = (input: PluginInput) => Promise<Hooks>;
```

**PluginInput (line 26):**

```typescript
export type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>; // OpenCode API client
  project: Project; // Current project metadata
  directory: string; // Project root directory
  worktree: string; // Git worktree path
  serverUrl: URL; // OpenCode server URL
  $: BunShell; // Shell executor
};
```

**Hooks Interface (line 148):**

```typescript
export interface Hooks {
  event?: (input: { event: Event }) => Promise<void>;
  config?: (input: Config) => Promise<void>;
  tool?: { [key: string]: ToolDefinition };
  auth?: AuthHook;
  'chat.message'?: (input, output) => Promise<void>;
  'chat.params'?: (input, output) => Promise<void>;
  'chat.headers'?: (input, output) => Promise<void>;
  'permission.ask'?: (input, output) => Promise<void>;
  'command.execute.before'?: (input, output) => Promise<void>;
  'tool.execute.before'?: (input, output) => Promise<void>;
  'shell.env'?: (input, output) => Promise<void>;
  'tool.execute.after'?: (input, output) => Promise<void>;
  'experimental.chat.messages.transform'?: (input, output) => Promise<void>;
  'experimental.chat.system.transform'?: (input, output) => Promise<void>;
  'experimental.session.compacting'?: (input, output) => Promise<void>;
  'experimental.text.complete'?: (input, output) => Promise<void>;
  'tool.definition'?: (input, output) => Promise<void>;
}
```

**18 hook types** total (including experimental).

### Hook Type Categories

| Category         | Hooks                                                                  | Purpose                                                    |
| ---------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Lifecycle**    | `event`, `config`                                                      | Session management, config changes                         |
| **Message**      | `chat.message`, `chat.params`, `chat.headers`                          | Intercept/modify LLM inputs                                |
| **Tool**         | `tool`, `tool.execute.before`, `tool.execute.after`, `tool.definition` | Tool registration and I/O transformation                   |
| **Command**      | `command.execute.before`                                               | Slash command interception                                 |
| **Permission**   | `permission.ask`                                                       | Permission gate customization                              |
| **Shell**        | `shell.env`                                                            | Shell environment modification                             |
| **Experimental** | `experimental.*` (4 hooks)                                             | Message transform, system prompt, compaction, autocomplete |

### Key Hook Types (OMO Uses)

#### 1. `chat.message`

**Signature (line 158):**

```typescript
"chat.message"?: (
  input: {
    sessionID: string
    agent?: string
    model?: { providerID: string; modelID: string }
    messageID?: string
    variant?: string
  },
  output: { message: UserMessage; parts: Part[] }
) => Promise<void>
```

**Purpose:** Intercept user messages before LLM processing

**OMO uses for:**

- Keyword detection (`[ultrawork]`, `[analyze-mode]`)
- Todo continuation enforcement
- Prometheus planning triggers
- Atlas workflow management

**Example:** Keyword detector prepends mode instructions to `output.parts[0].text`

#### 2. `tool.execute.after`

**Signature (line 189):**

```typescript
"tool.execute.after"?: (
  input: { tool: string; sessionID: string; callID: string; args: any },
  output: { title: string; output: string; metadata: any }
) => Promise<void>
```

**Purpose:** Post-process tool outputs before LLM sees them

**OMO uses for:**

- Rules injection (after `read`/`write`/`edit`)
- Context injection (AGENTS.md, README)
- Session caching (avoid duplicate injections)

**Example:** Rules injector appends matching rule files to `output.output`

#### 3. `event`

**Signature (line 149):**

```typescript
event?: (input: { event: Event }) => Promise<void>
```

**Purpose:** React to session lifecycle events

**Event types:**

- `session.created`
- `session.deleted`
- `session.compacted`
- `tool.executed`
- `message.sent`
- `agent.switched`
- (more)

**OMO uses for:**

- Background task cleanup on session delete
- Cache invalidation on session compact
- Atlas workflow state tracking

#### 4. `tool`

**Signature (line 151):**

```typescript
tool?: {
  [key: string]: ToolDefinition
}
```

**Purpose:** Register custom tools

**OMO registers:**

- `task` - Delegation tool (main orchestration mechanism)
- `background_output` - Retrieve background task results
- `background_cancel` - Cancel background tasks
- `slashcommand` - Slash command execution
- `ast_grep_search` - AST-aware code search
- `ast_grep_replace` - AST-aware code replacement
- (20+ more tools)

**Example:** `task` tool enables `task(subagent_type="oracle", ...)`

#### 5. `config`

**Signature (line 150):**

```typescript
config?: (input: Config) => Promise<void>
```

**Purpose:** Handle configuration changes

**OMO uses for:**

- Agent registration (dynamic based on config)
- Skill loading
- Category merging
- Hook enablement

---

## OMO Hook Implementation

### Plugin Entry Point

**File:** `/tmp/oh-my-opencode/src/index.ts`

```typescript
import type { Plugin } from '@opencode-ai/plugin';

const plugin: Plugin = async (input) => {
  // 1. Load configuration
  const config = await loadConfig(input.directory);

  // 2. Create managers (background tasks, skills, etc.)
  const managers = createManagers(input, config);

  // 3. Create hooks (41 hooks across 7 types)
  const hooks = createHooks({
    ctx: input,
    pluginConfig: config,
    backgroundManager: managers.background,
    isHookEnabled: managers.hookEnabled,
    // ...
  });

  // 4. Create tools (25+ custom tools)
  const tools = createTools(input, config, managers);

  // 5. Assemble plugin interface
  return createPluginInterface({
    ctx: input,
    pluginConfig: config,
    managers,
    hooks,
    tools,
  });
};

export default plugin;
```

**Flow:**

```
1. Load .opencode/oh-my-opencode.jsonc config
2. Initialize managers (background agent, skill loader, etc.)
3. Compose 41 hooks from modular hook creators
4. Register 25+ custom tools
5. Return Hooks interface to OpenCode
```

### Hook Composition

**File:** `/tmp/oh-my-opencode/src/create-hooks.ts` (62 lines)

**Architecture:**

```typescript
export function createHooks(args) {
  const core = createCoreHooks({
    ctx,
    pluginConfig,
    isHookEnabled,
    safeHookEnabled,
  });

  const continuation = createContinuationHooks({
    ctx,
    pluginConfig,
    isHookEnabled,
    backgroundManager,
    sessionRecovery: core.sessionRecovery,
  });

  const skill = createSkillHooks({
    ctx,
    isHookEnabled,
    mergedSkills,
    availableSkills,
  });

  return {
    ...core,
    ...continuation,
    ...skill,
  };
}
```

**Three hook categories:**

1. **Core hooks** - Essential functionality (rules injection, keyword detection)
2. **Continuation hooks** - Todo tracking, session recovery, boulder mode
3. **Skill hooks** - Skill-specific context injection

**Modular composition** allows:

- Each category in separate file (< 200 LOC)
- Independent enablement via config
- Clean dependency injection
- Easy testing

### Interface Assembly

**File:** `/tmp/oh-my-opencode/src/plugin-interface.ts` (66 lines)

**Maps hooks to OpenCode SDK interface:**

```typescript
export function createPluginInterface(args): PluginInterface {
  const { ctx, pluginConfig, firstMessageVariantGate, managers, hooks, tools } = args;

  return {
    tool: tools, // 25+ custom tools

    'chat.params': createChatParamsHandler({
      anthropicEffort: hooks.anthropicEffort,
    }),

    'chat.message': createChatMessageHandler({
      ctx,
      pluginConfig,
      firstMessageVariantGate,
      hooks,
    }),

    'experimental.chat.messages.transform': createMessagesTransformHandler({
      hooks,
    }),

    config: managers.configHandler,

    event: createEventHandler({
      ctx,
      pluginConfig,
      firstMessageVariantGate,
      managers,
      hooks,
    }),

    'tool.execute.before': createToolExecuteBeforeHandler({
      ctx,
      hooks,
    }),

    'tool.execute.after': createToolExecuteAfterHandler({
      hooks,
    }),
  };
}
```

**Handler pattern:**

Each hook type has a dedicated handler that:

1. Receives OMO-specific hooks (from `createHooks()`)
2. Transforms them into OpenCode SDK format
3. Applies conditional logic (enabled/disabled hooks)
4. Handles error recovery

**Example:** `createChatMessageHandler()` combines:

- Keyword detector hook
- Todo continuation enforcer hook
- Prometheus planning hook
- Atlas workflow hook
- Skill context injection hook

---

## Hook Composition Architecture

### Modular Hook Creators

OMO uses a **factory pattern** for hook creation. Each subsystem has a creator function:

```typescript
export function createRulesInjectorHook(ctx: PluginInput) {
  // Setup
  const truncator = createDynamicTruncator(ctx);
  const cache = createSessionCacheStore();

  // Return hook implementations
  return {
    'tool.execute.after': async (input, output) => {
      // Process rule injection
    },
    event: async ({ event }) => {
      // Handle cache cleanup
    },
  };
}
```

**File:** `src/hooks/rules-injector/hook.ts:32-87`

### Hook Merging

**Utility:** `mergeHooks()`

**Purpose:** Combine multiple hook objects into one

**Pattern:**

```typescript
const hooks = [
  createRulesInjectorHook(input),
  createKeywordDetectorHook(input),
  createTodoContinuationEnforcerHook(input),
  // ... 38 more
];

return mergeHooks(hooks);
```

**Merge strategy:**

- Same hook type from multiple creators → **chain execution**
- Hook returns early/throws → **stops propagation**
- Each hook can read/modify `output` object (mutation-based)

**Example:**

```typescript
// Hook A modifies output.parts
"chat.message": async (input, output) => {
  output.parts[0].text = "[MODE A]\n\n" + output.parts[0].text
}

// Hook B further modifies output.parts
"chat.message": async (input, output) => {
  output.parts[0].text = "[MODE B]\n\n" + output.parts[0].text
}

// Final output.parts[0].text:
// "[MODE B]\n\n[MODE A]\n\n[Original text]"
```

**Execution order:** Array order determines hook chaining (first → last)

### Core Hooks

**File:** `src/plugin/hooks/create-core-hooks.ts`

**Creates:**

1. **Rules injector** - Context injection after file operations
2. **Keyword detector** - Mode detection (`[ultrawork]`, etc.)
3. **Session recovery** - Restore state after crashes
4. **Anthropic effort** - `chat.params` temperature/thinking budget
5. **Serena integration** - IDE language server support

**Returns:**

```typescript
{
  rulesInjector: { "tool.execute.after", event },
  keywordDetector: { "chat.message" },
  sessionRecovery: { event },
  anthropicEffort: { "chat.params" },
  serenaIntegration: { tool },
}
```

### Continuation Hooks

**File:** `src/plugin/hooks/create-continuation-hooks.ts`

**Creates:**

1. **Todo continuation enforcer** - Reminds to complete todos
2. **Boulder mode** - Continuous work until completion
3. **Session state tracking** - Agent/session hierarchy

**Returns:**

```typescript
{
  todoContinuationEnforcer: { "chat.message", event },
  boulderMode: { "chat.message", event },
  sessionStateTracking: { "chat.message", event },
}
```

### Skill Hooks

**File:** `src/plugin/hooks/create-skill-hooks.ts`

**Creates:**

1. **Skill context injector** - Injects SKILL.md content into prompts
2. **MCP manager** - Launches MCP servers from skills
3. **Skill reminder** - Category+skill usage reminders

**Returns:**

```typescript
{
  skillContextInjector: { "chat.message" },
  mcpManager: { tool },
  skillReminder: { "chat.message" },
}
```

---

## Tool Registration

### Tool Definition Schema

**File:** `/tmp/opencode/packages/plugin/src/tool.ts`

```typescript
export type ToolDefinition = {
  description: string;
  parameters: JSONSchema; // JSON Schema object
  execute: (args: any, context: ToolContext) => Promise<ToolResult>;
};

export type ToolContext = {
  sessionID: string;
  callID: string;
  // ... more context
};

export type ToolResult = {
  title: string;
  output: string;
  metadata?: any;
};
```

### OMO Tool Creation

**File:** `src/create-tools.ts`

**Pattern:**

```typescript
export function createTools(
  input: PluginInput,
  config: OhMyOpenCodeConfig,
  managers: Managers,
): ToolsRecord {
  return {
    task: createDelegateTaskTool(input, config, managers),
    background_output: createBackgroundOutputTool(managers.background),
    background_cancel: createBackgroundCancelTool(managers.background),
    slashcommand: createSlashCommandTool(input),
    ast_grep_search: createAstGrepSearchTool(),
    ast_grep_replace: createAstGrepReplaceTool(),
    // ... 20+ more tools
  };
}
```

### Example: Delegate Task Tool

**File:** `src/tools/delegate-task/tools.ts`

**Tool definition:**

```typescript
export function createDelegateTaskTool(
  input: PluginInput,
  config: OhMyOpenCodeConfig,
  managers: Managers,
): ToolDefinition {
  return {
    description: 'Delegate a task to a specialized agent or category',
    parameters: {
      type: 'object',
      properties: {
        subagent_type: { type: 'string', description: 'Agent name' },
        category: { type: 'string', description: 'Task category' },
        load_skills: { type: 'array', items: { type: 'string' } },
        prompt: { type: 'string', description: 'Task prompt' },
        run_in_background: { type: 'boolean' },
        session_id: { type: 'string', description: 'Existing session to continue' },
        // ...
      },
    },
    execute: async (args, context) => {
      // Validation
      validateTaskArgs(args);

      // Launch background or sync
      if (args.run_in_background) {
        const taskID = await managers.background.launch(args);
        return { title: 'Task launched', output: `Task ID: ${taskID}` };
      } else {
        const result = await managers.background.executeSync(args);
        return { title: 'Task completed', output: result.output };
      }
    },
  };
}
```

**Registration:**

```typescript
// In createPluginInterface():
return {
  tool: {
    task: createDelegateTaskTool(...),  // Registered as "task"
    // ...
  },
  // ...
}
```

**Usage from LLM:**

```xml
<function_calls>
  <invoke name="task">
    <parameter name="subagent_type">oracle</parameter>
    <parameter name="prompt">Review this architecture...</parameter>
  </invoke>
</function_calls>
```

---

## Extension Points

### 1. Config Handler (Dynamic Agent Registration)

**Hook:** `config`

**File:** `src/features/config-manager/handler.ts`

**Purpose:** React to config changes, register agents dynamically

**Flow:**

```
User edits .opencode/oh-my-opencode.jsonc
    ↓
OpenCode detects change, calls config hook
    ↓
OMO config handler reloads plugin state
    ↓
Agents re-registered based on new config
    ↓
OpenCode client notified of agent changes
```

**Code:**

```typescript
export function createConfigHandler(input: PluginInput, config: OhMyOpenCodeConfig) {
  return async (newConfig: Config) => {
    // Rebuild agents with new config
    const agents = await createBuiltinAgents(
      newConfig.disabledAgents,
      newConfig.agentOverrides,
      // ...
    );

    // Notify OpenCode client
    await input.client.agent.bulkRegister(agents);
  };
}
```

### 2. Event Handler (Session Lifecycle)

**Hook:** `event`

**File:** `src/plugin/event.ts`

**Handles:**

- `session.created` - Initialize session state
- `session.deleted` - Cleanup caches, cancel background tasks
- `session.compacted` - Invalidate session caches
- `message.sent` - Track conversation flow
- `agent.switched` - Update session agent mapping

**Code:**

```typescript
export function createEventHandler(args) {
  return async ({ event }: { event: Event }) => {
    if (event.type === 'session.deleted') {
      const sessionID = event.properties.info.id;

      // Cancel background tasks
      await managers.background.cancelAllForSession(sessionID);

      // Clear caches
      hooks.rulesInjector.clearSessionCache(sessionID);

      // Clean up state
      hooks.sessionRecovery.removeSession(sessionID);
    }

    if (event.type === 'session.created') {
      const sessionID = event.properties.info.id;

      // Track first message variant gate
      firstMessageVariantGate.markSessionCreated(event.properties.info);
    }

    // ... more event handlers
  };
}
```

### 3. Tool Execute Handlers (Context Injection)

**Hooks:** `tool.execute.before`, `tool.execute.after`

**Files:**

- `src/plugin/tool-execute-before.ts`
- `src/plugin/tool-execute-after.ts`

**Before handler:**

```typescript
export function createToolExecuteBeforeHandler(args) {
  return async (input, output) => {
    // Pre-process tool arguments
    // Normalize file paths, validate inputs, etc.

    // Delegate to registered hooks
    if (hooks.someHook) {
      await hooks.someHook['tool.execute.before'](input, output);
    }
  };
}
```

**After handler:**

```typescript
export function createToolExecuteAfterHandler(args) {
  return async (input, output) => {
    // Post-process tool outputs

    // Rules injection
    if (hooks.rulesInjector) {
      await hooks.rulesInjector['tool.execute.after'](input, output);
    }

    // Context injection
    if (hooks.contextInjector) {
      await hooks.contextInjector['tool.execute.after'](input, output);
    }
  };
}
```

---

## Plugin Lifecycle

### Initialization Sequence

```
1. OpenCode CLI starts
2. OpenCode loads plugin from ~/.opencode/plugins/oh-my-opencode
3. OpenCode calls plugin factory: plugin(input: PluginInput)
4. OMO loads config from .opencode/oh-my-opencode.jsonc
5. OMO creates managers (background, skills, config)
6. OMO creates hooks (41 hooks composed from creators)
7. OMO creates tools (25+ tools registered)
8. OMO assembles plugin interface (Hooks object)
9. OMO returns Hooks to OpenCode
10. OpenCode registers agents, tools, hooks
11. OpenCode ready for user interaction
```

**Duration:** < 1 second (lazy loading for heavy operations)

### Runtime Hook Execution

**Example: User sends message**

```
1. User types message in OpenCode CLI
2. OpenCode calls `chat.message` hook
3. OMO's chatMessageHandler executes:
   a. Keyword detector scans for [ultrawork], etc.
   b. Todo continuation enforcer checks pending todos
   c. Prometheus planner checks for planning triggers
   d. Atlas workflow checks for work plan execution
   e. Skill reminder injects category+skill usage notes
4. All hooks modify output.parts (message text)
5. Modified message sent to LLM
6. LLM response processed
7. OpenCode displays response
```

**Example: User invokes task tool**

```
1. LLM calls task(subagent_type="oracle", ...)
2. OpenCode calls tool.execute (OMO's task tool)
3. Task tool delegates to background manager
4. Background manager:
   a. Validates arguments
   b. Resolves agent config
   c. Injects skills (if load_skills specified)
   d. Creates new session (or continues existing)
   e. Launches agent in background or sync
5. Agent executes with prompt + tools
6. Result returned to main session
7. OpenCode displays result
```

### Cleanup on Exit

```
1. OpenCode CLI receives SIGINT/SIGTERM
2. OpenCode calls plugin cleanup (if registered)
3. OMO background manager cancels all tasks
4. OMO MCP manager shuts down all MCP servers
5. OMO caches persisted to disk (if configured)
6. OpenCode exits
```

---

## Code Reference

### Key Files

| File                                            | LOC  | Purpose                 |
| ----------------------------------------------- | ---- | ----------------------- |
| `/tmp/opencode/packages/plugin/src/index.ts`    | 232  | OpenCode SDK definition |
| `src/index.ts`                                  | ~150 | OMO plugin entry point  |
| `src/plugin-interface.ts`                       | 66   | Interface assembly      |
| `src/create-hooks.ts`                           | 62   | Hook composition        |
| `src/create-tools.ts`                           | ~200 | Tool registration       |
| `src/plugin/hooks/create-core-hooks.ts`         | ~150 | Core hooks              |
| `src/plugin/hooks/create-continuation-hooks.ts` | ~150 | Continuation hooks      |
| `src/plugin/hooks/create-skill-hooks.ts`        | ~100 | Skill hooks             |
| `src/plugin/chat-message.ts`                    | ~200 | Chat message handler    |
| `src/plugin/event.ts`                           | ~150 | Event handler           |
| `src/plugin/tool-execute-after.ts`              | ~100 | Tool post-processor     |

### Hook Implementation Locations

| Hook Type                              | OMO Implementation                       |
| -------------------------------------- | ---------------------------------------- |
| `chat.message`                         | `src/plugin/chat-message.ts`             |
| `chat.params`                          | `src/plugin/chat-params.ts`              |
| `tool.execute.before`                  | `src/plugin/tool-execute-before.ts`      |
| `tool.execute.after`                   | `src/plugin/tool-execute-after.ts`       |
| `event`                                | `src/plugin/event.ts`                    |
| `config`                               | `src/features/config-manager/handler.ts` |
| `tool`                                 | `src/create-tools.ts`                    |
| `experimental.chat.messages.transform` | `src/plugin/messages-transform.ts`       |

### Hook Creator Index

**41 hook creators across these categories:**

1. **Core (src/plugin/hooks/create-core-hooks.ts)**
   - Rules injector
   - Keyword detector
   - Session recovery
   - Anthropic effort
   - Serena integration

2. **Continuation (src/plugin/hooks/create-continuation-hooks.ts)**
   - Todo continuation enforcer
   - Boulder mode
   - Session state tracking

3. **Skills (src/plugin/hooks/create-skill-hooks.ts)**
   - Skill context injector
   - MCP manager
   - Skill reminder

4. **Agent-specific**
   - Atlas hooks (`src/hooks/atlas/`)
   - Prometheus hooks (`src/hooks/prometheus/`)
   - Hephaestus hooks (`src/hooks/hephaestus/`)

5. **Utility**
   - System directive filter
   - First message variant gate
   - Permission compatibility

---

## Summary

OMO's plugin integration demonstrates:

1. **Modular hook architecture** - 41 hooks composed from reusable creators
2. **Clean separation** - Core/continuation/skill hooks in separate modules
3. **Interface adherence** - Strict compliance with OpenCode SDK (18 hook types)
4. **Extension points** - Config handler, event handler, tool registration
5. **Lifecycle management** - Initialization, runtime execution, cleanup
6. **Tool ecosystem** - 25+ custom tools for specialized tasks

This architecture enables:

- **Maintainability** - Each hook < 200 LOC, focused responsibility
- **Testability** - Hooks are pure functions with clear inputs/outputs
- **Extensibility** - Add new hooks without modifying existing code
- **Performance** - Lazy loading, session caching, parallel execution

**Next:** [06-skill-system.md](06-skill-system.md) - Skills, MCPs, and custom creation
