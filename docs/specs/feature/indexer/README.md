# Texere Indexer v1 Specification

**Version:** 1.1  
**Status:** Active (Core specs) + Placeholder specs (Implementation details TBD)  
**Last Updated:** December 2025

## Quick Summary

The **Texere Indexer** builds a unified **Knowledge Graph** from code, tests, specifications, and
incidents. It:

- **Ingests** Git snapshots incrementally via language-specific indexers (TypeScript, Python)
- **Extracts** symbols, calls, references, endpoints, schema entities, and test cases
- **Maps** features, tests, and endpoints using LLM assistance
- **Persists** to Neo4j (graph) + Qdrant (vectors) via the core library
- **Exposes** agent-facing queries: `getFeatureContext()`, `getEndpointPatternExamples()`,
  `getIncidentSlice()`

The graph enables agents to understand repo structure, apply patterns consistently, and debug using
historical context.

---

## Quick Navigation

### Core Specifications (Active – Authoritative)

| Document                                     | Purpose                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [**ingest_spec.md**](./ingest_spec.md)       | Complete v1 ingestion pipeline, language indexers, Git diff, extractors, error handling, testing requirements |
| [**nx_layout_spec.md**](./nx_layout_spec.md) | Nx monorepo structure: `indexer/{types, core, ingest, query, workers}` libraries and dependency rules         |

### Testing & Development (Foundation for Implementation)

**Start here before coding**:

| Document                                                   | Purpose                                                                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [**test_repository_spec.md**](./test_repository_spec.md)   | Comprehensive TypeScript test repo: structure, node/edge coverage matrix, git history, validation checklist |
| [**testing_strategy_spec.md**](./testing_strategy_spec.md) | Unit/integration/golden test structure, synthetic repos, coverage targets                                   |

### Implementation Detail Specs (Placeholders – Fill Before Coding)

**Must complete FIRST** (blocks all other work):

| Document                                           | Purpose                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [**graph_schema_spec.md**](./graph_schema_spec.md) | Neo4j/Memgraph DDL, node/edge schema, indexes, Cypher query patterns                     |
| [**vector_store_spec.md**](./vector_store_spec.md) | Qdrant payload schema, embedding model/dims, similarity queries                          |
| [**llm_prompts_spec.md**](./llm_prompts_spec.md)   | LLM prompt templates for feature mapping, test↔feature, endpoint↔feature; output schemas |

**High priority** (before implementation):

| Document                                             | Purpose                                                               |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| [**configuration_spec.md**](./configuration_spec.md) | Environment variables, config files, tracked branches, security lists |
| [**api_gateway_spec.md**](./api_gateway_spec.md)     | HTTP REST endpoints, request/response schemas, error contracts        |

**Medium priority** (implementation details):

| Document                                                         | Purpose                                                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [**symbol_id_stability_spec.md**](./symbol_id_stability_spec.md) | Symbol ID algorithm, Git rename/move handling, incremental diff logic                          |
| [**language_indexers_spec.md**](./language_indexers_spec.md)     | TypeScript/JavaScript AST rules, Python sidecar protocol, framework heuristics, test detection |

**Optional for v1**:

| Document                                                               | Purpose                                                     |
| ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| [**patterns_and_incidents_spec.md**](./patterns_and_incidents_spec.md) | Pattern definitions, incident manifest, historical tracking |

---

## Architecture at a Glance

```
Input                 → Indexer Pipeline              → Output
─────────────────────────────────────────────────────────────
Git Snapshot             Language Indexers           Knowledge Graph
(commit hash)       ┌─ TypeScript/JavaScript      ┌─ Neo4j (nodes/edges)
                    ├─ Python                     ├─ Qdrant (embeddings)
                    └─ ...
                       ↓
                    Higher-Level Extractors
                    • Endpoints
                    • Schema entities
                    • Test cases
                    • Features (LLM-assisted)
                       ↓
                    Graph Writes
                       ↓
                    Agent-Facing Queries
                    • getFeatureContext()
                    • getEndpointPatternExamples()
                    • getIncidentSlice()
```

---

## For Different Roles

