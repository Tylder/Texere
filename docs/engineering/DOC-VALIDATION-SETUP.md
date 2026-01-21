# Documentation Validation Automation

This document explains how to set up and use the automated documentation validation system.

## Overview

The documentation validation system automatically:

1. **Detects** changes to documentation files (created, updated, deleted)
2. **Auto-fixes**:
   - Updates `DOCUMENT-REGISTRY.md` with all documents and their metadata
   - Updates folder README files (Active/Archived sections)
3. **Validates**:
   - YAML frontmatter completeness (all required fields present)
   - Naming conventions (files start with correct prefix)
   - Cross-references (links to actual documents)
4. **Reports** what was fixed or what needs manual attention

## Setup

### Initial Setup (One-time)

1. **Install husky** (if not already installed):

   ```bash
   pnpm install husky --save-dev
   npx husky install
   ```

2. **Create pre-commit hook** (runs on every commit):

   ```bash
   npx husky add .husky/pre-commit "pnpm lint-staged"
   ```

3. **Verify setup**:

   ```bash
   ls -la .husky/
   ```

   You should see `.husky/pre-commit` with the hook.

### What Gets Hooked

Once set up, the validation automatically runs:

- **On `git commit`** (via pre-commit hook + lint-staged)
- **On any change to** `docs/engineering/**/*.md` (except README and DOCUMENT-REGISTRY)

## Usage

### Automatic (Recommended)

Just commit documentation changes normally:

```bash
git add docs/engineering/02-specifications/SPEC-my-feature.md
git commit -m "Add spec for my feature"
```

The script runs automatically and:

- Updates DOCUMENT-REGISTRY.md ✅
- Updates `02-specifications/README.md` ✅
- Validates frontmatter and naming ✅
- Reports success or errors ✅

### Manual Check

Run validation anytime without committing:

```bash
pnpm check:docs
```

This runs the same validation without the pre-commit hook.

## Validation Rules

### Required Frontmatter Fields

Every document MUST include YAML frontmatter with these fields:

```yaml
---
type: SPEC # Must match file prefix (SPEC, REQ, IMPL-PLAN, IDEATION)
status: active # active, archived, deprecated
stability: stable # stable, evolving, experimental
created: 2025-01-21 # Creation date (ISO format)
last_updated: 2025-01-21 # Last modification date
area: my-feature # Feature area or domain
feature: search # Feature name
# Optional fields:
implements: [REQ-x#REQ-001] # For SPEC/IMPL-PLAN: what it implements
coordinates: [SPEC-y] # For IMPL-PLAN: specs it coordinates
covers: [REQ-x#REQ-001] # For IMPL-PLAN: requirements it covers
depends_on: [REQ-x] # Dependencies on other docs
---
```

### Naming Conventions

| Type                  | Prefix       | Example                             |
| --------------------- | ------------ | ----------------------------------- |
| Requirement           | `REQ-`       | `REQ-pagination-system.md`          |
| Specification         | `SPEC-`      | `SPEC-search-results-pagination.md` |
| Implementation Plan   | `IMPL-PLAN-` | `IMPL-PLAN-pagination-system.md`    |
| Ideation (Problems)   | `IDEATION-`  | `IDEATION-search-problems.md`       |
| Ideation (Experience) | `IDEATION-`  | `IDEATION-search-experience.md`     |
| Ideation (Unknowns)   | `IDEATION-`  | `IDEATION-search-unknowns.md`       |

### Cross-Reference Validation

The script verifies that all references point to real documents:

```yaml
implements: [REQ-pagination-system#REQ-001] # Checks REQ-pagination-system.md exists
coordinates: [SPEC-search-pagination] # Checks SPEC-search-pagination.md exists
```

## Auto-Updated Files

The following files are automatically generated/updated by the validation script:

### `DOCUMENT-REGISTRY.md`

- **Do NOT edit manually**
- Lists all documents with metadata
- Shows relationships (REQ → SPEC → IMPL-PLAN)
- Updated every time docs change

### Folder READMEs

- `00-ideation/README.md` - Active/Archived ideation docs
- `01-requirements/README.md` - Active/Archived requirements
- `02-specifications/README.md` - Active/Archived specs
- `03-implementation-plans/README.md` - Active/Archived plans

These are partially auto-updated (Active/Archived lists). Do not manually edit the checklist
sections.

## Troubleshooting

### "No matches of search expression found"

If you see this error, the script couldn't auto-update a folder README. This usually means the file
format changed. Solution:

