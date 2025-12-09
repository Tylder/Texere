# [:DEPENDS_ON] – Dependencies

**Category**: Dependencies  
**Semantic**: "What does this depend on?"

---

## Purpose

Captures dependency relationships: external services, configuration variables, libraries, style
guides. Consolidates: service calls, config usage, library imports, and style guide conformance.

**Key Characteristic**: `kind` property distinguishes dependency type (SERVICE, CONFIG, LIBRARY,
STYLE_GUIDE, FEATURE).

---

## Properties

| Property     | Type      | Required | Notes                                                                              |
| ------------ | --------- | -------- | ---------------------------------------------------------------------------------- |
| `kind`       | enum      | Yes      | 'SERVICE' \| 'CONFIG' \| 'LIBRARY' \| 'STYLE_GUIDE' \| 'FEATURE' \| 'SECRET' (v2+) |
| `version`    | string    | Optional | Version constraint (e.g., "^1.2.0", ">=2.0.0")                                     |
| `required`   | boolean   | Optional | Is dependency mandatory? (for CONFIG, SECRET)                                      |
| `confidence` | float     | Optional | LLM extraction confidence (0.0–1.0)                                                |
| `createdAt`  | timestamp | Yes      | When relationship created                                                          |

---

## Sub-Types

### SERVICE – External Service Dependencies

```cypher
(symbol:Symbol)-[r:DEPENDS_ON {kind: 'SERVICE', confidence: 0.9}]->(service:ExternalService)
(endpoint:Boundary)-[r:DEPENDS_ON {kind: 'SERVICE', confidence: 0.95}]->(service:ExternalService)
(module:Module)-[r:DEPENDS_ON {kind: 'SERVICE'}]->(service:ExternalService)
```

**Semantic**: Code calls or integrates with external API (Stripe, Auth0, OpenAI).

**Common integrations**:

- Payment processors (Stripe, PayPal)
- Authentication (Auth0, Firebase)
- AI services (OpenAI, Anthropic)
- Analytics (Segment, Mixpanel)
- Messaging (Twilio, SendGrid)

### CONFIG – Configuration Variable Dependencies

```cypher
(symbol:Symbol)-[r:DEPENDS_ON {kind: 'CONFIG', required: true}]->(config:ConfigurationVariable)
(endpoint:Boundary)-[r:DEPENDS_ON {kind: 'CONFIG', required: false}]->(config:ConfigurationVariable)
```

**Semantic**: Code uses environment variable or config value.

**Common configs**:

- API keys (`STRIPE_API_KEY`, `AUTH0_SECRET`)
- Feature flags (`ENABLE_PAYMENTS`, `DEBUG_MODE`)
- URLs (`DATABASE_URL`, `CACHE_REDIS_URL`)

### LIBRARY – Library Dependencies (Not Indexed)

```cypher
(module:Module)-[r:DEPENDS_ON {kind: 'LIBRARY', version: '1.2.0'}]->(lib:ExternalService)
(file:File)-[r:DEPENDS_ON {kind: 'LIBRARY', version: '^1.0.0'}]->(lib:ExternalService)

-- V2+ option: Link to Dependency nodes for explicit supply chain tracking
(module:Module)-[r:DEPENDS_ON {kind: 'LIBRARY'}]->(dep:Dependency)
```

**Semantic**: Code imports or uses third-party library/package.

**V1 (Legacy)**: Target is ExternalService (external service registry)  
**V2+ (Recommended)**: Target is Dependency node (explicit package with version)

**When to use LIBRARY**:

- External npm/pip/Maven packages without source code access
- Frameworks we don't analyze (React, Vue, Express)
- Utilities (lodash, axios, moment)
- Supply chain auditing (version tracking, security scanning)

**When NOT to use LIBRARY**:

- If library code IS indexed → create separate [Codebase](../nodes/Codebase.md) (vendored
  dependency, monorepo sub-project, or configured for indexing)
- If tracking external API → use SERVICE kind instead

### STYLE_GUIDE – Style Guide Conformance

```cypher
(module:Module)-[r:DEPENDS_ON {kind: 'STYLE_GUIDE'}]->(guide:StyleGuide)
(symbol:Symbol)-[r:DEPENDS_ON {kind: 'STYLE_GUIDE'}]->(guide:StyleGuide)
```

**Semantic**: Code conforms to architectural/coding style guide.

**Common guides**:

- Linting rules (ESLint, Pylint)
- Architecture principles (Clean Code, SOLID)
- Naming conventions

### SECRET – Secret Dependencies (V2+)

