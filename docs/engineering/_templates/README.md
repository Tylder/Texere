# \_templates

Template files for each document type. Use these as starting points when creating new documents.

## How to Use

1. **Copy the template** for your document type
2. **Replace placeholders** (`<feature>`, `<area>`, `<topic>`) with your actual names
3. **Fill in sections** using the examples as guides
4. **Delete sections that don't apply** to your specific document
5. **Include Q&A sections** where you've made decisions with alternatives

## Templates Available

### Ideation Templates

- **`IDEATION-PROBLEMS-template.md`** – Problems, failure modes, scenarios, resolution indicators
- **`IDEATION-EXPERIENCE-template.md`** – Personas, journeys, invariants, failure & recovery
- **`IDEATION-UNKNOWNS-template.md`** – Open questions, blockers, closure criteria

Use all three for a complete ideation. You can skip Problems or Unknowns for small features, but
Experience is usually useful.

### Requirements Template

- **`REQ-template.md`** – Contains multiple numbered requirements (REQ-001, REQ-002, etc.)

Create one per feature. Include as many requirements as needed.

### Specification Template

- **`SPEC-template.md`** – Interfaces, data models, invariants, error handling, Q&A

Create one per piece that needs to be built. Multiple Specs can implement the same Requirement.

### Implementation Plan Template

- **`IMPL-PLAN-template.md`** – Milestones, work breakdown, risks, verification, rollout

Create when Specifications are ready. One Plan can coordinate multiple Specs and Requirements.

### Initiative Index Template

- **`INIT-template.md`** – Links to all related docs + status + tracking

Create one per feature/initiative. Update regularly.

---

## Tips

- The templates include examples (pagination, export, auth) to show what good looks like
- Q&A sections are optional but recommended for non-trivial decisions
- Don't feel obligated to use every section if it doesn't apply to your document
- Keep documents focused; if a section feels large or disconnected, that might signal it belongs in
  a separate document

## Questions?

See `../documentation_guide.md` for full details on each document type, linking rules, and
lifecycle.
