# Agent Communication and Coordination

## Overview

This document details how OMO's 11 agents communicate, delegate tasks, and coordinate work using the
background task system, session continuity, and concurrency control.

## File References

**Core Implementation Files:**

- `/tmp/oh-my-opencode/src/features/background-agent/manager.ts` (1,646 lines) — BackgroundManager
  class
- `/tmp/oh-my-opencode/src/tools/delegate-task/tools.ts` — Main `task()` tool implementation
- `/tmp/oh-my-opencode/src/tools/delegate-task/executor.ts` — Execution strategy exports
- `/tmp/oh-my-opencode/src/tools/delegate-task/background-task.ts` — `executeBackgroundTask()`
- `/tmp/oh-my-opencode/src/tools/delegate-task/sync-task.ts` — `executeSyncTask()`
- `/tmp/oh-my-opencode/src/tools/delegate-task/sync-continuation.ts` — `executeSyncContinuation()`
- `/tmp/oh-my-opencode/src/features/background-agent/concurrency.ts` — `ConcurrencyManager` class
- `/tmp/oh-my-opencode/src/features/background-agent/types.ts` — Type definitions

## 1. Task Delegation System

### The `task()` Tool

**Location:** `src/tools/delegate-task/tools.ts`

**Function Signature:**

```typescript
export function createDelegateTask(options: DelegateTaskToolOptions): ToolDefinition;
```

**Tool Definition:**

```typescript
tool({
  description: "Spawn agent task with category-based or direct agent selection",
  args: {
    load_skills: tool.schema.array(tool.schema.string()),  // ["git-master", "playwright"]
    description: tool.schema.string(),                      // Human-readable task description
    prompt: tool.schema.string(),                           // Task prompt for agent
    run_in_background: tool.schema.boolean(),              // true = async, false = sync
    category: tool.schema.string().optional(),             // "quick" | "visual" | "deep"
    subagent_type: tool.schema.string().optional(),        // "oracle" | "librarian" | "explore"
    session_id: tool.schema.string().optional(),           // Resume existing session
    command: tool.schema.string().optional(),              // Slash command that triggered
  },
  async execute(args: DelegateTaskArgs, toolContext) { ... }
})
```

### Execution Decision Flow

**Location:** `src/tools/delegate-task/tools.ts:execute()`

```typescript
// 1. Session Continuation (session_id provided)
if (args.session_id) {
  if (runInBackground) {
    return executeBackgroundContinuation(...)  // src/tools/delegate-task/background-continuation.ts
  }
  return executeSyncContinuation(...)          // src/tools/delegate-task/sync-continuation.ts
}

// 2. Category-Based Delegation
if (args.category) {
  const resolution = await resolveCategoryExecution(...)  // src/tools/delegate-task/category-resolver.ts
  // resolution.agentToUse = "sisyphus-junior"
  // resolution.categoryModel = { providerID, modelID, variant }
}

// 3. Direct Agent Delegation
else {
  const resolution = await resolveSubagentExecution(...)  // src/tools/delegate-task/subagent-resolver.ts
  // Validates agent exists and is callable
}

// 4. Execute Task
if (runInBackground) {
  return executeBackgroundTask(...)            // src/tools/delegate-task/background-task.ts
}
return executeSyncTask(...)                    // src/tools/delegate-task/sync-task.ts
```

## 2. Background Task System

### BackgroundManager Class

**Location:** `src/features/background-agent/manager.ts`

**Class Definition:**

```typescript
export class BackgroundManager {
  private tasks: Map<string, BackgroundTask>;
  private notifications: Map<string, BackgroundTask[]>;
  private pendingByParent: Map<string, Set<string>>;
  private client: OpencodeClient;
  private directory: string;
  private pollingInterval?: ReturnType<typeof setInterval>;
  private concurrencyManager: ConcurrencyManager;

  constructor(
    ctx: PluginInput,
    config?: BackgroundTaskConfig,
    options?: { tmuxConfig?; onSubagentSessionCreated?; onShutdown? },
  );

  async launch(input: LaunchInput): Promise<BackgroundTask>;
  async resume(input: ResumeInput): Promise<BackgroundTask>;
  getTask(taskId: string): BackgroundTask | undefined;
  private async startTask(item: QueueItem): Promise<void>;
  private async pollRunningTasks(): Promise<void>;
  private async notifyParentSession(task: BackgroundTask): Promise<void>;
}
```

