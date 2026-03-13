# Agent Architecture

## Overview

OMO implements **11 specialized agents** that work together like a development team. Each agent has:

- **Specific role and expertise**
- **Optimized model** (can be overridden)
- **Tool restrictions** (read-only vs full-access)
- **Delegation capabilities** (who can call whom)
- **Prompt engineering** (model-specific variants)

## Agent Hierarchy

```
Primary Agents (User-facing)
├─ Sisyphus (main orchestrator)
├─ Hephaestus (autonomous deep worker)
└─ Atlas (work plan executor)

Subagents (Callable via task())
├─ Oracle (architecture consultant)
├─ Librarian (docs researcher)
├─ Explore (codebase grep)
├─ Multimodal Looker (PDF/image analysis)
├─ Metis (pre-planning analyst)
├─ Momus (plan validator)
└─ Sisyphus-Junior (category executor)

Planning Agents
├─ Prometheus (strategic planner)
└─ Metis (consultant)
```

## Agent Modes

| Mode       | UI Model Selection    | Callable via task() | Purpose             |
| ---------- | --------------------- | ------------------- | ------------------- |
| `primary`  | Respects UI selection | No                  | User-facing agents  |
| `subagent` | Uses own model        | Yes                 | Specialized workers |
| `all`      | Both contexts         | Yes                 | Universal agents    |

## Agent Details

### 1. Sisyphus (Primary Orchestrator)

**Model:** `anthropic/claude-opus-4-6` (fallback: kimi-k2.5 → glm-4.7 → gpt-5.3-codex →
gemini-3-pro) **Temperature:** 0.1 **Mode:** primary

**Role:**

- Main agent facing the user
- Orchestrates all work
- Delegates to specialists
- Never works alone when specialists are available

**Capabilities:**

- Full tool access (read, write, edit, bash, LSP, AST)
- Can delegate via `task()` to:
  - Explore (background)
  - Librarian (background)
  - Oracle (sync)
  - Atlas (sync)
  - Any category via Sisyphus-Junior

**Delegation Pattern:**

```typescript
// Parallel background research
task(
  (subagent_type = 'explore'),
  (run_in_background = true),
  (load_skills = []),
  (description = 'Find auth implementations'),
  (prompt = '...'),
);
task(
  (subagent_type = 'librarian'),
  (run_in_background = true),
  (load_skills = []),
  (description = 'Find JWT docs'),
  (prompt = '...'),
);

// Sync consultation
task(
  (subagent_type = 'oracle'),
  (run_in_background = false),
  (load_skills = []),
  (description = 'Architecture advice'),
  (prompt = '...'),
);

// Work plan execution
task(
  (subagent_type = 'atlas'),
  (run_in_background = false),
  (load_skills = []),
  (description = 'Execute refactor plan'),
  (prompt = '...'),
);
```

**Prompt Structure:**

- Task management section (todo or task system)
- Available agents, tools, categories, skills
- Delegation table (when to delegate to whom)
- Key triggers for phase 0 decisions
- Oracle usage patterns
- Hard blocks and anti-patterns

### 2. Hephaestus (Autonomous Deep Worker)

**Model:** `openai/gpt-5.3-codex` (NO fallback) **Temperature:** 0.1 **Mode:** primary

**Role:**

- Goal-oriented autonomous problem-solving
- Thorough research before action
- Doesn't need step-by-step instructions
- "The Legitimate Craftsman"

**Capabilities:**

- Full tool access
- Cannot delegate (tool restrictions)
- Fires 2-5 explore/librarian agents before writing code
- Pattern matching from existing codebase
- End-to-end completion with verification

**Usage:**

```
User switches to Hephaestus agent (Tab → select)
User: "Implement JWT authentication"
Hephaestus:
  1. Fires explore agents to find auth patterns
  2. Fires librarian for JWT security docs
  3. Analyzes existing code style
  4. Implements solution matching project conventions
  5. Runs tests and verification
  6. Reports completion with evidence
```

**Key Characteristic:**

- **No delegation allowed** — must work independently
- **Deep mode** — explores thoroughly before acting
- **Autonomous** — determines steps, not told what to do

