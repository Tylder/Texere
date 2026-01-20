# SPEC-state-management-system: Pluggable, queryable state infrastructure

**Status:** Draft

**Version:** V1 (foundation layer)

---

## Quick Summary

The system requires a **durable, queryable state layer** that tracks multiple forms of state
(epistemic, research, plans, code, decisions) independently but with rich cross-linking. This spec
defines the V1 foundation: a pluggable state management architecture with stable IDs, flexible
links, and traversal queries.

V1 is designed to anticipate V2 (semantic indexing + TreeSitter code awareness) without implementing
it, enabling clean plugin-based extension later.

---

## References

**Driven by:**

- PROBDEF-ai-coding-system: PROB-003 (durable epistemic state), PROB-010 (current baseline vs
  history), PROB-004 (historical knowledge), PROB-009 (decision traceability), PROB-022 (schema
  evolution)
- REQ-ORCH-EPISTEMIC-001/002/003 (epistemic state management)
- REQ-ORCH-HISTORY-001/002 (decision history and rationale)
- REQ-ORCH-SESSION-001/002 (session persistence, checkpoint completeness)
- Architectural constraint: State is orthogonal to orchestration; LangGraph agents read/query/update
  state, but don't define it

**Enabled by:**

- Backend separation (ADR-architecture-backend-ui-separation) — state lives in backend, UI queries
  via API
- LangGraph orchestration (ADR-orchestration-langgraph-ts) — agents interact with state system, not
  just graph state

**Extended by:**

- V2: SPEC-semantic-indexing (docs/docstrings)
- V2: SPEC-code-ast-indexing (TreeSitter integration)

---

## Goals

1. **Pluggability:** New state types (epistemic, research, plan, code, etc.) can be added without
   modifying core
2. **Cross-type linking:** State entities reference each other across type boundaries by stable ID
3. **Schema evolution:** Epistemic state structure can change without breaking research references
   to it
4. **Queryability:** Traversal and filtering across state graph work uniformly regardless of state
   type
5. **Extensibility toward V2:** Architecture allows AST nodes and doc sections to become first-class
   queryable entities
6. **Immutability by ID:** Each state piece has a stable ID; mutations create new versions, not
   replacements

---

## Architecture

### Core Layers

```
┌─────────────────────────────────────────────┐
│ Query Interface                             │
│ (Traverse, filter, project across types)    │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ State Registry & Plugin System              │
│ (Type handlers, query dispatch)             │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ Link Graph (Entity References)              │
│ (ID-based linking across types)             │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ State Entities (Pluggable Types)            │
│ - Epistemic state (facts, hypotheses, etc.) │
│ - Research state (findings, sources)        │
│ - Plan/task state (work items, blockers)    │
│ - Code state (repo, mutations, baseline)    │
│ - Decision state (choices, rationale)       │
│ - [V2: AST nodes, doc sections]             │
└─────────────────────────────────────────────┘
```

### 1. Entity ID Scheme

Every piece of state has a **stable, hierarchical ID** that encodes type and location:

```
<type>:<namespace>:<identifier>[@version]

Examples:
  epistemic:hypoth:001                    # Hypothesis #1
  epistemic:fact:repo-structure-001       # Fact about repo structure
  epistemic:unknown:db-schema             # Unknown: database schema
  epistemic:constraint:payment-pci        # Constraint: PCI compliance
  epistemic:decision:auth-framework-001   # Decision #1
  epistemic:rationale:auth-framework-001  # Rationale for that decision

  research:tool-output:repo-search-042    # Tool output #42
  research:finding:api-patterns           # Finding from investigation
  research:staleness-marker:dep-upgrade   # Staleness check on dep upgrade

  plan:task:migrate-auth                  # Task: migrate auth
  plan:blocker:auth-task:resolve-hypoth   # Blocker: resolve hypothesis
  plan:phase:discovery                    # Phase marker: in discovery

  code:file:src/services/auth.ts
  code:repo-state:baseline-001            # Named baseline

  [V2 additions]:
  ast:src/services/auth.ts:fn:authenticate    # AST node: function
  ast:src/services/auth.ts:class:AuthService  # AST node: class

  doc:ARCHITECTURE.md#auth-layer              # Doc section
  doc:ADR-005                                 # ADR section
```