```cypher
-- Symbol uses secret (API key, password, token)
(symbol:Symbol)-[r:DEPENDS_ON {kind: 'SECRET', required: true}]->(secret:Secret)

-- Module requires credentials
(module:Module)-[r:DEPENDS_ON {kind: 'SECRET', required: false}]->(secret:Secret)
```

**Semantic**: Code uses a secret, credential, API key, or token (requires v2+ Secret nodes).

**Common secrets**:

- API keys (`STRIPE_API_KEY`, `OPENAI_API_KEY`)
- Database passwords
- Encryption keys
- JWT signing keys
- TLS certificates

**When to use**: You have enabled [Secret](../nodes/Secret.md) nodes and need credential auditing or
compliance tracking.

### FEATURE – Feature Dependencies

```cypher
(feature:Feature)-[r:DEPENDS_ON {kind: 'FEATURE'}]->(dependency:Feature)
```

**Semantic**: Feature depends on another feature for functionality.

**Common dependencies**:

- Authentication feature depends on User Management
- Payment Processing depends on Billing System

---

## Source → Target Pairs

| Source   | Kind         | Target                | Cardinality | Notes                                 |
| -------- | ------------ | --------------------- | ----------- | ------------------------------------- |
| Symbol   | SERVICE      | ExternalService       | optional    | Symbol calls service                  |
| Boundary | SERVICE      | ExternalService       | optional    | Boundary calls service                |
| Module   | SERVICE      | ExternalService       | optional    | Module integrates service             |
| Symbol   | CONFIG       | ConfigurationVariable | optional    | Symbol uses config                    |
| Boundary | CONFIG       | ConfigurationVariable | optional    | Boundary uses config                  |
| Module   | CONFIG       | ConfigurationVariable | optional    | Module uses config                    |
| Module   | LIBRARY      | ExternalService       | optional    | Module imports library (not indexed)  |
| File     | LIBRARY      | ExternalService       | optional    | File imports library (not indexed)    |
| Module   | LIBRARY      | Dependency (v2+)      | optional    | Module uses package (supply chain)    |
| Symbol   | LIBRARY      | Dependency (v2+)      | optional    | Symbol imports package (supply chain) |
| Module   | STYLE_GUIDE  | StyleGuide            | optional    | Module follows guide                  |
| Symbol   | STYLE_GUIDE  | StyleGuide            | optional    | Symbol follows guide                  |
| Feature  | FEATURE      | Feature               | optional    | Feature depends on feature            |
| Symbol   | SECRET (v2+) | Secret                | optional    | Symbol uses credential                |
| Module   | SECRET (v2+) | Secret                | optional    | Module requires credential            |

---

## Schema

```cypher
-- Index for dependency lookups
CREATE INDEX depends_on_kind IF NOT EXISTS
FOR ()-[r:DEPENDS_ON]-() ON (r.kind);

CREATE INDEX depends_on_kind_version IF NOT EXISTS
FOR ()-[r:DEPENDS_ON {kind: 'LIBRARY'}]-() ON (r.version);

-- Example: Get all external dependencies for a module
MATCH (mod:Module {id: $moduleId})
  -[r:DEPENDS_ON {kind: 'SERVICE'}]->(service:ExternalService)
RETURN service, r.confidence
ORDER BY r.confidence DESC
```

---

## Query Patterns

### External Service Dependencies

```cypher
-- What services does symbol depend on?
MATCH (sym:Symbol {id: $symbolId})-[r:DEPENDS_ON {kind: 'SERVICE'}]->(service:ExternalService)
RETURN service, r.confidence

-- All symbols using Stripe
MATCH (sym:Symbol)-[r:DEPENDS_ON {kind: 'SERVICE'}]->(service:ExternalService {id: 'stripe'})
RETURN sym, r.confidence
ORDER BY r.confidence DESC

-- What endpoints integrate with payment services?
MATCH (ep:Boundary)-[r:DEPENDS_ON {kind: 'SERVICE'}]->(service:ExternalService {category: 'payment'})
RETURN DISTINCT ep
```

### Configuration Dependencies

```cypher
-- What config does endpoint use?
MATCH (ep:Boundary {id: $endpointId})-[r:DEPENDS_ON {kind: 'CONFIG'}]->(config:ConfigurationVariable)
RETURN config, r.required
ORDER BY r.required DESC

-- Required configs for symbol
MATCH (sym:Symbol {id: $symbolId})-[r:DEPENDS_ON {kind: 'CONFIG', required: true}]->(config:ConfigurationVariable)
RETURN config

-- Missing config definitions
MATCH (sym:Symbol)-[r:DEPENDS_ON {kind: 'CONFIG'}]->(config:ConfigurationVariable)
WHERE NOT EXISTS((config)-[:DOCUMENTS]->(sym))
RETURN DISTINCT config
```

