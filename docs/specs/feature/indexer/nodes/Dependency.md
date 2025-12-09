# Dependency Node (Optional, V2+)

**Purpose**: Track external package dependencies (npm, pip, Maven, Cargo, etc.) for supply chain
security and version auditing.

**Status**: Optional — Add when you need explicit dependency tracking, supply chain security
scanning, or version deprecation warnings.

---

## Schema

| Property      | Type      | Constraints | Notes                                                    |
| ------------- | --------- | ----------- | -------------------------------------------------------- |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:packageName:version`              |
| `snapshotId`  | string    | Required    | Foreign key to Snapshot                                  |
| `name`        | string    | Required    | Package name (e.g., `express`, `numpy`, `spring-boot`)   |
| `version`     | string    | Required    | Semantic version (e.g., `1.6.0`)                         |
| `kind`        | enum      | Required    | "NPM" \| "PIP" \| "MAVEN" \| "CARGO" \| "GO" \| "JAR"    |
| `registry`    | string    | Optional    | Registry URL (npm, pypi, maven central, crates.io, etc.) |
| `description` | string    | Optional    | What this package does                                   |
| `createdAt`   | timestamp | Required    | When indexed                                             |

```cypher
CREATE CONSTRAINT dependency_id_unique IF NOT EXISTS
FOR (n:Dependency) REQUIRE n.id IS UNIQUE;
```

---

## Relationships

| From → To                    | Type              | Property          | Meaning                                    |
| ---------------------------- | ----------------- | ----------------- | ------------------------------------------ |
| Module → Dependency          | `[:DEPENDS_ON]`   | `kind: 'LIBRARY'` | Module uses this dependency                |
| Symbol → Dependency          | `[:DEPENDS_ON]`   | `kind: 'LIBRARY'` | Symbol imports this dependency             |
| Dependency → ExternalService | `[:PROVIDES_FOR]` | —                 | Dependency is provided by external service |

---

## When to Use

Add `Dependency` nodes when:

- You need explicit dependency tracking for supply chain auditing
- You're scanning for security vulnerabilities in specific versions
- You need to track version deprecation or end-of-life warnings
- You want to understand which modules depend on which packages
- You're building bill-of-materials (BOM) reports
- You need to audit license compliance across dependencies

---

## Examples

### NPM Package

```cypher
(dep:Dependency {
  id: 'snap123:express:4.18.0',
  snapshotId: 'snap123',
  name: 'express',
  version: '4.18.0',
  kind: 'NPM',
  registry: 'https://registry.npmjs.org',
  description: 'Fast, unopinionated, minimalist web framework'
})

(module:Module {name: 'apps/api-server'})
  -[:DEPENDS_ON {kind: 'LIBRARY'}]->
(dep)
```

### Python Package

```cypher
(dep:Dependency {
  id: 'snap123:numpy:1.24.3',
  name: 'numpy',
  version: '1.24.3',
  kind: 'PIP',
  registry: 'https://pypi.org',
  description: 'Fundamental package for scientific computing'
})

(sym:Symbol {name: 'analyzeData'})
  -[:DEPENDS_ON {kind: 'LIBRARY'}]->
(dep)
```

### Maven Dependency

```cypher
(dep:Dependency {
  id: 'snap123:org.springframework:spring-boot-starter-web:2.7.14',
  name: 'org.springframework:spring-boot-starter-web',
  version: '2.7.14',
  kind: 'MAVEN',
  registry: 'https://repo.maven.apache.org/maven2'
})

(module:Module {name: 'services/payment'})
  -[:DEPENDS_ON {kind: 'LIBRARY'}]->
(dep)
```

### Cargo Dependency

```cypher
(dep:Dependency {
  id: 'snap123:tokio:1.35.0',
  name: 'tokio',
  version: '1.35.0',
  kind: 'CARGO',
  registry: 'https://crates.io',
  description: 'Async runtime for Rust'
})

(module:Module {name: 'core/async-worker'})
  -[:DEPENDS_ON {kind: 'LIBRARY'}]->
(dep)
```

---

## Query Patterns

### Find All Dependencies in a Module

```cypher
MATCH (mod:Module {name: $moduleName})
MATCH (mod)-[:DEPENDS_ON {kind: 'LIBRARY'}]->(dep:Dependency)
RETURN dep.name, dep.version
```

### Audit: Which Modules Use a Vulnerable Dependency?

```cypher
MATCH (dep:Dependency {name: 'log4j', version: '2.14.0'})
MATCH (mod:Module)-[:DEPENDS_ON {kind: 'LIBRARY'}]->(dep)
RETURN mod.name
```

### Find Outdated Dependencies (comparison across snapshots)

```cypher
-- Find modules with older versions in snapshot1 vs snapshot2
MATCH (dep1:Dependency {name: $packageName})-[:IN_SNAPSHOT]->(snap1:Snapshot {id: $snap1Id})
MATCH (dep2:Dependency {name: $packageName})-[:IN_SNAPSHOT]->(snap2:Snapshot {id: $snap2Id})
WHERE dep1.version < dep2.version
RETURN snap1.timestamp, dep1.version, snap2.timestamp, dep2.version
```

### Find All Direct and Transitive Dependencies

```cypher
-- Direct dependencies
MATCH (mod:Module)-[:DEPENDS_ON {kind: 'LIBRARY'}]->(dep:Dependency)
WITH DISTINCT dep
RETURN dep

-- To extend: Add nested dependency tracking if available
```

### Bill of Materials (BOM) Report

```cypher
MATCH (snap:Snapshot {id: $snapshotId})
MATCH (snap)-[:CONTAINS*]->(mod:Module)
MATCH (mod)-[:DEPENDS_ON {kind: 'LIBRARY'}]->(dep:Dependency)-[:IN_SNAPSHOT]->(snap)
RETURN DISTINCT dep.name, dep.version, dep.kind, COUNT(DISTINCT mod) as usedByModules
ORDER BY dep.name
```

### License Compliance Check

```cypher
-- Find all dependencies (useful as input to external license scanner)
MATCH (dep:Dependency)-[:IN_SNAPSHOT]->(snap:Snapshot {id: $snapshotId})
RETURN dep.name, dep.version, dep.kind, dep.registry
```

---

## V1 → V2 Migration

**V1 (Current)**:

- Dependencies tracked via manifest files (package.json, requirements.txt, pom.xml, Cargo.toml)
- No explicit Dependency nodes
- Symbol imports may reference package names

**V2 Migration**:

1. Parse dependency manifests during indexing (package.json, requirements.txt, pom.xml, Cargo.toml)
2. Create Dependency nodes for each declared dependency with version
3. Link Module/Symbol that imports via `[:DEPENDS_ON {kind: 'LIBRARY'}]`
4. Extract registry information if available
5. Enable supply chain scanning and license auditing queries

---

## References

- **Graph Schema Spec**: `docs/specs/feature/indexer/graph_schema_spec.md` §2.4.4
- **Node Catalog**: `docs/specs/feature/indexer/nodes/README.md`
- **Related Nodes**: Module, Symbol, ExternalService
