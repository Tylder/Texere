# Texere — Services Catalog & Spec Plan

This catalog lists the distinct services Texere will implement as standalone specs, with scope, key operations, risks, and how they compose. Use this to author one spec file per service.

---

## Core, always‑on services (author these first)

### 1) Repository Service
**Purpose:** Uniform access to local FS, Git, and GitHub.  
**Key ops:** `list_files()`, `read_file()`, `write_patch()`, `git_diff()`, `open_pr()`.  
**Risks:** `WRITE_LOCAL`; protected paths; token scopes; PR‑only policy.

### 2) Parsing & Symbol Service
**Purpose:** Language‑aware parsing (Tree‑sitter) and symbol maps.  
**Key ops:** `detect_lang(path)`, `parse(file) -> AST`, `symbols(file) -> defs/refs`, `chunk(file) -> blocks`.  
**Risks:** LOW (compute only).

### 3) Keyword Index Service (BM25)
**Purpose:** Fast term search over chunks.  
**Key ops:** `upsert(chunk_id, text, meta)`, `delete(chunk_id)`, `topk(query, k, filters)`.  
**Risks:** LOW; size limits.

### 4) Embedding & Vector Index Service
**Purpose:** Embeddings + vector search (FAISS/Qdrant).  
**Key ops:** `embed(texts)`, `upsert(ids, vectors)`, `search(vector, k)`.  
**Risks:** LOW; model/version pinning.

### 5) Retrieval Orchestrator Service
**Purpose:** Hybrid pipeline (symbol/file narrow → BM25 → vector re‑rank → final‑K).  
**Key ops:** `search(query, filters) -> [Evidence]`.  
**Policy:** Single source of truth for `k` (shared `RetrievalConfig.resolve_k()`).  
**Risks:** LOW; enforces caps.

### 6) LLM Adapter Service
**Purpose:** Provider‑agnostic generation with streaming, JSON mode, tool‑calls, budgets.  
**Key ops:** `generate(messages, options) -> LLMResponse`, `stream(...) -> events`.  
**Risks:** LOW; budget/time caps; telemetry.

### 7) HITL Policy Service
**Purpose:** Risk assessment + approvals middleware around every node.  
**Key ops:** `pre_node(node, meta, runtime) -> {ALLOW|HITL|DENY}`, `post_node(...)`.  
**Risks:** N/A (governs others); env‑aware.

### 8) Telemetry & Audit Service
**Purpose:** Tracing, metrics, JSONL logs, redaction.  
**Key ops:** `log_event()`, `collect_usage(node, t0)`.  
**Risks:** PII redaction; storage quotas.

### 9) Config & Secrets Service
**Purpose:** Typed config, env overlays, secret loading, validation.  
**Key ops:** `load()`, `validate()`, `get(path)`.  
**Risks:** Secret handling; redaction.

---

## Editing & execution services (next wave)

### 10) Patch Propose/Verify/Apply Service
**Purpose:** Create diffs, enforce caps, apply with rollback.  
**Key ops:** `propose(goal, context) -> diff`, `verify(diff)`, `apply(diff)`.  
**Risks:** HIGH (`WRITE_LOCAL`); protected paths; size thresholds; PR policy.

### 11) Executor Service (Host/Docker)
**Purpose:** Run allowlisted commands; optional container sandbox.  
**Key ops:** `run(cmd, timeout) -> {exit, stdout, artifacts}`.  
**Risks:** MED/HIGH (`EXECUTE`); allowlist; resource caps; network policy.

---

## Web & external knowledge (optional)

### 12) Web Search Service
**Purpose:** API‑based search (Google CSE/Brave/Bing).  
**Key ops:** `search(q, k, site?, recency_days?) -> results`.  
**Risks:** Quotas; ToS compliance.

### 13) Web Fetch & Extract Service
**Purpose:** HTTP fetch + boilerplate removal + text extraction.  
**Key ops:** `get(url)`, `extract(response) -> {title,text,meta}`, `chunk(doc)`.  
**Risks:** `NET_READ`; robots.txt; domain allowlists; payload caps.

---

## Cross‑cutting / platform services

### 14) Project Profile Service
**Purpose:** SQLite metadata + index pointers; commit tracking; embeddings cache.  
**Key ops:** `get_profile(repo_id)`, `update_commit(sha)`, `list_changes(since_sha)`.  
**Risks:** LOW; integrity & migrations.

### 15) State & Checkpoint Service
**Purpose:** Thread/run checkpoints; resume/rollback; redaction.  
**Key ops:** `save(run_id, state)`, `load(run_id)`.  
**Risks:** PII/secrets scrubbing; size caps.

### 16) MCP Exposure Service (optional)
**Purpose:** Expose selected tools over Model Context Protocol.  
**Key ops:** `register_tool(spec, handler)`, `serve()`.  
**Risks:** Rate limits; auth.

---

## Composition at runtime
- **Indexing loop:** Repository → Parsing/Symbol → Keyword Index + Vector Index → Project Profile updated.  
- **Query loop:** Retrieval Orchestrator → (BM25 + Vector) → Evidence → LLM Adapter (JSON/tool‑calls) → Patch/Exec as needed.  
- **Governance:** HITL Policy wraps every node; Telemetry logs everything; Config/Secrets feeds all.

---

## What gets its own spec file (and must include)
- Repository Service — API, auth, path safety, PR policy, examples.  
- Parsing & Symbol Service — per‑language rules, chunking, exclusions.  
- Keyword Index Service — schema, filters, performance targets.  
- Embedding & Vector Index Service — model/versioning, cache keys, rebuilds.  
- Retrieval Orchestrator Service — scoring, `k` resolution, dedupe, quality metrics.  
- LLM Adapter Service — types, streaming/events, budgets, error taxonomy.  
- HITL Policy Service — risk tags, thresholds, env matrix, wrapper contract.  
- Telemetry & Audit Service — log schema, metrics, dashboards, redaction.  
- Config & Secrets Service — schema, precedence, validation.  
- Patch Service — diff JSON schema, verify caps, rollback, commit/PR rules.  
- Executor Service — allowlist, timeouts, sandbox profiles, artifact handling.  
- Web Search / Fetch & Extract — compliance, quotas, extraction quality.  
- Project Profile Service — SQLite DDL, directory layout, migration.  
- State & Checkpoint Service — retention, redaction, resume semantics.  
- MCP Exposure Service — tool catalog, rate limits, auth.

---

## MVP priority
1) Repository, Parsing/Symbol, Keyword Index, Embedding/Vector Index, Project Profile, Retrieval Orchestrator.  
2) LLM Adapter, Telemetry/Audit, Config/Secrets, HITL Policy (baseline).  
3) Patch + Executor.  
4) Web Search/Fetch.  
5) MCP Exposure.

---

## Quick choices to lock
1) **Index backends:**  
   - A) Whoosh + FAISS (local, OSS) — *recommended*  
   - B) Elasticsearch + Qdrant/Pinecone (managed)
2) **Embedding model v1:**  
   - A) Small OSS (e.g., bge-small) — *recommended*  
   - B) OpenAI `text-embedding-3-small`
3) **Sandbox for execution:**  
   - A) Host allowlist (v0), Docker later — *recommended*  
   - B) Docker from day one

*Reply with selections (e.g., 1A, 2A, 3A) and I’ll draft the first two service specs (Repository; Parsing & Symbol).*

