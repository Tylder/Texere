# OMO Complete Code Reference

## Quick Navigation

- [Core Files](#core-files)
- [Agent Implementations](#agent-implementations)
- [Hook Implementations](#hook-implementations)
- [Tool Implementations](#tool-implementations)
- [Feature Modules](#feature-modules)
- [Configuration](#configuration)
- [Types and Schemas](#types-and-schemas)
- [Utilities](#utilities)

## Core Files

### Plugin Entry Points

| File                      | Lines | Description                                             |
| ------------------------- | ----- | ------------------------------------------------------- |
| `src/index.ts`            | 106   | Main plugin entry, exports `OhMyOpenCodePlugin: Plugin` |
| `src/create-hooks.ts`     | 62    | Hook orchestration: `createHooks()`                     |
| `src/create-tools.ts`     | 54    | Tool registry: `createTools()`                          |
| `src/create-managers.ts`  | 80    | Manager initialization: `createManagers()`              |
| `src/plugin-interface.ts` | 66    | Plugin assembly: `createPluginInterface()`              |
| `src/plugin-config.ts`    | ~200  | Config loading: `loadPluginConfig()`                    |

**Key Exports:**

```typescript
// src/index.ts
export default OhMyOpenCodePlugin: Plugin
export type { OhMyOpenCodeConfig, AgentName, HookName, ... }

// src/create-hooks.ts
export type CreatedHooks = ReturnType<typeof createHooks>
export function createHooks(args): CreatedHooks

// src/create-tools.ts
export type CreateToolsResult
export async function createTools(args): Promise<CreateToolsResult>
```

## Agent Implementations

### Primary Agents

| Agent          | File                       | Lines | Factory Function               | Metadata                     |
| -------------- | -------------------------- | ----- | ------------------------------ | ---------------------------- |
| **Sisyphus**   | `src/agents/sisyphus.ts`   | ~800  | `createSisyphusAgent(model)`   | `SISYPHUS_PROMPT_METADATA`   |
| **Hephaestus** | `src/agents/hephaestus.ts` | ~600  | `createHephaestusAgent(model)` | `HEPHAESTUS_PROMPT_METADATA` |
| **Atlas**      | `src/agents/atlas/`        | 1976  | `createAtlasAgent(ctx)`        | `ATLAS_PROMPT_METADATA`      |
| **Prometheus** | `src/agents/prometheus/`   | ~1500 | `createPrometheusAgent(model)` | `PROMETHEUS_PROMPT_METADATA` |

**Atlas Structure:**

```
src/agents/atlas/
├── agent.ts              # createAtlasAgent(), getAtlasPrompt()
├── default.ts            # getDefaultAtlasPrompt() - Claude version
├── gpt.ts               # getGptAtlasPrompt() - GPT version
├── prompt-section-builder.ts  # Shared utilities
└── index.ts             # Exports
```

### Subagents

| Agent                 | File                              | Function                             | Temperature |
| --------------------- | --------------------------------- | ------------------------------------ | ----------- |
| **Oracle**            | `src/agents/oracle.ts`            | `createOracleAgent(model)`           | 0.1         |
| **Librarian**         | `src/agents/librarian.ts`         | `createLibrarianAgent(model)`        | 0.1         |
| **Explore**           | `src/agents/explore.ts`           | `createExploreAgent(model)`          | 0.1         |
| **Multimodal Looker** | `src/agents/multimodal-looker.ts` | `createMultimodalLookerAgent(model)` | 0.1         |
| **Metis**             | `src/agents/metis.ts`             | `createMetisAgent(model)`            | 0.3         |
| **Momus**             | `src/agents/momus.ts`             | `createMomusAgent(model)`            | 0.1         |

### Category Executor

| Agent               | File                          | Function                         |
| ------------------- | ----------------------------- | -------------------------------- |
| **Sisyphus-Junior** | `src/agents/sisyphus-junior/` | `createSisyphusJuniorAgent(ctx)` |

**Sisyphus-Junior Structure:**

```
src/agents/sisyphus-junior/
├── agent.ts              # Factory with model-specific routing
├── default.ts            # buildDefaultPrompt() - Claude
├── gpt.ts               # buildGptPrompt() - GPT
└── index.ts             # Exports
```

### Agent Registration

**File:** `src/agents/builtin-agents.ts`

```typescript
const agentSources: Record<BuiltinAgentName, AgentSource> = {
  sisyphus: createSisyphusAgent,
  hephaestus: createHephaestusAgent,
  oracle: createOracleAgent,
  librarian: createLibrarianAgent,
  explore: createExploreAgent,
  "multimodal-looker": createMultimodalLookerAgent,
  metis: createMetisAgent,
  momus: createMomusAgent,
  atlas: createAtlasAgent,
  // sisyphus-junior handled separately
}

const agentMetadata: Partial<Record<BuiltinAgentName, AgentPromptMetadata>> = {
  oracle: ORACLE_PROMPT_METADATA,
  librarian: LIBRARIAN_PROMPT_METADATA,
  explore: EXPLORE_PROMPT_METADATA,
  // ...
}

export async function createBuiltinAgents(...): Promise<Map<string, AgentConfig>>
```

### Agent Utilities

**File:** `src/agents/agent-builder.ts`

```typescript
export function buildAgent(
  source: AgentSource, // Factory or AgentConfig
  model: string,
  categories?: CategoriesConfig,
  gitMasterConfig?: GitMasterConfig,
  browserProvider?: BrowserAutomationProvider,
  disabledSkills?: Set<string>,
): AgentConfig;
```

**File:** `src/agents/dynamic-agent-prompt-builder.ts`

```typescript
export interface AvailableAgent {
  name: string;
  description: string;
  metadata: AgentPromptMetadata;
}

export function buildKeyTriggersSection(agents: AvailableAgent[]): string;
export function buildToolSelectionTable(agents, tools): string;
export function buildExploreSection(agents): string;
export function buildLibrarianSection(agents): string;
export function buildDelegationTable(agents): string;
export function buildCategorySkillsDelegationGuide(): string;
export function buildOracleSection(agents): string;
```

## Hook Implementations

### Core Hooks (`src/hooks/`)

| Hook                                        | Files                                      | Lines | Description                                      |
| ------------------------------------------- | ------------------------------------------ | ----- | ------------------------------------------------ |
| **keyword-detector**                        | `keyword-detector/`                        | 1665  | Detects ultrawork, ulw, search, analyze keywords |
| **todo-continuation-enforcer**              | `todo-continuation-enforcer/`              | 2061  | Enforces task completion (boulder mechanism)     |
| **comment-checker**                         | `comment-checker/`                         | ~300  | Validates AI-generated comments                  |
| **rules-injector**                          | `rules-injector/`                          | 1604  | Injects .claude/rules/\*.md files                |
| **directory-agents-injector**               | `directory-agents-injector/`               | ~400  | Injects AGENTS.md from hierarchy                 |
| **directory-readme-injector**               | `directory-readme-injector/`               | ~400  | Injects README.md files                          |
| **atlas**                                   | `atlas/`                                   | 1976  | Atlas orchestration hooks                        |
| **ralph-loop**                              | `ralph-loop/`                              | 1687  | Iterative refinement loop                        |
| **think-mode**                              | `think-mode/`                              | 1365  | Extended thinking mode                           |
| **session-recovery**                        | `session-recovery/`                        | 1279  | Auto error recovery                              |
| **claude-code-hooks**                       | `claude-code-hooks/`                       | 2110  | Claude Code compatibility                        |
| **context-window-monitor**                  | `context-window-monitor.ts`                | ~150  | Context usage tracking                           |
| **anthropic-context-window-limit-recovery** | `anthropic-context-window-limit-recovery/` | 2232  | Multi-strategy recovery                          |

### Hook Structure Example

**File:** `src/hooks/keyword-detector/hook.ts`

```typescript
export function createKeywordDetectorHook(args: {
  ctx: PluginContext;
  pluginConfig: OhMyOpenCodeConfig;
  isHookEnabled: (name: HookName) => boolean;
  safeHookEnabled: boolean;
}): { keywordDetector: ChatMessageHook | null } {
  if (!args.isHookEnabled('keyword-detector')) {
    return { keywordDetector: null };
  }

  return {
    keywordDetector: async (input, output) => {
      const messages = detectKeywords(output.parts);
      if (messages.length > 0) {
        // Inject keyword-specific messages
      }
    },
  };
}
```

### Hook Registration

**File:** `src/plugin/hooks/create-core-hooks.ts`

```typescript
export function createCoreHooks(args) {
  return {
    sessionRecovery: createSessionRecoveryHook(args),
    contextWindowMonitor: createContextWindowMonitorHook(args),
    thinkMode: createThinkModeHook(args),
    // ... 15+ more hooks
  };
}
```

**File:** `src/plugin/hooks/create-continuation-hooks.ts`

```typescript
export function createContinuationHooks(args) {
  return {
    todoContinuationEnforcer: createTodoContinuationEnforcerHook(args),
    stopContinuationGuard: createStopContinuationGuardHook(args),
    ralphLoop: createRalphLoopHook(args),
    // ... more continuation hooks
  };
}
```

## Tool Implementations

### Delegation Tools

| Tool                  | File                                             | Description             |
| --------------------- | ------------------------------------------------ | ----------------------- |
| **task**              | `src/tools/delegate-task/tools.ts`               | Main delegation tool    |
| **call_omo_agent**    | `src/tools/call-omo-agent/`                      | Direct agent invocation |
| **background_output** | `src/tools/background-task/background-output.ts` | Retrieve task results   |
| **background_cancel** | `src/tools/background-task/background-cancel.ts` | Cancel tasks            |

**Delegate Task Structure:**

```
src/tools/delegate-task/
├── tools.ts                    # createDelegateTask()
├── executor.ts                 # Execution strategy exports
├── background-task.ts          # executeBackgroundTask()
├── sync-task.ts               # executeSyncTask()
├── sync-continuation.ts       # executeSyncContinuation()
├── background-continuation.ts # executeBackgroundContinuation()
├── category-resolver.ts       # resolveCategoryExecution()
├── subagent-resolver.ts       # resolveSubagentExecution()
├── parent-context-resolver.ts # resolveParentContext()
├── skill-resolver.ts          # resolveSkillContent()
├── constants.ts               # Category prompt appends (569 lines)
└── types.ts                   # DelegateTaskArgs, ExecutorContext
```

### LSP Tools

**File:** `src/tools/lsp/tools.ts`

```typescript
export function createLspTools(options): ToolDefinition[] {
  return [
    createLspGotoDefinitionTool(),
    createLspFindReferencesTool(),
    createLspSymbolsTool(),
    createLspDiagnosticsTool(),
    createLspPrepareRenameTool(),
    createLspRenameTool(),
  ];
}
```

**Individual Tool Files:**

- `src/tools/lsp/goto-definition.ts`
- `src/tools/lsp/find-references.ts`
- `src/tools/lsp/symbols.ts`
- `src/tools/lsp/diagnostics.ts`
- `src/tools/lsp/rename.ts`

### AST-Grep Tools

**File:** `src/tools/ast-grep/tools.ts`

```typescript
export function createAstGrepTools(): ToolDefinition[] {
  return [createAstGrepSearchTool(), createAstGrepReplaceTool()];
}
```

### Other Tools

| Category        | File                          | Tools                                            |
| --------------- | ----------------------------- | ------------------------------------------------ |
| **Search**      | `src/tools/grep/`             | `grep`, `glob`                                   |
| **Interactive** | `src/tools/interactive-bash/` | `interactive-bash` (tmux)                        |
| **Skills**      | `src/tools/skill/`            | `skill`, `skill_mcp`                             |
| **Session**     | `src/tools/session-manager/`  | `session_list`, `session_read`, `session_search` |
| **Commands**    | `src/tools/slashcommand/`     | `slashcommand`                                   |
| **Look**        | `src/tools/look-at/`          | `look_at` (multimodal)                           |

## Feature Modules

### Background Agent System

**Main File:** `src/features/background-agent/manager.ts` (1,646 lines)

```typescript
export class BackgroundManager {
  constructor(ctx: PluginInput, config?: BackgroundTaskConfig, options?);

  async launch(input: LaunchInput): Promise<BackgroundTask>;
  async resume(input: ResumeInput): Promise<BackgroundTask>;
  getTask(taskId: string): BackgroundTask | undefined;

  private async startTask(item: QueueItem): Promise<void>;
  private async pollRunningTasks(): Promise<void>;
  private async notifyParentSession(task: BackgroundTask): Promise<void>;
  private processKey(key: string): Promise<void>;
  private getConcurrencyKeyFromInput(input: LaunchInput): string;
}
```

**Supporting Files:**

- `src/features/background-agent/concurrency.ts` — `ConcurrencyManager` class
- `src/features/background-agent/task-poller.ts` — `checkAndInterruptStaleTasks()`
- `src/features/background-agent/notify-parent-session.ts` — `notifyParentSession()`
- `src/features/background-agent/task-history.ts` — `TaskHistory` class
- `src/features/background-agent/types.ts` — Type definitions
- `src/features/background-agent/constants.ts` — Timing constants

### Built-in Skills

**Location:** `src/features/builtin-skills/`

```
builtin-skills/
├── skills/
│   ├── git-master.ts           # Git master skill
│   ├── playwright.ts           # Browser automation
│   ├── frontend-ui-ux.ts       # UI/UX skill
│   ├── dev-browser.ts          # Dev browser skill
│   └── index.ts
├── git-master/
│   └── SKILL.md                # Git master documentation
├── frontend-ui-ux/
│   └── SKILL.md
├── dev-browser/
│   └── SKILL.md
├── agent-browser/
│   └── SKILL.md
├── skills.ts                   # Skill loader
├── types.ts
└── index.ts
```

**Key Functions:**

```typescript
// src/features/builtin-skills/skills.ts
export function getBuiltinSkills(options): LoadedSkill[];
export function resolveSkillByName(name: string, options): LoadedSkill | null;
```

### Claude Code Compatibility

**Files:**

- `src/features/claude-code-agent-loader/` — Agent loader
- `src/features/claude-code-command-loader/` — Command loader
- `src/features/claude-code-mcp-loader/` — MCP loader
- `src/features/claude-code-plugin-loader/` — Plugin loader
- `src/features/claude-code-session-state/` — Session state tracking
- `src/features/claude-tasks/` — Task system

### Other Features

| Feature                   | Location                              | Description                |
| ------------------------- | ------------------------------------- | -------------------------- |
| **Context Injector**      | `src/features/context-injector/`      | Message context injection  |
| **Hook Message Injector** | `src/features/hook-message-injector/` | Synthetic message creation |
| **Skill MCP Manager**     | `src/features/skill-mcp-manager/`     | MCP-based skill management |
| **Task Toast Manager**    | `src/features/task-toast-manager/`    | UI toast notifications     |
| **Tool Metadata Store**   | `src/features/tool-metadata-store/`   | Tool metadata caching      |
| **Tmux Subagent**         | `src/features/tmux-subagent/`         | Tmux integration           |
| **Boulder State**         | `src/features/boulder-state/`         | Work plan state tracking   |

## Configuration

### Schema Files

**Location:** `src/config/schema/`

| File                       | Exports                                             |
| -------------------------- | --------------------------------------------------- |
| `oh-my-opencode-config.ts` | `OhMyOpenCodeConfigSchema`                          |
| `agent-names.ts`           | `BuiltinAgentNameSchema`                            |
| `agent-overrides.ts`       | `AgentOverrideConfigSchema`, `AgentOverridesSchema` |
| `background-task.ts`       | `BackgroundTaskConfigSchema`                        |
| `browser-automation.ts`    | `BrowserAutomationProviderSchema`                   |
| `categories.ts`            | `CategoriesConfigSchema`, `CategoryConfigSchema`    |
| `git-master.ts`            | `GitMasterConfigSchema`                             |
| `hook-names.ts`            | `HookNameSchema`                                    |
| `mcp-names.ts`             | `McpNameSchema`                                     |
| `command-names.ts`         | `BuiltinCommandNameSchema`                          |
| `tmux.ts`                  | `TmuxConfigSchema`                                  |
| `experimental.ts`          | `ExperimentalConfigSchema`                          |

**Main Config Schema:**

```typescript
// src/config/schema/oh-my-opencode-config.ts
export const OhMyOpenCodeConfigSchema = z.object({
  agents: AgentOverridesSchema.optional(),
  disabled_agents: z.array(BuiltinAgentNameSchema).optional(),
  disabled_hooks: z.array(HookNameSchema).optional(),
  mcps: z.record(z.string(), z.unknown()).optional(),
  backgroundTask: BackgroundTaskConfigSchema.optional(),
  tmux: TmuxConfigSchema.optional(),
  categories: CategoriesConfigSchema.optional(),
  gitMaster: GitMasterConfigSchema.optional(),
  experimental: ExperimentalConfigSchema.optional(),
});

export type OhMyOpenCodeConfig = z.infer<typeof OhMyOpenCodeConfigSchema>;
```

### Config Handlers

**Location:** `src/plugin-handlers/`

- `config-handler.ts` — `ConfigHandler` class
- `apply-agent-config.ts` — `applyAgentConfig()`
- `apply-command-config.ts` — `applyCommandConfig()`
- `apply-mcp-config.ts` — `applyMcpConfig()`
- `apply-tool-config.ts` — `applyToolConfig()`

## Types and Schemas

### Agent Types

**File:** `src/agents/types.ts`

```typescript
export type AgentMode = 'primary' | 'subagent' | 'all';

export interface AgentPromptMetadata {
  category: 'exploration' | 'specialist' | 'advisor' | 'utility';
  cost: 'FREE' | 'CHEAP' | 'EXPENSIVE';
  triggers?: DelegationTrigger[];
  useWhen?: string[];
  avoidWhen?: string[];
  dedicatedSection?: string;
  promptAlias?: string;
  keyTrigger?: string;
}

export type AgentFactory = ((model: string) => AgentConfig) & {
  mode: AgentMode;
};

export type AgentSource = AgentFactory | AgentConfig;

export function isGptModel(model: string): boolean;
export function extractModelName(model: string): string;
```

### Task Types

**File:** `src/features/background-agent/types.ts`

```typescript
export type BackgroundTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'error'
  | 'cancelled'
  | 'interrupt';

export interface BackgroundTask {
  id: string;
  status: BackgroundTaskStatus;
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  sessionID?: string;
  description: string;
  prompt: string;
  agent: string;
  parentSessionID: string;
  parentMessageID?: string;
  parentModel?: string;
  parentAgent?: string;
  model?: { providerID: string; modelID: string; variant?: string };
  category?: string;
  skills?: string[];
  error?: string;
  progress?: TaskProgress;
  concurrencyKey?: string;
}

export interface LaunchInput {
  description: string;
  prompt: string;
  agent: string;
  parentSessionID: string;
  parentMessageID?: string;
  parentModel?: string;
  parentAgent?: string;
  parentTools?: Record<string, boolean>;
  model?: { providerID: string; modelID: string; variant?: string };
  skills?: string[];
  skillContent?: string;
  category?: string;
}
```

## Utilities

### Shared Utilities (`src/shared/`)

| File                                    | Key Exports                                                   |
| --------------------------------------- | ------------------------------------------------------------- |
| `permission-compat.ts`                  | `createAgentToolRestrictions()`, `getAgentToolRestrictions()` |
| `session-tools-store.ts`                | `setSessionTools()`, `getSessionTools()`                      |
| `agent-utils.ts`                        | `isPlanFamily()`, `isSubagentFamily()`                        |
| `model-fallback.ts`                     | `resolveModelFallback()`                                      |
| `system-directive.ts`                   | `SYSTEM_DIRECTIVE_PREFIX`, `isSystemDirective()`              |
| `first-message-variant.ts`              | `createFirstMessageVariantGate()`                             |
| `truncate-description.ts`               | `truncateDescription()`                                       |
| `prompt-with-model-suggestion-retry.ts` | `promptWithModelSuggestionRetry()`                            |
| `tmux.ts`                               | `isInsideTmux()`                                              |
| `log.ts`                                | `log()`, `createLogFunction()`                                |

### Session Utilities

**File:** `src/features/hook-message-injector/injector.ts`

```typescript
export const MESSAGE_STORAGE = new Map<string, Map<string, MessageInfo>>();

export function storeMessage(sessionID: string, messageID: string, info: MessageInfo): void;
export function findNearestMessageWithFields(messageDir: MessageDir): MessageInfo | null;
export function findFirstMessageWithAgent(messageDir: MessageDir): string | null;
export function getMessageDir(sessionID: string): MessageDir | undefined;
```

**File:** `src/features/claude-code-session-state/index.ts`

```typescript
export const subagentSessions = new Set<string>();
export const sessionAgents = new Map<string, string>();

export function isSubagentSession(sessionID: string): boolean;
export function setSessionAgent(sessionID: string, agent: string): void;
export function getSessionAgent(sessionID: string): string | undefined;
```

## Constants

### Timing Constants

**File:** `src/features/background-agent/constants.ts`

```typescript
export const POLLING_INTERVAL_MS = 5000; // 5 seconds
export const DEFAULT_STALE_TIMEOUT_MS = 1800000; // 30 minutes
export const DEFAULT_MESSAGE_STALENESS_TIMEOUT_MS = 600000; // 10 minutes
export const MIN_RUNTIME_BEFORE_STALE_MS = 60000; // 1 minute
export const MIN_STABILITY_TIME_MS = 5000; // 5 seconds
export const MIN_IDLE_TIME_MS = 2000; // 2 seconds
export const TASK_TTL_MS = 1800000; // 30 minutes
export const TASK_CLEANUP_DELAY_MS = 300000; // 5 minutes
```

### Category Prompts

**File:** `src/tools/delegate-task/constants.ts`

```typescript
export const VISUAL_CATEGORY_PROMPT_APPEND: string;
export const ULTRABRAIN_CATEGORY_PROMPT_APPEND: string;
export const ARTISTRY_CATEGORY_PROMPT_APPEND: string;
export const QUICK_CATEGORY_PROMPT_APPEND: string;
export const UNSPECIFIED_LOW_CATEGORY_PROMPT_APPEND: string;
export const UNSPECIFIED_HIGH_CATEGORY_PROMPT_APPEND: string;
export const DEEP_CATEGORY_PROMPT_APPEND: string;
export const WRITING_CATEGORY_PROMPT_APPEND: string;
```

## Plugin Interface

### OpenCode SDK Types

**File:** `@opencode-ai/plugin` (node_modules)

```typescript
export type Plugin = (input: PluginInput) => Promise<Hooks>;

export interface PluginInput {
  client: ReturnType<typeof createOpencodeClient>;
  project: Project;
  directory: string;
  worktree: string;
  serverUrl: URL;
  $: BunShell;
}

export interface Hooks {
  event?: (input: { event: Event }) => Promise<void>;
  config?: (input: Config) => Promise<void>;
  tool?: { [key: string]: ToolDefinition };
  auth?: AuthHook;
  'chat.message'?: (input, output) => Promise<void>;
  'chat.params'?: (input, output) => Promise<void>;
  'tool.execute.before'?: (input, output) => Promise<void>;
  'tool.execute.after'?: (input, output) => Promise<void>;
  // ... 11 more hooks
}
```

### OMO Plugin Types

**File:** `src/plugin/types.ts`

```typescript
export type PluginContext = PluginInput;

export interface PluginInstance {
  tool?: ToolsRecord;
  'chat.message'?: ChatMessageHook;
  'chat.params'?: ChatParamsHook;
  'tool.execute.before'?: ToolExecuteBeforeHook;
  'tool.execute.after'?: ToolExecuteAfterHook;
  config?: ConfigHook;
  event?: EventHook;
  'experimental.chat.messages.transform'?: MessagesTransformHook;
}

export type ToolsRecord = Record<string, ToolDefinition>;
```

## Build and Test

### Build Scripts

**File:** `package.json`

```json
{
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target bun --format esm --external @ast-grep/napi && tsc --emitDeclarationOnly && bun run build:schema",
    "build:schema": "bun run script/build-schema.ts",
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  }
}
```

### Test Files

**Locations:**

- `src/**/*.test.ts` — 176 test files
- `src/**/*.int.test.ts` — Integration tests

**Key Test Files:**

- `src/agents/types.test.ts`
- `src/hooks/context-window-monitor.test.ts`
- `src/tools/delegate-task/*.test.ts`
- `src/features/background-agent/*.test.ts`

## Migration and Compatibility

**File:** `src/shared/migration/`

- Legacy config migration
- Settings format conversion
- Version compatibility

## MCP Integration

**Location:** `src/mcp/`

| MCP           | File               | Description            |
| ------------- | ------------------ | ---------------------- |
| **websearch** | `websearch-mcp.ts` | Exa/Tavily integration |
| **context7**  | `context7-mcp.ts`  | Official documentation |
| **grep_app**  | `grep-app-mcp.ts`  | GitHub code search     |

```typescript
// src/mcp/create-builtin-mcps.ts
export function createBuiltinMcps(config: OhMyOpenCodeConfig): McpConfig;
```

## Quick Reference: Key Classes

| Class                | Location                                        | Purpose                       |
| -------------------- | ----------------------------------------------- | ----------------------------- |
| `BackgroundManager`  | `src/features/background-agent/manager.ts`      | Background task orchestration |
| `ConcurrencyManager` | `src/features/background-agent/concurrency.ts`  | Concurrency control           |
| `TaskHistory`        | `src/features/background-agent/task-history.ts` | Task tracking                 |
| `ConfigHandler`      | `src/plugin-handlers/config-handler.ts`         | Config management             |
| `TmuxSessionManager` | `src/features/tmux-subagent/manager.ts`         | Tmux integration              |
| `SkillMcpManager`    | `src/features/skill-mcp-manager/manager.ts`     | MCP skill management          |
| `TaskToastManager`   | `src/features/task-toast-manager/manager.ts`    | Toast notifications           |

## Quick Reference: Key Functions

| Function                       | Location                                             | Purpose                    |
| ------------------------------ | ---------------------------------------------------- | -------------------------- |
| `createDelegateTask()`         | `src/tools/delegate-task/tools.ts`                   | Create task() tool         |
| `executeBackgroundTask()`      | `src/tools/delegate-task/background-task.ts`         | Launch background task     |
| `executeSyncTask()`            | `src/tools/delegate-task/sync-task.ts`               | Execute sync task          |
| `resolveParentContext()`       | `src/tools/delegate-task/parent-context-resolver.ts` | Get parent session context |
| `resolveCategoryExecution()`   | `src/tools/delegate-task/category-resolver.ts`       | Resolve category to agent  |
| `buildAgent()`                 | `src/agents/agent-builder.ts`                        | Build agent config         |
| `buildDynamicSisyphusPrompt()` | `src/agents/sisyphus.ts`                             | Build Sisyphus prompt      |
| `createBuiltinAgents()`        | `src/agents/builtin-agents.ts`                       | Create all agents          |

## Index by Concern

### Performance

- `src/features/background-agent/` — Parallel execution
- `src/features/background-agent/concurrency.ts` — Rate limiting
- `src/hooks/preemptive-compaction.ts` — Context management
- `src/hooks/tool-output-truncator.ts` — Output size control

### Reliability

- `src/hooks/session-recovery/` — Error recovery
- `src/features/background-agent/task-poller.ts` — Stale detection
- `src/hooks/delegate-task-retry/` — Retry logic
- `src/hooks/edit-error-recovery/` — Edit failure handling

### User Experience

- `src/features/task-toast-manager/` — Notifications
- `src/hooks/keyword-detector/` — Keyword shortcuts
- `src/hooks/think-mode/` — Extended thinking
- `src/tools/session-manager/` — Session navigation

### Code Quality

- `src/hooks/comment-checker/` — Comment validation
- `src/hooks/write-existing-file-guard/` — Safety checks
- `src/tools/lsp/` — Type checking
- `src/tools/ast-grep/` — Pattern validation

### Integration

- `src/features/claude-code-*-loader/` — Claude Code compat
- `src/mcp/` — MCP servers
- `src/features/skill-mcp-manager/` — Skill MCPs
- `src/features/tmux-subagent/` — Terminal integration
