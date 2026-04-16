# Texere Public MCP Polish Plan

## TL;DR

> **Quick Summary**: Turn Texere into a polished public MCP repository by tightening the repo boundary, removing or relocating internal-only artifacts, adding the missing open-source trust surface, curating public documentation, and only then doing small metadata and README refinements.
>
> **Primary Goal**: Make a first-time visitor think “this is a serious, maintained MCP/infra project” within a minute, without turning the cleanup into a giant rewrite.
>
> **Core Principle**: Preserve strong implementation and existing product docs; spend effort on repo shape, contributor trust, and public navigation.

---

## Context

### Original Request
Research what needs to happen for this repo to feel polished and public-ready as an MCP repository, then create a concrete plan.

### Research Summary

#### What is already strong
- `README.md` is already a credible public overview with quick start, package links, and release flow.
- `apps/mcp/README.md` and `packages/graph/README.md` are already useful package-level entry points.
- `LICENSE` exists and is correctly set to MIT.
- `.github/workflows/publish.yml` already provides a tag-based publishing path.
- Package manifests are publishable and already include core packaging fields like `files`, `bin`, `exports`, and `publishConfig` where relevant.

#### Highest-signal public-release problems
- The repo root still exposes internal/private workflow artifacts: `.opencode/`, `.sisyphus/`, `.idea/`, `AGENTS.md`, `PUBLIC_RELEASE_PLAN.md`, `skills/texere/SKILL.md`.
- `docs/` contains a large volume of research, draft, benchmark, audit, findings, and implementation-plan documents that blur the line between shipped guidance and private development history.
- Community/trust files appear missing: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, issue templates, PR template, `CODEOWNERS`.
- Package metadata is still sparse for public npm discoverability: no obvious `description`, `repository`, `bugs`, `homepage`, `keywords`, or maintainer-facing metadata in the package manifests.
- Empty scaffold placeholders like `.gitkeep` in top-level `agents/`, `apps/`, `packages/`, and `skills/` make the repo feel partially staged rather than intentionally public.

### Oracle Guidance
- Prioritize public repo boundaries and trust signals over rewriting already-good product documentation.
- Keep the strong READMEs, LICENSE, and publish workflow mostly intact.
- Curate or archive research material rather than trying to rewrite every draft into polished prose.
- Stop after first-pass clarity is achieved; avoid endless cosmetic churn.

---

## Work Objectives

### Core Objective
Make the repository feel intentionally public, easy to trust, and easy to navigate for MCP users, contributors, and evaluators.

