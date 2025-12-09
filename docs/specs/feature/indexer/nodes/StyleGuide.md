# StyleGuide Node

**Category**: Cross-Snapshot  
**Purpose**: Coding convention, architectural pattern, or style guide (e.g., "ESLint rules", "Clean
Code principles"). Persistent across snapshots.

---

## Properties

| Property      | Type      | Constraints | Notes                                                                             |
| ------------- | --------- | ----------- | --------------------------------------------------------------------------------- |
| `id`          | string    | UNIQUE      | Guide identifier (e.g., "eslint-config", "clean-code-solid")                      |
| `name`        | string    | Required    | Human-readable guide name                                                         |
| `description` | string    | Optional    | Guide description or summary                                                      |
| `path`        | string    | Optional    | File path in repo (e.g., ".eslintrc.json", "docs/coding-standards.md")            |
| `kind`        | enum      | Optional    | "lint-config" \| "architecture" \| "documentation" \| "convention" \| "principle" |
| `content`     | string    | Optional    | Guide content (first 5KB)                                                         |
| `isDeleted`   | boolean   | Required    | Soft delete marker                                                                |
| `createdAt`   | timestamp | Required    | When first discovered/indexed                                                     |
| `updatedAt`   | timestamp | Required    | Last modification                                                                 |

---

## Schema

```cypher
CREATE CONSTRAINT style_guide_id_unique IF NOT EXISTS
FOR (n:StyleGuide) REQUIRE n.id IS UNIQUE;

CREATE INDEX style_guide_name IF NOT EXISTS
FOR (n:StyleGuide) ON (n.name);

CREATE (guide:StyleGuide {
  id: "eslint-config",
  name: "ESLint Configuration",
  description: "TypeScript linting rules and conventions",
  path: ".eslintrc.json",
  kind: "lint-config",
  content: "{ rules: { 'no-unused-vars': 'error', ... } }",
  isDeleted: false,
  createdAt: timestamp(),
  updatedAt: timestamp()
})
```

---

## Relationships

### Outgoing (2 edge types)

| Edge                                                | Target                                          | Cardinality | Notes                       |
| --------------------------------------------------- | ----------------------------------------------- | ----------- | --------------------------- |
| `[:DOCUMENTS {target_role: 'MODULE' \| 'PATTERN'}]` | [Module](./Module.md) / [Pattern](./Pattern.md) | optional    | Governs modules or patterns |
| `[:REFERENCES {kind: 'SIMILAR'}]`                   | [StyleGuide](./StyleGuide.md)                   | optional    | Similar guides (embedding)  |

### Incoming (2 edge types)

| Edge                                  | Source                | Cardinality | Notes                    |
| ------------------------------------- | --------------------- | ----------- | ------------------------ |
| `[:DEPENDS_ON {kind: 'STYLE_GUIDE'}]` | [Module](./Module.md) | optional    | Module conforms to guide |
| `[:DEPENDS_ON {kind: 'STYLE_GUIDE'}]` | [Symbol](./Symbol.md) | optional    | Symbol follows guide     |

---

## Lifecycle

1. **Discovery**: Detected from configuration files or documentation
2. **Creation**: First reference creates node
3. **Persistence**: Survives across snapshots (cross-snapshot node)
4. **Soft Delete**: Marked `isDeleted: true` if removed or obsolete
5. **Immutable**: Content snapshot at creation; updates via `updatedAt` timestamp

---

## Usage Patterns

### Find All Active Style Guides

```cypher
MATCH (guide:StyleGuide {isDeleted: false})
RETURN guide, guide.kind
ORDER BY guide.kind, guide.name
```

### What Modules Follow This Guide?

```cypher
MATCH (guide:StyleGuide {id: 'eslint-config'})
OPTIONAL MATCH (mod:Module)-[r:DEPENDS_ON {kind: 'STYLE_GUIDE'}]->(guide)
RETURN mod, COUNT(*) as conforming_modules
```

### Find Symbols Adhering to Guide

```cypher
MATCH (guide:StyleGuide {id: 'clean-code'})
OPTIONAL MATCH (sym:Symbol)-[r:DEPENDS_ON {kind: 'STYLE_GUIDE'}]->(guide)
RETURN sym, guide
```

### Find Guides by Kind

```cypher
MATCH (guide:StyleGuide {kind: 'architecture', isDeleted: false})
RETURN guide, guide.name, guide.description
```

### Find Similar Guides (Embedding-Based)

```cypher
MATCH (guide:StyleGuide {id: 'eslint-config'})-[r:REFERENCES {kind: 'SIMILAR'}]->(similar:StyleGuide)
RETURN similar, r.distance
ORDER BY r.distance
LIMIT 5
```

### Compliance Check

```cypher
-- Modules NOT following required style guide
MATCH (guide:StyleGuide {id: 'required-architecture', isDeleted: false})
MATCH (mod:Module {isDeleted: false})
WHERE NOT (mod)-[:DEPENDS_ON {kind: 'STYLE_GUIDE'}]->(guide)
RETURN mod
```

---

## Constraints & Indexes

- **Unique Index**: `style_guide_id_unique` on `id`
- **Name Index**: `style_guide_name` on `name`
- **Soft Delete**: Never hard deleted; marked `isDeleted: true` when obsolete
- **Cross-Snapshot**: Persists across commits; referenced via incoming `[:DEPENDS_ON]` edges

---

## Common Use Cases

1. **Compliance audit**: "Which modules conform to our architecture guide?"
2. **Lint configuration**: "What ESLint rules apply here?"
3. **Code standards**: "What conventions does this symbol follow?"
4. **Documentation mapping**: "What guides document this pattern?"
5. **Architecture enforcement**: "Is this module following our layering principles?"
6. **Team onboarding**: "What style guides apply to this codebase?"

---

## Integration with Other Nodes

- **Module Compliance**: Modules declare conformance via `[:DEPENDS_ON]`
- **Symbol Adherence**: Symbols can reference guides they follow
- **Pattern Documentation**: Guides can document architectural [Pattern](./Pattern.md) nodes
- **Documentation**: Guides themselves documented via [SpecDoc](./SpecDoc.md)

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Module.md](./Module.md) – Conforming modules
- [Symbol.md](./Symbol.md) – Symbols adhering to guides
- [Pattern.md](./Pattern.md) – Patterns documented by guides
- [SpecDoc.md](./SpecDoc.md) – Guide documentation
- [../edges/DEPENDS_ON.md](../edges/DEPENDS_ON.md) – Conformance relationships
- [../edges/DOCUMENTS.md](../edges/DOCUMENTS.md) – Documentation relationships