### Library Dependencies

```cypher
-- What libraries does module use?
MATCH (mod:Module {id: $moduleId})-[r:DEPENDS_ON {kind: 'LIBRARY'}]->(lib:ExternalService)
RETURN lib, r.version

-- All modules using React (not indexed)
MATCH (mod:Module)-[r:DEPENDS_ON {kind: 'LIBRARY'}]->(lib:ExternalService {name: 'react'})
RETURN DISTINCT mod

-- Version compatibility check
MATCH (mod:Module)-[r:DEPENDS_ON {kind: 'LIBRARY', version: version}]->(lib:ExternalService {name: 'axios'})
RETURN mod, version
GROUP BY mod, version
```

### Style Guide Conformance

```cypher
-- What style guides apply to module?
MATCH (mod:Module {id: $moduleId})-[r:DEPENDS_ON {kind: 'STYLE_GUIDE'}]->(guide:StyleGuide)
RETURN guide

-- Modules not following required guide
MATCH (guide:StyleGuide {id: 'required-architecture'})
MATCH (mod:Module)
WHERE NOT (mod)-[:DEPENDS_ON {kind: 'STYLE_GUIDE'}]->(guide)
RETURN mod
```

### Feature Dependencies

```cypher
-- What features does this feature depend on?
MATCH (f:Feature {id: 'payment'})-[r:DEPENDS_ON {kind: 'FEATURE'}]->(dep:Feature)
RETURN dep

-- Transitive feature dependencies (depth 3)
MATCH (f:Feature {id: $featureId})
  -[r:DEPENDS_ON {kind: 'FEATURE'}*0..3]->(transitive:Feature)
RETURN DISTINCT transitive

-- Circular feature dependencies
MATCH (f1:Feature)-[r:DEPENDS_ON {kind: 'FEATURE'}*2..]->(f1)
RETURN f1 as circular_feature
```

---

## Constraints & Indexes

- **Kind Index**: `depends_on_kind` for filtering by dependency type
- **Version Index**: `depends_on_kind_version` for library version queries
- **Cardinality**: Moderate–High (1–50+ per source node)
- **No Uniqueness**: Multiple dependencies to same target allowed

---

## Common Use Cases

1. **External service inventory**: "What APIs do we integrate with?"
2. **Config management**: "What environment variables are required?"
3. **Library audit**: "Which modules use deprecated library X?"
4. **Dependency management**: "Can we upgrade this library?"
5. **Architecture enforcement**: "Is module following style guide?"
6. **Feature planning**: "What must be built before feature X?"
7. **Cost analysis**: "Which features use paid services?"

---

## Implementation Notes

### Version Constraint Format

Follow semantic versioning conventions:

- `"1.2.3"` – Exact version
- `"^1.2.3"` – Compatible with version (npm)
- `"~1.2.3"` – Approximately version (npm)
- `">=1.2.0"` – Version ranges

### Confidence Scoring

- **SERVICE**: 0.8–1.0 (LLM-derived; API calls often explicit in code)
- **CONFIG**: 0.9–1.0 (syntactic; env var references are reliable)
- **LIBRARY**: 0.95–1.0 (syntactic; import statements are deterministic)
- **STYLE_GUIDE**: 0.7–0.9 (semantic; requires understanding conformance)
- **FEATURE**: 0.6–0.9 (semantic; explicit feature references in code or comments)

### Transitive Analysis

For features:

```cypher
-- All transitive feature dependencies
MATCH (f:Feature {id: $featureId})
  -[r:DEPENDS_ON {kind: 'FEATURE'}*]->(transitive:Feature)
RETURN DISTINCT transitive
ORDER BY transitive.name
```

---

## Performance Notes

- **Optimal**: <50 dependencies per module
- **Traversal**: Transitive queries can be expensive; use depth limits
- **Cardinality**: Moderate (most queries resolve quickly)

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Core schema
- [Symbol.md](../nodes/Symbol.md) – Symbol definition
- [Boundary.md](../nodes/Boundary.md) – Boundary definition
- [Module.md](../nodes/Module.md) – Module definition
- [Feature.md](../nodes/Feature.md) – Feature definition
- [ExternalService.md](../nodes/ExternalService.md) – Service definition
- [StyleGuide.md](../nodes/StyleGuide.md) – Guide definition
- [ExternalService.md](../nodes/ExternalService.md) – External service/library definition
- [REFERENCES.md](./REFERENCES.md) – Code relations (imports)
- [DOCUMENTS.md](./DOCUMENTS.md) – Documentation (config docs)
