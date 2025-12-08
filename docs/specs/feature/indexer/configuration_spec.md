# Texere Indexer – Configuration & Environment Specification

**Document Version:** 0.1 (Placeholder)  
**Last Updated:** December 2025  
**Status:** Pending Implementation

## Overview

This specification defines environment variables, configuration files, and runtime configuration for
the Texere Indexer.

## Scope

- Environment variables and defaults
- Configuration file formats (YAML, JSON, or .env)
- Tracked branches configuration
- Allow/deny lists for sensitive paths
- Embedding and LLM model selection
- Graph and vector store connection strings
- Worker pool size and retry policies

## Out of Scope

- Deployment procedures (handled elsewhere)
- Operational runbooks
- Secret management (vault integration)

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Configuration Files](#2-configuration-files)
3. [Tracked Branches](#3-tracked-branches)
4. [Security Lists](#4-security-lists)
5. [Changelog](#5-changelog)

---

## 1. Environment Variables

### 1.1 Required Variables

_(To be detailed: NEO4J_URI, QDRANT_URL, etc.)_

### 1.2 Optional Variables

_(To be detailed: defaults and overrides)_

---

## 2. Configuration Files

### 2.1 indexer.config.yaml

_(To be detailed: structure, schema)_

---

## 3. Tracked Branches

### 3.1 Branch Configuration

_(To be detailed: format for specifying tracked branches)_

---

## 4. Security Lists

### 4.1 Deny List for Sensitive Paths

_(To be detailed: .env, secrets patterns)_

### 4.2 Allow List for Code Paths

_(To be detailed: optional allow-only mode)_

---

## 5. Changelog

| Date       | Version | Editor | Summary                                        |
| ---------- | ------- | ------ | ---------------------------------------------- |
| 2025-12-08 | 0.1     | @agent | Placeholder created. Configuration schema TBD. |

---

## References

- [Ingest Specification](./ingest_spec.md) – Snapshot selection (§6.1), security (§6.5)
- [README.md](./README.md) – Performance targets (§8.1), security (§8.4)
