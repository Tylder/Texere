# [:DOCUMENTS] – Knowledge & Governance

**Category**: Knowledge  
**Semantic**: "What explains or governs this?"

---

## Purpose

Represents documentation and governance relationships: specification documents, architectural
decisions, style guides, and guides that explain or govern code artifacts.

**Key Characteristic**: `target_role` property indicates what's being documented (Feature, Boundary,
Symbol, Module, Pattern).

---

## Properties

| Property      | Type      | Required | Notes                                                        |
| ------------- | --------- | -------- | ------------------------------------------------------------ |
| `target_role` | enum      | Yes      | 'FEATURE' \| 'ENDPOINT' \| 'SYMBOL' \| 'MODULE' \| 'PATTERN' |
| `similarity`  | float     | Optional | Semantic match score (0.0–1.0, for LLM-derived links)        |
| `createdAt`   | timestamp | Yes      | When relationship created                                    |

---

## Documentation Types

### SpecDoc → Feature

```cypher
(doc:SpecDoc)-[r:DOCUMENTS {target_role: 'FEATURE', similarity: 0.92}]->(feature:Feature)
```

**Semantic**: Specification document describes/defines user-facing feature.

**Common sources**:

- Feature specifications
- PRD (Product Requirements Document)
- Feature proposal/ADR
- Implementation guide

### SpecDoc → Boundary

```cypher
(doc:SpecDoc)-[r:DOCUMENTS {target_role: 'ENDPOINT'}]->(endpoint:Boundary)
```

**Semantic**: API documentation describes endpoint behavior, parameters, responses.

**Common sources**:

- API spec (OpenAPI/Swagger)
- Boundary documentation
- API design doc

### SpecDoc → Symbol

```cypher
(doc:SpecDoc)-[r:DOCUMENTS {target_role: 'SYMBOL', similarity: 0.85}]->(symbol:Symbol)
```

**Semantic**: Documentation explains symbol (function, class) purpose, usage, parameters.

**Common sources**:

- Function docstring/JSDoc extracted as spec
- Code comment documentation
- Function usage guide

### SpecDoc → Module

```cypher
(doc:SpecDoc)-[r:DOCUMENTS {target_role: 'MODULE'}]->(module:Module)
```

**Semantic**: Documentation explains module organization, responsibilities, architecture.

**Common sources**:

- Module README
- Architecture overview
- Module design doc
- Development guide

### SpecDoc → Pattern

```cypher
(doc:SpecDoc)-[r:DOCUMENTS {target_role: 'PATTERN', similarity: 0.88}]->(pattern:Pattern)
```

**Semantic**: Documentation explains pattern usage, rationale, constraints.

**Common sources**:

- Pattern documentation
- Design pattern guide
- Integration pattern spec

### StyleGuide → Module

```cypher
(guide:StyleGuide)-[r:DOCUMENTS {target_role: 'MODULE'}]->(module:Module)
```

**Semantic**: Style guide governs module architecture/coding style.

**Common sources**:

- Linting configuration
- Architecture guidelines
- Code style rules

### StyleGuide → Pattern

```cypher
(guide:StyleGuide)-[r:DOCUMENTS {target_role: 'PATTERN'}]->(pattern:Pattern)
```

**Semantic**: Style guide defines constraints on pattern usage.

---

## Source → Target Pairs

| Source     | Target Role | Target   | Cardinality | Notes                    |
| ---------- | ----------- | -------- | ----------- | ------------------------ |
| SpecDoc    | FEATURE     | Feature  | optional    | Feature specification    |
| SpecDoc    | ENDPOINT    | Boundary | optional    | API documentation        |
| SpecDoc    | SYMBOL      | Symbol   | optional    | Function documentation   |
| SpecDoc    | MODULE      | Module   | optional    | Module guide             |
| SpecDoc    | PATTERN     | Pattern  | optional    | Pattern documentation    |
| StyleGuide | MODULE      | Module   | optional    | Architecture conformance |
| StyleGuide | PATTERN     | Pattern  | optional    | Pattern style guide      |

---

## Schema

```cypher
-- Index for documentation queries
CREATE INDEX documents_target_role IF NOT EXISTS
FOR ()-[r:DOCUMENTS]-() ON (r.target_role);

CREATE INDEX documents_target_role_similarity IF NOT EXISTS
FOR ()-[r:DOCUMENTS]-() ON (r.target_role, r.similarity);

-- Example: Find all documentation for feature
MATCH (doc:SpecDoc)-[r:DOCUMENTS {target_role: 'FEATURE'}]->(f:Feature {id: 'auth'})
RETURN doc, r.similarity
ORDER BY r.similarity DESC
```

---

## Query Patterns

### Get Feature Documentation

```cypher
-- All docs explaining feature X
MATCH (doc:SpecDoc)-[r:DOCUMENTS {target_role: 'FEATURE'}]->(f:Feature {id: 'payment'})
RETURN doc, r.similarity
ORDER BY r.similarity DESC

-- Feature with full context
MATCH (f:Feature {id: 'payment'})
OPTIONAL MATCH (doc:SpecDoc)-[r1:DOCUMENTS {target_role: 'FEATURE'}]->(f)
OPTIONAL MATCH (sym:Symbol)-[r2:REALIZES {role: 'IMPLEMENTS'}]->(f)
OPTIONAL MATCH (ep:Boundary)-[r3:REALIZES {role: 'IMPLEMENTS'}]->(f)
RETURN {
  feature: f,
  documentation: collect(DISTINCT {doc: doc, similarity: r1.similarity}),
  implementingSymbols: collect(DISTINCT sym),
  implementingBoundaries: collect(DISTINCT ep)
}
```

### API Documentation

