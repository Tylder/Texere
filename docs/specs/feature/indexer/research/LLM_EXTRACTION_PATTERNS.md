# Texere Indexer – LLM Extraction Patterns

How LLMs extract actionable patterns from source code during the ingest pipeline, enabling agents to
understand and replicate implementation styles without storing full code.

---

## Overview

Instead of storing complete source code (expensive, verbose), the indexer uses LLM to **extract
patterns, templates, and metadata** that agents need to understand and replicate behavior.

**Ingest Flow:**

```
Symbol source code (full)
         ↓ (LLM)
Extract pattern template
Extract error handling style
Extract field mutations (field-level)
Extract configuration usage
Extract external service patterns
         ↓
Store compact, actionable metadata on Symbol node
```

---

## 1. Code Template Extraction

### Problem

**Raw Code:**

```typescript
async function handlePayment(req: Request, res: Response) {
  try {
    const { amount, userId } = req.body;

    const payment = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
    });

    await updateLedger(userId, amount);

    res.json({ success: true, paymentId: payment.id });
  } catch (error) {
    logger.error('Payment failed', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
}
```

**What agent needs:**

- The _structure_, not the details
- How errors are handled
- What kind of calls are made
- What parameters are returned

### LLM Prompt

````
Extract the implementation template from this function.
Replace specific values (variable names, strings, numbers) with placeholders.
Keep the structure and control flow.
Highlight the key steps: validation → external call → database update → response.

Function:
[symbol.sourceCode]

Output as:
```yaml
kind: endpoint-handler
steps:
  - name: validate
    description: Extract and validate request body
    pattern: "const { ... } = req.body; // or await validateInput()"
  - name: call_external_service
    service: stripe
    pattern: "await [SERVICE].[METHOD]([PARAMS])"
  - name: update_database
    pattern: "await [TABLE].update([PARAMS])"
  - name: respond
    pattern: "res.json({ ... })"
error_handling:
  - type: try-catch
    log_pattern: "logger.error(...)"
    response_pattern: "res.status(500).json(...)"
````

````

### Storage

Add to **Symbol** node:

```typescript
interface Symbol {
  // ... existing ...
  codeTemplate?: {
    kind: 'endpoint-handler' | 'helper-function' | 'validator' | 'database-access';
    steps: {
      name: string;
      description: string;
      pattern: string;
    }[];
    errorHandling: {
      type: 'try-catch' | 'throw' | 'callback' | 'promise-rejection';
      logPattern?: string;
      responsePattern?: string;
    };
    externalServices: string[];  // Services called: ['stripe', 'auth0']
    confidence: number;  // 0.0-1.0, LLM confidence
  };
}
````

### Agent Usage

**Query:**

```cypher
MATCH (template:Symbol {name: "handlePayment"})-[:FOLLOWS_PATTERN]->(pat:Pattern)
RETURN template.codeTemplate, pat
```

**Agent uses template to:**

- Write new handler following same structure
- Match error handling style
- Know which services to call
- Copy parameter passing convention

---

## 2. Error Handling Pattern Extraction

### Problem

Each codebase has error handling conventions:

- Some use `try-catch`, others throw
- Some log to stdout, others use structured logger
- Some return JSON errors, others HTTP status codes
- Some use custom error classes, others generic

Agent needs to know the local convention.

### LLM Prompt

````
Analyze error handling in this function and extract the pattern.

Function:
[symbol.sourceCode]

Output as:
```json
{
  "errorPattern": {
    "strategy": "try-catch" | "propagate" | "custom-handler",
    "catchExpression": "catch (error) { ... }",
    "logStatement": "logger.error('Payment failed', error)",
    "logging": {
      "level": "error",
      "format": "structured" | "string-interpolation",
      "includes": ["message", "error", "context", "stack"]
    },
    "responseStrategy": "json-error-object" | "http-status-code" | "throw",
    "errorResponse": {
      "pattern": "res.status(500).json({ error: 'Payment processing failed' })",
      "statusCode": 500,
      "fields": ["error"]  // or ["code", "message", "details"]
    },
    "examples": [
      "res.status(404).json({ error: 'User not found' })",
      "res.status(500).json({ error: 'Internal server error' })"
    ]
  }
}
````

````

### Storage

Add to **Pattern** node:

```typescript
interface Pattern {
  // ... existing ...
  errorHandling?: {
    strategy: 'try-catch' | 'propagate' | 'custom-handler';
    loggingStyle: 'structured' | 'string-interpolation';
    responseFormat: string;  // e.g., "{ error: string }"
    statusCodeConvention: string;  // e.g., "4xx for validation, 5xx for server"
    examples: string[];
  };
}
````