### 3. Atlas (Work Plan Executor)

**Model:** `anthropic/claude-sonnet-4-5` (fallback: kimi-k2.5 → gpt-5.2) **Temperature:** 0.1
**Mode:** primary

**Role:**

- Executes work plans from Prometheus
- Master orchestrator for complex multi-step tasks
- Delegates to Sisyphus-Junior via categories
- Tracks progress in boulder.json

**Capabilities:**

- Read-only direct edits (discouraged)
- Delegates via `task(category="...", run_in_background=false, ...)`
- Verifies each task completion
- Continues until boulder.json shows 100% completion

**Workflow:**

```
1. /start-work command triggers Atlas
2. Atlas reads .sisyphus/plans/latest.md
3. Creates/updates .sisyphus/boulder.json
4. For each task in plan:
   - Delegates via task(category="quick"|"visual"|"deep", ...)
   - Waits for completion
   - Verifies result (lsp_diagnostics, build, tests)
   - Marks task done in boulder.json
5. Continues until all tasks complete
```

**Delegation Pattern:**

```typescript
// Atlas delegates to Sisyphus-Junior via category
task(
  (category = 'quick'),
  (load_skills = []),
  (run_in_background = false),
  (description = 'Fix type error'),
  (prompt = 'Fix the type error in auth.ts line 42...'),
);

task(
  (category = 'visual-engineering'),
  (load_skills = ['frontend-ui-ux']),
  (run_in_background = false),
  (description = 'Add responsive chart'),
  (prompt = 'Add a responsive chart component to dashboard...'),
);
```

### 4. Prometheus (Strategic Planner)

**Model:** `anthropic/claude-opus-4-6` (fallback: kimi-k2.5 → gpt-5.2) **Temperature:** 0.1
**Mode:** primary

**Role:**

- Strategic planning and requirement clarification
- Interviews user to understand actual needs
- Generates detailed work plans
- Read-only (cannot execute plans)

**Capabilities:**

- Read, glob, grep tools only
- Can delegate to Metis for feature planning
- Can fire explore/librarian for research
- Creates plans in `.sisyphus/plans/{name}.md`

**Interview Process:**

1. User describes work (via `@plan` or agent switch)
2. Prometheus asks clarifying questions
3. Fires explore/librarian for codebase context
4. Consults Metis for gap analysis
5. Generates detailed plan with:
   - Atomic tasks
   - Verification criteria
   - Risk mitigations
   - Dependencies
6. Optionally validates with Momus (high accuracy mode)

**Plan Format:**

```markdown
# Refactor Authentication System

## Objective

Migrate from session-based to JWT authentication

## Tasks

1. [ ] Add JWT library dependency (jsonwebtoken)
2. [ ] Create JWT token generation service
3. [ ] Update login endpoint to issue JWT
4. [ ] Add JWT verification middleware
5. [ ] Update protected routes to use middleware
6. [ ] Migrate user sessions to JWT
7. [ ] Add refresh token rotation
8. [ ] Update tests
9. [ ] Deploy to staging

## Verification

- All tests pass
- No TypeScript errors
- Manual QA on staging
- Security review checklist complete
```

### 5. Oracle (Architecture Consultant)

**Model:** `openai/gpt-5.2` (fallback: claude-opus-4-6) **Temperature:** 0.1 **Mode:** subagent

**Role:**

- Read-only consultation for architecture and debugging
- High-IQ strategic guidance
- Complex design decisions
- Performance and security analysis

**Tool Restrictions:**

- ❌ Cannot write, edit, or commit
- ❌ Cannot delegate via task()
- ✅ Can read, grep, glob, LSP

**When to Use:**

- Complex architecture design → Oracle FIRST
- After completing significant work → Oracle review
- 2+ failed fix attempts → Oracle debugging
- Unfamiliar code patterns → Oracle analysis
- Security/performance concerns → Oracle consultation
- Multi-system tradeoffs → Oracle decision

**Invocation:**