### Task Lifecycle

**BackgroundTask Type:** `src/features/background-agent/types.ts`

```typescript
export interface BackgroundTask {
  id: string; // "bg_30e114a4"
  status: BackgroundTaskStatus; // "pending" | "running" | "completed" | "error" | "cancelled" | "interrupt"
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  sessionID?: string; // Child session ID (set when running)
  description: string;
  prompt: string;
  agent: string; // "explore" | "librarian" | "oracle"
  parentSessionID: string; // Parent session ID
  parentMessageID?: string;
  parentModel?: string;
  parentAgent?: string;
  parentTools?: Record<string, boolean>;
  model?: { providerID: string; modelID: string; variant?: string };
  category?: string;
  skills?: string[];
  skillContent?: string;
  error?: string;
  progress?: TaskProgress;
  concurrencyKey?: string;
}

interface TaskProgress {
  toolCalls: number;
  lastTool?: string;
  lastUpdate: Date;
  lastMessage?: string;
  lastMessageAt?: Date;
}
```

### Launch Flow

**Function:** `BackgroundManager.launch()` in `src/features/background-agent/manager.ts:120`

```typescript
async launch(input: LaunchInput): Promise<BackgroundTask> {
  // 1. Create task with status="pending"
  const task: BackgroundTask = {
    id: `bg_${crypto.randomUUID().slice(0, 8)}`,
    status: "pending",
    queuedAt: new Date(),
    // sessionID NOT set yet - will be set when running
    description: input.description,
    prompt: input.prompt,
    agent: input.agent,
    parentSessionID: input.parentSessionID,
    // ... more fields
  }

  // 2. Store task
  this.tasks.set(task.id, task)

  // 3. Track pending by parent
  if (input.parentSessionID) {
    const pending = this.pendingByParent.get(input.parentSessionID) ?? new Set()
    pending.add(task.id)
    this.pendingByParent.set(input.parentSessionID, pending)
  }

  // 4. Determine concurrency key (model or agent)
  const key = this.getConcurrencyKeyFromInput(input)

  // 5. Queue task
  const queue = this.queuesByKey.get(key) ?? []
  queue.push({ task, input })
  this.queuesByKey.set(key, queue)

  // 6. Process queue (fire-and-forget)
  this.processKey(key)

  return task
}
```

### Session Creation and Prompting

**Function:** `BackgroundManager.startTask()` in `src/features/background-agent/manager.ts:238`

```typescript
private async startTask(item: QueueItem): Promise<void> {
  const { task, input } = item

  // 1. Create child session
  const createResult = await this.client.session.create({
    body: {
      parentID: input.parentSessionID,  // Links to parent
      title: `${input.description} (@${input.agent} subagent)`,
    },
    query: {
      directory: parentDirectory,  // Inherits parent's directory
    },
  })

  const sessionID = createResult.data.id

  // 2. Update task to running
  task.status = "running"
  task.startedAt = new Date()
  task.sessionID = sessionID
  task.concurrencyKey = key

  // 3. Track subagent session
  subagentSessions.add(sessionID)  // src/features/claude-code-session-state/index.ts

  // 4. Set tool restrictions
  const tools = {
    ...getAgentToolRestrictions(input.agent),  // Agent-specific restrictions
    task: false,           // Subagents cannot delegate (except special cases)
    call_omo_agent: true,  // Subagents can call other subagents
    question: false,
  }
  setSessionTools(sessionID, tools)  // src/shared/session-tools-store.ts

  // 5. Fire prompt (fire-and-forget, no response body needed)
  promptWithModelSuggestionRetry(this.client, {
    path: { id: sessionID },
    body: {
      agent: input.agent,
      model: launchModel,
      variant: launchVariant,
      system: input.skillContent,  // Skills injected here
      tools,
      parts: [{ type: "text", text: input.prompt }],
    },
  }).catch((error) => {
    // Error handling - mark task as interrupt, release concurrency
    // See src/features/background-agent/manager.ts:613
  })
}
```

### Polling and Completion Detection

**Function:** `BackgroundManager.pollRunningTasks()` in
`src/features/background-agent/manager.ts:494`

