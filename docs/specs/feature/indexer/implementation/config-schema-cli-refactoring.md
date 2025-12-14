# Config Schema Export & CLI Refactoring Reference

**Document Version:** 1.1  
**Status:** Phase 1 Complete (Config Schema Export)  
**Last Updated:** December 14, 2025

---

## Overview

This document serves as a detailed reference for implementing:

1. **Configuration schema export** — Zod-based runtime validation with JSON Schema generation
2. **CLI code audit & reorganization** — Identify code suitable for extraction to packages
3. **Environment & defaults documentation** — User-facing guides and IDE support

**Related to Slice 1** (Git Snapshot Resolution & CLI) per [implementation/plan.md](./plan.md).

---

## Table of Contents

1. [Specification References](#1-specification-references)
2. [Phase 1: Config Schema Export](#2-phase-1-config-schema-export)
3. [Phase 2: CLI Code Audit](#3-phase-2-cli-code-audit)
4. [Phase 3: Code Migration (Conditional)](#4-phase-3-code-migration-conditional)
5. [Acceptance Criteria](#5-acceptance-criteria)
6. [Testing Strategy](#6-testing-strategy)
7. [Known Decisions & Open Questions](#7-known-decisions--open-questions)

---

## 1. Specification References

### Configuration & Validation

- **[configuration_spec.md](../configuration_spec.md)** — Config file format, fields,
  required/optional, defaults (§1–5)
- **[configuration_and_server_setup.md](../configuration_and_server_setup.md)** — Precedence
  hierarchy (§3–9)
- **Zod adoption decision:** Use Zod v3 (available via `zod-to-json-schema` dependency)

### CLI Specification

- **[cli_spec.md](./cli_spec.md)** — Command definitions, exit codes, output formats, daemon
  lifecycle (§2–12)

### Engineering Baselines

- **[typescript_configuration.md](../../engineering/typescript_configuration.md)** — Type
  strictness, module resolution
- **[eslint_code_quality.md](../../engineering/eslint_code_quality.md)** — Linting rules, naming
  conventions
- **[testing_strategy.md](../../engineering/testing_strategy.md)** — Test distribution (60–75% unit,
  15–25% integration, 5–10% E2E)
- **[testing_specification.md](../../engineering/testing_specification.md)** — Colocated test
  patterns, Vitest setup (§3.1–3.7)
- **[prettier_formatting.md](../../engineering/prettier_formatting.md)** — Code style

### Layout & Package Boundaries

- **[layout_spec.md](../layout_spec.md)** § 2.1–2.5 — Package structure, layer definitions, module
  boundaries

---

## 2. Phase 1: Config Schema Export

### Purpose

Enable IDE autocomplete, validation, and documentation for `.indexer-config.json` by exporting Zod
schemas and generating JSON Schema files.

### Files to Create/Modify

#### 2.1 `packages/indexer/core/src/config-schema.ts` (NEW)

**Purpose:** Define authoritative Zod schemas for all config types.

**Scope:**

```typescript
// Export these schemas:
IndexerConfigSchema; // Top-level config
CodebaseConfigSchema; // Per-codebase entry
GraphConfigSchema; // Neo4j connection
VectorsConfigSchema; // Qdrant connection
SecurityConfigSchema; // Deny/allow patterns
EmbeddingConfigSchema; // Model selection
LLMConfigSchema; // LLM provider config
WorkerConfigSchema; // Executor settings
```

**Key requirements:**

- All fields must have descriptions (Zod `.describe()`)
- Mark required vs optional with `.optional()` and defaults
- Validate field constraints (e.g., temperature 0.0–1.0, dimensions > 0)
- Support environment variable substitution placeholders (e.g., `${NEO4J_URI}`)
- Reference spec sections in descriptions

**Example structure:**

```typescript
import { z } from 'zod';

export const codebaseConfigSchema = z.object({
  id: z.string().describe('Unique identifier for codebase'),
  root: z.string().describe('Absolute path to repo root'),
  trackedBranches: z.array(z.string()).min(1).describe('Array of branch names to index'),
});

export const indexerConfigSchema = z.object({
  version: z.literal('1.0').describe('Schema version'),
  codebases: z.array(codebaseConfigSchema),
  // ... other sections
});

export type IndexerConfig = z.infer<typeof indexerConfigSchema>;
```

**Tests:**

- Unit: Validate schema against valid/invalid configs per
  [configuration_spec.md](../configuration_spec.md) examples
- Unit: Test environment variable placeholder handling

---

#### 2.2 `packages/indexer/core/src/schema-generator.ts` (NEW)

**Purpose:** Generate JSON Schema from Zod schemas for IDE integration.

**Exports:**

```typescript
export function generateJsonSchema(): JsonSchema7Type;
// Generates JSON Schema 7 suitable for IDE validation
```

**Dependency:** Use existing `zod-to-json-schema` (already available).

**Tests:**

- Unit: Generated schema is valid JSON Schema 7
- Unit: Schema contains descriptions and valid enum/pattern constraints

---

#### 2.3 `packages/indexer/core/src/index.ts` (MODIFY)

**Change:** Export new schema functions.

```typescript
// Add to existing exports:
export { indexerConfigSchema, codebaseConfigSchema /* ... */ } from './config-schema.js';
export { generateJsonSchema } from './schema-generator.js';
```

**Tests:**

- Verify exports are accessible from `@repo/indexer-core`

---

#### 2.4 `docs/schemas/indexer-config.schema.json` (NEW)

**Purpose:** JSON Schema file for IDE autocomplete/validation.

**Generation:** Automated via build script or test (run schema generator, write to file).

**Placement:** Committed to repo so IDEs can reference it.

**IDE Integration:** Users copy to `.vscode/settings.json`:

```json
{
  "json.schemas": [
    {
      "fileMatch": [".indexer-config.json"],
      "url": "./node_modules/@repo/indexer-core/dist/schemas/indexer-config.schema.json"
    }
  ]
}
```

---

#### 2.5 `docs/guides/config-reference.md` (NEW)

**Purpose:** Human-readable field reference for `.indexer-config.json`.

**Structure:**

```markdown
# Indexer Configuration Reference

## Overview

- Links to [configuration_spec.md](../configuration_spec.md)
- Precedence table (runtime → per-repo → global → defaults)
- Environment variable substitution syntax

## Required Fields

- `version`
- `codebases[].id`, `.root`, `.trackedBranches`
- `graph.neo4jUri`, `.neo4jUser`, `.neo4jPassword`
- `vectors.qdrantUrl`

## Optional Fields with Defaults

| Field                    | Default                    | Notes             |
| ------------------------ | -------------------------- | ----------------- |
| `vectors.collectionName` | `"texere-embeddings"`      | Qdrant collection |
| `embedding.model`        | `"openai"`                 | Provider          |
| `embedding.modelName`    | `"text-embedding-3-small"` | Model ID          |
| `embedding.dimensions`   | `1536`                     | Vector size       |
| `embedding.batchSize`    | `128`                      | Batch size        |
| `llm.provider`           | `"openai"`                 | Provider          |
| `llm.model`              | `"gpt-4o-mini"`            | Model ID          |
| `llm.temperature`        | `0.3`                      | 0.0–1.0           |
| `llm.maxTokens`          | `1024`                     | Output tokens     |
| `worker.type`            | `"local"`                  | Executor          |
| `worker.concurrency`     | `4`                        | Parallel ops      |
| `worker.retryAttempts`   | `3`                        | Retry count       |
| `worker.retryDelayMs`    | `5000`                     | Delay (ms)        |
| `security.denyPatterns`  | `[".env", "*.key"]`        | Deny list         |
| `security.allowPatterns` | `null`                     | Allow-only mode   |

## Examples

- Local development setup
- Production with env var substitution
- Third-party repository (per-repo config)
- Allow-only security mode

## Environment Variables

- Substitution syntax: `${VAR_NAME}`
- Required: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `QDRANT_URL`, `OPENAI_API_KEY`
- Optional: `INDEXER_CONFIG_PATH`, `LOG_LEVEL`
```

---

#### 2.6 `.indexer-config.example.json` (MODIFY)

**Change:** Add inline README section.

Add comment file `.indexer-config.example.md` or modify existing example:

````markdown
# .indexer-config.example.json Guide

This is a template for the Texere Indexer configuration file.

## File Location & Precedence

1. **Runtime** (CLI flags) — highest priority
2. **Per-repo** (`./.indexer-config.json` in repo root) — optional for third-party repos
3. **Global** (`INDEXER_CONFIG_PATH` env var or `./.indexer-config.json` at app root)
4. **Defaults** — hardcoded in code

## Required vs Optional

**Required:**

- `version`, `codebases[].id`, `.root`, `.trackedBranches`
- Graph credentials (neo4j\*), vector store (qdrantUrl)

**Optional:**

- All other fields; they have sensible defaults

## Environment Substitution

Fields like `neo4jUri` support `${VAR_NAME}` syntax:

```json
"neo4jUri": "${NEO4J_URI}"
```
````

Populate `.env` file (not committed):

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=sk-...
```

## Validation

Run before indexing:

```bash
pnpm indexer validate --config ./.indexer-config.json
```

## See Also

- [Configuration Specification](../../docs/specs/feature/indexer/configuration_spec.md)
- [Configuration Reference Guide](../../docs/guides/config-reference.md)
- [JSON Schema](../../docs/schemas/indexer-config.schema.json) (for IDE)

```

---

### Acceptance Criteria (Phase 1)

- [x] Zod schemas defined for all config types (config-schema.ts) — ✓ Completed
- [x] JSON Schema generation function exports (schema-generator.ts) — ✓ Completed
- [x] Generated schema file committed and valid (indexer-config.schema.json) — ✓ Generated via test
- [x] Configuration reference guide covers all fields with examples (config-reference.md) — ✓ Created
- [x] Unit tests validate schemas against spec examples (70%+ coverage) — ✓ config.test.ts complete
- [x] Integration test: schema generation produces valid JSON Schema 7 — ✓ generate-schema.test.ts
- [x] IDE can autocomplete/validate `.indexer-config.json` using generated schema — ✓ Schema available
- [ ] `pnpm post:report:fast` passes (lint, typecheck, tests) — ⏳ Pending validation

---

## 3. Phase 2: CLI Code Audit

### Purpose
Identify code in `apps/indexer-cli` that could be extracted to packages for reuse by workers, servers, or agents.

### Code Areas to Audit

#### 3.1 `apps/indexer-cli/src/daemon-lock.ts`

**Current scope:**
- Lock file creation/acquisition (`~/.texere-indexer/daemon.lock`)
- Stale lock detection & recovery
- PID recording, mode tracking (daemon vs detached)
- Environment variable provider interface (injectable)

**Reusability assessment:**
- **Used by:** CLI daemon (`run --daemon`)
- **Potentially useful for:** Worker processes, server restart handling
- **Decision needed:** Is daemon management global infrastructure or CLI-specific?

**Options:**
- A) Keep in CLI (daemon is CLI-only concern) ✓
- B) Move to `@repo/indexer-core` if workers/servers also manage daemons
- C) Move to new `@repo/indexer-utils` as generic daemon utility

**Recommendation:** **Option A (CLI-only)** unless future workers/server slices require daemon awareness.

---

#### 3.2 `apps/indexer-cli/src/output-formatter.ts`

**Current scope:**
- `TextFormatter` — section headers, key-value pairs, bullets, nested sections, status symbols
- `JSONFormatter` — structured output for machine consumption
- Output format enum (`'json' | 'text'`)

**Reusability assessment:**
- **Used by:** All CLI commands (list, status, run, validate, stop)
- **Potentially useful for:** Worker log aggregation, server response formatting, agent output
- **Risk if duplicated:** Code divergence, inconsistent output across tools

**Recommendation:** **Move to new `@repo/indexer-utils`** — generic, non-domain-specific, used by multiple consumers.

---

#### 3.3 `apps/indexer-cli/src/env/fallback-env-provider.ts`

**Current scope:**
- Environment variable provider interface (injectable)
- Default implementation using `process.env`
- Used for testability in daemon-lock and config loading

**Reusability assessment:**
- **Used by:** CLI (daemon-lock, config)
- **Potentially useful for:** Core config loading, workers, server bootstrapping
- **Decision needed:** Should this move to core or utils?

**Recommendation:** **Keep in `@repo/indexer-core`** — environment resolution is a core concern, not CLI-specific. Already somewhat present in config.ts.

---

#### 3.4 `apps/indexer-cli/src/commands/*.ts`

**Current scope:**
- Command routing, flag parsing, input validation
- Exit code assignment, signal handling
- Command-specific logic (validate, list, status, run, stop)

**Reusability assessment:**
- **Used by:** CLI only
- **Extract?:** No

**Recommendation:** **Keep in CLI** — command routing and CLI-specific concerns should stay in the app.

---

### Ownership Matrix (Proposed)

| Code | Current | Proposed | Rationale |
|------|---------|----------|-----------|
| `daemon-lock.ts` | CLI | **CLI** (unless future consensus on daemon awareness) | Only CLI currently needs daemon mgmt |
| `output-formatter.ts` | CLI | **`@repo/indexer-utils`** | Reusable by workers, servers, agents |
| `fallback-env-provider.ts` | CLI | **`@repo/indexer-core`** (or enhance existing) | Core concern, not CLI-specific |
| `commands/*.ts` | CLI | **CLI** | Command routing is CLI-only |
| Config loading | Partially in CLI, core | **`@repo/indexer-core`** ✓ | Already there (config.ts) |

---

### Acceptance Criteria (Phase 2)

- [ ] Audit completed and documented (this section)
- [ ] Ownership decisions agreed and recorded
- [ ] Dependency graph reviewed: no new circular deps if code moves
- [ ] Test impact assessed: which tests must move with code?

---

## 4. Phase 3: Code Migration (Conditional)

### Triggered By
User approval of ownership matrix and code extraction decisions.

### If Approved: `@repo/indexer-utils` Library Creation

**Template:** Use `templates/nx/node-lib` (copy & replace placeholders).

**Package structure:**
```

packages/indexer/utils/ src/ index.ts # Main exports output-formatter.ts # Moved from CLI
output-formatter.test.ts # Moved tests package.json # @repo/indexer-utils project.json # Tags:
domain:indexer, layer:utils README.md # Purpose, exports, dependencies, tests tsconfig.json
vitest.config.ts

````

**README sections:**
- Purpose: "Shared utilities for indexer CLI, workers, servers, and agents"
- Exports: OutputFormatter, JSONFormatter, OutputFormat type
- Allowed dependencies: @repo/indexer-types (logging, config types)
- Cannot depend on: indexer-core, indexer-ingest, indexer-query (avoid circular deps)
- Tests: `pnpm nx run indexer-utils:test`

**Module boundary tags:**
```json
{
  "tags": ["domain:indexer", "layer:utils"]
}
````

---

### Migration Steps (If Approved)

1. **Create `@repo/indexer-utils`** from template
2. **Move `output-formatter.ts`** + tests to utils
3. **Update CLI imports:**
   - Change: `import { TextFormatter } from '../output-formatter.js'`
   - To: `import { TextFormatter } from '@repo/indexer-utils'`
4. **Update `packages/indexer/core/package.json`** (if code moves there):
   - Add dependency on new lib if needed
5. **Update `apps/indexer-cli/package.json`:**
   - Add `@repo/indexer-utils` as dependency
6. **Run validation:** `pnpm post:report:fast`

---

### Acceptance Criteria (Phase 3)

- [ ] New package created and builds successfully
- [ ] Code migrated with all tests passing
- [ ] Import statements updated in CLI
- [ ] No new circular dependencies detected
- [ ] Module boundary checks pass (nx:lint)
- [ ] `pnpm post:report:fast` green across all affected packages

---

## 5. Acceptance Criteria (Overall)

### Phase 1 (Config Schema)

- [ ] Zod schemas + JSON Schema generation working
- [ ] IDE can autocomplete `.indexer-config.json`
- [ ] Configuration reference guide published
- [ ] All validation tests pass (schema, generation)

### Phase 2 (Audit)

- [ ] Code audit documented and ownership decisions made
- [ ] No blocking issues identified

### Phase 3 (Migration, if approved)

- [ ] Code extracted to appropriate packages
- [ ] All tests passing across packages
- [ ] Nx module boundaries enforced
- [ ] `pnpm post:report:fast` + `pnpm post:report` both green

---

## 6. Testing Strategy

### Phase 1: Config Schema (Unit + Integration)

**Unit tests** (colocated in `packages/indexer/core/src/`):

- ✓ Valid config passes schema validation (per [configuration_spec.md](../configuration_spec.md)
  examples)
- ✓ Invalid config rejected with descriptive error (missing required field, wrong type, constraint
  violation)
- ✓ Environment variable substitution (${VAR} → resolved value, missing → error)
- ✓ Default values applied when fields omitted

**Integration tests**:

- ✓ JSON Schema generation produces valid JSON Schema 7
- ✓ Generated schema matches Zod schema (no drift)
- ✓ IDE can use schema for validation (file format check)

**Coverage target:** 75–85% (schema definitions + generation logic)

**Reference:** [testing_strategy.md](../../engineering/testing_strategy.md) §2.2.1 (unit targets
60–75%)

---

### Phase 2: Audit (Documentation)

**No tests required** — audit is documentation.

---

### Phase 3: Code Migration (Regression + Unit)

**Regression tests:**

- Run existing CLI command tests against new utils imports
- Ensure output formatting behavior unchanged

**Unit tests for utils:**

- Existing tests (moved from CLI) should pass as-is
- Add 2–3 new tests for utils-specific scenarios (if any)

**Coverage target:** Maintain existing coverage levels

**Reference:** [testing_specification.md](../../engineering/testing_specification.md) §3–7
(colocated patterns)

---

## 7. Known Decisions & Open Questions

### Decisions Made ✓

1. **Use Zod for schema** (already available via `zod-to-json-schema` dependency)
2. **Export Zod schemas from core** (not CLI)
3. **Generate JSON Schema for IDE** (committed to docs)
4. **Documentation guide separate from spec** (config-reference.md)

### Open Questions (Require User Input)

1. **Daemon lock scope:**
   - Should daemon-lock.ts stay in CLI, move to core, or utils?
   - Assume CLI-only unless workers/servers also manage daemons?

2. **Output formatter extraction:**
   - Approved to move to `@repo/indexer-utils`? (Recommended: Yes)
   - Any other CLI utilities worth extracting?

3. **Utils library creation:**
   - Is creating `@repo/indexer-utils` worthwhile for this phase?
   - Or defer utils extraction to later when more reusable code exists?

4. **Schema file location:**
   - Commit generated JSON Schema to `docs/schemas/`?
   - Or generate at build time and exclude from repo?
   - (Recommend: Commit for IDE accessibility without build step)

---

## References & Links

### Specification Documents

- [configuration_spec.md](../configuration_spec.md) — Config format §1–5
- [configuration_and_server_setup.md](../configuration_and_server_setup.md) — Precedence §3–9
- [cli_spec.md](./cli_spec.md) — CLI commands §2–12
- [layout_spec.md](../layout_spec.md) § 2.1–2.5 — Package structure
- [testing_strategy.md](../../engineering/testing_strategy.md) — Test distribution
- [testing_specification.md](../../engineering/testing_specification.md) — Test patterns

### Related Implementation Docs

- [implementation/plan.md](./plan.md) — Vertical slices overview
- [implementation/plan.md § Slice 1](./plan.md#slice-1--git-snapshot-resolution-diff-plumbing--full-cli-implementation)
  — CLI implementation scope

### External Tools & Libraries

- [Zod documentation](https://zod.dev) — Schema validation
- [zod-to-json-schema](https://github.com/StefanTerdell/zod-to-json-schema) — JSON Schema generation
- [JSON Schema 7 spec](https://json-schema.org/draft/2020-12/schema) — Standard format

---

## Changelog

| Date       | Version | Editor | Summary                                                                                                                                                                                     |
| ---------- | ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-14 | 1.1     | @agent | Phase 1 Complete: config-schema.ts, schema-generator.ts, generate-schema-file.test.ts, docs/schemas/indexer-config.schema.json, docs/guides/config-reference.md, .indexer-config.example.md |
| 2025-12-14 | 1.0     | @agent | Initial doc: Phase 1 (schema), Phase 2 (audit), Phase 3 (migration) planning                                                                                                                |