### Agent Usage

```cypher
MATCH (pattern:Pattern {name: "error-handling-v2"})
RETURN pattern.errorHandling.examples
```

Agent sees:

```
res.status(400).json({ error: "Invalid request" })
res.status(500).json({ error: "Internal server error" })
```

And follows the same pattern in new code.

---

## 3. Field-Level Mutation Extraction

### Problem

Query: "Which fields of User does this symbol touch?"

**Option A (No LLM):** Can't determine without deep static analysis

**Option B (LLM):** Analyze code + tests → extract field mutations

### LLM Prompt

````
Analyze this function and extract what fields it reads/writes from the User model.

Function:
[symbol.sourceCode]

Tests:
[related test code]

Output as:
```json
{
  "fieldMutations": [
    {
      "entity": "User",
      "field": "email",
      "operation": "READ",
      "contexts": [
        "const email = user.email",
        "if (user.email === payload.email)"
      ]
    },
    {
      "entity": "User",
      "field": "passwordHash",
      "operation": "READ",
      "contexts": ["const isValid = await bcrypt.compare(password, user.passwordHash)"]
    },
    {
      "entity": "User",
      "field": "lastLoginAt",
      "operation": "WRITE",
      "contexts": ["await user.update({ lastLoginAt: new Date() })"]
    }
  ],
  "confidence": 0.95,
  "uncertainFields": []
}
````

````

### Storage

Create **FieldMutation** relationship:

```cypher
(symbol:Symbol)-[r:MUTATES_FIELD {
  operation: 'READ' | 'WRITE',
  confidence: 0.95,
  contexts: ["const email = user.email", "..."]
}]->(entity:DataContract)

// Better structure using relationship property:
(symbol:Symbol)-[r:FIELD_MUTATION {
  entity: "User",
  field: "email",
  operation: "READ",
  confidence: 0.95
}]->(:FieldUsage)
````

Or simpler: add `fieldMutations` property directly to Symbol:

```typescript
interface Symbol {
  // ... existing ...
  fieldMutations?: {
    entity: string; // "User"
    field: string; // "email"
    operation: 'READ' | 'WRITE';
    confidence: number;
  }[];
}
```

### Agent Usage

**Query:**

```cypher
MATCH (s:Symbol)
WHERE s.fieldMutations[*].entity = "User"
  AND s.fieldMutations[*].field = "email"
  AND s.fieldMutations[*].operation = "WRITE"
RETURN s.name
```

**Agent knows:** "These symbols write User.email, so when refactoring to User + Profile, I need to
update these 3 symbols."

---

## 4. Configuration & Environment Variable Extraction

### Problem

Symbols use environment variables but there's no tracking.

**Current:** `process.env.STRIPE_API_KEY` appears in code but not indexed

### LLM Prompt

````
Extract environment variables and configuration access patterns from this code.

Code:
[symbol.sourceCode]

Output as:
```json
{
  "configVariables": [
    {
      "name": "STRIPE_API_KEY",
      "kind": "secret",
      "usage": "const client = new Stripe(process.env.STRIPE_API_KEY)",
      "contexts": ["initialization"],
      "isRequired": true
    },
    {
      "name": "LOG_LEVEL",
      "kind": "public",
      "usage": "if (process.env.LOG_LEVEL === 'debug')",
      "contexts": ["conditional-logging"],
      "isRequired": false,
      "default": "info"
    }
  ],
  "configModules": ["stripe", "logging"],
  "secrets": ["STRIPE_API_KEY"]
}
````

````

### Storage

Create relationship from Symbol to ConfigurationVariable:

```typescript
(symbol:Symbol)-[:USES_CONFIG {
  isRequired: true,
  default?: string,
  kind: 'secret' | 'public'
}]->(configVar:ConfigurationVariable {
  name: "STRIPE_API_KEY",
  description: "Stripe API key for payment processing",
  required: true
})
````