**Implementing the Indexer?**  
→ Start with **test_repository_spec** (understand what to extract).  
→ Finalize **graph_schema_spec**, **vector_store_spec**, **llm_prompts_spec** (critical
infrastructure).  
→ Complete **configuration_spec**, **api_gateway_spec**, **language_indexers_spec** (implementation
details).  
→ Refer to **ingest_spec** & **nx_layout_spec** for orchestration and library structure.  
→ Use **testing_strategy_spec** + **test_repository_spec** to build unit/integration/golden tests.

**Integrating agents with the indexer?**  
→ Read **ingest_spec** §2.1–2.3 (data model).  
→ Use **api_gateway_spec** for endpoint contracts.  
→ Import from `@repo/features/indexer/query` (see **nx_layout_spec** §2.4).

**Understanding the graph model?**  
→ See **test_repository_spec** for visual node/edge mapping examples.  
→ Review **nodes/README.md** & **edges/README.md** for full catalog.  
→ This README was intentionally simplified; detailed schema in **graph_schema_spec**.

**Setting up CI/operations?**  
→ See **configuration_spec** for env vars and **ingest_spec** §6 for snapshot indexing flow.

**Validating indexer correctness?**  
→ Use **test_repository_spec** validation checklist.  
→ Run against test-typescript-app with golden file comparisons.

---

## Implementation Order

1. **Phase 1 (Foundation)**: Finalize **test_repository_spec** + **graph_schema_spec**,
   **vector_store_spec**, **llm_prompts_spec**
2. **Phase 2 (Setup)**: Complete remaining specs (**configuration_spec**, **api_gateway_spec**,
   **language_indexers_spec**)
3. **Phase 3 (Code)**: Implement `indexer/{types, core, ingest, query, workers}` per
   **nx_layout_spec**
4. **Phase 4 (Test)**: Write unit/integration/golden tests per **testing_strategy_spec** using
   **test_repository_spec**
5. **Phase 5 (Integrate)**: Connect with agents via **api_gateway_spec**

---

## Decisions Made (Q&A Summary)

- **v1 languages**: TypeScript/JavaScript (full AST) + Python (basic analysis)
- **LLM usage**: Feature mapping, test↔feature, endpoint↔feature (best-effort determinism)
- **Snapshot retention**: Latest commit per tracked branch (own repos); exact versions in lockfiles
  (deps)
- **Renames**: Treated as delete + add (no continuity tracking in v1)
- **Runtime**: Local or single-node execution
- **Performance**: Soft budget; correctness prioritized

---

## Changelog

| Date       | Version | Summary                                                                                                                               |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-09 | 1.2     | Added **test_repository_spec.md** for TypeScript test app; updated navigation & implementation order to prioritize testing foundation |
| 2025-12-08 | 1.1     | Restructured as navigation hub; moved detailed schema to placeholder specs; added quick summary & role-based navigation               |
| 2025-12-06 | 1.0     | Initial comprehensive spec (now split into focused documents)                                                                         |

---

## Quick Reference Links

### Detailed Catalogs

- [Node Type Catalog](./nodes/README.md) – All 14 node types, cardinality invariants, hierarchies
- [Edge Type Catalog](./edges/README.md) – All 10 edge types, property-based sub-typing, query
  patterns
- [Schema Documentation Summary](./SCHEMA_DOCUMENTATION_SUMMARY.md) – Quick reference for all nodes
  & edges

### Research & Analysis

- [NODE_EDGE_MAPPING.md](./research/NODE_EDGE_MAPPING.md) – Complete inventory of node↔edge pairs
- [RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md](./research/RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md)
  – Design rationale for consolidation
- [LLM_EXTRACTION_PATTERNS.md](./research/LLM_EXTRACTION_PATTERNS.md) – Patterns for LLM-assisted
  extraction

### External References

- [Texere System Overview](../../README.md) – High-level architecture
- [Engineering Testing Strategy](../../engineering/testing_strategy.md) – Repo-wide testing patterns
- External: [SCIP](https://sourcegraph.com/github.com/sourcegraph/scip),
  [Neo4j Cypher](https://neo4j.com/docs/cypher-manual/current/),
  [Qdrant](https://qdrant.tech/documentation/)
