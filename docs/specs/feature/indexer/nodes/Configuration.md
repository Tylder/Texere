# Configuration Node (Optional, V2+)

**Purpose**: Track configuration, environment variables, and secrets used by code.

**Status**: Optional — Add when you need config tracking, secret auditing, or compliance reporting.

---

## Schema

| Property      | Type      | Constraints | Notes                                                                         |
| ------------- | --------- | ----------- | ----------------------------------------------------------------------------- |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:configPath`                                            |
| `snapshotId`  | string    | Required    | Foreign key to Snapshot                                                       |
| `path`        | string    | Required    | Config file path (e.g., `.env`, `config.yaml`, `settings.json`)               |
| `kind`        | enum      | Required    | "ENV_VAR" \| "YAML_CONFIG" \| "JSON_CONFIG" \| "ENV_FILE" \| "SECRET_MANAGER" |
| `key`         | string    | Optional    | For ENV_VAR: the environment variable name                                    |
| `valueType`   | enum      | Optional    | "SECRET" \| "URL" \| "STRING" \| "NUMBER" \| "BOOLEAN"                        |
| `description` | string    | Optional    | What this configuration does                                                  |
| `createdAt`   | timestamp | Required    | When indexed                                                                  |

```cypher
CREATE CONSTRAINT configuration_id_unique IF NOT EXISTS
FOR (n:Configuration) REQUIRE n.id IS UNIQUE;
```

---

## Relationships

| From → To                       | Type               | Property         | Meaning                              |
| ------------------------------- | ------------------ | ---------------- | ------------------------------------ |
| Symbol → Configuration          | `[:DEPENDS_ON]`    | `kind: 'CONFIG'` | Symbol uses this config              |
| Configuration → ExternalService | `[:AUTHENTICATES]` | —                | Config is a credential for a service |

---

## When to Use

Add `Configuration` nodes when:

- You need to track which symbols use which config values
- You're auditing for secrets in code
- You need compliance reporting (which credentials are accessed where)
- You want to detect config drift or deprecated environment variables

---

## Examples

### Environment Variable

```cypher
(config:Configuration {
  id: 'snap123:.env:STRIPE_API_KEY',
  path: '.env',
  kind: 'ENV_VAR',
  key: 'STRIPE_API_KEY',
  valueType: 'SECRET',
  description: 'Stripe API key for payment processing'
})

(symbol:Symbol {name: 'chargeCard'})-[:DEPENDS_ON {kind: 'CONFIG'}]->(config)
(config)-[:AUTHENTICATES]->(service:ExternalService {name: 'Stripe'})
```

### YAML Config

```cypher
(config:Configuration {
  id: 'snap123:config.yaml:database.host',
  path: 'config.yaml',
  kind: 'YAML_CONFIG',
  key: 'database.host',
  valueType: 'URL',
  description: 'Primary database host'
})

(symbol:Symbol {name: 'connectToDatabase'})-[:DEPENDS_ON {kind: 'CONFIG'}]->(config)
```

### JSON Config

```cypher
(config:Configuration {
  id: 'snap123:settings.json:featureFlags',
  path: 'settings.json',
  kind: 'JSON_CONFIG',
  description: 'Feature flags for canary deployments'
})

(symbol:Symbol {name: 'checkFeatureFlag'})-[:DEPENDS_ON {kind: 'CONFIG'}]->(config)
```

---

## Query Patterns

### Find All Secrets Used in Code

```cypher
MATCH (config:Configuration {valueType: 'SECRET'})
MATCH (config)<-[:DEPENDS_ON {kind: 'CONFIG'}]-(sym:Symbol)
RETURN config, sym
```

### Find Config Drift

```cypher
-- Which config values existed in snapshot1 but not snapshot2?
MATCH (config1:Configuration)-[:IN_SNAPSHOT]->(snap1:Snapshot {id: $snap1Id})
OPTIONAL MATCH (config2:Configuration {key: config1.key})-[:IN_SNAPSHOT]->(snap2:Snapshot {id: $snap2Id})
WHERE config2 IS NULL
RETURN config1, "REMOVED" AS status
```

### Audit Trail: Who Uses This Secret?

```cypher
MATCH (config:Configuration {key: 'STRIPE_API_KEY'})
MATCH (config)<-[:DEPENDS_ON {kind: 'CONFIG'}]-(sym:Symbol)
MATCH (sym)-[:IN_SNAPSHOT]->(snap:Snapshot)
RETURN sym.name, snap.timestamp
```

---

## V1 → V2 Migration

**V1 (Current)**:

- Symbols may have imports/dependencies that reference config
- No explicit Configuration nodes

**V2 Migration**:

1. Add `Configuration` node type
2. Parse config files (`.env`, `config.yaml`, `settings.json`)
3. Create Configuration nodes
4. Link symbols that access config via `[:DEPENDS_ON {kind: 'CONFIG'}]`

---

## References

- **Graph Schema Spec**: `docs/specs/feature/indexer/graph_schema_spec.md` §2.4.1
- **Node Catalog**: `docs/specs/feature/indexer/nodes/README.md`
- **Related Nodes**: Symbol, ExternalService