### Agent Usage

```cypher
MATCH (symbol:Symbol)-[r:USES_CONFIG]->(config:ConfigurationVariable)
WHERE config.kind = 'secret'
RETURN config.name, collect(symbol.name)
```

Agent sees: "These 5 symbols use STRIPE_API_KEY (secret). When setting up environment, ensure this
is injected."

---

## 5. External Service Integration Pattern Extraction

### Problem

How do we integrate with Stripe? Is there a local pattern?

**Current:** Endpoint `[:CALLS]` ExternalService, but no pattern/example.

### LLM Prompt

````
Extract the integration pattern for external services from this code.

Code:
[symbol.sourceCode]

Output as:
```json
{
  "serviceIntegrations": [
    {
      "service": "Stripe",
      "operations": ["create_payment_intent", "retrieve_payment"],
      "clientInitialization": "const stripe = new Stripe(process.env.STRIPE_API_KEY)",
      "patterns": [
        {
          "operation": "create_payment_intent",
          "pattern": "await stripe.paymentIntents.create({ amount, currency })",
          "errorHandling": "catch (error) { logger.error(...) }"
        }
      ],
      "retry": {
        "strategy": "exponential-backoff",
        "maxRetries": 3
      },
      "timeout": 5000
    }
  ]
}
````

````

### Storage

Add to **ExternalService** node:

```typescript
interface ExternalService {
  // ... existing ...
  integrationPatterns?: {
    clientInit: string;  // How to create client
    operations: {
      name: string;
      pattern: string;  // How to call it
      errorHandling: string;
    }[];
    retryStrategy?: 'none' | 'exponential-backoff' | 'linear';
    timeout?: number;
  };
}
````

### Agent Usage

Agent queries Stripe service:

```cypher
MATCH (stripe:ExternalService {name: "Stripe"})
RETURN stripe.integrationPatterns
```

Sees:

```
clientInit: "const stripe = new Stripe(process.env.STRIPE_API_KEY)"
operations: [
  {
    name: "create_payment_intent",
    pattern: "await stripe.paymentIntents.create({ amount, currency })"
  }
]
```

Agent now writes: `const stripe = new Stripe(process.env.STRIPE_API_KEY)` and follows the same call
pattern.

---

## 6. Test Pattern Extraction

### Problem

How should tests be structured in this repo?

**Current:** Find similar tests, but agent doesn't know the pattern.

### LLM Prompt

````
Analyze test files and extract the test pattern/structure.

Test files:
[test code examples from similar symbols]

Output as:
```json
{
  "testPatterns": {
    "framework": "vitest" | "jest" | "pytest",
    "structure": {
      "describe": "Feature description",
      "it": "Test case description",
      "setup": "beforeEach(() => { ... })",
      "assertions": "expect(...).toEqual(...)"
    },
    "mockingStyle": "jest.mock(...)" | "python unittest.mock",
    "fixturePattern": "import { validPayment } from '../fixtures'",
    "asyncPattern": "async () => { ... }",
    "examples": [
      {
        "test": "should create payment with valid input",
        "code": "it('should create payment', async () => { ... })"
      }
    ]
  }
}
````

````

### Storage

Create **TestPattern** node (separate from code Pattern):

```typescript
interface TestPattern {
  id: string;
  framework: 'vitest' | 'jest' | 'pytest';
  structure: string;  // describe/it pattern
  mockingStyle: string;
  fixturePattern: string;
  asyncPattern: string;
  examples: string[];
}

// Edge
(testPattern:TestPattern)-[:USED_IN]->(testCase:TestCase)
````

---

## 7. Data Flow Extraction

### Problem

Agent needs to understand: "What data flows through this system?"

### LLM Prompt

````
Analyze the data flow from input to output in this handler.

Handler:
[symbol.sourceCode]

