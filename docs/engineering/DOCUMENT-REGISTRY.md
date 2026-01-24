---
type: REGISTRY
status: system
stability: stable
auto_generated: true
auto_generated_by: script/validate-docs.mjs
auto_generated_on_every: git commit (pre-commit hook)
last_updated: 2026-01-24
do_not_edit_manually: true
---

Auto-generated – do not edit manually. Update document YAML frontmatter to change entries. See
docs/engineering/meta/META-documentation-system.md for details.

## Quick Query

```
grep "| SPEC.*active" below
```

## Documents

| ID                                                    | Type              | Status | Stability    | Area             | Feature                           | Summary                                                                                                                                                                                                           |
| ----------------------------------------------------- | ----------------- | ------ | ------------ | ---------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IDEATION-PROBLEMS-context-and-task-isolation`        | IDEATION-PROBLEMS | draft  | experimental | ai-coding-system | context-and-task-isolation        | Context selection is opaque; users cannot anchor stable references; context spills across task boundaries, contaminating unrelated work                                                                           |
| `IDEATION-PROBLEMS-grounding-and-freshness`           | IDEATION-PROBLEMS | draft  | experimental | ai-coding-system | grounding-and-freshness           | Research becomes stale without cheap upkeep; hallucination and assumption drift are not mechanically prevented; decisions lack auditable history and traceability                                                 |
| `IDEATION-PROBLEMS-integration-and-execution`         | IDEATION-PROBLEMS | draft  | experimental | ai-coding-system | integration-and-execution         | Code generation violates repo constraints; test/build results are not reliably incorporated; environment drift breaks reproducibility; repo mutations are unsafe; changes are not reviewable at human granularity |
| `IDEATION-PROBLEMS-orchestration-and-governance`      | IDEATION-PROBLEMS | draft  | experimental | ai-coding-system | orchestration-and-governance      | Orchestration is opaque and unreliable; phase discipline blurs; multi-agent coordination fails; quality control is missing or ineffective; scope boundaries are ambiguous; self-improvement is ungrounded         |
| `IDEATION-PROBLEMS-session-continuity`                | IDEATION-PROBLEMS | draft  | experimental | ai-coding-system | session-continuity                | Session resets force repeated repo research; historical knowledge and constraints are lost; task state cannot be resumed; schema evolution breaks interpretation                                                  |
| `IDEATION-PROBLEMS-tooling-models-and-infrastructure` | IDEATION-PROBLEMS | draft  | experimental | ai-coding-system | tooling-models-and-infrastructure | Tool usage is unreliable; model swaps break workflows; context bloat drives costs; security boundaries are weak; dependency topology is blind; prompt brittleness undermines consistency                          |
| `IDEATION-PROBLEMS-user-trust-and-feedback`           | IDEATION-PROBLEMS | draft  | experimental | ai-coding-system | user-trust-and-feedback           | Uncertainty and confidence are not communicated transparently; user feedback and preferences are not accumulated; agent outputs cannot be calibrated for trust                                                    |
| `IDEATION-PROBLEMS-graph-knowledge-system`            | IDEATION-PROBLEMS | draft  | experimental | knowledge        | graph-knowledge-system            | Project decisions decay and become untraceable; a graph approach must avoid taxonomy sprawl and enforce lineage across evidence, plans, and code                                                                  |
| `REQ-generate-doc-indices`                            | REQ               | active | stable       | documentation    | section-indexing                  | Extract section hierarchy (H2/H3) from documents and embed structured index in frontmatter for LLM parsing                                                                                                        |
| `REQ-validate-docs`                                   | REQ               | active | stable       | documentation    | validation-system                 | Validate documentation structure, metadata, naming, and links; auto-update registries and folder READMEs on every commit                                                                                          |
| `REQ-graph-ingestion`                                 | REQ               | draft  | experimental | graph-system     | graph-ingestion                   | High-level requirements for ingestion pipelines and source connectors                                                                                                                                             |
| `REQ-graph-system-graph-ingestion-repo-scip-ts`       | REQ               | draft  | experimental | graph-system     | graph-ingestion-repo-scip-ts      | Requirements for ingesting a TypeScript repository via SCIP into canonical graph nodes                                                                                                                            |
| `REQ-graph-lifecycle`                                 | REQ               | draft  | experimental | graph-system     | graph-lifecycle                   | High-level requirements for lifecycle assertions and invariants                                                                                                                                                   |
| `REQ-graph-system-graph-lifecycle-assertions`         | REQ               | draft  | experimental | graph-system     | graph-lifecycle-assertions        | Requirements for lifecycle assertion kinds and minimum schemas                                                                                                                                                    |
| `REQ-graph-system-graph-policy-framework`             | REQ               | draft  | experimental | graph-system     | graph-policy-framework            | Requirements for a queryable, append-only policy framework in the graph                                                                                                                                           |
| `REQ-graph-projection`                                | REQ               | draft  | experimental | graph-system     | graph-projection                  | High-level requirements for deterministic projections                                                                                                                                                             |
| `REQ-graph-system-graph-projection-current-truth`     | REQ               | draft  | experimental | graph-system     | graph-projection-current-truth    | Requirements for the CurrentCommittedTruth projection                                                                                                                                                             |
| `REQ-graph-store`                                     | REQ               | draft  | experimental | graph-system     | graph-store                       | High-level requirements for graph storage interfaces and adapters                                                                                                                                                 |
| `REQ-graph-system-graph-store-inmemory`               | REQ               | draft  | experimental | graph-system     | graph-store-inmemory              | Requirements for an in-memory graph store adapter used in v0.1                                                                                                                                                    |
| `REQ-graph-system-graph-system-architecture`          | REQ               | draft  | experimental | graph-system     | graph-system-architecture         | High-level requirements for the Nx package boundaries and dependency rules of the graph system                                                                                                                    |
| `REQ-graph-system-graph-knowledge-system`             | REQ               | draft  | experimental | knowledge-graph  | graph-knowledge-system            | Graph-based project memory with lifecycle-traceable, queryable nodes and deterministic current/as-of views                                                                                                        |
| `SPEC-graph-system-vertical-slice-v0-1`               | SPEC              | draft  | experimental | graph-system     | graph-vertical-slice-v0-1         | End-to-end v0.1 slice: repo ingestion (SCIP-TS) -> in-memory graph -> JSON dumps -> projection                                                                                                                    |
| `META-documentation-system`                           | META              | active | stable       | documentation    | system                            | Complete specification of the 5-type documentation system: IDEATION, REQ, SPEC, IMPL-PLAN, META                                                                                                                   |

_Auto-generated: 2026-01-24_
