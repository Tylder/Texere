# Async Transport Specification (v0 - Placeholder)

**Status:** Placeholder  
**Audience:** Backend, Frontend  
**Last Updated:** 2025-12-05

## 1. Overview

The Async Transport layer delivers incremental results, state updates, and events from the Orchestration Core to clients asynchronously, supporting long-running workflows without blocking client connections.

This spec defines:
- Streaming protocol choice (SSE vs. WebSocket)
- Event types and serialization
- Backpressure and flow control
- Reconnection semantics
- Message ordering and delivery guarantees

## 2. Scope

(TBD)

## 3. Protocol Selection

(TBD)

## 4. Event Types & Schema

(TBD)

## 5. Backpressure & Flow Control

(TBD)

## 6. Reconnection Semantics

(TBD)

## 7. Message Ordering & Guarantees

(TBD)

## 8. Future Refinements

(TBD)

---

**See also:**
- [High-Level Architecture Spec](high_level_architecture_spec.md)
- [API & Gateway Spec](./api_gateway_spec.md)
- [TS Client Library Spec](./client_library_spec.md)
