# Texere Indexer – Missing Context Analysis

Why certain data types are critical for agent workflows and should be added (either v1 or v1+).

---

## 1. Source Code Snippets (HIGH PRIORITY – v1)

### The Problem

**Current state:** Symbol node has `docstring` property only.

```cypher
MATCH (s:Symbol {name: "handlePayment"})
RETURN s.docstring  -- Only JSDoc/docstring; no actual code
```

**What agent gets:** A 200-char docstring like `// Process payment and update ledger`

**What agent needs:** The actual function body to:

- Copy the implementation pattern
- Understand error handling inside the function
- See variable names and flow logic
- Learn how to call related functions
- Model refactoring changes

### Why It Matters

**Scenario: "Add a new payment endpoint following existing patterns"**

Agent can find exemplar endpoint, see that it calls `handlePayment()` symbol, but:

- ❌ Can't see how `handlePayment()` handles errors
- ❌ Can't copy the try-catch pattern
- ❌ Can't understand what exceptions it throws
- ❌ Can't see logging patterns inside

Without code, agent generates a different error handling style → style guide violation.

### Recommendation

Add `sourceCode` property to Symbol (truncated to reasonable size):

```typescript
interface Symbol {
  // ... existing ...
  sourceCode?: string; // First 2KB of implementation
  sourceCodeUrl?: string; // Link to full source in repo
  lineStart: number; // For navigation
  lineEnd: number;
}

// Or store separately:
interface SymbolSource {
  symbolId: string;
  content: string; // Full implementation
  language: string; // For syntax highlighting
}
```

**Storage strategy:**

- Store small snippets (first 500 chars) in Neo4j for quick access
- Store full source in separate document store (Postgres JSONB, MongoDB) with symbol ID reference
- Agents fetch full source only when needed

---

## 2. Request/Response Schemas (HIGH PRIORITY – v1)

### The Problem

**Current state:** Boundary stores `verb` and `path` only.

```cypher
MATCH (ep:Boundary {path: "/api/payments"})
RETURN ep.verb, ep.path  -- GET /api/payments
```

**What agent gets:** Basic HTTP metadata

**What agent needs:**

- What does the request body look like? (JSON schema)
- What fields are required vs optional?
- What does the response look like?
- What HTTP status codes can it return?
- What authentication is required?
- What are the error responses?

### Why It Matters

**Scenario: "Create a client library call to list payments"**

Agent finds `/api/payments` endpoint but:

- ❌ Doesn't know if it's paginated (limit/offset/cursor?)
- ❌ Doesn't know response fields (id, amount, date, metadata?)
- ❌ Doesn't know if 400 is "invalid filter" or "auth failed"
- ❌ Generates incorrect client code

### Recommendation

Add schema properties to Boundary:

```typescript
interface Boundary {
  // ... existing ...
  requestSchema?: {
    contentType: 'application/json';
    schema: object; // JSON Schema or OpenAPI schema
    examples?: { [key: string]: object };
  };

  responseSchema?: {
    schema: object;
    statusCodes: {
      [code: number]: {
        description: string;
        schema: object;
        example: object;
      };
    };
  };

  authentication?: {
    type: 'bearer' | 'api-key' | 'oauth2' | 'none';
    header?: string; // 'Authorization' or 'X-API-Key'
    scopes?: string[];
  };

  rateLimit?: {
    requestsPerSecond: number;
    burstLimit?: number;
  };
}
```

**Storage:**

- Extract from OpenAPI/Swagger definitions if available
- LLM can infer from endpoint handler code + tests
- Store as JSON on Boundary node
- Build full OpenAPI doc from all endpoints at query time

---

## 3. Field-Level Schema Mutations (HIGH PRIORITY – v1+)

### The Problem

**Current state:** Symbol links to DataContract with generic `READS_FROM` / `WRITES_TO`.

```cypher
MATCH (s:Symbol)-[r:READS_FROM|:WRITES_TO]->(e:DataContract {name: "User"})
RETURN s.name, r.type  -- "validateUser" READS_FROM User
```

**What agent gets:** "validateUser reads from User"

**What agent doesn't know:**

- Which fields of User? All of them?
- Just `id` and `email`? Or also `passwordHash`?
- Does it modify `lastLoginAt`?
- Does it read `isSuspended` or `isAdmin`?

### Why It Matters

**Scenario: "Refactor User → User + Profile, moving email to Profile"**

Agent needs to:

1. Find all symbols reading User.email
2. Repoint those to Profile.email
3. Update tests
4. Ensure no schema conflicts

**Without field-level mutations:**

- ❌ Agent sees 47 symbols touch User
- ❌ Agent doesn't know which ones specifically use `email`
- ❌ Agent refactors unnecessarily; breaks unrelated code
- ❌ Or misses some symbols that need updating

### Recommendation

Add field-level mutation tracking:

```typescript
// Option A: Relationship properties
(symbol:Symbol)-[r:READS_FROM {
  fields: ["id", "email", "createdAt"]
}]->(entity:DataContract)

(symbol:Symbol)-[r:WRITES_TO {
  fields: ["lastLoginAt", "preferences"]
}]->(entity:DataContract)

// Query
MATCH (s:Symbol)-[r:WRITES_TO {fields: ["email"]}]->(User)
RETURN s  -- Find all symbols that write User.email
```

```typescript
// Option B: Separate FieldMutation node
interface FieldMutation {
  id: string;  // symbolId:entityName:fieldName
  symbolId: string;
  entityName: string;
  fieldName: string;
  operation: 'READ' | 'WRITE' | 'DELETE';
  line: number;
  confidence: number;  // 0.0-1.0, LLM-inferred
}

(symbol:Symbol)-[:MUTATES_FIELD]->(mutation:FieldMutation)-[:OF]->(field:SchemaField)
```

**Inference:**

- Static analysis: Track ORM usage like `user.email = x` or `const {email} = user`
- LLM-assisted: For complex logic, LLM infers what fields are touched
- Test-driven: Analyze test mocks to see field patterns

---

## 4. Test Fixtures & Mock Patterns (MEDIUM PRIORITY – v1+)

### The Problem

**Current state:** TestCase links to Symbol but doesn't capture test data patterns.

```cypher
MATCH (t:TestCase)-[:TESTS]->(s:Symbol)
RETURN t.name, s.name  -- "should reject invalid payment" tests "validatePayment"
```

**What agent gets:** Test name and what it tests

**What agent doesn't know:**

- What does a valid payment object look like?
- Is there a factory: `createPayment({amount: 100})`?
- Are there fixtures in `fixtures/payments.ts`?
- Is mocking done with Jest, Sinon, pytest-mock?
- What test framework? vitest, jest, pytest?

### Why It Matters

**Scenario: "Write a test for the new Stripe integration"**

Agent needs test patterns but:

- ❌ Can't find fixture definitions
- ❌ Doesn't know how to mock Stripe client
- ❌ Writes test with wrong assertion syntax
- ❌ Test doesn't match repo style

### Recommendation

Add fixture and mock pattern recognition:

```typescript
// New node types
interface TestFixture {
  id: string;
  name: string;  // "validPayment", "expiredUser"
  path: string;  // path/to/fixtures.ts
  code: string;  // Sample code
  usedBy: string[];  // TestCase IDs that use it
}

interface MockPattern {
  id: string;
  service: string;  // "stripe", "auth0", "database"
  framework: string;  // "jest", "vitest", "pytest"
  code: string;  // Mock setup code
  exampleTests: string[];  // TestCase IDs using this mock
}

// New edges
(testCase:TestCase)-[:USES_FIXTURE]->(fixture:TestFixture)
(testCase:TestCase)-[:USES_MOCK]->(mockPattern:MockPattern)
(mockPattern:MockPattern)-[:MOCKS_SERVICE]->(externalService:ExternalService)
```

**Discovery:**

- Parse test file imports: `import {validPayment} from '../fixtures'`
- Parse mock setup: `jest.mock('stripe', ...)`
- Track in graph during indexing

---

## 5. Configuration & Environment Variables (MEDIUM PRIORITY – v1+)

### The Problem

**Current state:** No representation of config in graph.

```cypher
-- Agent can't query this at all
-- Where are environment variables documented?
-- Which symbols use STRIPE_API_KEY?
-- What's the naming convention?
```

**What agent needs to know:**

- What env vars does the codebase use?
- Which are secrets vs public config?
- Which modules/endpoints use each variable?
- What's the naming convention? `STRIPE_API_KEY` or `stripe.apiKey`?
- What are the defaults?
- Which are required vs optional?

### Why It Matters

**Scenario: "Add Stripe integration"**

Agent needs to:

1. Know the config pattern: `process.env.STRIPE_API_KEY` or `.env.STRIPE_SECRET_KEY`?
2. Know where to add it: `.env.example`, `docker-compose.yml`, Kubernetes secrets?
3. Know how it's loaded: Direct `process.env` or via config module?
4. Know if there are validation rules

**Without config context:**

- ❌ Agent hardcodes API key
- ❌ Or uses wrong env var naming
- ❌ Or stores secret in wrong place (plaintext in code)
- ❌ Or doesn't inject it into tests

### Recommendation

Add configuration tracking:

```typescript
interface ConfigurationVariable {
  id: string;
  name: string;  // STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET
  category: string;  // "payment", "auth", "logging"
  kind: 'secret' | 'public' | 'internal';
  defaultValue?: string;  // null for secrets
  description: string;
  required: boolean;
  examples: string[];  // STRIPE_SK_LIVE_*, STRIPE_SK_TEST_*
}

// New edges
(symbol:Symbol)-[:USES_CONFIG]->(configVar:ConfigurationVariable)
(module:Module)-[:REQUIRES_CONFIG]->(configVar:ConfigurationVariable)
(externalService:ExternalService)-[:CONFIGURED_BY]->(configVar:ConfigurationVariable)

// Query
MATCH (stripe:ExternalService {name: "Stripe"})
       -[:CONFIGURED_BY]->(config:ConfigurationVariable)
RETURN config  -- Returns STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET, etc.
```

