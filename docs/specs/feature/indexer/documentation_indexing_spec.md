# Texere Indexer – Documentation Indexing & Linking Specification

**Document Version:** 1.0  
**Status:** Active Specification  
**Last Updated:** December 2025  
**Purpose:** Define how documentation sources are acquired, processed, and semantically linked to
code nodes

---

## Table of Contents

1. [Overview](#overview)
2. [Documentation Sources](#documentation-sources)
3. [Processing Pipeline](#processing-pipeline)
4. [Linking Strategies](#linking-strategies)
5. [Generated Documentation](#generated-documentation)
6. [Implementation Checklist](#implementation-checklist)

---

## Overview

Documentation is indexed alongside code and embedded semantically to enable LLM agents to understand
proper usage patterns, API contracts, architectural decisions, and implementation guidance.

All documentation sources (colocated files, separate repos, hosted websites) undergo **identical
semantic processing**. The **only difference** is how data is acquired.

---

## Documentation Sources

### 1. Colocated Documentation

Markdown files and docstrings within the indexed repository.

**Per-repo config**:

```json
{
  "documentation": {
    "location": "colocated",
    "paths": ["docs/", "website/"]
  }
}
```

**Acquisition method**: Read markdown files from repo file system + extract docstrings from code
(JSDoc, Python docstrings, etc.).

**Examples**:

- Express.js: `/docs` folder in main repo
- React: `/docs` folder in `facebook/react`
- Most open-source projects

---

### 2. Separate Repository Documentation

Documentation maintained in a separate git repository.

**Per-repo config**:

```json
{
  "documentation": {
    "location": "separate",
    "gitUrl": "https://github.com/company/docs.git",
    "ref": "main"
  }
}
```

**Acquisition method**: Clone docs repo from git, read markdown files.

**Examples**:

- Stripe: `stripe/stripe-docs` (separate from `stripe/stripe-node`)
- Kubernetes: `kubernetes/website` (separate from `kubernetes/kubernetes`)
- GraphQL: `graphql/graphql.github.io` (separate from `graphql/graphql-spec`)

---

### 3. Hosted Website Documentation

Documentation published as a website with no accessible source code.

**Per-repo config**:

```json
{
  "documentation": {
    "location": "hosted",
    "websiteUrl": "https://docs.example.com",
    "crawlPatterns": ["/**"],
    "excludePatterns": ["/search", "/admin"]
  }
}
```

**Acquisition method**: Crawl website HTTP endpoints, extract HTML content.

**Examples**:

- Notion, Coda, Confluence (SaaS platforms)
- Hosted sites without git source (generated, legacy, external)
- Custom documentation platforms

---

## Processing Pipeline

All three sources undergo identical processing:

```
1. Extract Content
   ├─ Markdown files (colocated/separate)
   ├─ HTML content (hosted)
   └─ Code docstrings (colocated only)
       ↓
2. Parse & Identify References
   ├─ Explicit code mentions (function/class names)
   ├─ Type annotations (@param, @returns)
   ├─ Error references (throws, catches)
   ├─ Data entities (table names, field names)
   ├─ External dependencies (API mentions)
   ├─ Configuration references (env vars)
   └─ Examples (code snippets)
       ↓
3. Create Code Edges
   ├─ DOCUMENTS {role} edges to matched nodes
   ├─ Assign confidence scores (0.0–1.0)
   └─ Store similarity metadata
       ↓
4. Generate Embeddings
   ├─ Vector embed documentation content
   ├─ Store in Qdrant
   └─ Index for semantic queries
```

**Result**: All three sources produce embeddings in Qdrant and documentation edges in Neo4j linking
docs to code symbols/features/boundaries/patterns.

---

## Linking Strategies

Documentation → Code edges are created via multiple strategies (in precedence order):

### 1. Explicit References (High Confidence)

**Pattern**: Document mentions function/class/type name verbatim.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'SYMBOL', confidence: 0.95}]-> Symbol`

**Example**:

```markdown
"The `createUser()` function validates email and creates a user record."
```

**Implementation**: Regex match on symbol names + parse AST to identify targets.

---

### 2. Docstring Attachment (High Confidence)

**Pattern**: JSDoc, Python docstring, or inline comment attached to code.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'SYMBOL', confidence: 0.98}]-> Symbol`

**Example**:

```typescript
/**
 * Creates a new user in the system.
 * @param email User email address
 * @param password User password (>= 8 chars)
 * @returns Promise<IUser>
 */
async function createUser(email: string, password: string): Promise<IUser> {}
```

**Implementation**: Extract as pseudo-SpecDoc during code indexing, link directly to symbol.

---

### 3. Parameter/Type Documentation (Medium Confidence)

**Pattern**: Documentation describes input/output types or data models.

**Edges**:

- `SpecDoc -[:DOCUMENTS {role: 'PARAMETER', confidence: 0.85}]-> Symbol` (type reference)
- `SpecDoc -[:DOCUMENTS {role: 'DATA', confidence: 0.85}]-> DataContract`

**Example**:

```markdown
"The API accepts a User object with fields: id (string), email (string), role (enum)."
```

**Implementation**: Extract type names from docs, match to `Symbol` or `DataContract` nodes.

---

### 4. Code Example Extraction (Medium Confidence)

**Pattern**: Documentation contains code snippets/examples.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'EXAMPLE', confidence: 0.80}]-> Symbol`

**Example**:

```markdown
# Payment API

## Example:

\`\`\`typescript const payment = await paymentService.createPayment({ amount: 100, currency: 'USD'
}); \`\`\`
```

**Implementation**: Extract code blocks, parse for function calls/symbol usage, link to callees.

---

### 5. Error/Exception Documentation (Medium Confidence)

**Pattern**: Documentation describes exceptions thrown or caught.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'ERROR', confidence: 0.85}]-> Error` (v2+)

**Example**:

```markdown
"Throws `ValidationError` if email is invalid." "Throws `ConflictError` if user already exists."
```

**Implementation**: Extract error class names, match to Error nodes.

---

### 6. Data Flow Documentation (Medium Confidence)

**Pattern**: Documentation describes which tables/entities are read/written.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'DATA', confidence: 0.80}]-> DataContract`

