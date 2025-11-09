# Texere — Spin‑Out Specs Roadmap

This document lists the specs that should be separated from SPEC.md into their own comprehensive files, with scope and expected outputs.

---

## 1) Project Profile & Indexing Spec
**Why:** Backbone for speed and cost.  
**Cover:** repo identity, chunking rules, language parsers, incremental updates, embeddings cache keys, BM25/FAISS on‑disk layouts, integrity checks, migrations.  
**Outputs:** data schemas, update pseudocode, SLAs (index time/reindex), failure modes & recovery.

## 2) Retrieval & Ranking Spec
**Why:** Directly drives answer quality.  
**Cover:** hybrid pipeline (symbol/file narrow → BM25 → vector re‑rank), scoring/normalization, dedupe, `K` resolution hierarchy, caching, quality metrics.  
**Outputs:** APIs/resolvers, eval harness, golden queries, acceptance thresholds.

## 3) LLM Adapter Spec (finalized)
**Why:** Single surface for streaming, JSON, tool‑calls, budgets/telemetry.  
**Cover:** types, sync/stream interfaces, error taxonomy, JSON repair, tool schema validation, budget enforcement, policy hooks.  
**Outputs:** provider matrix (OpenAI/Anthropic/local), conformance tests.

## 4) HITL Policy & Enforcement Spec
**Why:** Safety + audit without friction.  
**Cover:** risk tags, thresholds, env matrix, node metadata decorator, middleware wrapper, approval UX, replay/auto‑approve.  
**Outputs:** policy config format, import‑linter rules, test matrix.

## 5) Executor & Sandbox Spec
**Why:** Running commands is risky/expensive.  
**Cover:** allowlists/denylists, timeouts, resource caps, Docker runner design (user, mounts, network), artifact capture, log redaction, cross‑OS behavior.  
**Outputs:** security checklist, container profiles, conformance tests for exit codes/timeouts.

## 6) Patch Lifecycle Spec
**Why:** Edits must be safe/reversible/traceable.  
**Cover:** diff format, size/path caps, verify/apply, rollback, commit/PR policy, conflict handling, CODEOWNERS/protected paths.  
**Outputs:** state machine, JSON schemas, failure/retry semantics.

## 7) Web Access & Compliance Spec
**Cover:** search adapters (CSE/Brave/etc.), robots.txt handling, domain allowlists, fetch/extract/cite pipeline, injection defenses, quotas.  
**Outputs:** adapter contracts, compliance notes, audit fields.

## 8) MCP Exposure Spec
**Cover:** which tools become MCP, auth, tool metadata, rate limits, mapping MCP ↔ Texere nodes.  
**Outputs:** server layout, tool catalogs, sample clients.

## 9) Observability & Telemetry Spec
**Cover:** trace structure, metrics (latency, tokens, cost, cache hit rate), log schema, PII redaction, exporters, correlation with run_id.  
**Outputs:** JSONL schema, dashboards, SLOs/alerts.

## 10) Config, Secrets & Env Spec
**Cover:** config hierarchy (repo/app/env), `.env` handling, secret mounting, validation, hot‑reload, per‑env defaults.  
**Outputs:** canonical `config.toml` + schema, validation CLI, redaction policy.

## 11) Testing & Golden Traces Spec
**Cover:** unit/integration structure, golden trace format, determinism controls (seed/temperature), CI gates, coverage targets.  
**Outputs:** fixtures, replay tool, pass/fail thresholds.

## 12) Versioning & Release/Packaging Spec
**Cover:** SemVer per pack, entry‑points, private PyPI publishing, dependency rules (core‑only), SBOM/license scanning.  
**Outputs:** release workflows, changelog policy, compatibility matrix.

## 13) Security & Privacy Spec
**Cover:** threat model, path escapes, secrets handling, PII policy, SBOM, supply‑chain checks, dependency pinning, vulnerability response.  
**Outputs:** checklists, scanners, review cadence.

## 14) State & Checkpointing Spec
**Cover:** checkpoint contents, size constraints, redaction, resume semantics, upgrades/migrations.  
**Outputs:** schema evolution guide, back‑compat tests.

## 15) CLI & UX Spec
**Cover:** dual‑channel output (human + `--json`), error codes, paging, color rules, non‑interactive mode, approval prompts.  
**Outputs:** command catalog, JSON schemas per command, TTY/non‑TTY behaviors.

---

### Suggested authoring order
1) Project Profile & Indexing  
2) Retrieval & Ranking  
3) Executor & Sandbox  
4) Patch Lifecycle  
5) Observability  
6) Config/Secrets  
7) Web Access  
8) MCP Exposure