```typescript
private async pollRunningTasks(): Promise<void> {
  // 1. Get all session statuses
  const allStatuses = await this.client.session.status({
    body: { ids: sessionIds },
  })

  // 2. Check for stale tasks and interrupt them
  await checkAndInterruptStaleTasks({
    tasks: this.tasks.values(),
    client: this.client,
    config: this.config,
    concurrencyManager: this.concurrencyManager,
    notifyParentSession: (task) => this.notifyParentSession(task),
    sessionStatuses: allStatuses,
  })  // src/features/background-agent/task-poller.ts

  // 3. Check each running task
  for (const task of this.tasks.values()) {
    if (task.status !== "running") continue

    const sessionStatus = allStatuses[task.sessionID]

    // 4. If session is idle, check for completion
    if (sessionStatus?.type === "idle") {
      const hasIncompleteMessages = await this.checkSessionTodos(task.sessionID)

      // 5. If no incomplete todos, mark as completed
      if (!hasIncompleteMessages) {
        task.status = "completed"
        task.completedAt = new Date()

        // 6. Release concurrency slot
        if (task.concurrencyKey) {
          this.concurrencyManager.release(task.concurrencyKey)
          task.concurrencyKey = undefined
        }

        // 7. Mark for notification
        this.markForNotification(task)
      }
    }
  }
}
```

### Parent Notification

**Function:** `BackgroundManager.notifyParentSession()` in
`src/features/background-agent/notify-parent-session.ts`

```typescript
export async function notifyParentSession(args: {
  task: BackgroundTask
  client: OpencodeClient
  pendingByParent: Map<string, Set<string>>
  tasks: Map<string, BackgroundTask>
  toastManager: TaskToastManager
}): Promise<void> {
  const { task, client, pendingByParent, tasks } = args

  // 1. Calculate completion status
  const pendingSet = pendingByParent.get(task.parentSessionID)
  if (pendingSet) {
    pendingSet.delete(task.id)
  }
  const allComplete = !pendingSet || pendingSet.size === 0
  const remainingCount = pendingSet?.size ?? 0

  // 2. Build notification text
  const notification = buildBackgroundTaskNotificationText({
    task,
    duration,
    allComplete,
    remainingCount,
    completedTasks,
  })

  // 3. Send to parent session
  await client.session.prompt({
    path: { id: task.parentSessionID },
    body: {
      parts: [{ type: "text", text: notification }],
    },
  })

  // 4. Update toast UI
  args.toastManager.update(task.id, ...)
}
```

**Notification Format:**

```
[BACKGROUND TASK COMPLETED]
**ID:** `bg_30e114a4`
**Description:** Explore agent coordination mechanisms
**Duration:** 2m 18s

**3 tasks still in progress.** You WILL be notified when ALL complete.
Do NOT poll - continue productive work.

Use `background_output(task_id="bg_30e114a4")` to retrieve this result.
```

## 3. Concurrency Control

### ConcurrencyManager Class

**Location:** `src/features/background-agent/concurrency.ts`

```typescript
export class ConcurrencyManager {
  private counts: Map<string, number> = new Map();
  private queues: Map<string, WaitQueueEntry[]> = new Map();
  private config?: BackgroundTaskConfig;

  constructor(config?: BackgroundTaskConfig) {
    this.config = config;
  }

  getConcurrencyLimit(model: string): number {
    // Precedence: model-specific > provider-specific > default
    const modelLimit = this.config?.modelConcurrency?.[model];
    if (modelLimit !== undefined) return modelLimit === 0 ? Infinity : modelLimit;

    const provider = model.split('/')[0]; // "anthropic" from "anthropic/claude-3-5-sonnet"
    const providerLimit = this.config?.providerConcurrency?.[provider];
    if (providerLimit !== undefined) return providerLimit === 0 ? Infinity : providerLimit;

    return this.config?.defaultConcurrency ?? 5;
  }

  async acquire(model: string): Promise<void> {
    const limit = this.getConcurrencyLimit(model);
    const current = this.counts.get(model) ?? 0;

    if (current < limit) {
      this.counts.set(model, current + 1);
      return;
    }

    // Wait in queue for slot to free
    return new Promise<void>((resolve, reject) => {
      const queue = this.queues.get(model) ?? [];
      queue.push({ resolve, rawReject: reject, settled: false });
      this.queues.set(model, queue);
    });
  }

  release(model: string): void {
    const queue = this.queues.get(model);

    // Try to hand off to next waiter (skip settled entries)
    while (queue && queue.length > 0) {
      const next = queue.shift()!;
      if (!next.settled) {
        next.resolve(); // Hand off slot (count stays same)
        return;
      }
    }

    // No handoff - decrement count to free slot
    const current = this.counts.get(model) ?? 0;
    if (current > 0) {
      this.counts.set(model, current - 1);
    }
  }
}
```

