# Texere Indexer – Language Indexers Spec (index)

**Document Version:** 0.2  
**Last Updated:** December 18, 2025  
**Status:** Active (index); per-language specs are authoritative for algorithms

## Purpose

This file is the **navigation and contract index** for all language-specific ingestion specs. It
states cross-cutting rules and points to the authoritative per-language documents.

## Quick Navigation

- [1. Scope & Audience](#1-scope--audience)
- [2. Cross-cutting Rules](#2-cross-cutting-rules)
- [3. Per-language Specs](#3-per-language-specs)
- [4. Testing Expectations](#4-testing-expectations)
- [5. Changelog](#5-changelog)
- [6. References](#6-references)

## 1. Scope & Audience

**In scope:** contracts that every language indexer must honor; links to language-specific
algorithms and heuristics.  
**Out of scope:** detailed AST rules, framework heuristics, and fallbacks (see per-language files).

Audience: indexer engineers, agents implementing ingest, reviewers validating coverage.

## 2. Cross-cutting Rules

1. **SCIP-first**: use a maintained SCIP indexer when available; fall back to deterministic AST
   extraction only when SCIP output is unavailable or invalid (ingest_spec §1.1).
2. **LLM last resort**: LLMs are permitted only when no static/SCIP signal exists (e.g., ambiguous
   boundary semantics); language specs must call this out explicitly.
3. **Unified graph shape**: all languages emit the same node/edge catalog; missing data must be
   marked as gaps rather than inventing language-specific node types.
4. **FileIndexResult-only output**: per ingest_spec §2.2–§2.3, language indexers emit
   `FileIndexResult[]` and do not write directly to storage.
5. **Registry-driven loading**: indexers register via `getLanguageIndexers()` (ingest_spec §3.6);
   language specs must document their `languageIds` and `canHandleFile` rules.

## 3. Per-language Specs

- **TypeScript/JavaScript**: see `languages/ts_ingest_spec.md` (SCIP-first via scip-typescript, TS
  compiler AST fallback, framework heuristics, node/edge coverage).
- **Python**: see `languages/python_ingest_spec.md` (SCIP-first via scip-python, libcst/pycg
  fallback, pytest/FastAPI/Flask heuristics, node/edge coverage).

## 4. Testing Expectations

- Unit + integration tests per ingest_spec §5.1C must cover each language’s extraction of symbols,
  references, calls, boundaries, tests, and data contracts.
- Golden `FileIndexResult` fixtures required for representative files in each language spec.
- Tests must cite the governing language section (e.g., `ts_ingest_spec §3.2.1`).

## 5. Changelog

| Date       | Version | Editor | Summary                                                  |
| ---------- | ------- | ------ | -------------------------------------------------------- |
| 2025-12-18 | 0.2     | @agent | Added cross-cutting rules; linked to per-language specs. |
| 2025-12-08 | 0.1     | @agent | Placeholder created; referenced ingest_spec §5.          |

## 6. References

- [Ingest Specification](./ingest_spec.md) – Language indexers (§5), interface (§4)
- [Nx Layout Spec](./nx_layout_spec.md) – Indexer module structure (§2.3)
