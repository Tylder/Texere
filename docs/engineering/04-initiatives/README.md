# 04-Initiatives

Navigation layer that groups related Ideation, Requirements, Specifications, and Implementation
Plans for each feature or initiative.

Initiative indices are **curated link maps** that help readers understand what documents belong
together. They are not specifications themselves.

## Active Initiatives

(None yet)

## On Hold

(None yet)

## Completed

(None yet)

---

## How to contribute

For each major feature or initiative, create one Initiative Index:

- `INIT-<area>-<topic>.md` – Links to related docs + status

See `../_templates/INIT-template.md` for template.

After creating a document:

- [ ] Update this README (add to appropriate status section)

---

## Naming Convention

- Feature: `INIT-export-feature.md`
- Cross-cutting: `INIT-pagination-system.md`
- Domain: `INIT-auth-system.md`

---

## What an Initiative Index Contains

- **Overview:** 1–2 sentences on the initiative
- **Owner:** Who coordinates this work
- **Ideation:** Links to all three Ideation docs (Problems, Experience, Unknowns)
- **Requirements:** Link to REQ document
- **Specifications:** Links to all related Specs (one requirement can have multiple specs)
- **Implementation Plan:** Links to IMPL-PLAN(s)
- **Status:** Key milestones and progress
- **Risks:** Known blockers and dependencies
- **Done Criteria:** When is this complete?

---

## Tips

- Keep it as a link map; don't duplicate content from linked docs
- Update status section regularly (especially for active initiatives)
- Include retrospective notes when complete
- Link across initiatives if they interact
