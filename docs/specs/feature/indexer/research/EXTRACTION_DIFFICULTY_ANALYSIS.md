# Texere Indexer – Nodes & Edges Extraction Difficulty Analysis

**Document Version:** 1.0  
**Status:** Extraction Strategy Reference  
**Last Updated:** December 2025

## Overview

This document organizes all graph nodes and edges by **extraction difficulty** and groups them by
**extraction step** in the ingest pipeline. It provides a roadmap for implementing language indexers
(TypeScript and Python) and understanding which extractions are deterministic vs. LLM-assisted.

---

## Table of Contents

1. [Extraction Groups (Difficulty-Ordered)](#extraction-groups-difficulty-ordered)
2. [Summary Table: Extraction Sequence](#summary-table-extraction-sequence)
3. [Key Implementation Insights](#key-implementation-insights)
4. [TS vs Python Implementation Notes](#ts-vs-python-implementation-notes)

---

## Extraction Groups (Difficulty-Ordered)

### GROUP 1: Foundation (Syntax-Based, Deterministic)

**Extraction Step:** AST parsing + Git metadata  
**Difficulty:** ⭐ Easy  
**Deterministic:** ✅ Yes  
**Language Coverage:** TS (full), Python (full)

#### Nodes

| Node         | Properties                                                                                                                                                       | Extraction Method                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Codebase** | `id`, `name`, `url`, `createdAt`, `updatedAt`                                                                                                                    | Git metadata (repo URL, ID)                                                                             |
| **Snapshot** | `id`, `codebaseId`, `commitHash`, `author`, `message`, `timestamp`, `branch`, `indexStatus`, `indexedAt`, `createdAt`                                            | Git commit info via `git log` and `git show`                                                            |
| **Module**   | `id`, `snapshotId`, `name`, `path`, `type`, `language`, `createdAt`                                                                                              | Directory structure inferred from file paths; Nx detection for type                                     |
| **File**     | `id`, `snapshotId`, `path`, `name`, `language`, `isTest`, `isDeleted`, `createdAt`                                                                               | File extension determines language; name patterns (\_.test.ts, test\_\_.py) determine `isTest`          |
| **Symbol**   | `id`, `snapshotId`, `filePath`, `name`, `kind`, `startLine`, `startCol`, `endLine`, `endCol`, `isExported`, `docstring`, `embeddingId`, `isDeleted`, `createdAt` | AST traversal to extract all definitions (functions, classes, methods, consts, types, interfaces, etc.) |

#### Edges

| Relationship                        | Direction           | Cardinality | Extraction Method             |
| ----------------------------------- | ------------------- | ----------- | ----------------------------- |
| `Codebase -[:CONTAINS]-> Snapshot`  | Bottom-up hierarchy | many-to-one | Git branch tracking           |
| `Snapshot -[:CONTAINS]-> Module`    | Bottom-up hierarchy | many-to-one | File path parsing             |
| `Module -[:CONTAINS]-> File`        | Bottom-up hierarchy | many-to-one | Directory nesting             |
| `File -[:IN_SNAPSHOT]-> Snapshot`   | Scoping             | many-to-one | Explicit scoping relationship |
| `Symbol -[:IN_SNAPSHOT]-> Snapshot` | Scoping             | many-to-one | Explicit scoping relationship |

#### Extraction Approach

**TypeScript:**

```
1. Parse file with TypeScript compiler API
2. Walk AST for:
   - FunctionDeclaration → kind: 'function'
   - ClassDeclaration → kind: 'class'
   - MethodSignature → kind: 'method'
   - VariableDeclaration → kind: 'const' | 'var' | 'let'
   - TypeAliasDeclaration → kind: 'type'
   - InterfaceDeclaration → kind: 'interface'
3. Extract JSDoc/comments as docstring
4. Extract export flag from modifiers
5. Store range: startLine, startCol, endLine, endCol from node position
```

**Python:**

```
1. Parse file with ast or libcst
2. Walk AST for:
   - FunctionDef → kind: 'function'
   - ClassDef → kind: 'class'
   - Assign (top-level) → kind: 'const'
3. Extract docstrings from nodes
4. Extract decorator info for export detection (optional)
5. Store line/column info from node
```

#### Notes

- Module type detection: Nx apps/libs vs standard folders
- Language detection: file extension (ts, tsx, js, py, etc.)
- Deterministic: Symbol IDs stable within snapshot:
  `snapshotId:filePath:symbolName:startLine:startCol`

---

### GROUP 2: Call Graph & References (Basic Static Analysis)

**Extraction Step:** Name resolution + reference tracking  
**Difficulty:** ⭐⭐ Medium  
**Deterministic:** ✅ Yes (best-effort; cross-file limited)  
**Language Coverage:** TS (good), Python (basic)

#### Nodes

- (Reuse Symbols from GROUP 1)

#### Edges

| Relationship                                         | Direction           | Type           | Cardinality  | Location Data             |
| ---------------------------------------------------- | ------------------- | -------------- | ------------ | ------------------------- |
| `Symbol -[:REFERENCES {type: 'CALL'}]-> Symbol`      | Call direction      | Call edge      | many-to-many | `filePath`, `line`, `col` |
| `Symbol -[:REFERENCES {type: 'REFERENCE'}]-> Symbol` | Reference direction | Type/const ref | many-to-many | `filePath`, `line`, `col` |

#### Extraction Approach

**TypeScript:**

```
FOR EACH symbol IN file.symbols:
  1. Walk symbol's body (if function/method/class)
  2. Find CallExpression nodes:
     - Resolve identifier name (e.g., "handlePayment")
     - Lookup symbol in scope (local, module-level, imported)
     - Create edge: symbol -[:REFERENCES {type: 'CALL'}]-> target
     - Store location: file path, line, col from CallExpression
  3. Find references (variable uses, type references):
     - Resolve identifier to symbol
     - Create edge: symbol -[:REFERENCES {type: 'REFERENCE'}]-> target
     - Store location

NOTES:
  - TS compiler API provides scope information
  - Cross-file references via import resolution (heuristic)
  - Type references harder; may require full type checking
```

**Python:**

```
FOR EACH symbol IN file.symbols:
  1. Walk symbol's body
  2. Find Call nodes:
     - Extract func attribute name (e.g., "handlePayment")
     - Lookup in module scope (simple name resolution)
     - Create edge if found
     - Store location: line, col from Call node
  3. Limited cross-file resolution (imports only)

NOTES:
  - libcst or ast module for parsing
  - Python's dynamic nature limits resolution
  - Best-effort: focus on function calls, not all references
```

#### Notes

- **Scope**: References within file or to imported symbols (limited cross-file in v1)
- **Renames**: If target symbol renamed, edge becomes stale (handled at write time)
- **Best-effort**: Missing some references is acceptable; false edges worse

---

### GROUP 3: Endpoints & Schema Entities (Framework-Specific Heuristics)

**Extraction Step:** Pattern matching + decorator/annotation parsing  
**Difficulty:** ⭐⭐ Medium  
**Deterministic:** ✅ Yes (heuristic patterns)  
**Language Coverage:** TS (full), Python (partial)

#### Nodes

| Node                  | Properties                                                                        | Extraction Method                                          |
| --------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Boundary**          | `id`, `snapshotId`, `verb`, `path`, `handlerSymbolId`, `description`, `createdAt` | Framework pattern matching (Express, Fastify, Flask, etc.) |
| **DataContract**      | `id`, `snapshotId`, `name`, `kind`, `description`, `createdAt`                    | ORM detection (Prisma, SQLAlchemy, TypeORM, etc.)          |
| **ThirdPartyLibrary** | `id`, `snapshotId`, `name`, `version`, `registry`, `createdAt`                    | Lockfile parsing (package-lock.json, poetry.lock, etc.)    |

#### Edges

| Relationship                                | Cardinality  | Extraction Method |
| ------------------------------------------- | ------------ | ----------------- |
| `Boundary -[:IN_SNAPSHOT]-> Snapshot`       | many-to-one  | Snapshot scoping  |
| `DataContract -[:IN_SNAPSHOT]-> Snapshot`   | many-to-one  | Snapshot scoping  |
| `Module -[:DEPENDS_ON]-> ThirdPartyLibrary` | many-to-many | Manifest parsing  |

#### Boundary Extraction

**TypeScript (Express/Fastify/SvelteKit):**

```
Patterns to match:
1. Express: app.get('/path', handler) | router.post('/path', handler)
   - Extract: verb from method name, path from string literal, handler from identifier

2. Fastify: fastify.get('/path', handler) | fastify.register(plugin)
   - Extract: same as Express

3. SvelteKit: export const GET = handler, export const POST = handler (in +page.ts)
   - Extract: verb from export name, path from file location (map directory to route)
   - Lookup handler symbol by name or inline function

4. Next.js API routes: export default handler (in pages/api/...)
   - Extract: verb from HTTP method detection (req.method comparison)
   - Path from file location

FOR EACH CallExpression matching app.VERB(path, handler):
  - Create Boundary node
  - Link to handler symbol via handlerSymbolId
  - Store verb, path, location
```

**Python (Flask/FastAPI):**

```
Patterns to match:
1. Flask: @app.route('/path', methods=['GET']) def handler()
   - Extract: decorator arguments for path, method list
   - Link to decorated function symbol

2. FastAPI: @app.get('/path') async def handler()
   - Extract: decorator method name (get, post) and path argument
   - Link to decorated function symbol

FOR EACH FunctionDef with decorator matching @app.VERB or @router.VERB:
  - Extract path from decorator argument
  - Extract verb from decorator method name
  - Create Boundary node
  - Link to function symbol
```

#### Schema Entity Extraction

**TypeScript (Prisma/TypeORM):**

```
1. Prisma:
    - Parse schema.prisma file separately (not code)
    - Extract model blocks → DataContract nodes
    - kind: 'prisma-model'

2. TypeORM:
   - Find class declarations with @Entity decorator
   - Extract class name → DataContract
   - kind: 'orm-entity'

3. Generic interfaces:
   - Look for /* @entity */ comment markers
   - Or use heuristic: interfaces named like data models (User, Product, etc.)
```

**Python (SQLAlchemy/Pydantic):**

```
1. SQLAlchemy:
   - Find class definitions extending declarative_base() or Base
   - Extract class name → DataContract
   - kind: 'orm-entity'

2. Pydantic:
   - Find class definitions extending BaseModel
   - Extract class name → DataContract
   - kind: 'orm-entity' (or 'pydantic-model')
```

#### Dependency Extraction

```
Parse lockfiles to extract installed versions:
  - package.json + package-lock.json → extract "name" + "version" from lock
  - pyproject.toml + poetry.lock → extract package + version from lock
  - Annotate with registry (npm, pypi, etc.)

Create Module -[:DEPENDS_ON]-> ThirdPartyLibrary edge for each dependency
```

#### Notes

- Endpoints: Handler symbol ID must exist in symbol registry
- Schema: Multiple detection methods; prefer explicit (decorators) over heuristic
- Dependencies: Always parse lockfile; package.json/pyproject.toml may be inconsistent

---

### GROUP 4: Test Cases (Test Pattern Matching)

**Extraction Step:** Test framework detection + name/location extraction  
**Difficulty:** ⭐⭐ Medium  
**Deterministic:** ✅ Yes (framework-specific patterns)  
**Language Coverage:** TS (full), Python (full)

#### Nodes

| Node         | Properties                                                               | Extraction Method            |
| ------------ | ------------------------------------------------------------------------ | ---------------------------- |
| **TestCase** | `id`, `snapshotId`, `filePath`, `name`, `kind`, `startLine`, `createdAt` | Test framework AST traversal |

#### Edges

| Relationship                          | Cardinality |
| ------------------------------------- | ----------- |
| `TestCase -[:IN_SNAPSHOT]-> Snapshot` | many-to-one |

#### Extraction Approach

**TypeScript (Vitest/Jest):**

```
1. Detect test file: matches *.test.ts, *.spec.ts pattern
2. Mark File.isTest = true
3. Walk AST for CallExpression patterns:
   - describe('...', () => { ... })
   - test('...', () => { ... })
   - it('...', () => { ... })
4. Build nested hierarchy:
   - Top-level: describe blocks
   - Nested: describe blocks within describe
   - Leaf: test/it calls
5. Construct full test name:
   - "Describe › Nested › should do X"
6. Infer kind from test location:
   - Location in __tests__/ → unit
   - Location in integration/ → integration
   - Location in e2e/ → e2e
   - Default: unit
```

**Python (pytest):**

```
1. Detect test file: matches test_*.py or *_test.py pattern
2. Mark File.isTest = true
3. Walk AST for:
   - test_FUNCTIONNAME() function definitions
   - class TestCLASSNAME with test_METHOD() methods
4. Build hierarchy:
   - Top-level: test functions and test classes
   - Nested: methods within test class
5. Construct full test name:
   - "test_payment" → "test_payment"
   - "TestPayment::test_create" → "TestPayment::test_create"
6. Infer kind from location (same heuristics as TS)
```

#### Notes

- Test name includes full hierarchy for precise identification
- `kind` classification is heuristic-based on file location
- startLine: line number of test/it/def (for navigation)

---

### GROUP 5: Test ↔ Feature & Boundary ↔ Feature Mapping (LLM-Assisted)

**Extraction Step:** Semantic matching via LLM  
**Difficulty:** ⭐⭐⭐ Hard (LLM-based, requires fallback)  
**Deterministic:** ❌ No (LLM; best-effort)  
**Language Coverage:** TS, Python (language-agnostic semantics)

#### Nodes

- (Reuse: TestCase, Boundary, Symbol, Feature from previous groups)

#### Edges

| Relationship                        | Cardinality  | Confidence Stored?            |
| ----------------------------------- | ------------ | ----------------------------- |
| `TestCase -[:VERIFIES]-> Feature`   | many-to-many | ✅ Yes: `confidence: 0.0–1.0` |
| `Boundary -[:IMPLEMENTS]-> Feature` | many-to-many | ✅ Yes: `confidence: 0.0–1.0` |
| `Symbol -[:IMPLEMENTS]-> Feature`   | many-to-many | ✅ Yes: `confidence: 0.0–1.0` |

#### Feature Source

Features are defined in a manual registry:

- **Source**: `features.yaml` at repo root (or config)
- **Format**: List of feature names + descriptions
- **Scope**: Cross-snapshot (persistent)

#### Test ↔ Feature Mapping

```
FOR EACH test in snapshot.tests:
  STEP 1 – Heuristic (high confidence):
    IF test.name CONTAINS feature.name (case-insensitive):
      Create TestCase -[:VERIFIES {confidence: 0.95}]-> Feature
      Continue to next test

  STEP 2 – Import analysis (medium confidence):
    IF test imports symbol that implements feature:
      Create TestCase -[:VERIFIES {confidence: 0.80}]-> Feature
      Continue to next test

  STEP 3 – LLM fallback (when uncertain):
    IF no match in steps 1–2:
      Send to LLM:
        "Test code: [test.sourceCode]
         Does this test verify the [feature.name] feature?
         Answer: yes/no/unclear"
      IF LLM says "yes":
        confidence = 0.70
      IF LLM says "unclear":
        confidence = 0.50
        (still create edge; agent can verify)
      IF LLM says "no":
        Skip (don't create edge)

DESIGN PRINCIPLE:
  - Missed links worse than false links
  - Generate plausible associations when uncertain (confidence 0.5+)
  - Agent can filter by confidence threshold when querying
```

#### Boundary ↔ Feature Mapping

```
FOR EACH endpoint in snapshot.endpoints:
  STEP 1 – Path heuristic (high confidence):
    IF endpoint.path CONTAINS feature.name:
      Create Boundary -[:IMPLEMENTS {confidence: 0.95}]-> Feature
      Continue to next endpoint

  STEP 2 – Handler symbol analysis:
    Handler symbol = lookup handlerSymbolId
    IF handler -[:IMPLEMENTS]-> feature (from GROUP 5 mapping):
      Create Boundary -[:IMPLEMENTS {confidence: 0.90}]-> Feature
      Continue to next endpoint

  STEP 3 – LLM fallback:
    IF no match in steps 1–2:
      Send to LLM:
        "Boundary: [verb] [path]
         Handler code: [handler.sourceCode]
         Which feature does this implement? (from list: [all feature names])
         Answer: [feature_name] or 'unclear'"
      IF LLM returns feature_name:
        confidence = 0.75
      IF LLM returns "unclear":
        Skip (don't create edge)
```

#### Error Handling

- **LLM failures** (timeout, error): Skip mapping for that test/endpoint; continue snapshot
- **Snapshot never fails** due to LLM errors
- **Design rule**: "_missed links are worse than bad links_" → prefer false positives over false
  negatives

---

### GROUP 6: Symbol Pattern Extraction (LLM-Assisted, Batch Processing)

**Extraction Step:** Code semantic analysis  
**Difficulty:** ⭐⭐⭐⭐ Very Hard (LLM per symbol; batch for efficiency)  
**Deterministic:** ❌ No (LLM; confidence scoring)  
**Language Coverage:** TS, Python (language-agnostic semantics)

#### Properties Added to Symbol Node

| Property           | Type   | Example                                                                      |
| ------------------ | ------ | ---------------------------------------------------------------------------- |
| `codeTemplate`     | object | `{ kind: 'endpoint-handler', steps: [...], errorHandling: {...} }`           |
| `fieldMutations`   | array  | `[{ entity: 'User', field: 'email', operation: 'WRITE', confidence: 0.95 }]` |
| `configVariables`  | array  | `[{ name: 'STRIPE_API_KEY', kind: 'secret', confidence: 0.90 }]`             |
| `externalServices` | array  | `[{ name: 'stripe', operations: [...], confidence: 0.85 }]`                  |
| `dataFlow`         | array  | `[{ stage: 1, name: 'Parse', input: '...', output: '...' }]`                 |

#### Extraction Approach: Code Template

**Problem:** Agent needs structure, not full code.

**LLM Prompt:**

```
Extract the implementation template from this function.
Replace specific values (variable names, strings, numbers) with placeholders.
Keep structure and control flow.
Highlight key steps: validation → external call → database update → response.

Function:
[symbol.sourceCode]

Output as JSON:
{
  "kind": "endpoint-handler" | "helper-function" | "validator" | "database-access",
  "steps": [
    { "name": "validate", "description": "...", "pattern": "..." },
    ...
  ],
  "errorHandling": {
    "type": "try-catch" | "throw" | "callback" | "promise-rejection",
    "logPattern": "...",
    "responsePattern": "..."
  },
  "externalServices": ["stripe", "auth0"],
  "confidence": 0.90
}
```

**Storage:** Add `codeTemplate` property to Symbol node

**Agent Usage:** Query similar symbols → copy template structure → fill in specifics

---

#### Extraction Approach: Field Mutations

**Problem:** Which fields of `User` does this symbol touch?

**LLM Prompt:**

```
Analyze this function and extract what fields it reads/writes from schema entities.

Function:
[symbol.sourceCode]

Related tests:
[related test code]

Output as JSON:
{
  "fieldMutations": [
    {
      "entity": "User",
      "field": "email",
      "operation": "READ" | "WRITE",
      "contexts": ["const email = user.email", "..."],
      "confidence": 0.95
    },
    ...
  ],
  "confidence": 0.95,
  "uncertainFields": []
}
```

**Storage:** Add `fieldMutations` array to Symbol node

**Agent Usage:** "When refactoring User → User + Profile, which symbols touch User.email? Query
symbols with `fieldMutations[*].field = 'email'`"

---

#### Extraction Approach: Configuration Variables

**Problem:** What environment variables does this symbol use?

**LLM Prompt:**

```
Extract environment variables and configuration access patterns from this code.

Code:
[symbol.sourceCode]

Output as JSON:
{
  "configVariables": [
    {
      "name": "STRIPE_API_KEY",
      "kind": "secret",
      "usage": "const client = new Stripe(process.env.STRIPE_API_KEY)",
      "isRequired": true,
      "confidence": 0.98
    },
    {
      "name": "LOG_LEVEL",
      "kind": "public",
      "usage": "if (process.env.LOG_LEVEL === 'debug')",
      "isRequired": false,
      "default": "info",
      "confidence": 0.90
    }
  ]
}
```

**Storage:** Add `configVariables` array to Symbol node

**Agent Usage:** "What secrets does the payment system need? Query symbols with
`configVariables[*].kind = 'secret'` and aggregate names"

---

#### Extraction Approach: External Services

**Problem:** How do we integrate with Stripe? Is there a pattern?

**LLM Prompt:**

```
Extract the integration pattern for external services from this code.

Code:
[symbol.sourceCode]

Output as JSON:
{
  "externalServices": [
    {
      "name": "Stripe",
      "operations": ["create_payment_intent", "retrieve_payment"],
      "clientInitialization": "const stripe = new Stripe(process.env.STRIPE_API_KEY)",
      "patterns": [
        {
          "operation": "create_payment_intent",
          "pattern": "await stripe.paymentIntents.create({ amount, currency })",
          "errorHandling": "catch (error) { logger.error(...) }"
        }
      ],
      "retry": { "strategy": "exponential-backoff", "maxRetries": 3 },
      "timeout": 5000,
      "confidence": 0.92
    }
  ]
}
```

**Storage:** Add `externalServices` array to Symbol node

**Agent Usage:** "Implementing Stripe integration: show me how we initialize Stripe client and call
create_payment_intent"

---

#### Extraction Approach: Data Flow

**Problem:** Agent needs to understand: "What data flows through this system?"

**LLM Prompt:**

```
Analyze the data flow from input to output in this handler.

Handler:
[symbol.sourceCode]

Output the data transformation pipeline as JSON:
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
    ...
  ],
  "confidence": 0.88
}
```

**Storage:** Add `dataFlow` array to Symbol node

**Agent Usage:** "Trace payment processing: parse request → call Stripe → update ledger → respond"

---

#### Batch Processing for Efficiency

**Problem:** LLM extraction per symbol is expensive.

**Solution:**

```
FOR EACH group_of_20_symbols IN changed_symbols:
  Send to LLM in single batch request:
    "Extract patterns from these 20 functions:
     [all 20 source codes]
     Return array of {symbolName, codeTemplate, fieldMutations, ...}"

  Process LLM response:
    FOR EACH symbolResult:
      IF confidence >= 0.6:
        Upsert Symbol node with extracted properties
      ELSE:
        Skip (don't store; retry on next indexing)

NOTES:
  - Lazy extraction: only process changed symbols per snapshot
  - Skip low-confidence results (<0.6) → retry next indexing
  - Never fail snapshot due to LLM errors
  - Cache results per symbol ID for reuse across snapshots
```

#### Notes

- **Confidence threshold**: Store only if `confidence >= 0.6`
- **Caching**: If symbol ID unchanged, reuse extraction from previous snapshot
- **Fallback**: Best-effort; missing patterns worse than inaccurate patterns

---

### GROUP 7: Documentation & Pattern Linking (Mixed Deterministic + LLM)

**Extraction Step:** File scanning + heuristic/LLM linking  
**Difficulty:** ⭐⭐⭐ Hard (name/content similarity; LLM for pattern matching)  
**Deterministic:** ❌ No (LLM; embeddings)  
**Language Coverage:** Language-agnostic (markdown/doc scanning)

#### Nodes

| Node           | Properties                                                                                    | Extraction Method                                 |
| -------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **SpecDoc**    | `id`, `snapshotId`, `path`, `name`, `kind`, `content` (first 5KB), `embeddingId`, `createdAt` | Scan `docs/` for markdown/ADR/design-doc files    |
| **StyleGuide** | `id`, `name`, `description`, `appliesTo` (module patterns)                                    | Scan `docs/style-guides/` or tagged docs          |
| **Pattern**    | `id`, `name`, `description`, `source` ('manual' or 'heuristic'), `createdAt`                  | Manual registry (patterns.yaml) or LLM-discovered |

#### Edges

| Relationship                             | Cardinality  | Inference                            |
| ---------------------------------------- | ------------ | ------------------------------------ |
| `SpecDoc -[:DOCUMENTS]-> Feature`        | many-to-many | Name/content similarity + embeddings |
| `SpecDoc -[:DOCUMENTS]-> Boundary`       | many-to-many | Content matching                     |
| `SpecDoc -[:DOCUMENTS]-> Symbol`         | many-to-many | Explicit tagging or semantic match   |
| `SpecDoc -[:DOCUMENTS]-> Module`         | many-to-many | Via tagging in doc                   |
| `StyleGuide -[:APPLIES_TO]-> Module`     | many-to-many | Tagging or path patterns             |
| `StyleGuide -[:REFERENCES]-> Pattern`    | many-to-many | Explicit tagging                     |
| `Symbol -[:FOLLOWS_PATTERN]-> Pattern`   | many-to-many | Heuristic + LLM                      |
| `Boundary -[:FOLLOWS_PATTERN]-> Pattern` | many-to-many | Heuristic + LLM                      |

#### SpecDoc Discovery & Linking

```
STEP 1 – Scan docs/:
  FOR EACH markdown file in docs/:
    Create SpecDoc node
    Extract title (# heading) as name
    Infer kind from path: docs/specs/ → 'spec', docs/adr/ → 'adr', etc.
    Store first 5KB of content
    Generate embedding for content

STEP 2 – SpecDoc ↔ Feature linking (embeddings + name):
  FOR EACH SpecDoc, Feature:
    IF SpecDoc.name CONTAINS Feature.name (case-insensitive):
      Create SpecDoc -[:DOCUMENTS]-> Feature
      confidence = 0.95
    ELSE:
      Compute embedding distance (cosine similarity)
      IF similarity > 0.8:
        Create SpecDoc -[:DOCUMENTS]-> Feature
        confidence = similarity

STEP 3 – SpecDoc ↔ Boundary linking (content):
  FOR EACH SpecDoc:
    Extract verb + path patterns from content
    IF pattern matches Boundary:
      Create SpecDoc -[:DOCUMENTS]-> Boundary

STEP 4 – SpecDoc ↔ Module linking (tagging):
  FOR EACH SpecDoc:
    IF document contains metadata: "appliesTo: [module-list]"
      Create SpecDoc -[:DOCUMENTS]-> Module for each
```

#### StyleGuide Discovery & Linking

```
STEP 1 – Scan style guides:
  FOR EACH file in docs/style-guides/ or tagged with @style-guide:
    Create StyleGuide node

STEP 2 – StyleGuide ↔ Module:
  FROM metadata in document: "appliesTo: apps/agent-orchestrator, packages/indexer"
    Create StyleGuide -[:APPLIES_TO]-> Module for each

STEP 3 – StyleGuide ↔ Pattern:
  FROM metadata in document: "patterns: error-handling-v2, logging-structured"
    Create StyleGuide -[:REFERENCES]-> Pattern for each

NOTES:
  - Metadata format: YAML front matter or explicit comments in doc
  - Tagging vs heuristic: explicit tags preferred
```

#### Pattern Linking (Heuristic + LLM)

```
STEP 1 – Manual patterns (deterministic):
  Load patterns.yaml (if exists):
    List of known patterns with descriptions
    Create Pattern nodes manually

STEP 2 – Link symbols to patterns (heuristic):
  FOR EACH Symbol with specific characteristics:
    IF symbol matches pattern heuristic:
      Create Symbol -[:FOLLOWS_PATTERN]-> Pattern
      Examples:
        - Symbol named *Middleware* → follows 'express-middleware' pattern
        - Symbol with try-catch + logger → follows 'error-handling-try-catch' pattern

STEP 3 – LLM pattern matching (when uncertain):
  FOR EACH Symbol without matched patterns:
    Send to LLM:
      "Code: [symbol.sourceCode]
       Known patterns: [list of pattern names + descriptions]
       Does this code follow any of these patterns?
       Answer: [pattern_name] or 'none'"
    IF LLM returns pattern_name:
      Create Symbol -[:FOLLOWS_PATTERN]-> Pattern
      confidence = 0.75

STEP 4 – Link endpoints to patterns (same flow):
  Same as symbols, but for Boundary handler symbols
```

#### Notes

- **Embeddings**: Store `embeddingId` for Qdrant vector similarity
- **Tagging**: Explicit metadata > name heuristic > embedding distance
- **Pattern confidence**: Heuristic > LLM; store on edge

---

### GROUP 8: Snapshots & Evolution (Git + Graph Semantics)

**Extraction Step:** Diff comparison + incremental graph management  
**Difficulty:** ⭐⭐⭐ Hard (Git diff logic + incremental semantics)  
**Deterministic:** ✅ Yes (Git is truth)  
**Language Coverage:** Language-agnostic

#### Edges

| Relationship                           | Cardinality  | Inference                   |
| -------------------------------------- | ------------ | --------------------------- |
| `Symbol -[:INTRODUCED_IN]-> Snapshot`  | many-to-one  | Git diff (first occurrence) |
| `Symbol -[:MODIFIED_IN]-> Snapshot`    | many-to-many | Git diff (changes)          |
| `Feature -[:INTRODUCED_IN]-> Snapshot` | many-to-one  | Graph analysis              |
| `Feature -[:MODIFIED_IN]-> Snapshot`   | many-to-many | Graph analysis              |
| `Incident -[:CAUSED_BY]-> Symbol`      | many-to-many | Manual mapping              |
| `Incident -[:AFFECTS]-> Feature`       | many-to-many | Manual mapping              |

#### Incremental Indexing & Snapshot Evolution

```
FOR EACH new snapshot:
  STEP 1 – Git diff:
    Compare snapshot.commitHash with parent.commitHash
    Result: {added: [...], modified: [...], deleted: [...], renamed: [...]}

  STEP 2 – Index only changed files:
    FOR EACH file in added ∪ modified:
      Run language indexer → FileIndexResult
    FOR EACH file in deleted:
      Mark File.isDeleted = true in graph
    FOR EACH file in renamed:
      Treat as: delete old + add new (no continuity in v1)

  STEP 3 – Track symbol introductions:
    FOR EACH new symbol in changed files:
      Create Symbol -[:INTRODUCED_IN]-> snapshot

  STEP 4 – Track symbol modifications:
    FOR EACH modified symbol (same ID, different properties):
      Create Symbol -[:MODIFIED_IN]-> snapshot

  STEP 5 – Feature evolution:
    FOR EACH feature with changed implementing symbols:
      Create Feature -[:MODIFIED_IN]-> snapshot
      (if first snapshot for feature: Feature -[:INTRODUCED_IN]-> snapshot)

  STEP 6 – Reuse unchanged:
    Files not in diff → reuse prior graph state
    (no new edges, no new symbols)
```

#### Querying Snapshot History

```
EXAMPLES for agents:

1. "Show me all modifications to the auth symbol":
   MATCH (s:Symbol {name: 'authenticateToken'})
   OPTIONAL MATCH (s)-[:INTRODUCED_IN]->(snap1:Snapshot)
   OPTIONAL MATCH (s)-[:MODIFIED_IN]->(snap2:Snapshot)
   ORDER BY snap.timestamp
   RETURN s, snap1, snap2

2. "What features were affected in the payment incident?":
   MATCH (i:Incident {id: 'payment-token-bug'})
   OPTIONAL MATCH (i)-[:AFFECTS]->(f:Feature)
   OPTIONAL MATCH (f)-[:MODIFIED_IN]->(snap:Snapshot)
   RETURN f, snap

3. "Incident chain: symbol → feature impact":
   MATCH (i:Incident)
   OPTIONAL MATCH (i)-[:CAUSED_BY]->(sym:Symbol)
   OPTIONAL MATCH (sym)-[:MODIFIED_IN]->(snap:Snapshot)
   OPTIONAL MATCH (sym)-[:IMPLEMENTS]->(feat:Feature)
   OPTIONAL MATCH (feat)-[:MODIFIED_IN]->(snap2:Snapshot)
   RETURN i, sym, snap, feat, snap2
```

#### Notes

- **Incremental only**: Only reindex diff files; unchanged files reuse state
- **Rename semantics**: Delete old + add new (no continuity tracking in v1)
- **Snapshot retention** (from ingest_spec §3.1):
  - Own repos: latest commit per configured branch
  - Dependencies: exact versions from lockfiles only

---

### GROUP 9: Third-Party & External Services (Manifest + LLM)

**Extraction Step:** Dependency parsing + service discovery  
**Difficulty:** ⭐⭐ Medium-Hard  
**Deterministic:** ✅ Mostly (lockfile parsing deterministic; service discovery heuristic + LLM)  
**Language Coverage:** TS, Python (language-agnostic for dependencies)

#### Nodes

| Node                                           | Properties                                                                     | Extraction Method   |
| ---------------------------------------------- | ------------------------------------------------------------------------------ | ------------------- |
| **ThirdPartyLibrary** (GROUP 3, enhanced here) | `id`, `snapshotId`, `name`, `version`, `registry`, `createdAt`                 | Lockfile parsing    |
| **ExternalService**                            | `id`, `name`, `description`, `url`, `integrationPatterns`, `createdAt`         | Code analysis + LLM |
| **ConfigurationVariable**                      | `id`, `name`, `module`, `secret`, `defaultValue`, `documentation`, `createdAt` | Code scanning + LLM |

#### Edges

| Relationship                                            | Cardinality  | Inference            |
| ------------------------------------------------------- | ------------ | -------------------- |
| `Symbol -[:USES_CONFIG]-> ConfigurationVariable`        | many-to-many | Code scanning + LLM  |
| `Boundary -[:CALLS]-> ExternalService`                  | many-to-many | Heuristic + LLM      |
| `ExternalService -[:HAS_INTEGRATION_PATTERN]-> Pattern` | many-to-many | LLM + manual tagging |

#### ThirdPartyLibrary Extraction (from GROUP 3, repeated for completeness)

```
Parse lockfiles:
  1. TypeScript/Node:
     - Parse package-lock.json (or pnpm-lock.yaml, yarn.lock)
     - Extract "name" + "version" + "resolved" (registry URL)
     - Create ThirdPartyLibrary node per installed package

  2. Python:
     - Parse poetry.lock or requirements.txt
     - Extract package + version
     - Infer registry (pypi, custom, etc.)

Create edge:
  Module -[:DEPENDS_ON]-> ThirdPartyLibrary
  (for each module referencing the package)

NOTE: Only store versions actually used in lockfile
      Not versions in package.json (which may be stale)
```

#### ExternalService Discovery

```
STEP 1 – Known services (heuristic):
  Scan code for imports of known API clients:
    - import Stripe from 'stripe'
    - import Auth0 from 'auth0'
    - from sendgrid import SendGridAPIClient

  Create ExternalService node if not exists
  Infer from library name (Stripe client → Stripe service)

STEP 2 – Unknown services (LLM):
  FOR EACH Symbol with HTTP client usage (fetch, axios, requests):
    Send to LLM:
      "Code: [symbol.sourceCode]
       This code makes HTTP calls to what external service?"
    IF LLM returns service name:
      Create ExternalService node
      Store name + confidence

STEP 3 – Link to symbols:
  FOR EACH Symbol calling external service:
    Create Boundary -[:CALLS]-> ExternalService
    or Symbol -[:CALLS]-> ExternalService (if not endpoint)

STEP 4 – Extract integration patterns (GROUP 6 style):
  Send to LLM:
    "How does this code integrate with Stripe?
     Show: client initialization, operations, error handling, retry logic"

  Store on ExternalService:
    integrationPatterns: {
      clientInit: "...",
      operations: [...],
      retryStrategy: "...",
      timeout: 5000
    }
```

#### ConfigurationVariable Extraction

```
STEP 1 – Scan for environment variable access:
  FOR EACH Symbol:
    Scan for patterns:
      - process.env.STRIPE_API_KEY (TS/JS)
      - os.getenv('STRIPE_API_KEY') (Python)
      - app.config['STRIPE_API_KEY'] (Flask)

STEP 2 – LLM semantic analysis (for complex cases):
  IF heuristic misses configuration:
    Send to LLM:
      "Code: [symbol.sourceCode]
       What configuration/environment variables does this use?"
    LLM returns: [{name, kind, isRequired, default}]

STEP 3 – Create ConfigurationVariable node:
  id: config var name (e.g., "STRIPE_API_KEY")
  secret: boolean (heuristic: contains "KEY", "SECRET", "PASSWORD" → true)
  defaultValue: extracted default (if present)
  documentation: from comments or LLM description

STEP 4 – Link to symbols:
  Symbol -[:USES_CONFIG]-> ConfigurationVariable
  Store edge properties: isRequired, default, kind
```

#### Integration Patterns (from GROUP 6, enhanced)

```
FOR EACH ExternalService:
  Extract integration pattern (via GROUP 6 LLM process):
    - How to initialize client
    - What operations are available
    - Error handling conventions
    - Retry/timeout strategies
    - Example usage patterns

  Store on ExternalService node:
    integrationPatterns: {
      clientInit: string,
      operations: [{name, pattern, errorHandling}],
      retryStrategy: string,
      timeout: number
    }

AGENT USAGE:
  "Implementing Stripe: show me integrationPatterns for Stripe service"
  Agent sees: clientInit, example operations, retry strategy
  Agent replicates pattern in new code
```

#### Notes

- **ExternalServices**: Some discovered heuristically (known libraries), others via LLM
- **ConfigurationVariables**: Secret detection heuristic; LLM for complex configs
- **Integration patterns**: Expensive to extract (per service, not per symbol); cache heavily
- **Dependencies**: Always parse lockfile; it's source of truth for installed versions

---

## Summary Table: Extraction Sequence

| Phase | Groups                  | Dependencies | Deterministic | Run Time (est.) | Notes                                         |
| ----- | ----------------------- | ------------ | ------------- | --------------- | --------------------------------------------- |
| **1** | GROUP 1                 | None         | ✅ Yes        | ~10s            | AST parsing + Git metadata; foundation        |
| **2** | GROUP 2, 3, 4           | GROUP 1      | ✅ Yes        | ~30s            | Static analysis; call graph, endpoints, tests |
| **3** | GROUP 8                 | GROUP 1      | ✅ Yes        | ~5s             | Git diff; incremental tracking                |
| **4** | GROUP 5, 7, 9 (partial) | GROUP 1–3    | ❌ LLM        | ~60s            | Semantic matching; heuristic fallbacks        |
| **5** | GROUP 6, 9 (full)       | GROUP 1–4    | ❌ LLM        | ~120s           | Batch LLM extractions; confidence scoring     |

**Total for medium repo (100 files, 500 symbols)**: ~3–5 minutes per snapshot  
**Parallelizable**: Groups 1–4 per-file; GROUP 5 aggregated; GROUP 6 in batches

---

## Key Implementation Insights

### 1. Extraction Layering

Extract in this order:

1. **Syntax** (AST): Nodes, basic relationships
2. **References** (Name resolution): Call graph
3. **Frameworks** (Heuristics): Endpoints, schemas, tests
4. **Semantics** (LLM): Feature mapping, pattern extraction
5. **Evolution** (Git): Snapshot history, incremental tracking

Each layer **builds on prior layers**; don't skip.

### 2. LLM Usage is Isolated

Groups 5, 6, 7, 9 use LLM, but:

- **Never block snapshot** on LLM failures
- **Skip only affected mapping**, continue indexing
- Store **confidence scores** on all edges
- Use **heuristics first**, LLM as fallback

### 3. Batch Processing for Efficiency

- GROUP 2 (call graph): Per-file, parallel
- GROUP 6 (patterns): Batch 20 symbols per LLM call
- GROUP 5 (feature mapping): Aggregate per snapshot, then LLM

### 4. Incremental Semantics

- **Per snapshot, not full reindex**: Only changed files
- **Snapshot retention**: Own repos (latest/branch), dependencies (lockfile versions only)
- **Renames**: Delete + add (no continuity)
- **Deletion**: Mark `isDeleted: true`, never hard-delete

### 5. TS vs Python Capability Gap

**TypeScript:**

- Full AST, good call resolution, clear decorators, endpoints (Express/Fastify/SvelteKit)
- LLM extractions: Same as Python, but code is cleaner/type-safe → higher confidence

**Python:**

- Basic AST, limited call resolution, decorators ok, endpoints (Flask/FastAPI)
- LLM extractions: Same prompts, but code may be more dynamic → lower confidence
- **v1 limitation**: "basic analysis only" per ingest_spec §1.2A

---

## TS vs Python Implementation Notes

### TypeScript Implementation

**Strengths:**

- TypeScript compiler API gives full type + symbol information
- Decorators (@Entity, @Route) are explicit
- ESM imports are well-structured
- Test frameworks (Vitest/Jest) are consistent

**Implementation approach:**

- Use `ts.createSourceFile()` + visitor pattern for AST
- `ts.TypeChecker` for type resolution
- Manually walk import chains for cross-file references
- Framework detection via AST (app.get, @route, etc.)

**Output quality:** High confidence for most extractions (GROUP 1–4)

### Python Implementation

**Strengths:**

- `ast` or `libcst` modules work well for basic analysis
- Decorators (@app.route) are explicit
- `pytest` test patterns are consistent

**Weaknesses:**

- No static type system → harder field-level tracking
- Dynamic imports (`importlib`) harder to resolve
- Flask's request object is implicit (agent reads context)

**Implementation approach:**

- Use `ast.parse()` + visitor for AST
- Manual import resolution (limited to direct imports)
- Heuristic for decorators, function calls
- Fallback to LLM for uncertain references

**Output quality:** Lower confidence for GROUP 2–3; compensate with LLM in GROUP 5–6

### Shared Considerations

- **Lockfile parsing**: Same approach for both (pkg-lock.json vs poetry.lock)
- **Endpoints**: Different patterns per framework; hard-code framework detection
- **LLM extractions**: Language-agnostic (prompts work for both)
- **Test detection**: Both use file naming patterns + AST

---

## References

- [ingest_spec.md](../ingest_spec.md) – Core ingest pipeline
- [graph_schema_spec.md](../graph_schema_spec.md) – Node/edge definitions
- [LLM_EXTRACTION_PATTERNS.md](./LLM_EXTRACTION_PATTERNS.md) – Detailed extraction patterns
- [AGENT_CONTEXT_EXAMPLES.md](./AGENT_CONTEXT_EXAMPLES.md) – Query examples
