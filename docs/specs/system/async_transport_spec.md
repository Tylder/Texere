# Async Transport Specification

**Document Version:** 0.1  
**Last Updated:** December 2025  
**Status:** Placeholder

**Relationship:** Implements layer defined in [high-level spec § 5.2](../README.md#52-api--transport-layer)

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Audience](#2-audience)
- [3. Overview](#3-overview)
- [4. Protocol Selection](#4-protocol-selection)
- [5. Event Types & Schema](#5-event-types--schema)
- [6. Backpressure & Flow Control](#6-backpressure--flow-control)
- [7. Reconnection Semantics](#7-reconnection-semantics)
- [8. Message Ordering & Guarantees](#8-message-ordering--guarantees)
- [9. Non-Functional](#9-non-functional)
- [10. References](#10-references)
- [11. Changelog](#11-changelog)

---

## 1. Scope

**In Scope (§1):**

- Streaming protocol selection (SSE vs. WebSocket)
- Event type definitions and serialization format
- Backpressure handling and flow control
- Reconnection semantics and error recovery
- Message ordering and delivery guarantees
- Integration with orchestration core event emitters

**Out of Scope (§1):**

- API endpoint design (covered in `api_gateway_spec.md`)
- Client-side implementation (covered in `client_library_spec.md`)
- Infrastructure and deployment (covered in `persistence_infra_spec.md`)

**Cite as:** §1

## 2. Audience

This specification is written for:
- **Backend Engineers:** Implementing streaming layer and event emission
- **Frontend Engineers:** Consuming streaming events and handling reconnections
- **Observability Team:** Understanding event types for instrumentation
- **DevOps:** Understanding performance and resource implications

**Cite as:** §2

## 3. Overview

The Async Transport layer delivers incremental results, state updates, and events from the Orchestration Core to clients asynchronously, supporting long-running workflows without blocking client connections.

**Status:** This spec is currently a placeholder. Key sections are TBD pending protocol selection.

**Cite as:** §3

## 4. Protocol Selection

**(TBD) Evaluate and decide:**

- **Server-Sent Events (SSE):** Simpler, HTTP-based, one-way streaming
  - Pros: HTTP/1.1 compatible, easier load balancing, no special proxying
  - Cons: One-way only; client→server requires separate HTTP requests
  
- **WebSockets:** Full-duplex, persistent connection
  - Pros: Bidirectional; lower latency; good for real-time
  - Cons: Requires special proxy support; stateful connections

**Decision owner:** TBD

**Cite as:** §4

## 5. Event Types & Schema

**(TBD) Define:**

- Event envelope structure (type, timestamp, data, metadata)
- Event types emitted (node_start, node_end, tool_call, tool_result, error, interrupt, message_add, etc.)
- Serialization format (JSON schema)
- Optional compression (gzip, etc.)

**Owner:** TBD

**Cite as:** §5

## 6. Backpressure & Flow Control

**(TBD) Define:**

- How server handles slow clients
- Buffering strategy for events
- Dropping vs. queueing behavior
- Client flow control signals

**Owner:** TBD

**Cite as:** §6

## 7. Reconnection Semantics

**(TBD) Define:**

- Detecting client disconnect
- Buffering events during disconnection
- Replay strategy (from last ack, from timestamp, none)
- Max reconnect wait time
- Client-side exponential backoff recommendation

**Owner:** TBD

**Cite as:** §7

## 8. Message Ordering & Guarantees

**(TBD) Define:**

- Message ordering guarantees (strict, per-stream, none)
- Delivery guarantee (at-most-once, at-least-once, exactly-once)
- Event sequence numbering
- Idempotency for retried events

**Owner:** TBD

**Cite as:** §8

## 9. Non-Functional

### 9.1 Performance Targets

- **Event latency:** <50ms p95 from emission to client receipt
- **Throughput:** TBD (events/second depending on workflow complexity)
- **Connection establishment:** <100ms p95

**Cite as:** §9.1

### 9.2 Reliability

- **Message delivery:** TBD (at-least-once or exactly-once target)
- **Connection uptime:** Target matching overall API uptime
- **Reconnection success rate:** >99% for clients within reconnect window

**Cite as:** §9.2

### 9.3 Scalability

- **Concurrent connections:** TBD (e.g., 10K+ per instance)
- **Memory per connection:** <1MB per active connection
- **Horizontal scaling:** TBD (load balancing strategy)

**Cite as:** §9.3

## 10. References

### External Documentation

- **Server-Sent Events (SSE):** https://html.spec.whatwg.org/multipage/server-sent-events.html
- **WebSockets:** https://tools.ietf.org/html/rfc6455
- **LangGraph Streaming:** https://docs.langchain.com/oss/python/langgraph/streaming
- **gRPC Streaming:** https://grpc.io/docs/guides/performance-best-practices/

### Internal Documentation

- [Texere High-Level Spec](../README.md) — System overview and component relationships
- [API & Gateway Spec](./api_gateway_spec.md) — HTTP endpoints and request/response contracts
- [Orchestration Core Spec](./orchestration_core_spec.md) — Workflow engine and event emission
- [Client Library Spec](./client_library_spec.md) — TypeScript client consumption patterns

**Cite as:** §10

## 11. Changelog

| Date | Version | Editor | Summary |
| --- | --- | --- | --- |
| Dec 5, 2025 | 0.1 | @agent | Upgraded to Placeholder spec per spec_writing.md standards; added Scope, Audience, Quick Navigation, Non-Functional, Changelog sections; renumbered and numbered all sections for citability (§1–§11); marked TBD items with owners. |

**Cite as:** §11
