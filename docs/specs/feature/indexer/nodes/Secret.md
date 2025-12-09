# Secret Node (Optional, V2+)

**Purpose**: Track secrets, credentials, API keys, and tokens used by code for compliance and
credential auditing.

**Status**: Optional — Add when you need credential auditing, secret rotation tracking, or
compliance reporting (SOC2, PCI-DSS, etc.).

---

## Schema

| Property           | Type      | Constraints | Notes                                                                            |
| ------------------ | --------- | ----------- | -------------------------------------------------------------------------------- |
| `id`               | string    | UNIQUE      | Composite: `snapshotId:secretName`                                               |
| `snapshotId`       | string    | Required    | Foreign key to Snapshot                                                          |
| `name`             | string    | Required    | Secret name (e.g., `STRIPE_API_KEY`, `DB_PASSWORD`)                              |
| `kind`             | enum      | Required    | "API_KEY" \| "DATABASE_PASSWORD" \| "ENCRYPTION_KEY" \| "TOKEN" \| "CERTIFICATE" |
| `provider`         | string    | Optional    | Where it's stored (AWS Secrets Manager, Vault, GitHub Secrets, etc.)             |
| `rotationRequired` | boolean   | Optional    | Needs periodic rotation (default: false)                                         |
| `description`      | string    | Optional    | What this secret is used for                                                     |
| `createdAt`        | timestamp | Required    | When indexed                                                                     |

```cypher
CREATE CONSTRAINT secret_id_unique IF NOT EXISTS
FOR (n:Secret) REQUIRE n.id IS UNIQUE;
```

---

## Relationships

| From → To                | Type               | Property         | Meaning                          |
| ------------------------ | ------------------ | ---------------- | -------------------------------- |
| Symbol → Secret          | `[:DEPENDS_ON]`    | `kind: 'SECRET'` | Symbol uses this secret          |
| Module → Secret          | `[:DEPENDS_ON]`    | `kind: 'SECRET'` | Module requires this secret      |
| Secret → ExternalService | `[:AUTHENTICATES]` | —                | Secret is credential for service |

---

## When to Use

Add `Secret` nodes when:

- You need credential auditing for compliance (SOC2, PCI-DSS, HIPAA, etc.)
- You're tracking secret rotation policies and expiration dates
- You need to find which code uses which credentials
- You want to detect secrets accidentally exposed in code
- You're building compliance dashboards
- You need to audit access to sensitive authentication materials

---

## Examples

### API Key

```cypher
(secret:Secret {
  id: 'snap123:STRIPE_API_KEY',
  snapshotId: 'snap123',
  name: 'STRIPE_API_KEY',
  kind: 'API_KEY',
  provider: 'AWS Secrets Manager',
  description: 'Stripe API key for payment processing',
  rotationRequired: true
})

(sym:Symbol {name: 'chargeCard'})
  -[:DEPENDS_ON {kind: 'SECRET'}]->
(secret)

(secret)-[:AUTHENTICATES]->(service:ExternalService {name: 'Stripe'})
```

### Database Password

```cypher
(secret:Secret {
  id: 'snap123:DB_PASSWORD_PROD',
  name: 'DB_PASSWORD_PROD',
  kind: 'DATABASE_PASSWORD',
  provider: 'HashiCorp Vault',
  description: 'PostgreSQL production database password',
  rotationRequired: true
})

(mod:Module {name: 'services/api'})-[:DEPENDS_ON {kind: 'SECRET'}]->(secret)
(secret)-[:AUTHENTICATES]->(db:ExternalService {name: 'PostgreSQL Production'})
```

### Encryption Key

```cypher
(secret:Secret {
  id: 'snap123:ENCRYPTION_KEY_MASTER',
  name: 'ENCRYPTION_KEY_MASTER',
  kind: 'ENCRYPTION_KEY',
  provider: 'AWS KMS',
  description: 'Master key for field-level encryption',
  rotationRequired: false
})

(sym:Symbol {name: 'encryptUserData'})
  -[:DEPENDS_ON {kind: 'SECRET'}]->
(secret)
```

### JWT Token / Bearer Token

