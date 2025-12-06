# ESLint Code Quality

**Status:** Active  
**Last Updated:** 2025-11-22  
**Related Specs:** high_level_system_spec.md §3.6, prettier_formatting.md,
typescript_configuration.md, ci_cd.md §2.2

---

## § 1. Overview

ESLint is PersonaCore's **code quality checker**. It owns _what code does_: logic errors, type
violations, imports, best practices.

**Key Principle:** ESLint is distributed per-package (context-specific rules) while Prettier is
centralized (formatting only).

| Tool         | Purpose                                              | Scope                          | Config Location                                           |
| ------------ | ---------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| **ESLint**   | Code quality (logic, types, imports, best practices) | Per-package (context-specific) | `packages/eslint-config/base.mjs` + package-level configs |
| **Prettier** | Formatting (whitespace, quotes)                      | Entire monorepo (consistent)   | Root: `prettier.config.mjs`                               |

---

## § 2. Architecture

### 2.1 Why Distributed ESLint + Root Prettier

**ESLint is distributed** (`packages/eslint-config/base.mjs` + per-package configs):

- Different packages have different structures (`src/**` vs `app/**` vs `lib/**`)
- Different rules apply (e.g., `import/no-default-export: off` for Next.js but `error` for backend)
- File type patterns vary by context (test files use relaxed type rules)
- Allows future publication of `@personacore/eslint-config` as standalone package

**Prettier is centralized** (root `prettier.config.mjs` only):

- See `prettier_formatting.md §2.1`

### 2.2 Directory Structure

```
PersonaCore/
├── eslint.config.mjs                      ← Root: Linting for root-level files only
├── prettier.config.mjs                    ← Root: Formatting for entire monorepo
│
├── packages/
│   ├── eslint-config/
│   │   ├── package.json                   ← Shared config package
│   │   └── base.mjs                       ← Shared ESLint rules + plugins (exported)
│   │
│   ├── backend/
│   │   ├── eslint.config.mjs              ← Imports base, configures src/** + tests/**
│   │   └── src/**/*.ts
│   │
│   ├── contracts/
│   │   ├── eslint.config.mjs              ← Imports base
│   │   └── src/**/*.ts
│   │
│   └── db/
│       └── (no eslint.config.mjs; uses inherited rules if any)
│
└── apps/
    ├── admin-ui/
    │   ├── eslint.config.mjs              ← Imports base, overrides for Next.js
    │   └── app/**/*.{ts,tsx}
    │
    └── web/
        ├── eslint.config.mjs              ← Imports base
        └── app/**/*.{ts,tsx}
```

---

## § 3. Core Rules by Category

### 3.1 Monorepo Discipline

**Rule:** Use workspace imports (`@personacore/*`) for cross-package imports

| Rule                    | Enforcement | Details                                                      |
| ----------------------- | ----------- | ------------------------------------------------------------ |
| `no-restricted-imports` | error       | Block relative cross-package imports; force `@personacore/*` |

**✅ Correct:**

```typescript
import { createUser } from '@personacore/backend';
import type { User } from '@personacore/contracts';
```

**❌ Incorrect:**

```typescript
import type { User } from '../../packages/contracts/src/types';
import { createUser } from '../backend/src/users';
```

### 3.2 Type Safety

| Rule                            | Enforcement                 | Details                              |
| ------------------------------- | --------------------------- | ------------------------------------ |
| `no-explicit-any`               | error (source), off (tests) | Explicit types required              |
| `explicit-function-return-type` | error                       | All functions must have return types |
| `no-unsafe-*` (5 rules)         | error (source), off (tests) | Prevent unsafe type operations       |

**✅ Correct:**

```typescript
function createUser(name: string): Promise<User> {
  return db.user.create({ data: { name } });
}
```

**❌ Incorrect:**

```typescript
function createUser(name: any) {
  // Missing return type
  return db.user.create({ data: { name } });
}
```

