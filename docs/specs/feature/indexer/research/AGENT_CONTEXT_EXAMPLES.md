# Texere Indexer – Agent Context Examples

This document explores realistic agent prompts and the knowledge graph queries needed to fulfill
them. It validates schema design and reveals missing patterns.

---

## Example 1: "Add a new endpoint for listing features"

**Agent Goal**: Create a new API endpoint that follows existing patterns.

**What the agent needs**:

- ✅ Exemplar endpoints (similar paths, same verb)
- ✅ Handler symbol patterns (how handlers are structured)
- ✅ Schema entities (what data models are involved)
- ✅ Tests for endpoints (example test structure)
- ✅ Style guides (naming, error handling conventions)
- ✅ Related features (what feature does this endpoint implement?)

**Cypher Query** (leveraging `getEndpointPatternExamples`):

```cypher
-- Agent calls: getEndpointPatternExamples(limit: 5)
MATCH (ep:Endpoint)
WHERE ep.path STARTS WITH "/api/features"  -- Filter by pattern
OPTIONAL MATCH (sym:Symbol {id: ep.handlerSymbolId})
OPTIONAL MATCH (t:TestCase)-[:TESTS]->(sym)
OPTIONAL MATCH (ep)-[:IMPLEMENTS]->(feat:Feature)
OPTIONAL MATCH (ep)-[:FOLLOWS_PATTERN]->(pat:Pattern)
OPTIONAL MATCH (sym)-[:READS_FROM|:WRITES_TO]->(entity:DataContract)

RETURN {
  endpoint: ep,
  handler: sym,
  handlerCode: sym.docstring,  -- Could include source
  tests: collect(DISTINCT t),
  feature: feat,
  patterns: collect(DISTINCT pat),
  dataModels: collect(DISTINCT entity)
}
LIMIT 5
```

**Data returned**:

- 3–5 similar endpoints (verb, path pattern)
- Handler symbol code/docstring
- Test examples to copy
- Feature being implemented
- API patterns the handler follows
- Data models involved (User, Feature, etc.)

**What's missing from schema?**

- Handler **source code snippet** (currently just `docstring`)
- **HTTP status codes** endpoint returns (stored where?)
- **Request/response schema** (could add to Endpoint properties)
- **Error handling patterns** (separate pattern type?)

---

## Example 2: "Fix the auth flow – it's rejecting valid tokens"

**Agent Goal**: Debug and fix authentication issue.

**What the agent needs**:

- ✅ Auth-related incidents (previous bug reports)
- ✅ Auth symbols (functions handling validation)
- ✅ Auth tests (what should pass/fail?)
- ✅ Recent changes to auth code (snapshot history)
- ✅ Features depending on auth
- ✅ Endpoints using auth

**Cypher Query**:

```cypher
-- 1. Find auth incidents
MATCH (i:Incident)
WHERE i.title CONTAINS "auth" OR i.description CONTAINS "token"
OPTIONAL MATCH (i)-[:CAUSED_BY]->(sym:Symbol)
OPTIONAL MATCH (i)-[:AFFECTS]->(feat:Feature)

-- 2. Find all auth-related symbols
OPTIONAL MATCH (authSym:Symbol)
WHERE authSym.name CONTAINS "auth" OR authSym.name CONTAINS "token"
OPTIONAL MATCH (authSym)-[:MODIFIED_IN]->(snap:Snapshot)
ORDER BY snap.timestamp DESC
LIMIT 1  -- Latest modification

-- 3. Find tests for auth
OPTIONAL MATCH (test:TestCase)-[:TESTS]->(authSym)

-- 4. Find endpoints using auth
OPTIONAL MATCH (authSym)<-[:REFERENCES* 0..3]-(ep:Endpoint)

RETURN {
  incidents: collect(DISTINCT i),
  rootCauseSymbols: collect(DISTINCT sym),
  affectedFeatures: collect(DISTINCT feat),
  authSymbols: collect(DISTINCT authSym),
  latestModification: snap,
  relatedTests: collect(DISTINCT test),
  dependentEndpoints: collect(DISTINCT ep)
}
```

**Data returned**:

- Recent auth incidents + root causes
- All auth-related symbols (with modification history)
- Tests that exercise auth
- Endpoints calling auth code
- Recent changes (what was modified?)

**What's missing?**