```bash
# Re-create the README with correct format
pnpm check:docs  # First runs validation (you should see specific errors)
```

### Validation Fails: "Missing frontmatter field"

**Problem:** Your document is missing required YAML fields.

**Solution:** Add all required fields to your document's frontmatter:

```yaml
---
type: SPEC
status: active
stability: stable
created: 2025-01-21
last_updated: 2025-01-21
area: search
feature: pagination
---
```

### Validation Fails: "Should start with SPEC-"

**Problem:** Your file name doesn't match the document type.

**Solution:** Rename your file to match:

- REQ documents: `REQ-*.md`
- SPEC documents: `SPEC-*.md`
- IMPL-PLAN documents: `IMPL-PLAN-*.md`
- IDEATION documents: `IDEATION-*.md`

### Validation Fails: "References non-existent document"

**Problem:** Your frontmatter references a document that doesn't exist.

**Solution:** Check the spelling and make sure the referenced document exists:

```yaml
implements: [REQ-pagination-system#REQ-001]
# ↑ Make sure REQ-pagination-system.md exists
```

### Pre-commit Hook Not Running

**Problem:** Script doesn't run when you commit.

**Solution:** Verify husky is installed:

```bash
ls -la .husky/pre-commit
cat .husky/pre-commit
```

If missing, re-run setup:

```bash
pnpm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "pnpm lint-staged"
```

### Want to Bypass the Hook (Not Recommended)

If you absolutely must commit without validation (emergency only):

```bash
git commit --no-verify
```

However, this skips the auto-fixes, so you'll need to manually update the registry.

## What the Script Does: Step-by-Step

1. **Detects** all documentation files in `docs/engineering/`
2. **Parses** YAML frontmatter from each file
3. **Validates**:
   - ✓ All required fields present
   - ✓ Type matches file prefix
   - ✓ References point to real documents
4. **Auto-fixes**:
   - ✓ Regenerates `DOCUMENT-REGISTRY.md` from scratch
   - ✓ Updates folder README Active/Archived lists
5. **Reports** results:
   - ✓ Success (green checkmarks)
   - ✗ Errors (red X, blocks commit)
   - ⚠️ Warnings (yellow exclamation)

## Example: Adding a New Specification

### Step 1: Create the file

```bash
touch docs/engineering/02-specifications/SPEC-my-feature.md
```

### Step 2: Add frontmatter and content

```markdown
---
type: SPEC
status: active
stability: stable
created: 2025-01-21
last_updated: 2025-01-21
area: search
feature: pagination
implements: [REQ-pagination-system#REQ-001]
---

# My Feature Specification

[content...]
```

### Step 3: Commit

```bash
git add docs/engineering/02-specifications/SPEC-my-feature.md
git commit -m "Add spec for my feature"
```

### Step 4 (Automatic!)

The validation script:

- ✅ Validates frontmatter → Pass
- ✅ Validates naming → Pass
- ✅ Validates references → Pass
- ✅ Updates `DOCUMENT-REGISTRY.md`
- ✅ Updates `02-specifications/README.md`
- ✅ Commit succeeds!

You see:

```
✨ AUTO-FIXES APPLIED:
  ✅ Updated DOCUMENT-REGISTRY.md
  ✅ Updated all folder READMEs

✅ Documentation validation passed!
```

## For CI/CD

To also validate in your CI pipeline (GitHub Actions, etc.):

```yaml
- name: Validate documentation
  run: pnpm check:docs
```

This ensures PRs don't merge with invalid documentation.

## FAQ

**Q: Can I manually edit DOCUMENT-REGISTRY.md?** A: No. It's auto-generated from frontmatter. Edit
document YAML instead; registry updates on next commit.

**Q: What if I want to keep a document but mark it archived?** A: Set `status: archived` in
frontmatter. The script moves it to the Archived section automatically.

**Q: Does the script handle document deletions?** A: Yes. When you delete a document and commit, the
script removes it from DOCUMENT-REGISTRY.md and folder READMEs.

**Q: Why auto-fix instead of just fail?** A: Auto-fixing reduces friction and ensures the system
stays in sync. You focus on content, not bookkeeping.

**Q: Can I use this without pre-commit hooks?** A: Yes! Just run `pnpm check:docs` manually, or add
it to CI/CD. Hooks are optional but recommended.

---

**Setup status:** Check if hooks are installed:

```bash
ls -la .husky/pre-commit 2>/dev/null && echo "✅ Hooks installed" || echo "❌ Hooks not installed"
```
