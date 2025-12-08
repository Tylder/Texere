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

### Implementation Detail Specs (Placeholders – Fill Before Coding)

**Must complete FIRST** (blocks all other work):

| Document                                           | Purpose                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [**graph_schema_spec.md**](./graph_schema_spec.md) | Neo4j/Memgraph DDL, node/edge schema, indexes, Cypher query patterns                     |
| [**vector_store_spec.md**](./vector_store_spec.md) | Qdrant payload schema, embedding model/dims, similarity queries                          |
| [**llm_prompts_spec.md**](./llm_prompts_spec.md)   | LLM prompt templates for feature mapping, test↔feature, endpoint↔feature; output schemas |

**High priority** (before implementation):

| Document                                                   | Purpose                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| [**configuration_spec.md**](./configuration_spec.md)       | Environment variables, config files, tracked branches, security lists     |
| [**api_gateway_spec.md**](./api_gateway_spec.md)           | HTTP REST endpoints, request/response schemas, error contracts            |
| [**testing_strategy_spec.md**](./testing_strategy_spec.md) | Unit/integration/golden test structure, synthetic repos, coverage targets |

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
→ Start with **graph_schema_spec**, **vector_store_spec**, **llm_prompts_spec** (critical).  
→ Then fill in **configuration_spec**, **api_gateway_spec**, **testing_strategy_spec**.  
→ Refer to **ingest_spec** & **nx_layout_spec** for orchestration and library structure.

**Integrating agents with the indexer?**  
→ Read **ingest_spec** §2.1–2.3 (data model).  
→ Use **api_gateway_spec** for endpoint contracts.  
→ Import from `@repo/features/indexer/query` (see **nx_layout_spec** §2.4).

**Understanding the graph model?**  
→ This README was intentionally simplified; the full schema lives in **ingest_spec** and
**graph_schema_spec**.

**Setting up CI/operations?**  
→ See **configuration_spec** for env vars and **ingest_spec** §6 for snapshot indexing flow.

---

## Implementation Order

1. **Phase 1**: Finalize **graph_schema_spec**, **vector_store_spec**, **llm_prompts_spec**
2. **Phase 2**: Complete remaining placeholder specs
3. **Phase 3**: Implement `indexer/{types, core, ingest, query, workers}` per **nx_layout_spec**
4. **Phase 4**: Write tests per **testing_strategy_spec**
5. **Phase 5**: Integrate with agents

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

| Date       | Version | Summary                                                                                                                 |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2025-12-08 | 1.1     | Restructured as navigation hub; moved detailed schema to placeholder specs; added quick summary & role-based navigation |
| 2025-12-06 | 1.0     | Initial comprehensive spec (now split into focused documents)                                                           |

---

## References

- [Texere System Overview](../../README.md) – High-level architecture
- [Engineering Testing Strategy](../../engineering/testing_strategy.md) – Repo-wide testing patterns
- External: [SCIP](https://sourcegraph.com/github.com/sourcegraph/scip),
  [Neo4j Cypher](https://neo4j.com/docs/cypher-manual/current/),
  [Qdrant](https://qdrant.tech/documentation/)