- **Diff/change context** (what exactly changed in latest snapshot?)
- **Test results** (which tests pass/fail?)
- **Call chain visualization** (Symbol A calls B calls C)
- **Blame/author** (who modified recently? from Git)

---

## Example 3: "Implement Stripe integration for the billing feature"

**Agent Goal**: Connect a new external service to an existing feature.

**What the agent needs**:

- ✅ Feature definition (what is "billing"?)
- ✅ Related symbols/endpoints
- ✅ Similar external service integrations (e.g., Auth0)
- ✅ Tests for similar integrations
- ✅ Error handling patterns
- ✅ Configuration patterns (env vars, secrets)

**Cypher Query**:

```cypher
-- Find the billing feature
MATCH (feat:Feature {name: "billing"})

-- Get implementing symbols/endpoints
OPTIONAL MATCH (feat)-[:IMPLEMENTS]->(sym:Symbol)
OPTIONAL MATCH (feat)-[:IMPLEMENTS]->(ep:Endpoint)

-- Find similar external service integrations
OPTIONAL MATCH (anotherEp:Endpoint)-[:CALLS]->(extSvc:ExternalService)
WHERE extSvc.id IN ["stripe", "auth0", "sendgrid"]  -- Example services

-- For each integration, get handler + tests
OPTIONAL MATCH (anotherEp)<-[:HANDLED_BY]-(anotherSym:Symbol)
OPTIONAL MATCH (integrationTest:TestCase)-[:TESTS]->(anotherSym)

-- Get integration patterns
OPTIONAL MATCH (anotherSym)-[:FOLLOWS_PATTERN]->(integrationPat:Pattern)

-- Configuration (from SpecDoc or StyleGuide)
OPTIONAL MATCH (configDoc:SpecDoc)
WHERE configDoc.path CONTAINS "config" OR configDoc.content CONTAINS "API_KEY"

RETURN {
  feature: feat,
  currentSymbols: collect(DISTINCT sym),
  currentEndpoints: collect(DISTINCT ep),
  exampleIntegrations: {
    endpoints: collect(DISTINCT anotherEp),
    handlers: collect(DISTINCT anotherSym),
    tests: collect(DISTINCT integrationTest),
    patterns: collect(DISTINCT integrationPat)
  },
  configExamples: collect(DISTINCT configDoc)
}
```

**Data returned**:

- Billing feature definition
- Current billing symbols/endpoints
- 3–5 example external service integrations (handlers + tests)
- Integration patterns to follow
- Configuration examples

**What's missing?**

- **API client library documentation** (how to instantiate Stripe client?)
- **Environment variable naming conventions** (STRIPE_API_KEY vs STRIPE_SECRET?)
- **Error handling for external calls** (retry logic, timeout handling)
- **Mock/test doubles** (how to test external service calls?)

---

## Example 4: "Refactor the User schema – we're splitting into User and Profile"

**Agent Goal**: Safely refactor a database schema entity.

**What the agent needs**:

- ✅ Current schema entity (User model definition)
- ✅ Symbols reading/writing User
- ✅ Tests verifying User usage
- ✅ Endpoints serving User data
- ✅ Features depending on User
- ✅ Related entities (dependencies)

**Cypher Query**:

```cypher
-- Find the User schema entity
MATCH (entity:DataContract {name: "User"})

-- Find all symbols reading/writing to User
OPTIONAL MATCH (sym:Symbol)-[r:READS_FROM|:WRITES_TO]->(entity)
WITH entity, sym, r

-- Find tests for those symbols
OPTIONAL MATCH (test:TestCase)-[:TESTS]->(sym)

-- Find endpoints serving User
OPTIONAL MATCH (sym)<-[:REFERENCES* 0..2]-(ep:Endpoint)

-- Find features using User
OPTIONAL MATCH (feat:Feature)-[:IMPLEMENTS]->(sym)

-- Find related entities (FK constraints, etc.)
OPTIONAL MATCH (entity)-[:DEPENDS_ON]->(relatedEntity:DataContract)

RETURN {
  dataContract: entity,
  usingSym: collect({
    symbol: sym,
    usage: r.type,  -- READS_FROM or WRITES_TO
    location: r.line
  }),
  tests: collect(DISTINCT test),
  endpoints: collect(DISTINCT ep),
  features: collect(DISTINCT feat),
  relatedEntities: collect(DISTINCT relatedEntity)
}
```

**Data returned**:

- User entity definition
- Every symbol touching User (with read/write type)
- Tests verifying User code
- Endpoints returning User data
- Features using User
- Related entities

**What's missing?**

- **Field-level usage** (which fields are read/written? e.g., User.email vs User.createdAt)
- **Migration helpers** (SQL migration templates)
- **Breaking changes** (which endpoints/tests will break?)
- **Gradual migration plan** (User → User + Profile rollout strategy)

---

## Example 5: "Update error handling across all endpoints to match the new style guide"

**Agent Goal**: Apply a style guide consistently.

**What the agent needs**:

- ✅ Style guide definition (new error handling convention)
- ✅ Modules it applies to
- ✅ Endpoints not following it (compliance check)
- ✅ Example endpoints that do follow it
- ✅ Error patterns

**Cypher Query**:

```cypher
-- Find the style guide
MATCH (guide:StyleGuide {name: "error-handling-v2"})
OPTIONAL MATCH (guide)-[:APPLIES_TO]->(module:Module)

-- Find endpoints in that module
OPTIONAL MATCH (module)-[:CONTAINS*]->(f:File)
OPTIONAL MATCH (f)-[:CONTAINS]->(ep:Endpoint)

-- Find which endpoints follow the pattern
OPTIONAL MATCH (guide)-[:REFERENCES]->(correctPattern:Pattern)
OPTIONAL MATCH (ep)-[:FOLLOWS_PATTERN]->(pattern:Pattern)

-- Identify non-compliant endpoints (don't follow pattern)
WITH ep, pattern, correctPattern
WHERE pattern IS NULL OR pattern.id <> correctPattern.id

-- For compliant examples, get the handler code
OPTIONAL MATCH (complianceSymbol:Symbol {id: ep.handlerSymbolId})
OPTIONAL MATCH (complianceSymbol)-[:FOLLOWS_PATTERN]->(correctPattern)

RETURN {
  styleGuide: guide,
  applicableModule: module,
  nonCompliantEndpoints: collect(DISTINCT ep),
  complianceExample: {
    endpoint: complianceSymbol,
    code: complianceSymbol.docstring,
    pattern: correctPattern
  },
  updatedAt: guide.updatedAt
}
```

**Data returned**:

- Style guide definition
- All endpoints in applicable modules
- Endpoints that don't follow pattern (action items)
- Example endpoint that does follow pattern (reference implementation)

**What's missing?**

- **Automated compliance checker** (can we score non-compliance?)
- **Migration instructions** (step-by-step fix for each endpoint)
- **Code diff preview** (show before/after)
- **Related tests** (which tests verify compliance?)

---

## Example 6: "Create a test for the new payment feature"

**Agent Goal**: Write a test that follows repo patterns.

**What the agent needs**:

- ✅ Feature definition
- ✅ Related symbols/endpoints
- ✅ Example tests (similar test cases)
- ✅ Test patterns and structure
- ✅ Mock/fixture patterns
- ✅ Assertion patterns

**Cypher Query**:

```cypher
-- Find feature
MATCH (feat:Feature {name: "payment"})

-- Find implementing symbols/endpoints
OPTIONAL MATCH (feat)-[:IMPLEMENTS]->(sym:Symbol)

-- Find existing tests for similar features
OPTIONAL MATCH (similarFeat:Feature)
WHERE similarFeat.name IN ["billing", "subscription", "checkout"]
OPTIONAL MATCH (similarFeat)-[:IMPLEMENTS]->(similarSym:Symbol)
OPTIONAL MATCH (test:TestCase)-[:TESTS|:VERIFIES]->(similarSym)

-- Test patterns
OPTIONAL MATCH (test)-[:FOLLOWS_PATTERN]->(testPattern:Pattern)

-- Integration with external service
OPTIONAL MATCH (sym)-[:CALLS]->(extSvc:ExternalService)

-- Fixture/mock patterns
OPTIONAL MATCH (mockPattern:Pattern)
WHERE mockPattern.name CONTAINS "mock" OR mockPattern.name CONTAINS "fixture"

RETURN {
  feature: feat,
  symbolsToTest: collect(DISTINCT sym),
  exampleTests: collect({
    test: test,
    relatedSymbol: similarSym,
    feature: similarFeat,
    patterns: mockPattern
  }),
  externalServices: collect(DISTINCT extSvc),
  testingPatterns: collect(DISTINCT testPattern)
}
```

