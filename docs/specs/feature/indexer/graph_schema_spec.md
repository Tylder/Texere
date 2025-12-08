# Texere Indexer – Graph Database Schema Specification

**Document Version:** 0.1 (Placeholder)  
**Last Updated:** December 2025  
**Status:** Pending Implementation

## Overview

This specification defines the Neo4j/Memgraph schema for the Texere Knowledge Graph, including:

- Node type definitions and properties
- Edge type definitions and constraints
- Index strategy for query performance
- Cypher query patterns for the three main API bundles

## Scope

- Node type DDL (CREATE CONSTRAINT, property indexes)
- Edge type definitions and relationship cardinality
- Query indexes and performance strategy
- Cypher query patterns for getFeatureContext, getEndpointPatternExamples, getIncidentSlice

## Out of Scope

- Database selection rationale (covered in README.md §7.1)
- Backup/restore procedures
- Multi-database federation (v2+)

## Table of Contents

1. [Node Type Schema](#1-node-type-schema)
2. [Edge Type Schema](#2-edge-type-schema)
3. [Index Strategy](#3-index-strategy)
4. [Cypher Query Patterns](#4-cypher-query-patterns)
5. [Changelog](#5-changelog)

---

## 1. Node Type Schema

### 1.1 Codebase

```cypher
CREATE CONSTRAINT codebase_id_unique IF NOT EXISTS
FOR (n:Codebase) REQUIRE n.id IS UNIQUE;
```

**Properties**:

- `id` (string, PK): Codebase identifier
- `name` (string): Human-readable name
- `url` (string, optional): Repository URL
- `createdAt` (timestamp): When indexed began

---

## 2. Edge Type Schema

_(To be detailed)_

---

## 3. Index Strategy

_(To be detailed)_

---

## 4. Cypher Query Patterns

### 4.1 getFeatureContext Pattern

_(To be detailed)_

### 4.2 getEndpointPatternExamples Pattern

_(To be detailed)_

### 4.3 getIncidentSlice Pattern

_(To be detailed)_

---

## 5. Changelog

| Date       | Version | Editor | Summary                                                          |
| ---------- | ------- | ------ | ---------------------------------------------------------------- |
| 2025-12-08 | 0.1     | @agent | Placeholder created; references README.md §7.1. Core schema TBD. |

---

## References

- [Texere Indexer README](./README.md) – High-level schema overview (§4)
- [Ingest Specification](./ingest_spec.md) – Data flow into graph
