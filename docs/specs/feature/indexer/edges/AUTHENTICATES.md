# [:AUTHENTICATES] – Authentication & Credentials (V2+)

**Category**: Dependencies  
**Status**: Optional (v2+) — Only applicable when using [Configuration](../nodes/Configuration.md)
or [Secret](../nodes/Secret.md) nodes.  
**Semantic**: "What credentials authenticate this service?"

---

## Purpose

Captures the relationship between credential nodes (Configuration, Secret) and the external services
they authenticate.

---

## Properties

| Property    | Type      | Required | Notes                     |
| ----------- | --------- | -------- | ------------------------- |
| `createdAt` | timestamp | Yes      | When relationship created |

---

## Sub-Types & Patterns

### Configuration → ExternalService

Links a Configuration node to an external service it authenticates.

```cypher
(config:Configuration {
  kind: 'ENV_VAR',
  key: 'STRIPE_API_KEY'
})-[:AUTHENTICATES]->(service:ExternalService {name: 'Stripe'})
```

**Semantic**: This config variable contains credentials for the service.

### Secret → ExternalService

Links a Secret node to the service it authenticates.

```cypher
(secret:Secret {
  name: 'STRIPE_API_KEY',
  kind: 'API_KEY'
})-[:AUTHENTICATES]->(service:ExternalService {name: 'Stripe'})
```

**Semantic**: This secret/credential grants access to the external service.

---

## Source → Target Pairs

| Source        | Target          | Cardinality | Notes                               |
| ------------- | --------------- | ----------- | ----------------------------------- |
| Configuration | ExternalService | optional    | Config authenticates service (v2+)  |
| Secret        | ExternalService | optional    | Secret/credential authenticates svc |

---

## Query Patterns

### Find All Secrets for a Service

```cypher
MATCH (secret:Secret)-[:AUTHENTICATES]->(service:ExternalService {name: 'Stripe'})
RETURN secret.name, secret.kind, secret.provider
```

### Audit: Which Code Uses These Credentials?

```cypher
MATCH (secret:Secret)-[:AUTHENTICATES]->(service:ExternalService {name: $serviceName})
MATCH (user)-[:DEPENDS_ON {kind: 'SECRET'}]->(secret)
WHERE user:Symbol OR user:Module
RETURN user.name, secret.name, service.name
```

### Compliance: All Authenticated Services

```cypher
-- Which services are authenticated? Which credentials are used?
MATCH (cred)-[:AUTHENTICATES]->(service:ExternalService)
WHERE cred:Configuration OR cred:Secret
RETURN service.name, TYPE(cred) as credType, cred.name, cred.kind
ORDER BY service.name
```

### Find Unused Credentials

```cypher
-- Secrets/configs that authenticate a service but nothing uses them
MATCH (cred)-[:AUTHENTICATES]->(service:ExternalService)
WHERE cred:Configuration OR cred:Secret
OPTIONAL MATCH (user)-[:DEPENDS_ON {kind: 'SECRET'|'CONFIG'}]->(cred)
WHERE user:Symbol OR user:Module
WITH cred, service, COUNT(user) as usageCount
WHERE usageCount = 0
RETURN cred, service, "UNUSED" as status
```

### Service Authentication Inventory

```cypher
-- For each service, list all authentication methods
MATCH (service:ExternalService)
OPTIONAL MATCH (cred)-[:AUTHENTICATES]->(service)
WHERE cred:Configuration OR cred:Secret
RETURN service.name, COLLECT(cred.name) as credentials, COLLECT(cred.kind) as kinds
ORDER BY service.name
```

### Multi-Authentication Services

```cypher
-- Services that require multiple credentials
MATCH (service:ExternalService)
MATCH (cred)-[:AUTHENTICATES]->(service)
WHERE cred:Configuration OR cred:Secret
WITH service, COUNT(DISTINCT cred) as credCount
WHERE credCount > 1
RETURN service.name, credCount, "MULTI_AUTH" as authType
ORDER BY credCount DESC
```

---

## Common Use Cases

1. **Credential Auditing**: Which services use which credentials?
2. **Compliance Reporting**: Document all authentication for compliance (SOC2, PCI-DSS)
3. **Secret Rotation**: Find all credentials for a service that need rotation
4. **Access Control**: Which teams can access which services via which credentials?
5. **Incident Response**: If a credential is compromised, which services are affected?
6. **Deprecation**: When retiring a service, find and revoke its credentials

---

## V2+ Migration

**When to create**:

1. You have enabled [Configuration](../nodes/Configuration.md) nodes
2. You have enabled [Secret](../nodes/Secret.md) nodes
3. You need credential auditing or compliance reporting

**Pattern**:

```cypher
-- Example: Stripe API key authenticates Stripe
MATCH (snap:Snapshot {id: $snapshotId})
MATCH (secret:Secret {name: 'STRIPE_API_KEY'})-[:IN_SNAPSHOT]->(snap)
MATCH (service:ExternalService {name: 'Stripe'})
MERGE (secret)-[:AUTHENTICATES]->(service)
```

---

## References

- **Graph Schema Spec**: `docs/specs/feature/indexer/graph_schema_spec.md` §3
- **Configuration Node**: `docs/specs/feature/indexer/nodes/Configuration.md`
- **Secret Node**: `docs/specs/feature/indexer/nodes/Secret.md`
- **ExternalService Node**: `docs/specs/feature/indexer/nodes/ExternalService.md`
- **DEPENDS_ON Edge**: [DEPENDS_ON.md](./DEPENDS_ON.md) (for CONFIG/SECRET kinds)
