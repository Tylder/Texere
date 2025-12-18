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

### 3.4 ESM Import Compatibility (NodeNext)

- Keep extensionful ESM imports; do not rely on formatters that strip file extensions, as NodeNext
  resolution requires explicit extensions for declarations to stay valid for consumers.
  citeturn0search0

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

| Plugin                        | Purpose                                      | Version | Why                                             |
| ----------------------------- | -------------------------------------------- | ------- | ----------------------------------------------- |
| `prettier-plugin-packagejson` | Format `package.json` consistently           | Latest  | Standardizes package.json across monorepo       |
| `prettier-plugin-tailwindcss` | Sort Tailwind utility classes alphabetically | Latest  | Prevents class duplicates; improves readability |

**Installation:**

```bash
pnpm -w add -D prettier-plugin-packagejson prettier-plugin-tailwindcss
```

**NOTE:** `prettier-plugin-sort-imports` is **NOT** used. ESLint's `import/order` rule handles all
import sorting (see `eslint_code_quality.md §3.3`).

### 3.4 Tailwind Class Sorting (prettier-plugin-tailwindcss)

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

**RULE:** Prettier and ESLint must not conflict. ESLint handles import ordering; Prettier handles
formatting only.

**See:** `eslint_code_quality.md §3.3` for import ordering details.

### 4.1 Workflow: ESLint Fixes Imports, Prettier Formats

**CRITICAL WORKFLOW:**

1. **`pnpm lint --fix`** – ESLint fixes import order via `import/order` rule
   - Auto-organizes: builtins → external → workspace (`@repo/*`) → aliases → parent → relative
   - Enforces `consistent-type-imports`
   - Examples: See `eslint_code_quality.md §3.3`

2. **`pnpm format`** – Prettier applies formatting (whitespace, quotes, trailing commas)
   - Does NOT touch import order (ESLint owns this)