### 3.3 Import Organization

| Rule                       | Enforcement            | Details                                                       |
| -------------------------- | ---------------------- | ------------------------------------------------------------- |
| `import/order`             | **disabled**           | Handled entirely by Prettier (`prettier-plugin-sort-imports`) |
| `import/no-default-export` | error (except Next.js) | Named exports only                                            |
| `consistent-type-imports`  | error                  | Use `import type { X }` for type-only imports                 |

**RULE: Prettier Owns Import Sorting; ESLint Only Validates Type Imports**

Import sorting is complex and error-prone when two tools both try to fix it. Solution: **Disable
ESLint's `import/order` rule** and let Prettier handle all import sorting via
`prettier-plugin-sort-imports`.

- **Prettier** (`prettier-plugin-sort-imports`) auto-fixes import order during `pnpm format:staged`
  (runs first)
- **ESLint** (`consistent-type-imports`) validates that type imports use `import type { X }` syntax
  (validation only, no fixing)
- No conflict: single source of truth for import order

**Import Order (Prettier auto-fixes to this):**

1. Node.js builtins: `node:fs`, `node:path`
2. External packages: `zod`, `axios`, `vitest`
3. Other scoped packages: `@babel/core`, `@testing-library/react`
4. Workspace imports: `@personacore/*`
5. Absolute aliases: `@/*`
6. Parent imports: `../config`
7. Sibling imports: `./helper`

**Workflow:**

```bash
pnpm format:staged  # Prettier: Auto-fix import order via importOrder regex (see prettier_formatting.md §3.4)
pnpm lint           # ESLint: Validate type imports use 'import type { X }' syntax only
```

**See:** `prettier_formatting.md §3.4` for Prettier regex patterns.

**✅ Correct (after `pnpm format:staged`):**

```typescript
import fs from 'node:fs';

import { z } from 'zod';

import type { User } from '@personacore/contracts';
import { createUser, deleteUser } from '@personacore/backend';

import { Button } from '@/components';

import { config } from '../config';

import { helper } from './helper';

export function handleUser(user: User): void { ... }
export { createUser, deleteUser };
```

**❌ Incorrect (before formatting or violates `consistent-type-imports`):**

```typescript
import { createUser } from '@personacore/backend';
import { User } from '@personacore/contracts';  // ❌ Should be 'import type { User }'
import { z } from 'zod';
import fs from 'node:fs';  // ❌ Wrong order (Prettier fixes during format:staged)

export { User, createUser };  // ❌ Mixed type/value
export default function handleUser(user: User) { ... }  // ❌ Default export
```

**Why disable `import/order` in ESLint:**

- Reduces complexity: one tool (Prettier) handles sorting; ESLint validates syntax only
- Prevents conflicts: no misaligned regex patterns between Prettier and ESLint
- Cleaner workflow: `format:staged` fixes, `lint` validates
- Easier maintenance: one source of truth for import order (Prettier's `importOrder` config)

### 3.4 Dead Code

| Rule             | Enforcement | Details                                           |
| ---------------- | ----------- | ------------------------------------------------- |
| `no-unused-vars` | error       | Catch unused variables; prefix with `_` to ignore |

**✅ Correct:**

```typescript
const { id, _deprecated } = user; // Prefix _ for unused vars
```

**❌ Incorrect:**

```typescript
const { id, deprecatedField } = user; // Unused field not prefixed
```

### 3.5 Async Safety

| Rule                   | Enforcement | Details                                            |
| ---------------------- | ----------- | -------------------------------------------------- |
| `no-floating-promises` | error       | All promises must be awaited or explicitly handled |
| `no-misused-promises`  | error       | Prevent returning promises in array methods        |

**✅ Correct:**

```typescript
await sendEmail(user);
array.map((item) => item.id); // No async
```

**❌ Incorrect:**

```typescript
sendEmail(user); // Floating promise
array.map(async (item) => await process(item)); // Promise in map
```