### Configuration Example

**Location:** `.opencode/oh-my-opencode.jsonc`

```jsonc
{
  "backgroundTask": {
    "defaultConcurrency": 5,
    "providerConcurrency": {
      "anthropic": 10,
      "openai": 3,
      "google": 8,
    },
    "modelConcurrency": {
      "anthropic/claude-opus-4-6": 2,
      "openai/gpt-5.3-codex": 1,
      "google/gemini-3-pro": 5,
    },
    "staleTimeoutMs": 1800000, // 30 minutes
    "messageStalenessTimeoutMs": 600000, // 10 minutes
  },
}
```

## 4. Session Continuity

### Parent Context Resolution

**Location:** `src/tools/delegate-task/parent-context-resolver.ts`

```typescript
export interface ParentContext {
  sessionID: string;
  messageID?: string;
  agent?: string;
  model?: { providerID: string; modelID: string; variant?: string };
}

export function resolveParentContext(ctx: ToolContextWithMetadata): ParentContext {
  // 1. Get message directory for session
  const messageDir = getMessageDir(ctx.sessionID); // src/features/hook-message-injector/message-dir.ts

  // 2. Find previous message with model/agent info
  const prevMessage = messageDir
    ? findNearestMessageWithFields(messageDir) // src/features/hook-message-injector/injector.ts
    : null;

  // 3. Get session agent (from session state)
  const sessionAgent = getSessionAgent(ctx.sessionID); // src/features/claude-code-session-state/index.ts

  // 4. Get first message agent
  const firstMessageAgent = messageDir ? findFirstMessageWithAgent(messageDir) : null;

  // 5. Determine parent agent (precedence: context > session > first message > previous message)
  const parentAgent = ctx.agent ?? sessionAgent ?? firstMessageAgent ?? prevMessage?.agent;

  // 6. Extract parent model from previous message
  const parentModel =
    prevMessage?.model?.providerID && prevMessage?.model?.modelID
      ? {
          providerID: prevMessage.model.providerID,
          modelID: prevMessage.model.modelID,
          ...(prevMessage.model.variant ? { variant: prevMessage.model.variant } : {}),
        }
      : undefined;

  return {
    sessionID: ctx.sessionID,
    messageID: ctx.messageID,
    agent: parentAgent,
    model: parentModel,
  };
}
```

### Session Continuation

**Location:** `src/tools/delegate-task/sync-continuation.ts`

```typescript
export async function executeSyncContinuation(
  args: DelegateTaskArgs,
  ctx: ToolContextWithMetadata,
  executorCtx: ExecutorContext,
  deps: SyncContinuationDeps = syncContinuationDeps,
): Promise<string> {
  const { client } = executorCtx;

  // 1. Recover agent and model from message history
  const messagesResp = await client.session.messages({
    path: { id: args.session_id! },
  });
  const messages = (messagesResp.data ?? []) as SessionMessage[];

  let resumeAgent: string | undefined;
  let resumeModel: { providerID: string; modelID: string } | undefined;
  let resumeVariant: string | undefined;

  // 2. Scan backwards to find most recent agent/model
  for (let i = messages.length - 1; i >= 0; i--) {
    const info = messages[i].info;
    if (info?.agent || info?.model) {
      resumeAgent = info.agent;
      resumeModel =
        info.model ??
        (info.providerID && info.modelID
          ? { providerID: info.providerID, modelID: info.modelID }
          : undefined);
      resumeVariant = info.variant;
      break;
    }
  }

  // 3. Restore tool restrictions
  const allowTask = isPlanFamily(resumeAgent); // src/shared/agent-utils.ts
  const tools = {
    ...(resumeAgent ? getAgentToolRestrictions(resumeAgent) : {}),
    task: allowTask,
    call_omo_agent: true,
    question: false,
  };
  setSessionTools(args.session_id!, tools);

  // 4. Send continuation prompt
  await promptWithModelSuggestionRetry(client, {
    path: { id: args.session_id! },
    body: {
      ...(resumeAgent ? { agent: resumeAgent } : {}),
      ...(resumeModel ? { model: resumeModel } : {}),
      ...(resumeVariant ? { variant: resumeVariant } : {}),
      tools,
      parts: [{ type: 'text', text: args.prompt }],
    },
  });

  // 5. Poll for result
  const result = await deps.pollSyncSession(client, {
    sessionID: args.session_id!,
    taskId,
    toastManager,
    startTime,
  });

  return result;
}
```

