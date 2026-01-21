# SPEC-<area>-<topic>

**Status:** Draft | Active | Revised

---

## Overview

Brief description of what this spec defines and why.

Example: "The export service API contract: endpoints, request/response schemas, error handling, and
rate limits for exporting data in various formats."

---

## Scope

What is included in this spec?

- Export API endpoints (GET, POST)
- Request/response schemas
- Error codes and handling
- Rate limiting and quotas
- CSV format specification

**Non-Scope:**

What is explicitly NOT included?

- Frontend UI/UX (covered in separate spec)
- Job queue implementation (internal detail)
- Long-term storage/archival
- Export scheduling

---

## Implements

Which Requirements does this Specification implement?

Note: One Spec can implement multiple Requirements. One Requirement can be implemented by multiple
Specs.

- REQ-<feature>.md#REQ-001
- REQ-<feature>.md#REQ-002
- REQ-<feature>.md#REQ-003

Example (pagination in search results):

- REQ-pagination-system.md#REQ-001 (offset/limit support)
- REQ-pagination-system.md#REQ-002 (metadata in response)
- REQ-pagination-system.md#REQ-003 (error handling)

---

## Interfaces & Observable Behavior

Exact APIs, state changes, or interactions.

### API Endpoint: POST /api/exports

**Request:**

```json
{
  "data_source": "string (required)",
  "format": "csv | json | parquet (required)",
  "filters": { "date_range": "...", ... },
  "timeout_seconds": 30
}
```

**Response (Success):**

```json
{
  "export_id": "uuid",
  "status": "completed | queued | in_progress",
  "download_url": "string or null",
  "progress_percent": 0-100,
  "estimated_seconds_remaining": 15
}
```

**Response (Error):**

```json
{
  "error_code": "TIMEOUT | INVALID_FORMAT | TOO_LARGE",
  "message": "Human-readable explanation",
  "retry_after_seconds": 30
}
```

---

## Data Models

Schemas for persistent or significant transient data.

### Export Record

```
{
  export_id: UUID (immutable)
  user_id: UUID
  data_source: string
  format: enum (CSV, JSON, Parquet)
  filters: JSON object
  status: enum (PENDING, RUNNING, COMPLETED, FAILED)
  created_at: timestamp
  completed_at: timestamp or null
  file_size_bytes: integer or null
  error_code: string or null
  error_message: string or null
}
```

### State Transitions

```
PENDING → RUNNING → COMPLETED (or FAILED)
PENDING → RUNNING → FAILED (with error details)
```

---

## Invariants

Rules that must always be true.

- Export status is immutable once COMPLETED or FAILED (no retries on the same record; user creates
  new export)
- File size is recorded only for COMPLETED exports
- Error message is recorded only for FAILED exports

---

## Error Semantics

Explicit error handling and failure modes.

| Error Code     | HTTP Status | Meaning                        | User Action                    |
| -------------- | ----------- | ------------------------------ | ------------------------------ |
| INVALID_FORMAT | 400         | Format not supported           | Choose different format        |
| TOO_LARGE      | 413         | Dataset exceeds limits         | Filter data or contact support |
| TIMEOUT        | 504         | Export didn't complete in time | Retry or use async option      |
| RATE_LIMIT     | 429         | Too many exports               | Wait and retry                 |
| INTERNAL_ERROR | 500         | Unexpected failure             | Contact support with export_id |

---

## Validation Approach

How conformance is verified (testing strategy).

**Unit Tests:**

- CSV formatter produces valid output
- Schema validation rejects invalid requests
- State machine enforces correct transitions

**Integration Tests:**

- Export completes within timeout for 1M rows
- Error handling returns correct error codes
- Concurrent exports don't interfere

**E2E Tests:**

- User can export, download, and open file
- Error scenarios show appropriate messages

---

## Performance Constraints

If applicable, explicit performance requirements.

- Export must complete within 30 seconds for datasets up to 1M rows
- API response time < 100ms (excluding export processing)
- Support 10 concurrent exports without queueing

---

## Q&A

**Q: Should streaming exports be supported to reduce memory use?**

- Streaming response (server sends rows as processed): lower memory, but complex
- Buffering (fetch all, then respond): simpler, higher memory
- Hybrid (buffer up to 100MB, then stream): balanced

A: Buffering for now. Implement lazy-loading for the frontend instead. Revisit if we see memory
pressure on large datasets.

**Q: How do we handle very large datasets (100M+ rows)?**

- Option A: Reject with INVALID_FORMAT or TOO_LARGE error
- Option B: Recommend user to contact support for data pipeline
- Option C: Async export with background job

A: Reject with TOO_LARGE. Document in help. Async exports (Option C) are a future REQ if demand
justifies.

**Q: What if export is requested while one is already running?**

- Queue the request (FIFO)
- Reject with "already running" error
- Allow multiple concurrent exports

A: Allow multiple concurrent exports. Implement rate limiting (max 10 per user) to prevent abuse.
