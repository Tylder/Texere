# Draft: Texere + OMO/OpenCode Integration

## User's Request
"I want to work on integrating Texere into opencode and omo. At minimum 1 new agent defined and integrated into omo that will be in charge of ingesting... it should do a much better job since it would be an expert."

## What the User Is Actually Trying to Solve
The benchmark showed that generic agents using Texere create mediocre nodes. The problem is twofold:
1. **Guidance gap**: SKILL.md doesn't teach quality criteria deeply enough
2. **Workflow gap**: Ingestion is a multi-step orchestration task (research → decompose → classify → score → store → link) that generic agents don't optimize for

The user wants a dedicated **knowledge engineer** agent — not just "another agent that has access to Texere tools" but one whose entire identity and expertise is about creating excellent knowledge graph content.

## Research Findings (from 3 explore agents)

### How OMO Agents Work
- **Built-in agents**: TypeScript files in `src/agents/`, registered in `builtin-agents.ts` and `agent-names.ts`
- **Custom agents**: YAML frontmatter AGENT.md files in `.opencode/agents/` — NO code changes needed
- **AgentConfig**: `{ description, mode, model, temperature, prompt, tools }` + static `.mode` property
- **AgentPromptMetadata**: `{ category, cost, triggers, useWhen, avoidWhen, keyTrigger, dedicatedSection }`
- **Delegation**: Subagents invoked via `task(subagent_type="name", ...)`. Most subagents have `task=false` (can't delegate further) but Metis is an exception — it CAN delegate to explore/librarian.
- **Skills**: `load_skills=["name"]` injects SKILL.md body as system prompt content

### How Texere Currently Integrates
- Already a **skill** (`.opencode/skills/texere/SKILL.md`) with embedded MCP
- When loaded via `load_skills=["texere"]`, SKILL.md body injected into agent system prompt
- MCP tools accessed via `skill_mcp(mcp_name="texere", tool_name="texere_search", ...)` OR directly as `mcp_texere_texere_search()` depending on configuration
- Any agent CAN use Texere — the issue is they don't use it WELL

### Skill-MCP Pipeline (confirmed)
1. SKILL.md frontmatter has `mcp:` section with command/args
2. SkillMcpManager lazily connects to MCP server on first use
3. Skill content (body after `---`) injected as system prompt
4. Tools available via `skill_mcp` tool or directly if MCP is in opencode config

### Agent Registration (built-in path)
1. Create `src/agents/agent-name.ts` with factory + metadata
2. Register in `src/agents/builtin-agents.ts` (agentSources + agentMetadata)
3. Export from `src/agents/index.ts`
4. Add to `src/config/schema/agent-names.ts` (BuiltinAgentNameSchema + OverridableAgentNameSchema)
5. Rebuild plugin

### Custom Agent Path (no code changes)
1. Create `.opencode/agents/agent-name/AGENT.md` with YAML frontmatter
2. OMO auto-discovers and registers
3. Always appears as "CHEAP utility" in delegation table
4. Limited metadata control

## Critical Analysis

### The TWO separate problems
1. **SKILL.md quality gaps** — affects ALL agents, fixable without any new agent
2. **Ingestion workflow complexity** — requires orchestration expertise, benefits from a specialist

### Why "just improve SKILL.md" isn't sufficient
- The Recall Test guidance is excellent but covers only CONTENT quality
- Missing: scoring rubrics, tag strategy, content length, when-to-split heuristics
- Even with perfect guidance, ingestion requires: read source → decompose into atomic concepts → classify type/role → assess importance relative to other nodes → create edges to existing graph → verify no duplicates
- This is a fundamentally different cognitive task from "use texere to store what you learned"
- It's the difference between "write to a database" and "be a data engineer"

### Why "just add an agent" isn't sufficient
- If the underlying SKILL.md is weak, even the specialist agent will struggle
- The specialist's prompt can embed scoring rubrics, but those should ALSO live in SKILL.md for other agents
- Both improvements are needed and they're complementary

### Delegation architecture concern
- Most OMO subagents have `task=false` (can't delegate further)
- For the weaver to ask explore/librarian, it needs `task=true`
- Precedent: Metis CAN delegate to explore/librarian
- This means the weaver would be a "powered subagent" like Metis, not a restricted one like Oracle

## Integration Options Analysis

| Option | Where | Delegation? | Metadata Control | Maintenance | Effort |
|--------|-------|-------------|------------------|-------------|--------|
| A: Built-in OMO agent | omo src/agents/ | Full (task=true) | Full | Fork/PR omo | High |
| B: Custom AGENT.md | .opencode/agents/ | Limited | Always "CHEAP utility" | Local only | Low |
| C: Custom AGENT.md + skill | .opencode/agents/ + SKILL.md | Has MCP tools | Limited | Local, portable | Medium |
| D: Texere repo ships agent + skill | Texere .opencode/ | Has MCP tools | Limited | Ships with Texere | Medium |

## User Decisions (answered)
1. **Agent location**: Wants full OMO power, open to fork if needed, prefers extending without forking
2. **SKILL.md improvements**: Not now, skill is ok for now
3. **Agent scope**: Ingestion specialist only (more agents in later versions)
4. **Delegation model**: Asked for reasoned recommendation (see below)

## Critical Finding: Delegation Architecture

**`task=true` is GATED by `isPlanFamily()`** — only `plan` and `prometheus` agents get delegation power.

From `src/tools/delegate-task/sync-prompt-sender.ts`:
```typescript
const allowTask = isPlanFamily(input.agentToUse)  // Only "plan", "prometheus"
tools: { task: allowTask }
```

From `src/features/background-agent/spawner.ts`:
```typescript
task: false,  // HARDCODED for ALL background subagents
```

From `src/shared/agent-tool-restrictions.ts`:
- explore, librarian, oracle, metis, momus → `task: false` 
- Unknown agents (like a custom "weaver") → `{}` (empty = no restrictions listed)
- BUT: spawner/prompt-sender OVERRIDES to `task: false` regardless

**Bottom line**: A custom agent CANNOT fire explore/librarian via `task()`. Period. Unless omo is forked.

**Escape hatch**: `call_omo_agent` tool IS available to agents not in EXPLORATION_AGENT_DENYLIST. Metis uses this pattern. But it's sync-only and limited.

## Recommended Architecture: Pipeline Model

Given delegation constraints, the **pipeline model** is recommended:

```
User: "Ingest these Hono docs"
Sisyphus (has task=true):
  1. Fires explore agents for codebase context
  2. Fires librarian for external docs  
  3. Uses webfetch for URLs
  4. Passes ALL gathered content to weaver:
     task(subagent_type="weaver", load_skills=["texere"], 
          prompt="{topic + gathered content}")
Weaver:
  5. Decomposes content into atomic concepts
  6. Classifies type/role for each
  7. Assesses importance/confidence using embedded rubric
  8. Searches existing graph for duplicates/connections
  9. Creates nodes + edges with quality guarantees
  10. Returns summary of what was created
```

**Why pipeline > autonomous for V1:**
- Works with custom AGENT.md immediately (no fork needed)
- Separates concerns: Sisyphus = orchestrator, Weaver = transformer
- Sisyphus already excels at delegation/research
- Weaver's cognitive budget goes entirely to QUALITY, not logistics
- The benchmark showed the problem was quality-of-transformation, not quality-of-gathering

**V2 (future)**: Fork omo, make built-in, add `task=true` for autonomous mode

## User Decision: OMO Fork Required

User rejected custom AGENT.md approach for TWO reasons:
1. **AGENT.md is too limiting** — confirmed from experience
2. **Integration requirement**: Weaver must be callable automatically by OTHER OMO agents during research/decisions, not just explicitly by Sisyphus

This means the weaver needs to appear in the delegation table with proper metadata (useWhen, triggers, etc.) so that agents like Prometheus, Sisyphus, and potentially explore/librarian can recognize when to invoke it.

**Implication**: Must fork OMO → create built-in agent at `src/agents/weaver.ts`

## Integration Vision: Both Explicit + Automatic

**Explicit (delegation awareness):**
- Weaver appears in delegation table with proper metadata
- useWhen: "content needs to be ingested into knowledge graph", "research results should be persisted"
- Other agents see it and know to delegate knowledge ingestion to it
- E.g., Prometheus says "this research should be ingested" → delegates to weaver

**Automatic (hook-based):**  
- After research/reading, a hook automatically fires weaver to ingest
- Could be: tool.execute.after on webfetch, explore completion, librarian completion
- No manual delegation needed — ingestion happens as a side-effect of research

**User note**: "This is part of the research and we need to test different approaches"
→ Plan should include BOTH approaches, with testing to determine which works best

## Verification Strategy
- **Re-run benchmark**: Feed same 8 source documents to weaver agent
- Compare output quality against benchmark (30 nodes, 40 edges, 44% RELATED_TO)
- Concrete before/after quality comparison

## CRITICAL: Observability Findings (from 2 explore agents)

### What ALREADY EXISTS (no building needed):
1. **OpenCode SQLite persistence** — Full tool calls with params+results stored in `opencode.db`
   - `PartTable.data` stores `{ type: "tool", tool: string, state: { input, output, error, time } }`
   - `message.info.agent` tracks which agent made the call
   - `message.info.system` stores system prompt strings
   - Parent-child sessions via `parentID` field
2. **Session read tools** — `session_read`, `session_list`, `session_search` MCP tools
   - Can read full history including tool call params and results after the fact
3. **OMO transcript** — JSONL at `~/.claude/transcripts/{sessionId}.jsonl` with tool invocations
4. **OMO verbose logging** — `logEventVerbose()` shows tool calls on stderr with input/output preview
5. **OpenCode export** — `opencode export [sessionID]` dumps full JSON
6. **REST API** — `GET /:sessionID/message` returns all messages with tool parts

### What DOESN'T exist (gaps we need to fill):
1. **Texere MCP server logging** — Currently only has `console.error` for startup failure
   - When weaver calls `texere_store_knowledge`, we see it in session data
   - But we can't see INSIDE the Texere MCP (validation, dedup checks, embedding, etc.)
2. **Quality audit tooling** — No automated way to review quality of created nodes after ingestion
3. **Weaver-specific trace** — No "ingestion report" that summarizes what was created

### Observability Strategy for MVP:
1. **Session replay (free)** — Use `session_read` to review weaver's tool calls after the fact
2. **Texere MCP logging (build)** — Add structured logging to MCP server
3. **Quality audit (build)** — Post-ingestion script that queries graph and scores output
4. **Ingestion report (build)** — Weaver returns structured summary of what it created
5. **Benchmark comparison (build)** — Script to compare before/after metrics