## 5. Agent-to-Agent Communication Patterns

### Pattern 1: Sisyphus → Explore (Background)

**Sisyphus Agent:** `src/agents/sisyphus.ts`

```typescript
// Prompt section instructs Sisyphus to fire background agents
const SISYPHUS_PROMPT = `
### Explore Agent = Contextual Grep

Fire liberally for:
- Multiple search angles needed
- Unfamiliar module structure
- Cross-layer pattern discovery

**Always background:**
task(subagent_type="explore", run_in_background=true, load_skills=[], 
     description="...", prompt="...")
`;
```

**Execution:**

```typescript
// In Sisyphus context
task(
  (subagent_type = 'explore'),
  (run_in_background = true),
  (load_skills = []),
  (description = 'Find auth implementations'),
  (prompt = `[CONTEXT] Implementing JWT auth for REST API...
     [GOAL] Match existing auth conventions
     [REQUEST] Find auth middleware, login handlers, token generation...`),
);
```

**Result:** Task ID returned immediately, Sisyphus continues work, notification arrives when
complete.

### Pattern 2: Sisyphus → Oracle (Sync)

**Sisyphus Agent:** `src/agents/sisyphus.ts`

```typescript
const SISYPHUS_PROMPT = `
### Oracle — Read-Only Consultant

WHEN to Consult:
- Complex architecture design → Oracle FIRST
- After completing significant work → Oracle review
- 2+ failed fix attempts → Oracle debugging

WHEN NOT:
- Simple file operations
- First attempt at any fix
`;
```

**Execution:**

```typescript
// In Sisyphus context
const advice = task(
  (subagent_type = 'oracle'),
  (run_in_background = false),
  (load_skills = []),
  (description = 'Architecture consultation'),
  (prompt = "We're deciding between microservices vs monolith..."),
);

// Sisyphus waits for advice, then uses it to make decision
```

### Pattern 3: Atlas → Sisyphus-Junior (Category)

**Atlas Agent:** `src/agents/atlas/agent.ts`

```typescript
// Atlas delegates to Sisyphus-Junior via category
const result = task(
  (category = 'quick'),
  (load_skills = []),
  (run_in_background = false),
  (description = 'Fix type error'),
  (prompt = `TASK: Fix type error on line 42

MUST DO:
1. Read auth.ts
2. Fix with minimal changes
3. Run lsp_diagnostics

MUST NOT DO:
- Refactor surrounding code
- Change function signatures

EXPECTED OUTPUT:
- Type error resolved
- lsp_diagnostics clean`),
);

// Atlas verifies result
lsp_diagnostics((filePath = 'auth.ts'));
```

### Pattern 4: Prometheus → Metis (Planning)

**Prometheus Agent:** `src/agents/prometheus/plan-generation.ts`

```typescript
// Prometheus consults Metis before generating plan
const metisAnalysis = task(
  (subagent_type = 'metis'),
  (run_in_background = false),
  (description = 'Analyze requirements for gaps'),
  (prompt = `Analyze this request for:
     - Hidden intentions
     - Missing requirements
     - Potential failure points
     - Scope ambiguities
     
     Request: ${userRequest}`),
);

// Use Metis analysis to write comprehensive plan
```

## 6. Key Functions and Utilities

### Agent Tool Restrictions

**Location:** `src/shared/permission-compat.ts`

```typescript
export function createAgentToolRestrictions(restrictedTools: string[]): {
  tools: Record<string, boolean>;
} {
  return {
    tools: Object.fromEntries(restrictedTools.map((tool) => [tool, false])),
  };
}

// Usage in Oracle agent
const restrictions = createAgentToolRestrictions(['write', 'edit', 'task']);
// Returns: { tools: { write: false, edit: false, task: false } }
```

