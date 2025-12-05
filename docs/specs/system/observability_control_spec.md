# Observability & Control Specification

**Document Version:** 0.1  
**Last Updated:** December 2025  
**Status:** Placeholder

**Relationship:** Supports all layers defined in [high-level spec § 5](../README.md#5-architecture-overview)

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Audience](#2-audience)
- [3. Overview](#3-overview)
- [4. Tracing Strategy](#4-tracing-strategy)
- [5. Logging Standards](#5-logging-standards)
- [6. Metrics Collection](#6-metrics-collection)
- [7. Debugging & Introspection](#7-debugging--introspection)
- [8. Operational Dashboards](#8-operational-dashboards)
- [9. Non-Functional](#9-non-functional)
- [10. References](#10-references)
- [11. Changelog](#11-changelog)

---

## 1. Scope

**In Scope (§1):**

- Distributed tracing strategy and instrumentation
- Structured logging standards and aggregation
- Metrics collection and time-series storage
- Developer-facing debugging UIs and tools
- Operational dashboards and alerts
- Compliance and audit logging

**Out of Scope (§1):**

- Performance profiling tools (separate profiling spec)
- Cost monitoring and optimization (separate finance spec)
- User analytics (separate product analytics spec)

**Cite as:** §1

## 2. Audience

This specification is written for:
- **Backend & Platform Engineers:** Instrumenting code and managing tracing/logging
- **Site Reliability Engineers:** Operating and monitoring production systems
- **Observability Team:** Managing infrastructure for traces, logs, metrics
- **Developers:** Debugging issues using tracing and logging output

**Cite as:** §2

## 3. Overview

Observability & Control provides visibility, debugging, and operational control for Texere workflows, including traces, logs, metrics, and developer-facing debugging interfaces.

**Status:** Tracing backend decided and implemented. Logging and metrics (TBD).

**Current Implementation (Decision Made §5.1):**
- **Distributed Tracing:** Langfuse v3 (open-source, self-hosted)
- **LLM Integration:** Automatic via Langfuse LangChain callback handler
- **Deployment:** Separate Docker Compose stack (see `docker-compose.langfuse.yml`)

**Cite as:** §3

## 4. Tracing Strategy

### 4.1 Distributed Tracing (DECIDED)

**Decision: Langfuse v3 (Self-Hosted)**

Texere uses [Langfuse v3](https://langfuse.com) for distributed tracing:

- **Why Langfuse:**
  - ✅ Open-source (GitHub, self-hostable, no vendor lock-in)
  - ✅ First-class LangGraph support via LangChain callback handler
  - ✅ Full tracing: LLM calls, tool invocations, node execution, latencies, token counts
  - ✅ Production-ready: ClickHouse for analytics, PostgreSQL for transactional data
  - ✅ Flexible deployment: Local Docker Compose, Kubernetes, cloud VMs
  - ❌ Not LangSmith: Avoids vendor lock-in and cost concerns

- **Comparison (Rejected Options):**
  - **LangSmith:** Vendor lock-in, proprietary, tied to LangChain pricing
  - **OpenTelemetry (OTEL):** Lower-level, requires more instrumentation, no LLM-specific features
  - **Jaeger:** Strong for distributed systems, weak for LLM-specific metrics

**Implementation Details (§5.1 onwards):**

See [Implementation: Langfuse Integration](#5-langfuse-implementation) below.

**Decision record:** Decision made 2025-12-05. Langfuse provides the right balance of openness, LLM-specific features, and operational simplicity.

**Cite as:** §4.1

### 4.2 Instrumentation Points

**(TBD) Define:**

- Node start/end with duration
- Tool invocation (input, output, latency)
- Message additions and mutations
- Checkpoint saves
- Error and interrupt events
- LLM API calls (if direct integration)

**Owner:** TBD

**Cite as:** §4.2

## 5. Langfuse Implementation (DECIDED)

This section documents how Texere integrates Langfuse for observability.

### 5.1 Deployment Architecture

**Langfuse v3 Self-Hosted Stack** (see `docker-compose.langfuse.yml`):

```
┌─────────────────────────────────────────────────────┐
│ Langfuse Web (port 3000)                            │
│ - UI for trace inspection and analysis              │
│ - API for SDK integration                           │
└────────────────┬────────────────────────────────────┘
                 │
┌─────────────────────────────────────────────────────┐
│ Infrastructure                                       │
├──────────────────────────────────────────────────────┤
│ - PostgreSQL (5432): Transactional data & metadata   │
│ - ClickHouse (8123): Traces, observations, analytics │
│ - Redis (6379): Cache, queue, rate limiting          │
│ - MinIO (9000/9090): S3-compatible blob storage      │
│ - Langfuse Worker: Async trace processing           │
└──────────────────────────────────────────────────────┘
```

**Deployment Model:**
- Separate Docker Compose file (`docker-compose.langfuse.yml`)
- Runs independently from Texere core
- Optional for local dev, required for production observability

### 5.2 SDK Integration (LangChain Callback Handler)

**Implementation in `src/texere/orchestration/graph.py`:**

```python
from langfuse.langchain import CallbackHandler

def _get_langfuse_handler() -> Optional[CallbackHandler]:
    """Initialize Langfuse if LANGFUSE_PUBLIC_KEY is configured."""
    if not os.getenv("LANGFUSE_PUBLIC_KEY"):
        return None
    return CallbackHandler()

def create_workflow_graph(config: Optional[RunnableConfig] = None) -> Any:
    # ... build graph ...
    compiled = graph.compile(checkpointer=checkpointer)
    
    # Add automatic tracing if configured
    handler = _get_langfuse_handler()
    if handler:
        compiled = compiled.with_config({"callbacks": [handler]})
    
    return compiled
```

**Key Features:**
- ✅ **Automatic:** No manual span creation; callback captures all LLM calls, tool invocations, node execution
- ✅ **Full Context:** Traces include inputs, outputs, token counts, latencies, errors
- ✅ **Graceful Degradation:** If `LANGFUSE_PUBLIC_KEY` is missing, runs without observability
- ✅ **Zero Code Changes:** Works with existing LangGraph graphs without refactoring

### 5.3 Configuration

**Required Environment Variables:**

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...     # From Langfuse UI settings
LANGFUSE_SECRET_KEY=sk-lf-...     # From Langfuse UI settings
LANGFUSE_BASE_URL=http://localhost:3000  # Local or https://cloud.langfuse.com
```

**Setup for Local Development:**

1. Start Langfuse: `docker compose -f docker-compose.langfuse.yml up`
2. Open http://localhost:3000, create project, copy API keys
3. Set keys in `.env` file
4. Run Texere with normal commands; tracing happens automatically

**Setup for Cloud Deployment:**

1. Sign up at [cloud.langfuse.com](https://cloud.langfuse.com)
2. Create project, copy API keys
3. Set `LANGFUSE_BASE_URL=https://cloud.langfuse.com` (EU) or US region
4. Deploy Texere with credentials in secrets manager

### 5.4 Tracing Scope (Full)

Langfuse callback handler captures:

- **LangGraph Nodes:** Entry, exit, duration, state mutations
- **LLM Calls:** Model, input tokens, output tokens, latency, cost estimation
- **Tool Invocations:** Tool name, input/output, success/failure
- **Errors & Exceptions:** Caught and attached to spans with stack traces
- **Metadata:** User ID, session ID, custom tags (extensible)

**Token Counting:** Automatic via LangChain integration (counts tokens per LLM call, totals per trace).

### 5.5 Privacy & Security

- **Data Residence:** 
  - Local: Stored in PostgreSQL/ClickHouse on your infrastructure
  - Cloud: Stored in Langfuse Cloud data centers (check [regional availability](https://langfuse.com))
- **Network Isolation:** Langfuse runs in isolated Docker network; no automatic external calls
- **Data Retention:** Configurable per deployment; local deployments own their data fully
- **PII Handling:** Users responsible for scrubbing PII from LLM prompts before sending to Langfuse

**Cite as:** §5

### 4.3 Span Context & Baggage

**(TBD) Define:**

- Required span tags (user_id, thread_id, run_id, etc.)
- Baggage items for context propagation
- Sampling strategy (deterministic, probabilistic, etc.)

**Owner:** TBD

**Cite as:** §4.3

## 5. Logging Standards

### 5.1 Log Format

**(TBD) Define:**

- Structured JSON logging format
- Required fields (timestamp, level, message, context)
- Log levels and usage (DEBUG, INFO, WARN, ERROR, CRITICAL)

**Owner:** TBD

**Cite as:** §5.1

### 5.2 Log Aggregation

**(TBD) Define:**

- Log collection backend (ELK stack, Datadog, CloudWatch, etc.)
- Retention policies
- Log search and filtering capabilities
- Alerting on error patterns

**Owner:** TBD

**Cite as:** §5.2

## 6. Metrics Collection

### 6.1 Key Metrics

**(TBD) Define:**

- Workflow execution metrics (duration, success rate, errors)
- Tool invocation metrics (count, latency, errors)
- System health (CPU, memory, disk, network)
- API metrics (requests, latency, errors)
- Queue metrics (depth, processing latency)

**Owner:** TBD

**Cite as:** §6.1

### 6.2 Metrics Backend

**(TBD) Decide:**

- **Prometheus:** Open-source metrics database
- **Datadog:** Commercial APM platform
- **CloudWatch:** AWS native metrics
- **Other:** TBD

**Decision owner:** TBD

**Cite as:** §6.2

## 7. Debugging & Introspection

### 7.1 LangGraph Studio Integration

**(TBD) Define:**

- Visualization of workflow graph and execution
- Checkpoint navigation and state inspection
- Message history and tool call review
- Interactive debugging (step through, pause)

**Owner:** TBD

**Cite as:** §7.1

### 7.2 API for Introspection

**(TBD) Define:**

- Endpoints to query execution history
- State snapshot retrieval
- Tool call replay and inspection

**Owner:** TBD

**Cite as:** §7.2

## 8. Operational Dashboards

### 8.1 System Health Dashboard

**(TBD) Define:**

- Service uptime and error rates
- Resource utilization (CPU, memory, disk)
- Database and queue health
- Network latency and throughput

**Owner:** TBD

**Cite as:** §8.1

### 8.2 Workflow Analytics Dashboard

**(TBD) Define:**

- Workflow execution success rates
- Latency distribution
- Tool usage statistics
- Error trends and patterns

**Owner:** TBD

**Cite as:** §8.2

### 8.3 Alerting & On-Call

**(TBD) Define:**

- Alert rules and thresholds
- On-call rotation and escalation
- Incident communication channels
- Runbook linking

**Owner:** TBD

**Cite as:** §8.3

## 9. Non-Functional

### 9.1 Performance Impact

- **Tracing overhead:** <5% latency increase
- **Logging overhead:** <10% CPU increase
- **Metrics scraping:** <1s per scrape cycle

**Cite as:** §9.1

### 9.2 Data Retention

- **Traces:** TBD (e.g., 7 days)
- **Logs:** TBD (e.g., 30 days)
- **Metrics:** TBD (e.g., 1 year with downsampling)

**Cite as:** §9.2

### 9.3 Data Privacy

- **PII redaction:** Remove sensitive data from logs
- **Encryption:** Encrypt data in transit and at rest
- **Access control:** Limit who can view logs and traces

**Cite as:** §9.3

## 10. References

### External Documentation

- **LangGraph Observability:** https://docs.langchain.com/oss/python/langgraph/observability
- **LangSmith Documentation:** https://docs.smith.langchain.com/
- **OpenTelemetry:** https://opentelemetry.io/docs/
- **Prometheus Metrics:** https://prometheus.io/docs/
- **Distributed Tracing (Jaeger):** https://www.jaegertracing.io/docs/
- **ELK Stack (Logging):** https://www.elastic.co/guide/

### Internal Documentation

- [Texere High-Level Spec](../README.md) — System overview and component relationships
- [Orchestration Core Spec](./orchestration_core_spec.md) — Workflow engine and instrumentation hooks
- [API & Gateway Spec](./api_gateway_spec.md) — HTTP endpoints and error handling
- [Security & Policy Spec](./security_policy_spec.md) — Audit logging and compliance
- [Persistence & Infrastructure Spec](./persistence_infra_spec.md) — Storage for logs and traces

**Cite as:** §10

## 11. Changelog

| Date | Version | Editor | Summary |
| --- | --- | --- | --- |
| Dec 5, 2025 | 0.1 | @agent | Upgraded to Placeholder spec per spec_writing.md standards; added Scope, Audience, Quick Navigation, Non-Functional, Changelog sections; renumbered and numbered all sections for citability (§1–§11); marked TBD items with owners; organized by tracing, logging, metrics. |

**Cite as:** §11
