# Three-Branch Public Release Workflow

This document describes the simplest workflow for keeping the public branch clean while retaining a
visible internal branch in the same public repository.

## Current repo note

The branch names in this document are role names, not a requirement that your repository literally
uses those names.

For Texere right now, the equivalent mapping is:

- `main` -> the future clean public branch role
- `internal` -> the current `v4` working branch role
- `public-prep/*` -> short-lived cleanup/promotion branches created from `v4`

If your repository currently uses `master` instead of `main`, substitute `master` wherever this
document says `main`.

## Branch roles

### `main`

Public-facing branch.

Use `main` for the version of the repository you want new visitors to see first:

- polished docs
- public-safe files only
- release-ready project structure
- no internal-only workflow clutter

### `internal`

Primary working branch.

Use `internal` for normal development when you want to keep dev-only files, notes, or workflow
artifacts in the repo without making them part of `main`.

This branch can contain:

- internal planning docs
- agent/workflow files
- draft material
- experimental cleanup work
- other development-only files that should not be promoted to `main`

Important: `internal` is still public if the repository is public. This workflow keeps `main` clean,
but it does **not** make `internal` private.

### `public-prep/*`

Short-lived promotion branches.

Create a `public-prep/*` branch from `internal` whenever you want to prepare a clean set of changes
for `main`.

Examples:

- `public-prep/repo-cleanup`
- `public-prep/docs-curation`
- `public-prep/release-surface`

This branch exists to:

- remove internal-only files
- verify the public-facing file set
- separate publishable changes from internal branch noise
- provide a review buffer before merging into `main`

## Recommended flow

1. Do day-to-day work on `internal`.
2. When something is ready for the public branch, create a new `public-prep/*` branch from
   `internal`.
3. Remove or exclude anything that should not appear on `main`.
4. Review the diff specifically from a public-repo perspective.
5. Merge the `public-prep/*` branch into `main`.

## Rules

- Do not merge `internal` directly into `main`.
- Treat `public-prep/*` as the only bridge into `main`.
- Keep internal-only files in predictable locations when possible.
- Prefer separate commits for public-safe work and internal-only work.
- If a change would be embarrassing or sensitive if seen publicly, it does not belong on `internal`
  in a public repository.

## Why this works

This setup keeps the workflow simple:

- one repository
- one long-lived internal branch
- one clean public branch
- one explicit promotion step before public release

It avoids the overhead of maintaining a separate private companion repository while still protecting
the quality of `main`.

## What this workflow does not do

This workflow does **not** provide secrecy.

If the repository is public:

- `internal` is public
- `public-prep/*` branches are public
- branch history is public
- files and commits on those branches are public

Use a separate private repository instead if any internal branch content must remain private.