**Data returned**:

- Feature definition
- Symbols to test
- 3–5 similar test cases (can copy structure)
- Test patterns to follow
- Mock/fixture patterns
- External service integration tests

**What's missing?**

- **Test data fixtures** (sample User, Payment objects)
- **Mock library patterns** (Jest vs Vitest vs pytest patterns)
- **Coverage targets** (what % coverage for payment feature?)
- **Test isolation rules** (unit vs integration classification)

---

## Pattern Observations

### What the Schema Supports Well ✅

1. **Pattern discovery** – Examples via `[:FOLLOWS_PATTERN]`
2. **Impact analysis** – Via `[:IMPLEMENTS]`, `[:READS_FROM]`, `[:REFERENCES]`
3. **Feature context** – `getFeatureContext()` returns all needed data
4. **Endpoint discovery** – Filtering by path, verb, patterns
5. **Incident investigation** – Via `[:CAUSED_BY]`, `[:AFFECTS]`, `[:MODIFIED_IN]`

### What's Missing or Underspecified ⚠️

1. **Source code snippets** – Only `docstring`; full source needed
2. **Diff/change details** – Snapshot timestamp exists, but not diff metadata
3. **Request/response schemas** – Should Endpoint include OpenAPI schema?
4. **Field-level mutations** – Which fields of DataContract are read/written?
5. **Test data / fixtures** – No representation of mock data patterns
6. **Configuration variables** – Where are API_KEY patterns stored?
7. **Deployment context** – Which endpoints are deployed where?
8. **Performance metadata** – Endpoint latency, query complexity?

### Recommended Schema Extensions (Post-v1)

```typescript
// Endpoint enhancement
interface Endpoint {
  // ... existing ...
  requestSchema?: string; // JSON Schema or OpenAPI
  responseSchema?: string; // JSON Schema or OpenAPI
  statusCodes?: { [code: number]: string }; // Documented status codes
  performanceTargetMs?: number; // Expected latency
  deploymentEnvironment?: string; // prod, staging, etc.
}

// DataContract enhancement
interface DataContract {
  // ... existing ...
  fieldUsage?: {
    fieldName: string;
    symbols: string[]; // Symbol IDs that use field
    operations: ('READ' | 'WRITE')[];
  }[];
}

// New node type: Configuration
interface ConfigurationVariable {
  id: string;
  name: string; // STRIPE_API_KEY
  module: string; // Which module uses it
  secret: boolean; // Is it sensitive?
  defaultValue?: string;
  documentation: string;
}

// New edge: Symbol -[:USES_CONFIG]-> ConfigurationVariable
```

---

## Agent Interaction Model

Based on these examples, the interaction flow is:

```
Agent receives prompt
         ↓
Parse intent (e.g., "add endpoint", "fix auth", "refactor schema")
         ↓
Query knowledge graph for context
    • getFeatureContext() – if feature-centric
    • getEndpointPatternExamples() – if API-centric
    • getIncidentSlice() – if debugging
    • Custom queries for schema refactoring, style guide checks
         ↓
Compose result bundle with examples, patterns, dependencies
         ↓
Agent uses context to:
  - Generate code (modeled after examples)
  - Identify breaking changes (via impact analysis)
  - Write tests (using test patterns)
  - Apply style guides (find non-compliant code)
         ↓
Agent makes edits, validates, runs tests
         ↓
(Optional) Update knowledge graph (new symbols, endpoints, features)
```

---

## Validation Checklist

- [x] Can agent find pattern examples? → Yes (`:FOLLOWS_PATTERN`)
- [x] Can agent understand data dependencies? → Yes (`READS_FROM`, `WRITES_TO`)
- [x] Can agent trace bug impact? → Yes (`:CAUSED_BY`, `:AFFECTS`, `:MODIFIED_IN`)
- [x] Can agent find similar code? → Yes (`SIMILAR_TO` embeddings)
- [x] Can agent apply style guides? → Partial (need field-level mutations for full validation)
- [x] Can agent test code? → Yes (find example tests)
- [?] Can agent understand performance constraints? → Not yet (no perf metadata)
- [?] Can agent handle gradual migrations? → Unclear (need diff context)

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node/edge catalog
- [API Gateway Spec](../api_gateway_spec.md) – Request/response contracts
- [README.md](../README.md) – Query API bundles (§6)