```cypher
-- Get all documentation for boundary
MATCH (doc:SpecDoc)-[r:DOCUMENTS {target_role: 'BOUNDARY'}]->(b:Boundary {id: $boundaryId})
RETURN doc

-- Boundaries without documentation
MATCH (b:Boundary)
WHERE NOT EXISTS((doc:SpecDoc)-[:DOCUMENTS {target_role: 'BOUNDARY'}]->(b))
RETURN b
LIMIT 50
```

### Symbol Documentation

```cypher
-- Get documentation for symbol
MATCH (sym:Symbol {id: $symbolId})
OPTIONAL MATCH (doc:SpecDoc)-[r:DOCUMENTS {target_role: 'SYMBOL'}]->(sym)
RETURN doc, r.similarity
ORDER BY r.similarity DESC

-- High-confidence symbol documentation
MATCH (doc:SpecDoc)-[r:DOCUMENTS {target_role: 'SYMBOL', similarity: sim}]->(sym:Symbol)
WHERE sim >= 0.8
RETURN sym, doc, r.similarity
```

### Module Architecture

```cypher
-- Module documentation and style guides
MATCH (mod:Module {id: $moduleId})
OPTIONAL MATCH (doc:SpecDoc)-[r1:DOCUMENTS {target_role: 'MODULE'}]->(mod)
OPTIONAL MATCH (guide:StyleGuide)-[r2:DOCUMENTS {target_role: 'MODULE'}]->(mod)
RETURN {
  module: mod,
  documentation: collect(DISTINCT doc),
  styleGuides: collect(DISTINCT guide)
}
```

### Pattern Documentation

```cypher
-- Docs and guides for pattern
MATCH (pat:Pattern {id: 'middleware'})
OPTIONAL MATCH (doc:SpecDoc)-[r1:DOCUMENTS {target_role: 'PATTERN'}]->(pat)
OPTIONAL MATCH (guide:StyleGuide)-[r2:DOCUMENTS {target_role: 'PATTERN'}]->(pat)
RETURN {
  pattern: pat,
  documentation: collect(DISTINCT doc),
  styleGuides: collect(DISTINCT guide)
}
```

### Documentation Inventory

```cypher
-- Breakdown of documentation by type
MATCH (doc:SpecDoc)-[r:DOCUMENTS {target_role: role}]->(target)
RETURN role, COUNT(DISTINCT doc) as doc_count, COUNT(DISTINCT target) as documented_targets
GROUP BY role
ORDER BY doc_count DESC

-- Most frequently documented patterns
MATCH (doc:SpecDoc)-[r:DOCUMENTS {target_role: 'PATTERN'}]->(pat:Pattern)
RETURN pat, COUNT(doc) as doc_count
GROUP BY pat
ORDER BY doc_count DESC
```

---

## Constraints & Indexes

- **Target Role Index**: `documents_target_role` for filtering by documentation type
- **Similarity Index**: `documents_target_role_similarity` for quality-based filtering
- **Cardinality**: Moderate (1–10 docs per target)
- **No Uniqueness**: Multiple docs can document same target

---

## Common Use Cases

1. **Documentation discovery**: "What docs explain feature X?"
2. **API reference**: "What's the documentation for this endpoint?"
3. **Architecture guidance**: "What style guides apply to this module?"
4. **Code comments**: "Is this function documented?"
5. **Specification compliance**: "What spec defines this feature?"
6. **Release notes**: "What features changed and how are they documented?"

---

## Implementation Notes

### Similarity Scoring

- **Exact keyword match** (e.g., feature name in doc title): 0.95–1.0
- **High semantic overlap** (LLM embedding): 0.80–0.95
- **Moderate overlap**: 0.60–0.80
- **Speculative link** (low confidence): <0.60

### SpecDoc Extraction

Docs are extracted from various sources:

- Markdown files in `docs/` directory
- ADR files in `docs/adr/`
- Spec files (prefix `_spec.md`)
- READMEs
- Design documents
- Inline code docstrings (converted to spec nodes)

### Linking Strategy

**Deterministic linking** (syntactic):

```cypher
-- Feature name in doc path
'docs/features/payment-processing.md' -> Feature(id: 'payment-processing')
```

**Semantic linking** (LLM-derived):

```cypher
-- Doc content similarity to feature/symbol/endpoint
(doc)-[r:DOCUMENTS]->(target) WHERE r.similarity > threshold
```

---

## Content Sampling

SpecDoc nodes store first 5KB of content for display/search:

```cypher
{
  path: "docs/features/payment.md",
  content: "# Payment Processing\n\nHandle credit card payments via Stripe...",
  embeddingId: "vec-abc123"  -- For semantic search
}
```

---

## Cross-References

- **Feature Documentation Flow**: Feature ← SpecDoc → (DEPENDS_ON) → Symbol
- **Boundary API Flow**: Boundary ← SpecDoc → (LOCATION) → Symbol
- **Module Architecture**: Module ← StyleGuide + SpecDoc

---

## Performance Notes

- **Query Cost**: Low (direct 1-hop relationships)
- **Similarity Search**: Can be expensive (embedding lookups); cache if frequent

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Core schema
- [Feature.md](../nodes/Feature.md) – Feature definition
- [Boundary.md](../nodes/Boundary.md) – Boundary definition
- [Symbol.md](../nodes/Symbol.md) – Symbol definition
- [Module.md](../nodes/Module.md) – Module definition
- [Pattern.md](../nodes/Pattern.md) – Pattern definition
- [SpecDoc.md](../nodes/SpecDoc.md) – Documentation node
- [StyleGuide.md](../nodes/StyleGuide.md) – Style guide node
- [REALIZES.md](./REALIZES.md) – Implementation (complements documentation)
- [DEPENDS_ON.md](./DEPENDS_ON.md) – Dependencies (documents config)