**Example**:

```markdown
"Reads from the User table and writes to the AuditLog table."
```

**Implementation**: Extract entity names, match to DataContract nodes.

---

### 7. Boundary/Endpoint Documentation (High Confidence)

**Pattern**: API docs list routes, methods, paths.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'ENDPOINT', confidence: 0.95}]-> Boundary`

**Example**:

```markdown
## GET /users/:id

Returns user by ID.

## POST /users

Creates a new user.
```

**Implementation**: Parse OpenAPI/Swagger, extract routes, match to Boundary nodes.

---

### 8. Feature Documentation (Medium Confidence)

**Pattern**: Documentation describes feature requirements, acceptance criteria, design.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'FEATURE', confidence: 0.85}]-> Feature`

**Example**:

```markdown
# Payment Feature

Allow users to pay with credit card or PayPal.
```

**Implementation**: Match feature ID to doc path or content similarity.

---

### 9. Pattern Usage Documentation (Medium Confidence)

**Pattern**: Documentation explains design pattern, middleware, or reusable pattern.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'PATTERN', confidence: 0.80}]-> Pattern`

**Example**:

```markdown
# Middleware Pattern

Express middleware chains request → response flow.
```

**Implementation**: Extract pattern names, semantic match to Pattern nodes.

---

### 10. Configuration Reference Documentation (Medium Confidence)

**Pattern**: Documentation mentions environment variables or config keys.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'CONFIG', confidence: 0.85}]-> Configuration`

**Example**:

```markdown
"Set `DATABASE_URL` to your PostgreSQL connection string." "Configure `JWT_SECRET` in .env for token
signing."
```

**Implementation**: Extract config key names, match to Configuration nodes.

---

### 11. Dependency Documentation (Medium Confidence)

**Pattern**: Documentation mentions external services or libraries.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'DEPENDENCY', confidence: 0.80}]-> ExternalService`

**Example**:

```markdown
"Integrates with Stripe API for payment processing." "Uses axios for HTTP requests."
```

**Implementation**: Extract service/library names, match to ExternalService nodes.

---

### 12. Test Coverage Documentation (Medium Confidence)

**Pattern**: Documentation references test files or test cases.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'TEST_COVERAGE', confidence: 0.85}]-> TestCase`

**Example**:

```markdown
"See `user.service.test.ts` for examples and edge cases."
```

