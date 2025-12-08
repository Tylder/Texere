# Texere Indexer – Vector Store & Embedding Specification

**Document Version:** 0.1 (Placeholder)  
**Last Updated:** December 2025  
**Status:** Pending Implementation

## Overview

This specification defines the Qdrant vector store schema and embedding strategy for the Texere
Knowledge Graph, enabling similarity-based queries across symbols, features, and specifications.

## Scope

- Vector payload schema for symbols, features, specs, and test cases
- Embedding model selection and dimensions
- Distance metrics and similarity thresholds
- Chunking strategy for large code blocks
- Vector lifecycle (generation, updates, cleanup)

## Out of Scope

- Vector search ranking algorithms (handled per query)
- Qdrant deployment or operational procedures
- Embedding model fine-tuning

## Table of Contents

1. [Embedding Strategy](#1-embedding-strategy)
2. [Vector Payload Schema](#2-vector-payload-schema)
3. [Similarity Queries](#3-similarity-queries)
4. [Lifecycle & Updates](#4-lifecycle--updates)
5. [Changelog](#5-changelog)

---

## 1. Embedding Strategy

### 1.1 Embedding Model

_(To be selected: OpenAI text-embedding-ada-002, Ollama local, or other)_

### 1.2 Dimensions & Distance Metric

_(To be specified: e.g., 1536 dims, cosine distance)_

---

## 2. Vector Payload Schema

### 2.1 Symbol Embedding

_(To be detailed)_

### 2.2 Feature Embedding

_(To be detailed)_

---

## 3. Similarity Queries

### 3.1 getFeatureContext – Similar Features

_(To be detailed)_

### 3.2 Call Graph Similarity

_(To be detailed)_

---

## 4. Lifecycle & Updates

### 4.1 Incremental Embedding

_(To be detailed: embedding only changed entities per Snapshot)_

### 4.2 Cleanup on Symbol Deletion

_(To be detailed)_

---

## 5. Changelog

| Date       | Version | Editor | Summary                                                              |
| ---------- | ------- | ------ | -------------------------------------------------------------------- |
| 2025-12-08 | 0.1     | @agent | Placeholder created; references README.md §7.1. Embedding model TBD. |

---

## References

- [Texere Indexer README](./README.md) – High-level storage (§7)
- [Ingest Specification](./ingest_spec.md) – Embedding scope (§6.4)