**Versioning:** Append `@version` for historical queries. Default to latest unless specified.

- `epistemic:hypoth:001` → latest version
- `epistemic:hypoth:001@1` → version 1 (when it was first created)

### 2. Link Model

A **link** is a directed reference from one entity to another:

```typescript
interface Link {
  from: EntityID; // e.g., "epistemic:hypoth:001"
  to: EntityID; // e.g., "research:tool-output:042"
  rel: string; // Relationship type: "grounded-by", "contradicted-by", "supports", "blocks", etc.
  created: timestamp;
  evidence?: {
    // Optional: explain why this link exists
    description: string;
    source: 'user' | 'system' | 'inference';
  };
}
```

**Link types (examples; extensible):**

- `grounded-by` — hypothesis grounded in research finding
- `contradicted-by` — fact contradicted by new evidence
- `supports` — research supports a decision
- `blocks` — unknown blocks a task
- `refines` — later hypothesis refines earlier one
- `replaces` — decision replaces previous decision
- `depends-on` — task depends on resolution
- `derives-from` — inferred fact derives from explicit facts
- `references` — decision references an ADR/doc
- [V2]: `defined-in` — decision defined/documented in ADR
- [V2]: `implemented-in` — design implemented as code (AST node)
- [V2]: `explained-in` — code explained in docstring

Links survive across state type boundaries:

- `epistemic:hypoth:001` → `research:tool-output:042` (hypothesis grounded in tool output)
- `research:tool-output:042` → `plan:task:migrate-auth` (research informs task planning)
- `plan:task:migrate-auth` → `code:file:src/services/auth.ts` (task targets code)

### 3. Query Interface

Queries operate on the state graph. All queries return **entity projections** (subsets of full
entity state).

```typescript
interface StateQuery {
  // Traversal
  startFrom(entityID: EntityID); // Begin at entity
  followLinks(relTypes?: string[]); // Follow specific link types (all if unspecified)
  depth(maxDepth: number); // Limit traversal depth

  // Filtering
  where(predicate); // Filter entities by property
  ofType(type: string); // Only entities of given type (e.g., "epistemic", "research")

  // Projection/Output
  project(fields: string[]); // Select which fields to return
  collect(); // Execute query, return results
  count(); // Count matching entities

  // History
  asOf(timestamp); // Query state as it was at a time
  versions(); // Get all versions of an entity
}

// Examples:
stateGraph
  .startFrom('epistemic:hypoth:001')
  .followLinks(['grounded-by', 'contradicted-by'])
  .collect();
// → Returns all research that grounds or contradicts hypothesis 001

stateGraph.startFrom('plan:task:migrate-auth').followLinks(['blocks']).depth(1).collect();
// → Returns all entities that directly block this task

stateGraph
  .startFrom('epistemic:decision:auth-framework-001')
  .followLinks()
  .ofType('research', 'epistemic')
  .project(['id', 'description', 'status'])
  .collect();
// → Find all epistemic and research entities linked to this decision; return only id/description/status
```

### 4. State Type Registry & Plugin Model

New state types register with the system:

