# Texere Indexer – Node Type Catalog

**Overview**: This directory contains detailed specifications for all 14 node types in the Texere
Knowledge Graph.

Nodes are grouped into two categories:

- **Snapshot-Scoped**: Created per commit; versioned and deletable
- **Cross-Snapshot**: Persistent across snapshots; soft-deleted if obsolete

---

## Snapshot-Scoped Nodes (9 Mandatory + 6 Optional)

Created during indexing for a specific snapshot. Linked via `[:IN_SNAPSHOT]`.

### Mandatory (V1)

| Node                                   | Purpose                                            | Cardinality     | Key Property                                        |
| -------------------------------------- | -------------------------------------------------- | --------------- | --------------------------------------------------- |
| **[Codebase](./Codebase.md)**          | Code repository (any code being indexed)           | N per workspace | `id` (unique)                                       |
| **[Snapshot](./Snapshot.md)**          | Git commit being indexed                           | N per codebase  | `id` (composite: codebaseId:commitHash)             |
| **[Module](./Module.md)**              | Logical package/library/app                        | N per snapshot  | `id` (composite: snapshotId:modulePath)             |
| **[File](./File.md)**                  | Source code file                                   | N per module    | `id` (composite: snapshotId:filePath)               |
| **[Symbol](./Symbol.md)**              | Function, class, type, interface, const            | N per file      | `id` (composite: snapshotId:filePath:name:line:col) |
| **[Boundary](./Boundary.md)** ⚠️       | Callable interface (HTTP, gRPC, CLI, events, etc.) | N per snapshot  | `id` (composite: snapshotId:kind:identifier)        |
| **[DataContract](DataContract.md)** ⚠️ | Data model (Prisma, SQL, GraphQL, Protobuf, etc.)  | N per snapshot  | `id` (composite: snapshotId:entityName)             |
| **[TestCase](./TestCase.md)**          | Unit/integration/e2e test                          | N per file      | `id` (composite: snapshotId:filePath:testName)      |
| **[SpecDoc](./SpecDoc.md)**            | Documentation (spec, ADR, design doc)              | N per snapshot  | `id` (composite: snapshotId:docPath)                |

### Optional (V2+)

Add these nodes only when your domain requires them.

| Node                                    | Purpose                                  | When to Use                                    |
| --------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| **[Configuration](./Configuration.md)** | Environment variables, config files      | Config drift tracking, secret auditing         |
| **[Error](./Error.md)**                 | Custom exceptions & error types          | Error flow analysis, exception handling chains |
| **[Message](./Message.md)**             | Pub/sub topics, events (Kafka, RabbitMQ) | Event-driven architectures, message tracing    |
| **[Dependency](./Dependency.md)**       | External packages (npm, pip, Maven)      | Supply chain security, version auditing        |
| **[Secret](./Secret.md)**               | API keys, credentials, tokens            | Credential auditing, compliance (SOC2, etc.)   |
| **[Workflow](./Workflow.md)**           | Orchestrations (Airflow, Temporal)       | Orchestration tracking, workflow evolution     |

---

## Cross-Snapshot Nodes (5)

Persistent across snapshots. Linked via `[:INTRODUCED_IN]` and `[:MODIFIED_IN]` for evolution
tracking.

| Node                                        | Purpose                                   | Cardinality        | Lifecycle                 |
| ------------------------------------------- | ----------------------------------------- | ------------------ | ------------------------- |
| **[Feature](./Feature.md)**                 | User-facing feature                       | 1 per feature ID   | Soft-delete on removal    |
| **[Pattern](./Pattern.md)**                 | Code pattern (e.g., "express-middleware") | 1 per pattern name | Manual or heuristic       |
| **[Incident](./Incident.md)**               | Bug/issue report                          | 1 per incident ID  | Soft-delete on resolution |
| **[ExternalService](./ExternalService.md)** | Third-party API (Stripe, Auth0)           | 1 per service name | Persistent                |
| **[StyleGuide](./StyleGuide.md)**           | Coding convention/guide                   | 1 per guide path   | Persistent                |

---

## Quick Navigation

### By Hierarchy

- **Root**: [Codebase](./Codebase.md)
  - Contains: [Snapshot](./Snapshot.md)
    - Contains: [Module](./Module.md)
      - Contains: [File](./File.md)
        - Contains: [Symbol](./Symbol.md)

### By Domain

- **Code Structure**: [Module](./Module.md), [File](./File.md), [Symbol](./Symbol.md)
- **Behavior**: [Boundary](./Boundary.md), [TestCase](./TestCase.md), [Workflow](./Workflow.md)
  (v2+)
- **Data**: [DataContract](DataContract.md), [Message](./Message.md) (v2+)
- **Metadata**: [SpecDoc](./SpecDoc.md), [StyleGuide](./StyleGuide.md)
- **External Integration**: [ExternalService](./ExternalService.md), [Dependency](./Dependency.md)
  (v2+)
- **Features & Issues**: [Feature](./Feature.md), [Incident](./Incident.md)
- **Patterns**: [Pattern](./Pattern.md)
- **Operations**: [Configuration](./Configuration.md) (v2+), [Secret](./Secret.md) (v2+),
  [Error](./Error.md) (v2+)

---

## Common Properties (All Nodes)

| Property    | Type      | Required | Notes                                       |
| ----------- | --------- | -------- | ------------------------------------------- |
| `id`        | string    | Yes      | Unique identifier (node-specific structure) |
| `createdAt` | timestamp | Yes      | When node was created/indexed               |
| `updatedAt` | timestamp | Optional | Last modification                           |
| `isDeleted` | boolean   | Optional | Soft-delete marker (cross-snapshot only)    |

---

## Cardinality Invariants

**Critical**:

- Every snapshot-scoped node has **exactly 1** `[:IN_SNAPSHOT]` edge
- Every file has **exactly 1** parent module
- Every module has **exactly 1** parent module (or snapshot for root modules)
- Every snapshot has **exactly 1** parent codebase

**Many-to-Many**:

- Feature ↔ Symbol (via `[:REALIZES]`)
- Feature ↔ Boundary (via `[:REALIZES]`)
- Symbol ↔ Pattern (via `[:REFERENCES {kind: 'PATTERN'}]`)
- Symbol ↔ TestCase (via `[:REALIZES {role: 'TESTS'}]`)

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Overview & constraints
- [../edges/README.md](../edges/README.md) – Edge type catalog
- [NODE_EDGE_MAPPING.md](../research/NODE_EDGE_MAPPING.md) – Complete node↔edge inventory