### Session Tools Store

**Location:** `src/shared/session-tools-store.ts`

```typescript
const sessionToolsStore = new Map<string, Record<string, boolean>>();

export function setSessionTools(sessionID: string, tools: Record<string, boolean>): void {
  sessionToolsStore.set(sessionID, tools);
}

export function getSessionTools(sessionID: string): Record<string, boolean> | undefined {
  return sessionToolsStore.get(sessionID);
}
```

### Subagent Session Tracking

**Location:** `src/features/claude-code-session-state/index.ts`

```typescript
export const subagentSessions = new Set<string>();

export function isSubagentSession(sessionID: string): boolean {
  return subagentSessions.has(sessionID);
}
```

### Model Fallback Resolution

**Location:** `src/shared/model-fallback.ts`

```typescript
export interface ModelFallbackInfo {
  providerID: string;
  modelID: string;
  variant?: string;
  fallbackChain?: string[];
}

export function resolveModelFallback(
  agentName: string,
  requestedModel: string | undefined,
  availableModels: string[],
): ModelFallbackInfo {
  // 1. Try requested model
  // 2. Try agent's fallback chain
  // 3. Use system default
}
```

## 7. Stale Task Detection

**Location:** `src/features/background-agent/task-poller.ts`

```typescript
export async function checkAndInterruptStaleTasks(args: {
  tasks: Iterable<BackgroundTask>;
  client: OpencodeClient;
  config: BackgroundTaskConfig | undefined;
  concurrencyManager: ConcurrencyManager;
  notifyParentSession: (task: BackgroundTask) => Promise<void>;
  sessionStatuses?: SessionStatusMap;
}): Promise<void> {
  const staleTimeoutMs = args.config?.staleTimeoutMs ?? DEFAULT_STALE_TIMEOUT_MS; // 30 min
  const messageStalenessMs =
    args.config?.messageStalenessTimeoutMs ?? DEFAULT_MESSAGE_STALENESS_TIMEOUT_MS;

  const now = Date.now();

  for (const task of args.tasks) {
    if (task.status !== 'running') continue;

    const runtime = now - (task.startedAt?.getTime() ?? 0);
    const sessionStatus = args.sessionStatuses?.[task.sessionID!];
    const sessionIsRunning = sessionStatus !== undefined && sessionStatus !== 'idle';

    // Check for stale task (no progress updates)
    if (!task.progress?.lastUpdate) {
      if (sessionIsRunning) continue; // Still active
      if (runtime <= messageStalenessMs) continue; // Too recent to be stale

      // Mark as cancelled due to staleness
      task.status = 'cancelled';
      task.error = `Stale timeout (no activity for ${Math.floor(runtime / 60000)}min)`;
      task.completedAt = new Date();

      // Release concurrency slot
      if (task.concurrencyKey) {
        args.concurrencyManager.release(task.concurrencyKey);
        task.concurrencyKey = undefined;
      }

      // Notify parent
      await args.notifyParentSession(task);
    }
  }
}
```

## Summary: Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User Request                                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────┐
    │ Sisyphus               │  src/agents/sisyphus.ts
    │ (Primary Agent)        │  createSisyphusAgent()
    └────────┬───────────────┘
             │
             ├─ task(subagent_type="explore", run_in_background=true)
             │  └─→ BackgroundManager.launch()  [manager.ts:120]
             │      └─→ Queue → Acquire Slot → Create Session → Prompt
             │          └─→ Polling → Completion → Notify Parent
             │
             ├─ task(subagent_type="oracle", run_in_background=false)
             │  └─→ executeSyncTask()  [sync-task.ts]
             │      └─→ Create Session → Prompt → Poll → Return Result
             │
             └─ task(category="quick", run_in_background=false)
                └─→ resolveCategoryExecution()  [category-resolver.ts]
                    └─→ agentToUse = "sisyphus-junior"
                        └─→ executeSyncTask() with category config
```

## Next Steps

- **[Prompt System](03-prompt-system.md)** — How prompts are constructed and injected
- **[Adding Agents](04-adding-agents.md)** — Create custom agents
- **[Plugin Integration](05-plugin-integration.md)** — OpenCode SDK hooks