```typescript
interface StateTypePlugin {
  type: string; // e.g., "epistemic", "research"

  entitySchema(namespace: string): {
    // Define shape of entity for this type/namespace
    fields: { [key: string]: FieldDef };
    invariants?: (entity) => boolean[]; // Constraints to enforce
  };

  mutations?: {
    // Define what operations are allowed on this type
    [operationName: string]: (entity, args) => entity;
  };

  queries?: {
    // Define type-specific queries
    [queryName: string]: (collection, args) => Result[];
  };
}

// Example: Epistemic state plugin
registerStateType({
  type: 'epistemic',

  entitySchema(namespace) {
    if (namespace === 'hypoth') {
      return {
        fields: {
          id: { type: 'string', immutable: true },
          value: { type: 'string' },
          grounded: { type: 'boolean', default: false },
          created: { type: 'timestamp', immutable: true },
          updated: { type: 'timestamp' },
          status: { type: 'enum', values: ['open', 'validated', 'refuted', 'superseded'] },
        },
        invariants: [
          (e) => e.status === 'validated' || !e.grounded, // If ungrounded, can't be validated
        ],
      };
    }
    // ... other namespaces
  },

  mutations: {
    ground(entity, { researchID }) {
      // Mark hypothesis as grounded by research
      return { ...entity, grounded: true, updated: now() };
    },
    refute(entity, { contradictionID }) {
      return { ...entity, status: 'refuted', updated: now() };
    },
  },
});
```

When a new state type is registered:

- Its queries become available in the global query interface
- Links can point to/from its entities
- No core code changes required

### 5. Update Semantics

**Immutability by ID:** State entities are never mutated in-place.

- When you change a hypothesis, you create a new version with an incremented version number
- Old versions remain queryable (for history, debugging, causality)
- Links remain valid (they point to entity ID, not a specific version; `@version` qualifier
  optional)
- Checkpoint captures which versions were current at that moment

```typescript
// V1: Create new hypothesis
state.create('epistemic:hypoth:002', {
  value: 'Database uses PostgreSQL',
  created: timestamp,
  status: 'open',
});

// Later: Hypothesis becomes validated
state.update('epistemic:hypoth:002', {
  status: 'validated',
});
// Internally: Creates new version with @2

// Query for history:
state.versions('epistemic:hypoth:002');
// → [
//   { id: "epistemic:hypoth:002@1", status: "open", updated: T1 },
//   { id: "epistemic:hypoth:002@2", status: "validated", updated: T2 }
// ]

// Link always points to latest unless specified:
link({
  from: 'research:finding:db-patterns',
  to: 'epistemic:hypoth:002', // Points to @latest
  rel: 'contradicts',
});
// Later if hypothesis updates, link still valid
```

### 6. Persistence & Checkpointing

State is persisted to a durable backend (database, event log, etc.; implementation TBD).

Each **checkpoint** captures:

- Timestamp
- Current version of each entity
- Active links
- Orchestration context (which agent ran, why, what it accessed)

On session resume:

- Load checkpoint
- Restore all entities to their checkpoint versions
- Resume orchestration from saved point
- New work creates new versions, new links

---

## V1 State Types

These are the initial pluggable types. Others can be added without changing core:

