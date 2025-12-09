# SpecDoc Node

**Category**: Snapshot-Scoped  
**Purpose**: Documentation file (spec, ADR, design doc, guide, ticket).

---

## Properties

| Property      | Type      | Constraints | Notes                                                  |
| ------------- | --------- | ----------- | ------------------------------------------------------ |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:docPath`                        |
| `snapshotId`  | string    | Required    | Foreign key to [Snapshot](./Snapshot.md)               |
| `path`        | string    | Required    | Spec file path in repo                                 |
| `name`        | string    | Required    | Document title                                         |
| `kind`        | enum      | Required    | "spec" \| "adr" \| "design-doc" \| "guide" \| "ticket" |
| `content`     | string    | Optional    | Document content (first 5KB)                           |
| `embeddingId` | string    | Optional    | Qdrant vector ID for similarity search                 |
| `createdAt`   | timestamp | Required    | When indexed                                           |

---

## Schema

```cypher
CREATE CONSTRAINT spec_doc_id_unique IF NOT EXISTS
FOR (n:SpecDoc) REQUIRE n.id IS UNIQUE;

CREATE (doc:SpecDoc {
  id: "snap-123:docs/specs/indexer/graph_schema_spec.md",
  snapshotId: "snap-123",
  path: "docs/specs/indexer/graph_schema_spec.md",
  name: "Graph Schema Specification",
  kind: "spec",
  content: "# Overview\nThis spec defines the Neo4j/Memgraph schema...",
  embeddingId: "vec-xyz789",
  createdAt: timestamp()
})
```

---

## Relationships

### Outgoing (6 edge types)

| Edge                                     | Target                    | Cardinality | Notes              |
| ---------------------------------------- | ------------------------- | ----------- | ------------------ |
| `[:IN_SNAPSHOT]`                         | [Snapshot](./Snapshot.md) | exactly 1   | Version scoping    |
| `[:DOCUMENTS {target_role: 'FEATURE'}]`  | [Feature](./Feature.md)   | optional    | Explains feature   |
| `[:DOCUMENTS {target_role: 'ENDPOINT'}]` | [Endpoint](./Endpoint.md) | optional    | Documents endpoint |
| `[:DOCUMENTS {target_role: 'SYMBOL'}]`   | [Symbol](./Symbol.md)     | optional    | References symbol  |
| `[:DOCUMENTS {target_role: 'MODULE'}]`   | [Module](./Module.md)     | optional    | Applies to module  |
| `[:DOCUMENTS {target_role: 'FILE'}]`     | [File](./File.md)         | optional    | References file    |

### Incoming (2 edge types)

| Edge           | Source                    | Cardinality | Notes            |
| -------------- | ------------------------- | ----------- | ---------------- |
| `[:CONTAINS]`  | [Snapshot](./Snapshot.md) | optional    | Snapshot scoping |
| `[:DOCUMENTS]` | [SpecDoc](./SpecDoc.md)   | optional    | Cross-references |

---

## Document Classification

| Kind         | Pattern                      | Example                        |
| ------------ | ---------------------------- | ------------------------------ |
| "spec"       | Technical specification      | `docs/specs/feature/*/spec.md` |
| "adr"        | Architecture Decision Record | `docs/adr/*.md`                |
| "design-doc" | Design document              | `docs/design/*.md`             |
| "guide"      | How-to guide or guide        | `docs/guides/*.md`             |
| "ticket"     | Issue/ticket description     | Issue tracker metadata         |

---

## Embedding-Based Linking

SpecDoc → (Feature \| Endpoint \| Symbol) edges created via:

1. **Name matching**: Document title contains target name
2. **Content similarity**: Embedding distance > threshold
3. **Explicit tagging**: Document metadata lists targets
4. **Property**: `similarity: 0.0-1.0` indicates confidence

---

## Usage Patterns

### Find Docs for Feature

```cypher
MATCH (f:Feature {id: $featureId})<-[r:DOCUMENTS {target_role: 'FEATURE'}]-(doc:SpecDoc)
RETURN doc, r.similarity
ORDER BY r.similarity DESC
```

### Find Docs for Endpoint

```cypher
MATCH (ep:Endpoint {id: $endpointId})<-[r:DOCUMENTS {target_role: 'ENDPOINT'}]-(doc:SpecDoc)
RETURN doc, r.similarity
ORDER BY r.similarity DESC
```

### Find Docs for Symbol

```cypher
MATCH (sym:Symbol {id: $symbolId})<-[r:DOCUMENTS {target_role: 'SYMBOL'}]-(doc:SpecDoc)
RETURN doc, r.similarity
```

### Find All ADRs

```cypher
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS]->(doc:SpecDoc {kind: 'adr'})
RETURN doc
```

### Find Docs for Module

```cypher
MATCH (m:Module {id: $moduleId})<-[r:DOCUMENTS {target_role: 'MODULE'}]-(doc:SpecDoc)
RETURN doc
```

---

## Content Storage

- **Stored Content**: First 5KB of document (for search/context)
- **Embedding**: Vector stored in Qdrant for similarity queries
- **Full Content**: Accessible via repo/file system (spec only stores summary)

---

## Constraints & Indexes

- **Unique Index**: `spec_doc_id_unique` on `id`
- **Cardinality**: Many docs per snapshot
- **Sparse**: `content` and `embeddingId` optional

---

## Common Use Cases

1. **Context retrieval**: "What docs explain feature X?"
2. **Documentation coverage**: "Is endpoint Y documented?"
3. **ADR history**: "All architecture decisions"
4. **Implementation guides**: "Docs for this module"
5. **Knowledge discovery**: "Find docs similar to X"

---

## Integration with Knowledge Graph

SpecDoc is crucial for agent context:

```
Agent Task: "Implement payment feature"
  ├─ Find Feature('payment')
  ├─ Find SpecDoc -[:DOCUMENTS]-> Feature
  ├─ Read SpecDoc content (context)
  ├─ Find Symbol/Endpoint -[:REALIZES]-> Feature
  └─ Implement with guidance from docs
```

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Snapshot.md](./Snapshot.md) – Version scoping
- [Feature.md](./Feature.md) – Feature documentation
- [../edges/DOCUMENTS.md](../edges/DOCUMENTS.md) – Documentation links