```typescript
// Sisyphus → Oracle
task(
  (subagent_type = 'oracle'),
  (run_in_background = false),
  (load_skills = []),
  (description = 'Architecture consultation'),
  (prompt = `We're deciding between:
     1. Microservices with gRPC
     2. Monolith with modules
     3. Serverless functions
     
     Codebase context:
     - 50k LOC TypeScript
     - 3 developers
     - 10k users
     - Budget constraints
     
     Recommend approach with rationale.`),
);
```

### 6. Librarian (Documentation Researcher)

**Model:** `zai-coding-plan/glm-4.7` (fallback: glm-4.7-free) **Temperature:** 0.1 **Mode:**
subagent

**Role:**

- Search external references (docs, OSS, web)
- Official API documentation
- GitHub code examples
- Library best practices

**Tool Restrictions:**

- ❌ Cannot write, edit, or commit
- ❌ Cannot delegate via task()
- ✅ Can use websearch (Exa/Tavily)
- ✅ Can use context7 (official docs)
- ✅ Can use grep_app (GitHub search)

**Trigger Phrases:**

- "How do I use [library]?"
- "What's the best practice for [framework]?"
- "Find examples of [library] usage"
- "Working with unfamiliar npm/pip packages"

**Invocation:**

```typescript
// Sisyphus → Librarian (background)
task(
  (subagent_type = 'librarian'),
  (run_in_background = true),
  (load_skills = []),
  (description = 'Find JWT security docs'),
  (prompt = `Find current best practices for JWT auth:
     - OWASP auth guidelines
     - Token storage (httpOnly vs localStorage)
     - Refresh token rotation
     - Common JWT vulnerabilities
     
     Skip 'what is JWT' tutorials - production security only.`),
);
```

### 7. Explore (Codebase Grep)

**Model:** `xai/grok-code-fast-1` (fallback: claude-haiku-4-5 → gpt-5-mini → gpt-5-nano)
**Temperature:** 0.1 **Mode:** subagent

**Role:**

- Fast codebase exploration (contextual grep)
- Find existing patterns and implementations
- Discover file structure and conventions
- AST-aware code search

**Tool Restrictions:**

- ❌ Cannot write, edit, or commit
- ❌ Cannot delegate via task()
- ✅ Can read, grep, glob, AST-grep, LSP

**When to Use:**

- Multiple search angles needed
- Unfamiliar module structure
- Cross-layer pattern discovery
- Finding existing implementations

**Invocation:**

```typescript
// Sisyphus → Explore (background)
task(
  (subagent_type = 'explore'),
  (run_in_background = true),
  (load_skills = []),
  (description = 'Find auth implementations'),
  (prompt = `[CONTEXT] Implementing JWT auth for REST API in src/api/routes/
     
     [GOAL] Match existing auth conventions
     
     [REQUEST] Find:
     - Auth middleware patterns
     - Login/signup handlers
     - Token generation code
     - Credential validation
     
     Focus on src/ - skip tests. Return file paths with patterns.`),
);
```

### 8. Multimodal Looker

**Model:** `google/gemini-3-flash` **Temperature:** 0.1 **Mode:** subagent

**Role:**

- PDF/image analysis
- Screenshot interpretation
- Diagram understanding
- Visual content extraction

**Tool Restrictions:**

- ❌ Cannot write, edit, or commit
- ❌ Cannot delegate via task()
- ✅ Can analyze images and PDFs

**Usage:**

```typescript
task(
  (subagent_type = 'multimodal-looker'),
  (run_in_background = false),
  (description = 'Analyze architecture diagram'),
  (prompt = 'Extract system components and relationships from diagram.png'),
);
```

### 9. Metis (Pre-Planning Analyst)

**Model:** `anthropic/claude-opus-4-6` (fallback: kimi-k2.5 → gpt-5.2) **Temperature:** 0.3 (higher
for creativity) **Mode:** subagent

**Role:**

- Pre-planning analysis
- Identify hidden intentions
- Spot ambiguities and AI failure points
- Feature gap analysis

**Capabilities:**

- Can fire explore/librarian for research
- Provides comprehensive analysis before planning
- Helps Prometheus write better plans

**Invocation:**