1. **epistemic** — Facts, hypotheses, unknowns, constraints, decisions, rationale
   - Namespaces: `fact`, `hypoth`, `unknown`, `constraint`, `decision`, `rationale`
   - Enforce separation (hypotheses can't silently become facts)

2. **research** — Findings, investigations, tool outputs, sources
   - Namespaces: `tool-output`, `finding`, `investigation`, `staleness-marker`
   - Track provenance, staleness

3. **plan** — Work items, tasks, phases, blockers
   - Namespaces: `task`, `phase`, `blocker`, `milestone`
   - Track work state and dependencies

4. **code** — Repository state, baselines, mutations
   - Namespaces: `file`, `repo-state`, `baseline`
   - Track code state separate from commits

5. **decision** — Choices, trade-offs, rejected alternatives
   - Namespaces: `choice`, `trade-off`, `alternative`
   - Link to research, constraints, rationale

---

## V2 Roadmap (Preview)

V2 adds **semantic awareness** without breaking V1:

1. **AST Indexing (TreeSitter)**
   - Register code symbols as first-class state entities: `ast:file:symbol`
   - Functions, classes, types become queryable
   - Example queries: "What code implements this decision?" "What code depends on this constraint?"
   - New link type: `implemented-in` (decision → code symbol)

2. **Semantic Doc Indexing**
   - Register doc sections as entities: `doc:ARCHITECTURE.md#section`
   - Docstrings become queryable: `docstring:src/services/auth.ts:fn:authenticate`
   - New link types: `defined-in`, `explained-in`
   - Example queries: "What decisions are explained in this ADR?" "What code implements this
     requirement?"

3. **Cross-Graph Queries**
   - "Show me the decision, its rationale, the research that supports it, the code that implements
     it, and the docs that explain it"
   - Multi-hop traversal across epistemic state, research, code, docs

4. **Inference Layer** (optional future)
   - Automated linking based on semantic similarity
   - Constraint propagation (if hypothesis refuted, mark dependent tasks as blocked)

**V2 is purely additive:** It registers new state types and new link types. V1 queries continue to
work unchanged.

---

## Constraints & Guarantees

1. **No silent schema corruption:** When epistemic state schema changes, old entities remain
   queryable (possibly with migration)
2. **Links are durable:** A link to `epistemic:hypoth:001` remains valid even if hypothesis
   structure changes
3. **IDs are immutable:** Once assigned, an entity ID never changes (new versions use version
   suffix, not new ID)
4. **Query results are projections:** Queries return subsets; full entity structure not required in
   every query result
5. **Type isolation by default:** Queries within a type don't break when other types change (but
   cross-type queries available when needed)

---

## Implementation Notes (Not Prescriptive)

These are hints for implementation; spec doesn't mandate specific tech:

- **Backend storage:** Event log or document store with versioning (e.g., PostgreSQL with version
  columns, MongoDB with versioning, or event sourcing)
- **Link index:** Separate index for fast traversal (e.g., graph database, inverted index, or
  in-memory cache)
- **Query execution:** Can be in-process (for small state) or backend service (for scale)
- **Eventual consistency:** Checkpoints may lag live state; that's acceptable for the use case

---

## Example: Full Workflow (V1)

**User initiates task:** "Determine if auth framework X is suitable"

1. **System creates planning state:**

   ```
   plan:task:evaluate-auth-framework
   epistemic:unknown:auth-framework-compatibility
   epistemic:constraint:auth-pci-requirement
   ```

2. **Agent runs research:**
   - Gathers docs, runs tests, checks compatibility
   - System creates research entities:

   ```
   research:tool-output:framework-docs-001
   research:finding:framework-supports-pci
   research:staleness-marker:check-in-30-days
   ```

3. **Agent reports finding:**
   - System links research to unknown:

   ```
   Link: epistemic:unknown:auth-framework-compat → research:finding:framework-supports-pci (grounded-by)
   ```

4. **Unknown is now resolved:**
   - Query can detect: "This unknown is now grounded"
   - UI shows: "Unknown resolved by: [link to research]"

5. **Later, research becomes stale:**
   - System updates staleness marker
   - Query detects: "This finding is now stale"
   - UI prompts: "Re-validate research on auth framework?"

6. **Session checkpoint:**
   - All entities and links saved with versions
   - Next session resumes with full context

**V2 addition:** Code implementing decision links back to ADR that decided it; docs explain what it
does.

---

## Open Questions for Refinement

1. **Conflict resolution:** When two agents create conflicting epistemic state (e.g., contradictory
   facts), what's the merge strategy? (Likely: flag as conflict, require user resolution)
2. **Storage backend:** Event log vs document store vs graph database? (Defer to implementation, but
   spec allows all)
3. **Query performance:** Should we build an index? When? (Likely: yes, build as optimization after
   V1 works)
4. **Privacy/scoping:** When switching tasks/projects, how is state scoped? (Likely: separate state
   graphs per project, with query guards)