**Implementation**: Extract file/test names, match to TestCase nodes.

---

### 13. Architectural Layer Documentation (Low Confidence)

**Pattern**: Documentation mentions layers, tiers, or architectural boundaries.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'MODULE', confidence: 0.70}]-> Module` (with metadata)

**Example**:

```markdown
"The service layer handles business logic, while controllers handle HTTP."
```

**Implementation**: Semantic matching of layer descriptions to module organization.

---

### 14. Semantic Fallback (Low Confidence)

**Pattern**: General documentation with no explicit code references.

**Edge**: `SpecDoc -[:DOCUMENTS {role: 'GENERAL', confidence: 0.50}]-> Symbol` (via embedding
similarity)

**Example**:

```markdown
"This module handles user authentication and authorization."
```

**Implementation**: Embed doc content, find nearest code nodes via vector similarity.

---

## Confidence Scoring Guidelines

| Confidence Range | Linking Strategy          | Use Case                          |
| ---------------- | ------------------------- | --------------------------------- |
| **0.95–1.0**     | Explicit match, docstring | Function name in doc, JSDoc       |
| **0.80–0.95**    | Pattern match, API spec   | Route path, error class names     |
| **0.60–0.80**    | LLM extraction            | Semantic linking, example parsing |
| **0.40–0.60**    | Speculative               | Weak semantic match               |
| **<0.40**        | Reject                    | Do not create edge                |

**Recommendation**: Filter UI queries to `confidence >= 0.70` by default; expert views show all.

---

## Generated Documentation

Documentation can be automatically generated by LLM when code lacks human-written documentation.
Generated docs fill gaps and provide context for agents while allowing human review/improvement.

### When to Generate

**Candidates for generation**:

- Symbols (functions, classes) with no docstrings
- Endpoints with no API documentation
- Features with no specification
- Modules with no README or architecture doc
- Patterns with no explanation

**Per-repo config**:

```json
{
  "generateDocumentation": {
    "enabled": true,
    "targets": ["undocumented-symbols", "undocumented-endpoints"],
    "minConfidence": 0.8,
    "promptTemplate": "custom"
  }
}
```

### SpecDoc Properties

Generated docs stored in SpecDoc with source metadata:

```cypher
{
  id: "snap-123:generated/user-service.md",
  snapshotId: "snap-123",
  path: "generated/user-service.md",
  name: "UserService Documentation",
  kind: "spec",
  source: "generated",           // ← NEW: "colocated", "separate", "hosted", or "generated"
  content: "# UserService\nManages user CRUD operations...",
  generatedAt: timestamp(),       // ← NEW: When doc was generated
  generatedBy: "claude-3.5",      // ← NEW: LLM model used
  generatedFor: "Symbol:UserService",  // ← NEW: What it documents
  embeddingId: "vec-xyz789",
  createdAt: timestamp()
}
```

### Linking & Confidence

Generated docs create DOCUMENTS edges with adjusted confidence:

**Example**:

```cypher
(doc:SpecDoc {source: "generated"})-[r:DOCUMENTS {
  role: 'SYMBOL',
  confidence: 0.82,
  isGenerated: true
}]->(sym:Symbol)
```

**Confidence scoring**:

- Higher confidence if code analysis is clear (type signatures, examples, tests)
- Lower confidence for complex/ambiguous logic
- Adjustable via `minConfidence` config

### Generation Process

1. **Identify targets**: Scan symbols/endpoints/features lacking docs
2. **Prepare context**: Gather code, tests, call graph, usage patterns
3. **Prompt LLM**: Generate documentation for target
4. **Create SpecDoc**: Store as `source: "generated"` node
5. **Link to code**: Create DOCUMENTS edge with confidence score
6. **Flag for review**: UI highlights generated docs for human verification

### UI & Filtering

- **SpecDoc.source property**: Distinguish human vs. generated
- **Filter**: `source = "generated"` to show only generated
- **Badge**: Mark generated docs in UI for transparency
- **Review workflow**: Allow humans to convert generated → human-written (update source)

### Example: Generated Symbol Doc

**Input**: Undocumented `createPayment()` function

**Generated output**:

````markdown
# createPayment

Creates a new payment transaction.

## Signature

```typescript
async createPayment(params: PaymentRequest): Promise<Payment>
```
````

## Parameters

- `params.amount` (number): Payment amount in cents
- `params.currency` (string): ISO 4217 currency code

## Returns

Promise resolving to Payment object with transaction ID, status, timestamp.

## Throws

- `ValidationError` if amount is negative or currency invalid
- `ConflictError` if payment already exists for this request ID

## Examples

```typescript
const payment = await paymentService.createPayment({
  amount: 1000,
  currency: 'USD',
});
```

## Related

See also: `capturePayment()`, `refundPayment()`

````

**Created as**:
```cypher
(doc:SpecDoc {
  source: "generated",
  generatedFor: "Symbol:createPayment",
  generatedBy: "claude-3.5"
})-[r:DOCUMENTS {role: 'SYMBOL', confidence: 0.88}]->(sym:Symbol)
````

