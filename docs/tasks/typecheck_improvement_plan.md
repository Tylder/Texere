# Typecheck & Build Determinism – Action Plan (Dec 17, 2025)

## Goals

- Faster, deterministic typecheck/build runs with Nx + TypeScript.
- No emit/test cross-talk; cache-friendly defaults; clean handoff for CI.

## Agreed Steps

1. **Enable Nx TSC batch mode & keep `clean:false` on build targets**
   - Switch projects to the Nx `@nx/js:tsc` executor (or set `options.batch: true` where supported).
   - Preserve `.tsbuildinfo` for incremental speed; only clean in explicit hygiene steps.

2. **Add `--stopOnBuildErrors` for CI builds / `check-types:clean`**
   - CI/build pipelines fail fast when any referenced project has errors, while local `check-types`
     remains incremental.

3. **Standardize `tsBuildInfoFile` under `.cache/` per project**
   - Point lib/spec configs to `.cache/tsconfig.*.tsbuildinfo` to avoid root clutter and maximize
     reuse.

4. **Serialize multi-target workflows to avoid clean/emit races**
   - Run `check-types → test:coverage → build` in phases (or encode via `dependsOn`) so emitters
     aren’t deleted mid-run; keep a final `pnpm clean` for CI handoff.

## Notes

- Tests now exclude `.cache/**` to prevent emitted spec JS from being picked up by Vitest.
- Default `check-types` stays incremental; `check-types:clean` is available when a zero-artifact
  pass is required.