Output the data transformation pipeline:
```json
{
  "dataFlow": [
    {
      "stage": 1,
      "name": "Parse request",
      "input": "HTTP request body",
      "output": "{ amount: number, userId: string }",
      "validation": "Validate schema"
    },
    {
      "stage": 2,
      "name": "Call external service",
      "input": "{ amount, currency }",
      "output": "{ id: string, status: string }",
      "service": "stripe"
    },
    {
      "stage": 3,
      "name": "Update database",
      "input": "{ userId, paymentId }",
      "output": "Ledger entry created"
    },
    {
      "stage": 4,
      "name": "Send response",
      "input": "{ paymentId, success: true }",
      "output": "HTTP 200 JSON"
    }
  ]
}
````

````

### Storage

Add to Symbol:

```typescript
interface Symbol {
  // ... existing ...
  dataFlow?: {
    stage: number;
    name: string;
    input: string;
    output: string;
    service?: string;
    validation?: string;
  }[];
}
````

---

## LLM Extraction in Ingest Pipeline

### Updated Ingest Flow (Section 5.2 of ingest_spec.md)

```
4. Higher-Level Extraction: FROM FileIndexResult + repo config + LLM:

   a. Endpoint extraction (AST + heuristics)

   b. Schema entity extraction (ORM parsing)

   c. TestCase extraction (pytest, vitest)

   d. Feature mapping (features.yaml + LLM inference)

   e. **LLM-based pattern extraction (NEW):**
      - For each Symbol, extract code template
      - For each Symbol, extract error handling pattern
      - For each Symbol touching entities, extract field mutations
      - For each Symbol using config, extract env var usage
      - For each Symbol calling external service, extract integration pattern
      - For each Symbol with tests, extract test pattern
      - For each Symbol, extract data flow

      LLM batches these extractions per 10-20 symbols for efficiency

   f. Test↔Feature mapping (LLM)

   g. Endpoint↔Feature mapping (LLM)
```

---

## Why LLM for This?

| Task                 | Why LLM?                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Code templates**   | Generalize from specific code requires understanding semantics, not just syntax                              |
| **Error handling**   | Multiple ways to handle errors; LLM identifies _local convention_                                            |
| **Field mutations**  | Without type inference, hard to track which fields accessed (e.g., `user.email` vs `user.preferences.email`) |
| **Config variables** | `process.env.STRIPE_API_KEY` vs `config.get('stripe.apiKey')` vs `app.config.stripe`—multiple patterns       |
| **Service patterns** | Retry logic, timeout, error mapping—LLM extracts decision rules                                              |
| **Test patterns**    | Different frameworks, different conventions; LLM learns local style                                          |
| **Data flow**        | Understanding "parse → validate → call external → return" requires semantic analysis                         |

---

## Storage & Efficiency

**Problem:** LLM extraction per symbol is expensive.

**Solutions:**

1. **Batch extraction:** Process 20 symbols per LLM call
2. **Lazy extraction:** Only extract for changed symbols per snapshot
3. **Confidence threshold:** Store confidence score; skip extraction if <0.6
4. **Caching:** Reuse templates from similar symbols
5. **Optional extraction:** Mark extraction as best-effort; don't fail snapshot if LLM call fails

---

## Updated Query Bundles

### getFeatureContext (Updated)

```json
{
  "feature": {...},
  "implementingSymbols": [
    {
      "name": "handlePayment",
      "codeTemplate": {
        "kind": "endpoint-handler",
        "steps": [...]
      },
      "errorHandling": {
        "strategy": "try-catch",
        "examples": [...]
      },
      "fieldMutations": [
        {"entity": "User", "field": "email", "operation": "READ"}
      ],
      "configVariables": ["STRIPE_API_KEY"],
      "externalServices": ["stripe"],
      "dataFlow": [...]
    }
  ]
}
```

**Agent now has everything to understand and replicate the feature safely.**

---

## References

- [Ingest Specification](../ingest_spec.md) – Integration point (§5.2, §5.4)
- [graph_schema_spec.md](../graph_schema_spec.md) – Storage
- [MISSING_CONTEXT_ANALYSIS.md](./MISSING_CONTEXT_ANALYSIS.md) – Why this is needed
