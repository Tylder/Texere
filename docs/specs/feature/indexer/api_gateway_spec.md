# Texere Indexer – API Gateway & HTTP Interface Specification

**Document Version:** 0.1 (Placeholder)  
**Last Updated:** December 2025  
**Status:** Pending Implementation

## Overview

This specification defines the HTTP REST API interface for the Texere Indexer, exposing the three
main query bundles and administrative operations.

## Scope

- REST endpoint definitions and HTTP method conventions
- Request/response schemas (JSON)
- Error handling and status codes
- Optional rate limiting and authentication
- OpenAPI documentation structure

## Out of Scope

- gRPC interface (considered for future versions)
- WebSocket support
- Pagination strategies beyond next-token

## Table of Contents

1. [Query Endpoints](#1-query-endpoints)
2. [Administrative Endpoints](#2-administrative-endpoints)
3. [Error Responses](#3-error-responses)
4. [Rate Limiting](#4-rate-limiting-optional)
5. [Changelog](#5-changelog)

---

## 1. Query Endpoints

### 1.1 GET /api/features/{featureName}/context

_(To be detailed: getFeatureContext endpoint)_

**Request**:

```
GET /api/features/{featureName}/context?depth=2
```

**Response**: FeatureContextBundle (see README.md §6.1)

---

### 1.2 GET /api/boundaries/patterns

_(To be detailed: getBoundaryPatternExamples endpoint)_

**Request**:

```
GET /api/boundaries/patterns?limit=10
```

**Response**: Array of BoundaryPatternExample

---

### 1.3 GET /api/incidents/{incidentId}/slice

_(To be detailed: getIncidentSlice endpoint)_

**Request**:

```
GET /api/incidents/{incidentId}/slice
```

**Response**: IncidentSliceBundle (see README.md §6.3)

---

## 2. Administrative Endpoints

### 2.1 POST /api/snapshots/reindex

_(To be detailed: trigger reindexing)_

### 2.2 GET /api/snapshots/{codebaseId}

_(To be detailed: inspect recent snapshots)_

---

## 3. Error Responses

### 3.1 Standard Error Format

_(To be detailed: HTTP status codes, error codes, messages)_

---

## 4. Rate Limiting (Optional)

_(To be detailed: rate limits, headers, quota management)_

---

## 5. Changelog

| Date       | Version | Editor | Summary                                                                     |
| ---------- | ------- | ------ | --------------------------------------------------------------------------- |
| 2025-12-08 | 0.1     | @agent | Placeholder created; references README.md §6 (Query API). OpenAPI spec TBD. |

---

## References

- [README.md](./README.md) – Query API contracts (§6)
- [Nx Layout Spec](layout_spec.md) – Serving layer (§3)