---

## Implementation Checklist

### Documentation Acquisition

- [ ] **Colocated**: Scan configured paths for markdown files
- [ ] **Colocated**: Extract docstrings from code during indexing
- [ ] **Separate**: Clone docs repo from git, checkout ref
- [ ] **Hosted**: Crawl website with configurable patterns/exclusions
- [ ] **Error handling**: Log and skip inaccessible docs (non-blocking)

### Content Processing

- [ ] Parse markdown frontmatter / metadata
- [ ] Extract first 5KB for SpecDoc storage
- [ ] Generate embeddings via embedding model
- [ ] Store vectors in Qdrant

### Reference Extraction

- [ ] Regex: Explicit code mentions (symbol names)
- [ ] Regex: Type references (@param, @returns)
- [ ] Regex: Error classes (throws/catches)
- [ ] Regex: Entity names (tables, fields)
- [ ] Regex: API routes (GET /path, POST /path)
- [ ] Regex: Environment variables ($VAR, `VAR`)
- [ ] AST: Extract code examples, parse calls
- [ ] LLM: Semantic matching (fallback strategy)

### Edge Creation

- [ ] Create DOCUMENTS edges with confidence scores
- [ ] Batch upsert to Neo4j (transactional)
- [ ] Handle duplicates (merge edges, keep highest confidence)
- [ ] Index by target_role for efficient queries

### Quality Assurance

- [ ] Confidence distribution histogram (80%+ >= 0.70)
- [ ] Coverage analysis (% of symbols documented)
- [ ] Broken link detection (orphaned references)
- [ ] Duplicate doc detection (same content, different paths)

---

## Query Patterns (Common Agent Tasks)

### Find All Docs for a Symbol

```cypher
MATCH (sym:Symbol {id: $symbolId})
OPTIONAL MATCH (doc:SpecDoc)-[r:DOCUMENTS {role: 'SYMBOL'}]->(sym)
RETURN doc, r.confidence
ORDER BY r.confidence DESC
```

### Find API Documentation for Endpoint

```cypher
MATCH (ep:Boundary {id: $boundaryId})
OPTIONAL MATCH (doc:SpecDoc)-[r:DOCUMENTS {role: 'ENDPOINT'}]->(ep)
RETURN doc
```

### Find Docs with High Confidence

```cypher
MATCH (doc:SpecDoc)-[r:DOCUMENTS]->()
WHERE r.confidence >= 0.80
RETURN doc, r.confidence
ORDER BY r.confidence DESC
```

### Documentation Coverage Analysis

```cypher
MATCH (sym:Symbol)
OPTIONAL MATCH (doc:SpecDoc)-[:DOCUMENTS {role: 'SYMBOL'}]->(sym)
RETURN COUNT(DISTINCT sym) as total_symbols,
       COUNT(DISTINCT doc) as documented_symbols,
       ROUND(100.0 * COUNT(DISTINCT doc) / COUNT(DISTINCT sym)) as coverage_pct
```

---

## References

- [graph_schema_spec.md](./graph_schema_spec.md) – Node/edge schema
- [nodes/SpecDoc.md](./nodes/SpecDoc.md) – SpecDoc node definition
- [edges/DOCUMENTS.md](./edges/DOCUMENTS.md) – DOCUMENTS edge definition
- [configuration_and_server_setup.md](./configuration_and_server_setup.md) – Configuration for doc
  sources

---

**End of Documentation Indexing & Linking Specification**