```cypher
(secret:Secret {
  id: 'snap123:JWT_SIGNING_KEY',
  name: 'JWT_SIGNING_KEY',
  kind: 'TOKEN',
  provider: 'GitHub Secrets',
  description: 'Private key for JWT token signing',
  rotationRequired: true
})

(sym:Symbol {name: 'generateAuthToken'})
  -[:DEPENDS_ON {kind: 'SECRET'}]->
(secret)
```

### Certificate

```cypher
(secret:Secret {
  id: 'snap123:TLS_CERTIFICATE',
  name: 'TLS_CERTIFICATE',
  kind: 'CERTIFICATE',
  provider: 'AWS Certificate Manager',
  description: 'TLS certificate for API gateway',
  rotationRequired: true
})

(boundary:Boundary {kind: 'HTTP'})-[:DEPENDS_ON {kind: 'SECRET'}]->(secret)
```

---

## Query Patterns

### Find All Secrets Used by a Module

```cypher
MATCH (mod:Module {name: $moduleName})
MATCH (mod)-[:DEPENDS_ON {kind: 'SECRET'}]->(secret:Secret)
RETURN secret.name, secret.kind, secret.provider
```

### Audit: Which Code Uses a Specific Secret?

```cypher
MATCH (secret:Secret {name: 'STRIPE_API_KEY'})
MATCH (secret)<-[:DEPENDS_ON {kind: 'SECRET'}]-(user)
WHERE user:Symbol OR user:Module
RETURN user.name, user
```

### Find Secrets Due for Rotation

```cypher
MATCH (secret:Secret {rotationRequired: true})
MATCH (secret)-[:IN_SNAPSHOT]->(snap:Snapshot)
RETURN secret.name, secret.kind, snap.timestamp
ORDER BY snap.timestamp DESC
LIMIT 20
```

### Compliance: Document All Authentication Points

```cypher
-- Find all secrets and where they're used
MATCH (secret:Secret)-[:IN_SNAPSHOT]->(snap:Snapshot {id: $snapshotId})
MATCH (user)-[:DEPENDS_ON {kind: 'SECRET'}]->(secret)
MATCH (secret)-[:AUTHENTICATES]->(service:ExternalService)
RETURN secret.name, user.name, service.name, secret.provider
```

### Unrotated Secrets (Cross-Snapshot Analysis)

```cypher
-- Find secrets with no changes across snapshots
MATCH (snap1:Snapshot {id: $snap1Id})
MATCH (snap2:Snapshot {id: $snap2Id})
MATCH (secret1:Secret {name: $secretName})-[:IN_SNAPSHOT]->(snap1)
OPTIONAL MATCH (secret2:Secret {name: $secretName})-[:IN_SNAPSHOT]->(snap2)
WHERE secret2 IS NULL OR secret1.updatedAt = secret2.updatedAt
RETURN $secretName as secret, "NOT_ROTATED" as status
```

### Secrets by External Service

```cypher
-- Which services are authenticated via secrets?
MATCH (secret:Secret)-[:AUTHENTICATES]->(service:ExternalService)
RETURN service.name, COUNT(DISTINCT secret) as secretCount, COLLECT(secret.kind) as kinds
ORDER BY secretCount DESC
```

---

## V1 → V2 Migration

**V1 (Current)**:

- Secrets detected via code scanning (e.g., regex patterns for API keys)
- No explicit Secret nodes
- Credential usage inferred from Symbol analysis

**V2 Migration**:

1. Add `Secret` node type
2. Scan for secrets in code (both explicitly defined and hardcoded)
3. Parse secret management configurations (Vault configs, AWS Secrets Manager references)
4. Create Secret nodes with kind and provider
5. Link symbols/modules that use secrets via `[:DEPENDS_ON {kind: 'SECRET'}]`
6. Track rotation requirements and expiration metadata
7. Enable compliance queries and credential audits

---

## Compliance & Security Considerations

- **DO NOT** store actual secret values as node properties
- Store only metadata: name, kind, provider, rotation requirements
- External tools should fetch actual values from secret stores (Vault, AWS Secrets Manager, etc.)
- Use this graph for auditing which code accesses which secrets
- Combine with secret scanning tools (e.g., TruffleHog, GitGuardian) to detect exposures

---

## References

- **Graph Schema Spec**: `docs/specs/feature/indexer/graph_schema_spec.md` §2.4.5
- **Node Catalog**: `docs/specs/feature/indexer/nodes/README.md`
- **Related Nodes**: Symbol, Module, ExternalService
