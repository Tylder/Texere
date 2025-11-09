# Texere — HITL (Human‑In‑The‑Loop) Policy & Enforcement Spec

**Purpose**
Provide a single, consistent mechanism to **assess risk**, **gate execution**, and **audit** actions across all nodes/agents/tools in Texere without slowing safe paths. HITL lives in a **policy middleware wrapper** around every node, with fast‑path allow for low‑risk operations.

**Abbreviations (expanded once)**
- **HITL, Human‑In‑The‑Loop**  
- **RAG, Retrieval‑Augmented Generation**  
- **PII, Personally Identifiable Information**  
- **JSON, JavaScript Object Notation**  
- **CLI, Command Line Interface**

---

## 1. Scope & Goals
- **Single audit surface:** one place to evaluate risk, request approvals, and log outcomes for all packs (retrieval, patch, exec, web, docs, data).
- **Zero‑friction safe nodes:** low‑risk operations run with **no prompts**; wrapper overhead is negligible.
- **Deterministic policy:** same behavior from CLI, API, and subgraphs; policies are config‑driven and environment‑aware (dev/staging/prod).

Out of scope: identity management/SSO beyond an approver callback; enterprise workflow UIs.

---

## 2. Risk Model

### 2.1 Risk Levels
- **LOW** — read‑only or pure compute (e.g., retrieval, rerank, summarize, validate JSON).  
- **MEDIUM** — bounded side‑effects under allowlists (e.g., run allowlisted command, propose diff).  
- **HIGH** — direct writes or unbounded execution (e.g., apply patch, non‑allowlisted command, net write).

### 2.2 Capabilities (tags)
Attach capabilities to nodes/tools:
- `READ_LOCAL`, `WRITE_LOCAL`  
- `EXECUTE` (process run)  
- `NET_READ`, `NET_WRITE`  
- `PII_TOUCH`

### 2.3 Dynamic Thresholds (triggers)
- Lines/files changed; protected paths touched  
- Command allowlist/denylist; args patterns  
- Domains outside allowlist; robots.txt disallowed  
- Time/cost/token budgets exceeded  
- Volume caps: pages fetched, bytes read/written

---

## 3. Policy Matrix (by environment)

| Risk \ Env | Dev | Staging | Prod |
|---|---:|---:|---:|
| **LOW** | allow | allow | allow |
| **MEDIUM** | allow + audit | allow + audit | HITL on threshold |
| **HIGH** | HITL | HITL | HITL / deny if outside caps |

**Threshold examples**
- `max_lines_changed=500`, `max_files=10`  
- `allowed_paths=["src/**", "docs/**"]`  
- `allowed_commands=["test","lint","build","run"]`  
- `allowed_domains=["example.com","docs.company.com"]`  
- `max_pages=10`, `max_bytes_per_page=3MB`, `max_total_bytes=20MB`

---

## 4. Node Metadata

### 4.1 Decorator (pack authoring)
```python
# texere.core.policy
from pydantic import BaseModel

def node_meta(*, risk: str, capabilities: list[str], caps: dict|None=None):
    def wrap(fn):
        fn.__tex_meta__ = {
            "risk": risk,
            "capabilities": capabilities,
            "caps": caps or {}
        }
        return fn
    return wrap
```

### 4.2 Examples
```python
@node_meta(risk="LOW", capabilities=["READ_LOCAL"]) 
def retrieve_hybrid(state, ctx): ...

@node_meta(risk="MEDIUM", capabilities=["EXECUTE"], 
          caps={"allowed_commands":["test","lint","build","run"], "timeout_s":180})
def run_allowlisted(state, ctx): ...

@node_meta(risk="HIGH", capabilities=["WRITE_LOCAL"], 
          caps={"max_lines_changed":500, "allowed_paths":["src/**","docs/**"]})
def apply_patch(state, ctx): ...
```

---

## 5. Policy Interface & Decisions

```python
# texere.core.policy
class PreDecision(BaseModel):
    action: str               # "ALLOW" | "REQUIRE_HITL" | "DENY"
    reason: str
    evidence: dict = {}

class Policy(Protocol):
    def pre_node(self, node_name: str, meta: dict, runtime: dict, env: str) -> PreDecision: ...
    def post_node(self, node_name: str, usage: dict, outcome: dict) -> None: ...
    def denied(self, node_name: str, decision: PreDecision) -> dict: ...
```

**Runtime signals** delivered to `pre_node`: resolved budgets, computed diff stats, command line, domains to touch, robots result, etc.

---

## 6. Enforcement Wrapper (single audit surface)

