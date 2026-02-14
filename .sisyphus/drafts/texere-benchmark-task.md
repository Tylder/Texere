# Draft: Texere Ingestion Benchmark Task

## What This Is

A standardized, reproducible task given to an agent after each Texere iteration. The agent ingests
content from a documentation website into Texere's knowledge graph. The friction/failures/gaps
surfaced during ingestion drive improvement priorities.

## Requirements (confirmed)

- **Purpose**: Find shortcomings, friction, DX issues in Texere
- **Input**: Documentation website with specific URLs
- **Output**: Nodes and edges in Texere from the site content
- **Graph state**: Clean slate each run (wipe before benchmark)
- **Friction targets**: ALL — type selection quality, graph structure quality, workflow compliance
- **Doc site**: TBD — helping user pick one

## Texere API Surface (current, for benchmark design)

- **MCP-facing "types"** (17): task, code_pattern, problem, solution, project, technology, error,
  fix, command, file_context, workflow, general, conversation, decision, requirement, constraint,
  research
- **Edge types** (14): RELATED_TO, CAUSES, SOLVES, REQUIRES, CONTRADICTS, BUILDS_ON, DEPRECATED_BY,
  PREVENTS, VALIDATES, ALTERNATIVE_TO, MOTIVATED_BY, IMPLEMENTS, CONSTRAINS, ANCHORED_TO
- **Key tools**: texere_store_node, texere_create_edge, texere_search, texere_traverse,
  texere_about, texere_stats

## Key Insight: SKILL.md vs Implementation Gap

- The SKILL.md references v1.0/v1.1 naming conventions
- The actual MCP tools expose roles as "types" (17 user-facing types = internal roles)
- Edge types in MCP are v1.1 names (SOLVES, REQUIRES, etc.), but internal code has v1.0 names
  (Resolves, DependsOn, etc.)
- v1.1 implementation is underway — benchmark should test the MCP-facing API

## Decisions Made

- **Two benchmark tracks**: Hono (external, qualitative) + Internal docs (controlled, with truth)
- **Hono URLs** (~6 pages): overview, getting-started, routing, middleware, validation,
  best-practices
- **Task prompt style**: Open-ended — just URLs + "create nodes and edges". Tests SKILL.md guidance.
- **Graph state**: Clean slate each run (wipe before benchmark)
- **Agent runtime**: opencode (this tool), with Texere MCP tools available
- **Task format**: Markdown prompt file in repo (.sisyphus/benchmarks/)
- **Evaluation for Hono**: Qualitative (eyeball graph structure, note friction)
- **Evaluation for internal docs**: Structural truth defined — expected concepts, relationships,
  invariants

## Internal Doc Candidates

Ranked by benchmark fitness:

### Tier 1 (Best for truth definition)

1. **kg-redesign.md** — Rich mix of decisions, problems, requirements, research, technologies.
   Natural MOTIVATED_BY, SOLVES, BUILDS_ON edges. Clear concepts you KNOW should be nodes.
2. **memory-graph-audit.md** — Clear "took vs didn't take" structure. Technologies, decisions,
   comparisons. Natural BUILDS_ON, ALTERNATIVE_TO edges.

### Tier 2 (Good but already tested)

3. **search-comparison-llm-ux.md** — Already used in previous benchmark
   (node-modeling-test-findings.md). Could re-use but less novel signal.

### Tier 3 (Useful but narrow)

4. **sqlite-benchmark-research.md** — Mostly `research` type nodes. Less type diversity.
5. **oh-my-opencode-integration.md** — Good decisions/requirements but references external system
   heavily.

## Truth Definition Approach

- **NOT exact title matching** — concept coverage + relationship coverage + structural invariants
- **Three layers**:
  1. Must-have concepts (these ideas MUST appear as nodes, any reasonable type)
  2. Must-have relationships (these edges MUST exist between the concepts)
  3. Structural invariants (counts, type distribution, connectivity)

## Decisions Still Open

- None blocking plan generation. Ready to proceed.