### Concrete Deliverables
- A cleaned root repo surface with internal-only artifacts removed, ignored, relocated, or intentionally hidden.
- A minimal open-source trust layer (`CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `CHANGELOG`, templates, `CODEOWNERS`).
- A curated documentation structure that distinguishes public docs from historical research and drafts.
- Public-ready package metadata for `@texere/mcp` and `@texere/graph`.
- Light README refinements only where they improve navigation or match the curated docs structure.

### Definition of Done
- [ ] The root directory no longer looks like a private agent workspace.
- [ ] A new visitor can identify the main entry points in under a minute.
- [ ] Public contributors can see how to contribute, report issues, and disclose security problems.
- [ ] Draft/research material is clearly separated from primary docs.
- [ ] Package manifests contain the metadata expected for public npm packages.
- [ ] No cleanup work rewrites stable documentation unnecessarily.

### Must Have
- Explicit decision on every internal-looking root artifact: remove, relocate, ignore, or keep with justification.
- Minimal but real community/trust docs.
- Documentation information architecture: “start here”, “reference”, “deep research/history”.
- Public metadata added consistently to both published packages.

### Must NOT Have
- No giant README rewrite unless specific gaps remain after curation.
- No attempt to polish every historical research note.
- No breaking of the existing publish workflow during cleanup.
- No deletion of useful technical history without first deciding whether it should be archived or retained.

---

## Recommended Sequencing

### Phase 1 — Define the public boundary
**Why first**: This is the highest-leverage polish step. Even strong code looks half-private if the root feels like a personal workspace.

#### Tasks
1. Audit every internal-looking root item and decide one of: remove from repo, move out of public surface, archive, or keep.
2. Clean or relocate internal-only artifacts such as:
   - `.opencode/`
   - `.sisyphus/`
   - `.idea/`
   - root `AGENTS.md`
   - package-level `AGENTS.md` files if they are not intended for public readers
   - `PUBLIC_RELEASE_PLAN.md`
   - `skills/texere/SKILL.md` and any other agent-only instructions
3. Remove empty scaffold placeholders or justify their existence:
   - `agents/.gitkeep`
   - `apps/.gitkeep`
   - `packages/.gitkeep`
   - `skills/.gitkeep`
4. Confirm `.gitignore` and related ignore rules keep local runtime and workspace state out of the public repo going forward.

#### Acceptance Criteria
- [ ] Root directory presents as a product repo, not an internal orchestration workspace.
- [ ] Every remaining top-level item has a clear public reason to exist.
- [ ] Internal agent artifacts are not visible to first-time visitors unless intentionally preserved.

#### Agent-Executed QA Scenarios
```text
Scenario: Root surface no longer looks private
  Tool: Read + Glob
  Steps:
    1. Read the repo root directory.
    2. Confirm internal-only items targeted for removal/relocation are gone or intentionally replaced.
    3. Confirm the remaining top-level entries are public-facing project assets.
  Expected Result: The root reads like a public product repo, not a personal workspace.

Scenario: Internal artifact decisions are complete
  Tool: Read + Grep
  Steps:
    1. Check for remaining top-level `AGENTS.md`, `PUBLIC_RELEASE_PLAN.md`, `.opencode/`, `.sisyphus/`, `.idea/`, and agent-only skill files.
    2. For anything still present, confirm the repo docs explicitly justify why it remains public.
  Expected Result: No unexplained private-looking artifact remains in the public surface.
```

---

### Phase 2 — Add the trust and contributor baseline
**Why second**: Public polish is not just about appearance; it is about making the repo safe and legible to use, contribute to, and evaluate.

#### Tasks
1. Add `CONTRIBUTING.md` with setup, quality commands, contribution expectations, and PR flow.
2. Add `CODE_OF_CONDUCT.md`.
3. Add `SECURITY.md` with disclosure expectations and contact/reporting guidance.
4. Add a lightweight `CHANGELOG.md` or release-notes policy.
5. Add maintainer workflow scaffolding:
   - `.github/CODEOWNERS`
   - issue templates
   - PR template

#### Acceptance Criteria
- [ ] Users know how to contribute.
- [ ] Security reporting has an explicit path.
- [ ] Repo governance and triage feel deliberate rather than ad hoc.

#### Agent-Executed QA Scenarios
```text
Scenario: Trust documents exist and are linked
  Tool: Read + Glob
  Steps:
    1. Confirm `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `CHANGELOG.md` exist at the repo root.
    2. Read each file and verify it contains project-specific guidance rather than placeholder text.
  Expected Result: Core open-source trust files exist and are not boilerplate shells.

Scenario: Maintainer workflow scaffolding is present
  Tool: Glob + Read
  Steps:
    1. Confirm `.github/CODEOWNERS`, issue templates, and a PR template exist.
    2. Read them to verify they reflect Texere’s contribution and review flow.
  Expected Result: Public contribution and triage workflows look intentional and ready to use.
```

---

### Phase 3 — Curate public docs versus research/history
**Why third**: The docs problem is curation, not lack of content.

#### Tasks
1. Define a public docs structure, for example:
   - primary docs / start here
   - technical reference / stable design docs
   - archive / research / historical notes
2. Review `docs/` and classify each document as one of:
   - public primary documentation
   - public deep technical reference
   - historical archive
   - private/internal-only material to remove from public repo
3. Specifically review high-noise items such as:
   - `docs/research/`
   - `docs/v4-ideas.md`
   - `docs/pagination-implementation-plan.md`
   - `docs/node-modeling-test-plan.md`
   - `docs/node-modeling-test-findings.md`
   - `docs/memory-graph-audit.md`
   - `docs/sqlite-benchmark-research.md`
   - `docs/batch-api-design-options.md`
   - `docs/Knowledge-DB-for-LLMs-2026-03-18.md`
4. Add a short docs index or docs README that explains what is canonical versus historical.

#### Acceptance Criteria
- [ ] A first-time visitor can distinguish shipped guidance from exploratory history.
- [ ] Valuable research remains available only where it adds credibility rather than clutter.
- [ ] The main docs path is short and obvious.

#### Agent-Executed QA Scenarios
```text
Scenario: Canonical docs path is obvious
  Tool: Read
  Steps:
    1. Read the root README and any docs index/README.
    2. Confirm they point clearly to the primary starting documents before any archive or research material.
  Expected Result: A first-time reader can identify the recommended reading path immediately.

Scenario: Research and history are clearly separated
  Tool: Read + Glob
  Steps:
    1. Inspect `docs/` structure after curation.
    2. Confirm exploratory material is grouped under archive/history/research labeling rather than mixed into the primary path.
    3. Read representative moved or retained docs to verify status labeling is explicit.
  Expected Result: Public docs and historical material are visibly distinct.
```

---

### Phase 4 — Polish package metadata and discoverability
**Why fourth**: Once the repo itself feels clean, package metadata becomes the multiplier for public distribution.

#### Tasks
1. Add public metadata to `apps/mcp/package.json` and `packages/graph/package.json`:
   - `description`
   - `repository`
   - `homepage`
   - `bugs`
   - `keywords`
   - any maintainer-facing metadata you want to expose
2. Review the root `package.json` for repository-level metadata that helps GitHub and npm understand the monorepo.
3. Ensure package descriptions align with the repo story: MCP server + graph library, not generic AI tooling.

#### Acceptance Criteria
- [ ] Both published packages look intentional and searchable on npm.
- [ ] Metadata is consistent with the public repo positioning.

#### Agent-Executed QA Scenarios
```text
Scenario: Package metadata is complete
  Tool: Read
  Steps:
    1. Read `apps/mcp/package.json` and `packages/graph/package.json`.
    2. Confirm `description`, `repository`, `homepage`, `bugs`, and `keywords` are present and project-specific.
    3. Confirm the wording matches Texere’s MCP + graph positioning.
  Expected Result: Both packages present as real public packages rather than sparse workspace manifests.
```

---

### Phase 5 — Apply only small README and release-surface refinements
**Why last**: README work should close specific navigation gaps, not restart the project explanation from zero.

#### Tasks
1. Update `README.md` only where needed to reflect the curated docs structure and contributor/community additions.
2. Add or tighten links to:
   - contributing guide
   - security policy
   - docs index
   - package-level entry points
3. Consider small trust/discoverability enhancements if useful:
   - badges
   - clearer “start here” section
   - release or status note aligned with actual package state

#### Acceptance Criteria
- [ ] README changes are additive and precise, not a full rewrite.
- [ ] The root README points cleanly into the newly curated public surface.

#### Agent-Executed QA Scenarios
```text
Scenario: README still works as the main entry point
  Tool: Read
  Steps:
    1. Read `README.md` after refinement.
    2. Confirm it links to the curated docs path, package entry points, and trust/community docs.
    3. Confirm the overall structure remains recognizable and has not been rewritten unnecessarily.
  Expected Result: README is still concise, strong, and better connected to the final public surface.

Scenario: README changes are minimal and intentional
  Tool: Git diff
  Steps:
    1. Inspect the diff for `README.md`.
    2. Confirm the changes are targeted link and navigation improvements rather than broad churn.
  Expected Result: README polish is precise and proportional to actual repo changes.
```

---

## Priority Order

### Highest Priority
1. Public boundary cleanup
2. Trust/community files
3. Docs curation

### Medium Priority
4. Package metadata
5. Small README polish

### Lower Priority / Optional
- Badges and cosmetics
- Expanded examples beyond the current baseline
- Further CI enhancements beyond the release workflow and basic contributor scaffolding

---

## Risks and Anti-Patterns

### Main Risks
- Spending time rewriting already-good docs instead of fixing public-boundary problems.
- Leaving internal files in the root, which keeps the repo feeling half-private.
- Trying to polish every research artifact, causing churn without improving first impressions.
- Deleting historical material impulsively instead of deciding whether to archive or reframe it.

### Anti-Patterns to Avoid
- “Documentation marathon” behavior that rewrites everything.
- Mixing canonical guidance and brainstorming in the same docs path.
- Shipping sparse package metadata after the repo cleanup is done.
- Preserving agent-only files at root level without public justification.

---

## Execution Notes

### Suggested First Pass
If this plan is executed in one focused sweep, the best order is:
1. Root cleanup and internal artifact decisions
2. Community/trust files
3. Docs curation + docs index
4. Package metadata
5. Small README adjustments

### Stop Condition
Stop after the repo clearly communicates:
- what Texere is
- where to start
- how to use the MCP package
- how to contribute or report issues
- which docs are canonical versus historical

If those are true, additional polish has lower return.

---

## Verification Strategy

### Review Questions
- Does the root directory still expose private development workflow state?
- Can a new visitor find the main entry points without reading research docs?
- Does the repo visibly support contributors and responsible disclosure?
- Do package manifests look like public packages rather than internal workspace manifests?
- Are historical docs clearly framed as history, not the main path?

### Success Heuristic
The polished repo should feel like:
> a serious, maintained MCP/infra project with a clean public surface

and not like:
> a private notebook, agent workspace, or development archive that happens to contain good code

### Final Verification Pass
```text
1. Read the repo root directory and confirm the public boundary cleanup landed.
2. Read the trust/community files and templates to confirm contributor readiness.
3. Read the docs index plus representative retained/archive docs to confirm information architecture.
4. Read both published package manifests to confirm public metadata completeness.
5. Read the root README and inspect its diff to confirm minimal, targeted polish.
```