```typescript
// Prometheus → Metis
task(
  (subagent_type = 'metis'),
  (run_in_background = false),
  (load_skills = []),
  (description = 'Analyze user request for gaps'),
  (prompt = `User wants: "Refactor auth system"
     
     Analyze for:
     - Hidden intentions (security? performance? maintainability?)
     - Missing requirements (what about existing sessions?)
     - Potential failure points (data migration? downtime?)
     - Scope ambiguities (just backend or frontend too?)`),
);
```

### 10. Momus (Plan Validator)

**Model:** `openai/gpt-5.2` (fallback: claude-opus-4-6) **Temperature:** 0.1 **Mode:** subagent

**Role:**

- Review work plans for clarity, verifiability, completeness
- Catch gaps, ambiguities, missing context
- Enforce rigorous planning standards
- Quality assurance for plans

**Tool Restrictions:**

- ❌ Cannot write, edit, or commit
- ❌ Cannot delegate via task()
- ✅ Read-only validation

**Invocation:**

```typescript
// Prometheus → Momus (high accuracy mode)
task(
  (subagent_type = 'momus'),
  (run_in_background = false),
  (load_skills = []),
  (description = 'Validate refactor plan'),
  (prompt = `Review this plan for:
     - Clarity: Can Atlas execute without ambiguity?
     - Verifiability: Clear success criteria for each task?
     - Completeness: All edge cases covered?
     - Gaps: Missing steps or context?
     
     Plan: [plan content]`),
);
```

### 11. Sisyphus-Junior (Category Executor)

**Model:** `anthropic/claude-sonnet-4-5` (or category-specific model) **Temperature:** 0.1 **Mode:**
all

**Role:**

- Executes tasks delegated via categories
- Category-specific prompts and models
- Cannot re-delegate (prevents infinite loops)
- Focused execution without orchestration overhead

**Categories:**

- `quick` — Fast, simple tasks (claude-haiku-4-5)
- `visual-engineering` — UI/UX work (gemini-3-pro)
- `deep` — Complex problem-solving (gpt-5.3-codex)
- `ultrabrain` — Deep logical reasoning (gpt-5.3-codex xhigh)
- `artistry` — Creative tasks (gemini-3-pro max)
- `writing` — Documentation (gemini-3-flash)
- `unspecified-low/high` — Catch-all

**Tool Restrictions:**

- ❌ Cannot use task() (prevents infinite delegation)
- ✅ Full read/write access otherwise

**Invocation:**

```typescript
// Atlas → Sisyphus-Junior (via category)
task(
  (category = 'quick'),
  (load_skills = []),
  (run_in_background = false),
  (description = 'Fix type error'),
  (prompt = `TASK: Fix type error on line 42 of auth.ts

MUST DO:
1. Read auth.ts and identify type error
2. Fix with minimal changes
3. Run lsp_diagnostics to verify

MUST NOT DO:
- Refactor surrounding code
- Change function signatures
- Add new dependencies

EXPECTED OUTPUT:
- Type error resolved
- lsp_diagnostics clean`),
);
```

## Agent Selection Decision Tree

```
User Request
  ↓
Simple task?
  ├─ YES → Use Sisyphus directly
  │
  └─ NO → Needs planning?
          ├─ YES → Switch to Prometheus (@plan or Tab)
          │        └─ Prometheus creates plan
          │        └─ /start-work → Atlas executes
          │
          └─ NO → Complex exploration?
                  ├─ YES → Sisyphus fires background agents:
                  │        - Explore (codebase)
                  │        - Librarian (docs)
                  │        └─ Uses results to implement
                  │
                  └─ NO → Architecture question?
                          ├─ YES → Sisyphus → Oracle
                          │
                          └─ NO → Autonomous deep work?
                                  └─ YES → Switch to Hephaestus
```

## Agent Communication Protocols

### 1. Primary → Subagent (Background)

```typescript
// Sisyphus fires multiple background tasks
const taskIds = [
  task(subagent_type="explore", run_in_background=true, ...),
  task(subagent_type="librarian", run_in_background=true, ...),
  task(subagent_type="explore", run_in_background=true, ...)
]

// Continue with other work
// Notifications arrive when tasks complete
// Collect results: background_output(task_id="...")
```

