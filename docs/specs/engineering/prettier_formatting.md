# Prettier Formatting Configuration

**Status:** Active  
**Last Updated:** 2025-11-22  
**Related Specs:** high_level_system_spec.md §3.6, eslint_code_quality.md, ci_cd.md §2.2

---

## § 1. Overview

Prettier is PersonaCore's **code formatter**. It owns _what code looks like_: whitespace, quotes,
line breaks, trailing commas.

**Key Principle:** One centralized root configuration ensures consistent formatting across the
entire monorepo.

| Aspect              | Detail                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Purpose**         | Code formatting (whitespace, quotes, line breaks)                                      |
| **Scope**           | Entire monorepo (consistent style)                                                     |
| **Config Location** | Root: `prettier.config.mjs`                                                            |
| **Relationship**    | Works with ESLint (`eslint_code_quality.md`); Prettier formats, ESLint validates logic |

---

## § 2. Architecture

### 2.1 Why Prettier is Centralized

**Single root configuration** (`prettier.config.mjs`) applies to all packages because:

- Formatting _should_ be consistent across the entire monorepo
- No reason for different packages to have different line widths or quote styles
- Simpler to maintain and scale
- File-based overrides (not package-based) handle rare exceptions (markdown, JSX)

**No per-package Prettier configs.** All packages use the root config.

### 2.2 Directory Structure

```
PersonaCore/
├── prettier.config.mjs                    ← Root: Formatting rules for entire monorepo
├── .prettierignore
│
├── packages/
│   ├── backend/
│   │   └── src/**/*.ts
│   ├── contracts/
│   │   └── src/**/*.ts
│   └── db/
│       └── prisma/
│
└── apps/
    ├── admin-ui/
    │   └── app/**/*.{ts,tsx}
    │
    └── web/
        └── app/**/*.{ts,tsx}
```

All directories use the root `prettier.config.mjs`.

---

## § 3. Configuration Details

### 3.1 Prettier Base Configuration

**File:** `prettier.config.mjs`

**Current base configuration:**

```javascript
{
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'lf',
  plugins: [
    'prettier-plugin-packagejson',
    'prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  overrides: [
    {
      files: '*.md',
      options: { proseWrap: 'always' }
    },
    {
      files: ['apps/**/*.{tsx,jsx}'],
      options: {
        jsxSingleQuote: false,
        bracketSameLine: false,
      }
    }
  ]
}
```

**Configuration details:**

| Option          | Value | Purpose                                          |
| --------------- | ----- | ------------------------------------------------ |
| `printWidth`    | 100   | Line length before wrapping                      |
| `singleQuote`   | true  | Use single quotes for strings (except JSX)       |
| `trailingComma` | 'all' | Add trailing commas to multi-line objects/arrays |
| `endOfLine`     | 'lf'  | Unix line endings (LF)                           |

### 3.2 File-Based Overrides

**Markdown files:**

```javascript
{
  files: '*.md',
  options: { proseWrap: 'always' }
}
```

- `proseWrap: 'always'` – Soft wrap prose at `printWidth` for readable markdown diffs

**JSX/React files** (`apps/admin-ui`, `apps/web`):

```javascript
{
  files: ['apps/**/*.{tsx,jsx}'],
  options: {
    jsxSingleQuote: false,
    bracketSameLine: false,
  }
}
```

- `jsxSingleQuote: false` – React convention (avoid single quotes in attributes: `className='x'`)
- `bracketSameLine: false` – JSX closing bracket on new line for readability

### 3.3 Plugins

**RULE:** PersonaCore must use these Prettier plugins:

| Plugin                         | Purpose                                               | Version | Why                                             |
| ------------------------------ | ----------------------------------------------------- | ------- | ----------------------------------------------- |
| `prettier-plugin-packagejson`  | Format `package.json` consistently                    | Latest  | Standardizes package.json across monorepo       |
| `prettier-plugin-sort-imports` | Auto-organize imports (matches ESLint `import/order`) | Latest  | Fixes import order before ESLint linting        |
| `prettier-plugin-tailwindcss`  | Sort Tailwind utility classes alphabetically          | Latest  | Prevents class duplicates; improves readability |

**Installation:**

```bash
pnpm -w add -D prettier-plugin-packagejson prettier-plugin-sort-imports prettier-plugin-tailwindcss
```

**Why important:** `prettier-plugin-sort-imports` auto-fixes import order during
`pnpm format:staged` so `pnpm lint` passes without requiring `eslint --fix`.

### 3.4 Import Sorting (prettier-plugin-sort-imports)

**RULE:** `prettier.config.mjs` must configure import sorting with this pattern (matches ESLint
`import/order`):

```javascript
importOrder: [
  '^node:',                // Node.js builtins (e.g., node:fs, node:path)
  '^(?!\.)(?!@)',         // External packages (e.g., zod, axios) - NOT starting with . or @
  '^@(?!personacore|/)',   // Other scoped packages (e.g., @babel/core, @testing-library/react)
  '^@personacore/',        // Workspace imports (@personacore/*)
  '^@/',                   // Absolute aliases (@/)
  '^\.\.[/\\]',         // Parent imports (../ or ..\) - MUST come before ./
  '^\./',                 // Sibling imports (./)
],
importOrderSeparation: true,   // Add blank lines between groups
importOrderSortSpecifiers: true, // Sort specifiers within import statements
```

**Example result:**

```typescript
import fs from 'node:fs';

import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { createUser } from '@personacore/backend';
import type { User } from '@personacore/contracts';

import { config } from '../config';

import { helper } from './helper';
```

**Pattern explanation:**

- **`^node:`** – Node.js builtins (e.g., `node:fs`, `node:path`)
- **`^(?!\.)(?!@)`** – External npm packages (not starting with `.` or `@`): `zod`, `axios`,
  `vitest`
- **`^@(?!personacore|/)`** – Other scoped packages: `@babel/core`, `@testing-library/react`
- **`^@personacore/`** – Workspace imports: `@personacore/backend`, `@personacore/contracts`
- **`^@/`** – Absolute aliases: `@/components`
- **`^\.\.[/\\]`** – Parent imports: `../config` (MUST come before `./`)
- **`^\.\/`** – Sibling imports: `./helper`

### 3.5 Tailwind Class Sorting (prettier-plugin-tailwindcss)

**Behavior:** Automatically sorts Tailwind utility classes alphabetically.

**Before:**

```jsx
<button className="px-4 ml-2 text-lg font-bold bg-blue-500">
```

**After:**

```jsx
<button className="ml-2 bg-blue-500 px-4 text-lg font-bold">
```

**Why:** Consistent class ordering prevents duplicates and improves readability.

---

## § 4. Integration with ESLint

**RULE:** Prettier and ESLint must not conflict. Prettier fixes imports; ESLint validates them.

**See:** `eslint_code_quality.md §6` for integration details.

### 4.1 Import Sorting: Prettier Fixes, ESLint Validates

**CRITICAL WORKFLOW:**

1. **`pnpm format:staged`** – Prettier fixes import order via `prettier-plugin-sort-imports`
   - Auto-organizes: builtins → external → workspace (`@personacore/*`) → aliases → parent →
     relative
   - Also fixes whitespace, quotes, trailing commas
   - Examples: See § 3.4 above

2. **`pnpm lint`** – ESLint validates import order is correct