**Discovery:**

- Regex patterns: `process.env.STRIPE_API_KEY`, `config.get('stripe')`
- Environment files: `.env.example`, `.env.local`
- CI/CD configs: `docker-compose.yml`, `k8s/secrets.yaml`
- Code analysis: Track `Symbol -[:USES_CONFIG]-> ConfigVar`

---

## 6. Deployment & Feature Flags (LOW PRIORITY – v2)

### The Problem

**Current state:** No notion of deployment targets or feature flags.

**What agent doesn't know:**

- Is this endpoint in production?
- Is it behind a feature flag?
- Is it beta/experimental?
- Which environments is it deployed to? (dev, staging, prod)
- What's the rollout percentage?

### Why It Matters

**Scenario: "Make a breaking API change to /api/payments"**

Agent should:

- Know if endpoint is in production (risky change!)
- Know if there are feature flags protecting it (safe to change)
- Know if any clients depend on it
- Suggest deprecation period

**Without deployment context:**

- ❌ Agent makes breaking change to live endpoint
- ❌ Breaks production clients
- ❌ No migration path

### Recommendation (v2+)

```typescript
interface DeploymentTarget {
  environment: 'development' | 'staging' | 'production';
  region?: string;
  version?: string;
}

interface FeatureFlag {
  id: string;
  name: string;  // "stripe-payment-redesign"
  status: 'experiment' | 'beta' | 'stable' | 'deprecated';
  rolloutPercentage: number;  // 0-100
  targetAudience?: string;
  releasedAt?: timestamp;
}

(endpoint:Boundary)-[:DEPLOYED_TO]->(target:DeploymentTarget)
(endpoint:Boundary)-[:BEHIND_FLAG]->(flag:FeatureFlag)
(feature:Feature)-[:GATED_BY]->(flag:FeatureFlag)
```

---

## 7. Performance Metadata (LOW PRIORITY – v2)

### The Problem

**What agent doesn't know:**

- What's the P99 latency of this endpoint?
- Is there a performance budget? (e.g., must be <100ms)
- Which queries are slow?
- Are there known bottlenecks?

### Why It Matters

**Scenario: "Optimize the feature list endpoint"**

Agent should:

- Know P99 is currently 800ms
- Know budget is 500ms
- Know the bottleneck is database query
- Avoid changes that make it slower

---

## Priority Matrix

| What                     | Why                                                       | v1? | v1+ | Implementation Difficulty                |
| ------------------------ | --------------------------------------------------------- | --- | --- | ---------------------------------------- |
| Source code snippets     | Agents need actual implementations to copy patterns       | ✅  | —   | Medium (storage strategy)                |
| Request/response schemas | Agents need to generate correct client/server code        | ✅  | —   | Easy (extract from OpenAPI)              |
| Field-level mutations    | Agents need safe refactoring with field-level precision   | ⚠️  | ✅  | Hard (deep code analysis)                |
| Test fixtures            | Agents need to write tests matching repo style            | ⚠️  | ✅  | Medium (parse test files)                |
| Config variables         | Agents need to follow config patterns; avoid secrets leak | ✅  | —   | Medium (regex + code analysis)           |
| Deployment context       | Agents need to avoid breaking changes to live services    | —   | ✅  | Medium (extract from deployment configs) |
| Performance metadata     | Agents should respect performance budgets                 | —   | ✅  | Easy (collect from monitoring)           |

---

## Implementation Order

### v1 Must-Have

1. **Source code snippets** → Symbol.sourceCode (first 2KB)
2. **Request/response schemas** → Boundary.requestSchema, Boundary.responseSchema
3. **Configuration variables** → New ConfigurationVariable node type + discovery

### v1+ Should-Have

4. **Field-level mutations** → FieldMutation tracking via static analysis + LLM
5. **Test fixtures** → TestFixture node + import parsing
6. **Mock patterns** → MockPattern node + framework detection

### v2+ Nice-to-Have

7. **Deployment context** → DeploymentTarget, FeatureFlag nodes
8. **Performance metadata** → PerformanceMetric properties

---

## Impact on Query API Bundles

Adding this context changes what `getFeatureContext()` returns:

**Before:**

```json
{
  "feature": {...},
  "handlerSymbols": [...],
  "tests": [...]
}
```

**After:**

```json
{
  "feature": {...},
  "handlerSymbols": [
    {
      "name": "handlePayment",
      "sourceCode": "async function handlePayment(req) { ... }",
      "docstring": "...",
      "usedConfigVars": ["STRIPE_API_KEY"],
      "tests": [...]
    }
  ],
  "endpoints": [
    {
      "path": "/api/payments",
      "requestSchema": {...},
      "responseSchema": {...},
      "authentication": {...}
    }
  ]
}
```

Agent now has everything needed to implement safely and consistently.

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Current schema
- [AGENT_CONTEXT_EXAMPLES.md](./AGENT_CONTEXT_EXAMPLES.md) – Use cases
- [llm_prompts_spec.md](../llm_prompts_spec.md) – What LLM sees