```python
# texere.core.runner
from time import perf_counter

def run_node(node_fn, node_name, state, ctx):
    meta = getattr(node_fn, "__tex_meta__", {"risk":"LOW","capabilities":[],"caps":{}})
    runtime = ctx.runtime_signals(node_name, state)   # e.g., diff stats, command preview

    decision = ctx.policy.pre_node(node_name, meta, runtime, ctx.env)
    if decision.action == "DENY":
        ctx.audit.log(node=node_name, stage="denied", reason=decision.reason, evidence=decision.evidence)
        return ctx.policy.denied(node_name, decision)

    if decision.action == "REQUIRE_HITL":
        approved = ctx.hitl.request(
            node=node_name,
            reason=decision.reason,
            payload=decision.evidence,
            run_id=ctx.run_id
        )
        if not approved:
            return ctx.policy.denied(node_name, decision)

    t0 = perf_counter()
    try:
        new_state = node_fn(state)
        outcome = {"status":"ok"}
    except Exception as e:
        new_state = state
        outcome = {"status":"error","error":str(e)}
    finally:
        usage = ctx.telemetry.collect(node_name, t0)
        ctx.policy.post_node(node_name, usage, outcome)
        ctx.audit.log(node=node_name, stage="post", usage=usage, outcome=outcome)

    return new_state
```

- **Fast‑path allow:** LOW risk with no thresholds hit → no prompts.
- **HITL timing:** before execution of risky nodes.
- **Audit:** pre‑decision, post‑usage, and outcome in one place.

---

## 7. HITL UX (approvals)

**Data shown to approver**
- Node name, risk, capabilities  
- Reason (threshold crossed, non‑allowlisted command, protected path, domain outside allowlist, robots disallow)  
- Evidence: diff summary, command, domains, caps (limits & current values)  
- Environment (dev/staging/prod) and run_id

**Decision options**
- Approve once  
- Deny  
- Approve & remember for this run (auto‑approve identical follow‑ups)  
- Approve with overrides (tighten caps for this run)

**Channels**
- LangGraph interrupt (Studio)  
- CLI interactive prompt (fallback)  
- API webhook (enterprise)

---

## 8. Configuration

```toml
# texere policy config
[env]
current = "dev"  # dev|staging|prod

[risk.low]
action = "allow"

[risk.medium]
action = "allow"
thresholds = { lines=500, files=10 }

[risk.high]
action = "hitl"

default_caps = { max_pages=10, max_bytes_per_page="3MB", max_total_bytes="20MB" }

[allowlists]
commands = ["test","lint","build","run"]
paths = ["src/**","docs/**"]
domains = ["docs.company.com","example.com"]
```

---

## 9. Telemetry & Audit Log

**Captured fields**
- `run_id`, `node`, `env`, timestamps  
- Risk meta (level, capabilities), decision, approver id  
- Usage: latency, tokens, cost, retries  
- Side effects: files changed (counts/paths), commands run (exit code), domains fetched

**Storage**
- Local JSONL for dev; pluggable backend for prod (e.g., DB/ELK).  
- Redaction of secrets/PII at the adapter layer.

---

## 10. Integration Points
- **LLM adapter**: emits usage/finish events to policy, enabling budget enforcement in generation/streaming.  
- **Retrieval nodes**: tagged LOW; no prompts; still audited.  
- **Patch/Exec/Web nodes**: tagged MEDIUM/HIGH with caps; gates fire as configured.

---

## 11. Testing & CI Enforcement

1) **Unit tests** for `pre_node` decisions across envs and thresholds.  
2) **Golden traces** with expected decisions (ALLOW/HITL/DENY) for key workflows.  
3) **Import‑linter** contract to prevent cross‑pack imports; ensures all risk meta is local to nodes.  
4) **E2E test**: apply patch over caps → HITL; deny → no side effects.

---

## 12. Performance Targets
- Wrapper overhead for LOW risk nodes: < 1 ms per call (excluding telemetry write).  
- HITL prompt latency dominated by human response; node waits via interrupt.

---

## 13. Migration
- Packs add `@node_meta` gradually; default meta assumed `LOW` if absent.  
- Policy defaults to permissive in dev; stricter in staging/prod.  
- Existing graphs only wrap via `run_node` to gain auditability without code changes.

---

## 14. Examples

**A) Safe retrieval run (no prompts)**
- `retrieve_hybrid` (LOW) → allowed, audited → generate → verify.

**B) Patch apply exceeding cap**
- `apply_patch` wants to change 800 lines; cap=500 → `REQUIRE_HITL`; approver reduces cap to 600; run proceeds or is denied.

**C) Web fetch outside allowlist**
- `web_fetch_extract` targeting `randomsite.tld` with allowlist set → HITL; approver denies; node short‑circuits with policy‑denied outcome.

---

## 15. Rationale
Keeping HITL in a **single middleware** preserves consistency and auditability across all entry points while giving safe nodes a fast path. Policies remain declarative and environment‑aware, so teams can tune guardrails without editing node code or agent