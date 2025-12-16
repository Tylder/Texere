# TypeScript Typecheck Cache Location Solutions

## Current State

**Problem**: Build artifacts (`.tsbuildinfo` files) from `tsc -b tsconfig.check.json` currently land alongside source files, cluttering package directories.

**Current Implementation**:
- 7 packages use `check-types: "tsc -b tsconfig.check.json"` (indexer/*, langgraph-orchestrator)
- TypeScript incremental cache files (`tsconfig.lib.tsbuildinfo`) appear in package roots
- No centralized `.cache` directory for build artifacts
- Per spec (typescript_configuration.md §5), the script runs: `tsc -b tsconfig.json && tsc -b tsconfig.json --clean` to validate and remove emitted artifacts

**Root Cause**: TypeScript's `--build` mode requires the `tsBuildInfoFile` to be writable and is stored where `tsconfig.json` directs it. When using project references without explicit output directories, artifacts appear inline.

---

## Solution Comparison

### **Solution A: Use Per-Package `.cache/.tsbuildinfo` with `tsBuildInfoFile` Override** ✅ RECOMMENDED

**How it works**:
- Add `tsBuildInfoFile: ".cache/tsconfig.lib.tsbuildinfo"` to each package's `tsconfig.lib.json`
- Create `.gitignore` entries to exclude `.cache/`
- Keep all `.cache` directories synchronized in pattern

**Advantages**:
- ✅ Spec-compliant: Works with existing `tsc -b` + `--clean` workflow
- ✅ Per-package isolation: Each package's cache is self-contained
- ✅ Simple, one-file change per package
- ✅ Incremental builds still work
- ✅ IDE compatible (VSCode, TypeScript server)
- ✅ No breaking changes to scripts or build pipeline

**Disadvantages**:
- ⚠ Manual per-package update (7 files)
- ⚠ `.cache` directories won't be ignored until each package has `.gitignore` entry

**Implementation**:
```json
// packages/indexer/types/tsconfig.lib.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": ".cache/tsconfig.lib.tsbuildinfo",
    "outDir": "dist",
    // ... rest of config
  }
}
```

```
// packages/indexer/types/.gitignore
.cache/
```

---

### **Solution B: Centralized Root `.cache` Directory with Path Resolution**

**How it works**:
- Create `/home/anon/Texere/.cache/packages/` hierarchy mirroring monorepo structure
- Use absolute paths in `tsBuildInfoFile`: `"../../.cache/packages/indexer/types/tsconfig.lib.tsbuildinfo"`
- Single `.gitignore` entry at root

**Advantages**:
- ✅ Single `.gitignore` entry (one place to maintain)
- ✅ All build artifacts in one place (easier to clean)
- ✅ Less per-package clutter
- ✅ Works with existing build pipeline

**Disadvantages**:
- ❌ Absolute/relative paths fragile: breaks if monorepo moves
- ❌ Path complexity: harder to understand cache organization
- ❌ Scattered across directories: defeats "per-package" isolation
- ⚠ Still requires per-package config updates
- ⚠ IDE traversal overhead (looking outside package boundaries)

**Implementation**:
```json
// packages/indexer/types/tsconfig.lib.json
{
  "compilerOptions": {
    "tsBuildInfoFile": "../../.cache/packages/indexer/types/tsconfig.lib.tsbuildinfo"
  }
}
```

---

### **Solution C: Use Nx Cache with Custom TypeScript Executor**

**How it works**:
- Replace `check-types` scripts with custom Nx executor that wraps `tsc`
- Executor redirects output to `.nx/cache/packages/<name>`
- Leverage Nx's built-in caching and task orchestration

**Advantages**:
- ✅ Integrates with Nx's caching layer
- ✅ Single executor for all packages (DRY)
- ✅ Works with `nx graph` dependency tracking
- ✅ Automatic cleanup on `nx reset`

**Disadvantages**:
- ❌ Requires new Nx executor implementation
- ❌ Complexity: introduces another layer of abstraction
- ❌ Heavy for a simple path redirect
- ❌ Performance overhead: Nx orchestration vs direct `tsc` call
- ⚠ Learning curve for maintainers
- ⚠ Not spec-aligned (spec expects `tsc -b` directly)

---

### **Solution D: Pre-Build Step that Auto-Generates Config**

**How it works**:
- Create a script (`scripts/sync-tsbuildinfo-paths.ts`) that auto-generates `tsBuildInfoFile` paths
- Run before `nx sync` in the development workflow
- Ensure consistency across all packages

**Advantages**:
- ✅ Single source of truth for cache structure
- ✅ Automated: reduces manual per-package edits
- ✅ Scalable: new packages auto-configured
- ✅ Can also auto-generate `.gitignore` entries

**Disadvantages**:
- ⚠ Another script to maintain
- ⚠ Adds build complexity
- ❌ Generated configs harder to debug/understand
- ⚠ Requires running script after project creation

---

### **Solution E: Monorepo-Wide TypeScript Configuration Root**

**How it works**:
- Move `tsBuildInfoFile` to root-level `tsconfig.json` compiler options
- All projects inherit via `extends`
- Single pattern: `.tsbuildinfo` files in `.cache/[project-name]/`

**Advantages**:
- ✅ Centralized policy (single place to manage)
- ✅ Automatic inheritance (packages don't need to configure)
- ✅ Consistent across entire monorepo

**Disadvantages**:
- ❌ Won't work: TypeScript resolves relative paths from config file location, not workspace root
- ❌ Would require absolute paths (fragile, non-portable)
- ❌ Spec conflict: `tsconfig.base.json` is for base compiler options only

---

## Recommended Path Forward

### **Primary: Solution A (Per-Package `.cache`)**

Rationale:
1. **Spec alignment**: Fits existing `typescript_configuration.md` workflow
2. **Simplicity**: Single config line per package, no scripts
3. **Isolation**: Each package owns its cache (good for monorepos)
4. **No breaking changes**: Works with current CI/CD, scripts, IDE setup
5. **Scalability**: New packages naturally follow pattern

**Implementation Steps**:
1. Update 7 package `tsconfig.lib.json` files:
   ```json
   "tsBuildInfoFile": ".cache/tsconfig.lib.tsbuildinfo"
   ```

2. Add `.gitignore` to each package:
   ```
   .cache/
   ```

3. Update spec reference in `typescript_configuration.md` §4.1:
   > "tsBuildInfoFile: ".cache/tsconfig.lib.tsbuildinfo" to keep artifacts out of source tree"

4. Optional: Add to root `scripts/lint.sh` or `nx reset`:
   ```bash
   find packages -type d -name ".cache" -exec rm -rf {} \; 2>/dev/null || true
   ```

**Time Estimate**: ~15 minutes (7 files × 2 changes + 1 spec update)

---

## Optional Enhancement: Auto-Cleanup

Add to `pnpm` lifecycle or Husky hook:

```bash
# scripts/clean-tsbuildinfo.sh
#!/usr/bin/env bash
find packages -type f -name "*.tsbuildinfo" -delete
find packages -type d -name ".cache" -empty -delete
```

Or use in `package.json`:
```json
"clean:tsbuildinfo": "bash scripts/clean-tsbuildinfo.sh"
```

---

## Specification Alignment

**Current Spec Reference**: `typescript_configuration.md` § 5 (package.json requirements)

Recommend adding to §4.1 (Per-Project Configuration – Libraries):

> "Set `tsBuildInfoFile` to `.cache/tsconfig.lib.tsbuildinfo` to centralize incremental build artifacts outside the source tree. Add `.cache/` to package `.gitignore`."

---

## Migration Checklist

- [ ] Update 7 `tsconfig.lib.json` files with `tsBuildInfoFile` path
- [ ] Add/update `.gitignore` in affected packages  
- [ ] Run `pnpm typecheck` to verify no regressions
- [ ] Test IDE TypeScript server (VSCode restart may be needed)
- [ ] Update `typescript_configuration.md` spec
- [ ] Commit with message: "chore: move tsbuildinfo to .cache per package"

---

## Quick Comparison Table

| Factor | A: Per-Package `.cache` | B: Centralized Root | C: Nx Executor | D: Auto-Generate | E: Root Config |
|--------|------------------------|-------------------|-----------------|-------------------|----------------|
| **Implementation Effort** | 15 min (⭐) | 20 min | 2–3 hrs | 1 hr | 10 min (fails) |
| **Spec Alignment** | ✅ Excellent | ⚠ Decent | ❌ Not aligned | ⚠ Aligned | ❌ Won't work |
| **Maintenance Burden** | ✅ Low (per-pkg) | ✅ Low (root) | ⚠ Medium | ⚠ Script-dependent | ❌ N/A |
| **Scalability** | ✅ Auto (new pkgs) | ⚠ Manual | ✅ Auto | ✅ Auto | ❌ N/A |
| **IDE Compatibility** | ✅ Perfect | ✅ Good | ⚠ Depends | ✅ Good | ❌ N/A |
| **Performance Impact** | ✅ None | ✅ None | ⚠ +5–10% | ✅ None | ❌ N/A |
| **Monorepo Portability** | ✅ High | ⚠ Medium (paths) | ✅ High | ✅ High | ❌ N/A |
| **CI/CD Compatibility** | ✅ Works | ✅ Works | ✅ Works | ⚠ Script dependent | ❌ N/A |
| **Debugging Difficulty** | ⭐ Easy | ⭐ Easy | ⭐⭐⭐ Hard | ⭐⭐ Medium | ❌ N/A |
| **Recommended?** | ✅ **YES** | ⚠ Fallback | ❌ No | ⚠ Maybe later | ❌ No |

---

## Online References Consulted

1. **Nx TypeScript Project Linking**: https://nx.dev/concepts/typescript-project-linking
   - Confirms per-project config is standard for monorepos

2. **TypeScript Handbook – Project References**: https://www.typescriptlang.org/docs/handbook/project-references.html
   - Describes `tsBuildInfoFile` as per-config option (not workspace-wide)

3. **Leapcell Article on Monorepo Optimization**: https://leapcell.io/blog/accelerating-large-typescript-monorepo-builds-and-dependency-management
   - Recommends `.tsbuildinfo` in `.cache` or `dist/` per package for incremental builds

4. **Turborepo Monorepo Handbook**: https://turbo.build/repo/docs/handbook
   - Mentions `.cache` convention for non-source artifacts

5. **Thijs Koerselman – Quest for Perfect TS Monorepo**: https://thijs-koerselman.medium.com/my-quest-for-the-perfect-ts-monorepo-62653d3047eb
   - Discusses `.cache` pattern for incremental build state

---

## Decision: Proceed with Solution A

**Why chosen**:
1. Minimal friction: one line per package
2. Spec-aligned: matches TypeScript project references guidance
3. Proven pattern: used in Nx, Turbo, other large monorepos
4. No downstream impacts: scripts, CI, IDE all continue working
5. Quick win: 15-minute implementation, immediate cleanup

**Next Steps** (if approved):
- [ ] Review & approve this solution
- [ ] Implement per Solution A (Implementation Steps above)
- [ ] Run `pnpm typecheck` to verify
- [ ] Update spec documentation
- [ ] Commit with validation checks passing