### 2. Primary → Subagent (Sync)

```typescript
// Sisyphus waits for Oracle advice
const advice = task(
  (subagent_type = 'oracle'),
  (run_in_background = false),
  (description = 'Architecture consultation'),
  (prompt = '...'),
);

// Use advice to make decision
```

### 3. Orchestrator → Executor (Sync)

```typescript
// Atlas delegates to Sisyphus-Junior via category
const result = task(
  (category = 'quick'),
  (load_skills = []),
  (run_in_background = false),
  (description = 'Fix type error'),
  (prompt = '...'),
);

// Verify result
lsp_diagnostics((filePath = 'auth.ts'));

// Mark task complete in boulder.json
```

### 4. Planner → Consultant (Sync)

```typescript
// Prometheus consults Metis
const analysis = task(
  (subagent_type = 'metis'),
  (run_in_background = false),
  (description = 'Analyze requirements'),
  (prompt = '...'),
);

// Use analysis to write better plan
```

## Agent Prompt Composition

Each agent's prompt is built from **composable sections**:

1. **Base Identity** — Role, expertise, mindset
2. **Task Management** — Todo or Task system
3. **Available Resources** — Tools, agents, categories, skills
4. **Delegation Guidance** — When to delegate to whom
5. **Key Triggers** — Phase 0 decision shortcuts
6. **Hard Blocks** — Non-negotiable constraints
7. **Anti-Patterns** — Forbidden practices

**Example: Sisyphus Prompt Structure**

```
[Role: Powerful AI Agent with orchestration]
  ↓
[Core Competencies]
  ↓
[Phase 0: Intent Gate]
  ↓
[Phase 1: Codebase Assessment]
  ↓
[Phase 2A: Exploration (explore/librarian)]
  ↓
[Phase 2B: Implementation]
  ↓
[Phase 3: Completion]
  ↓
[Oracle Usage]
  ↓
[Task Management]
  ↓
[Tone and Style]
  ↓
[Hard Blocks]
  ↓
[Anti-Patterns]
```

## Agent Configuration

### Config File Structure

```jsonc
{
  "agents": {
    "oracle": {
      "model": "anthropic/claude-opus-4-6",
      "temperature": 0.1,
      "tools": {
        "write": false,
        "edit": false,
        "task": false,
      },
      "prompt_append": "Additional instructions...",
      "thinking": {
        "type": "enabled",
        "budgetTokens": 32000,
      },
    },
    "sisyphus-junior": {
      "model": "anthropic/claude-sonnet-4-5",
      "category": "executor",
      "skills": ["git-master"],
    },
  },

  "disabled_agents": ["hephaestus"],
}
```

### Override Options

| Field             | Type    | Description                            |
| ----------------- | ------- | -------------------------------------- |
| `model`           | string  | Override model (provider/model-id)     |
| `variant`         | string  | Model variant (max, high, medium, low) |
| `temperature`     | number  | 0-2 (default varies by agent)          |
| `top_p`           | number  | 0-1 nucleus sampling                   |
| `prompt`          | string  | Replace entire prompt                  |
| `prompt_append`   | string  | Append to prompt                       |
| `tools`           | object  | Tool permissions (true/false)          |
| `disable`         | boolean | Disable agent                          |
| `description`     | string  | Agent description                      |
| `mode`            | string  | primary/subagent/all                   |
| `color`           | string  | UI color (#RRGGBB)                     |
| `permission`      | object  | Permission settings                    |
| `maxTokens`       | number  | Max output tokens                      |
| `thinking`        | object  | Extended thinking config               |
| `reasoningEffort` | string  | low/medium/high/xhigh                  |
| `textVerbosity`   | string  | low/medium/high                        |

## Next Steps

- **[Agent Communication](02-agent-communication.md)** — Task delegation, session continuity
- **[Prompt System](03-prompt-system.md)** — How agent prompts are built and injected
- **[Adding Agents](04-adding-agents.md)** — Create custom agents step-by-step
