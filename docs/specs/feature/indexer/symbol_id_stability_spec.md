# Texere Indexer – Git Diff & Symbol ID Stability Specification

**Document Version:** 0.1 (Placeholder)  
**Last Updated:** December 2025  
**Status:** Pending Implementation

## Overview

This specification defines symbol ID stability, Git diff strategies, and handling of file renames,
moves, and code transformations across Snapshots.

## Scope

- Symbol ID generation algorithm (path + name + range)
- Git rename detection and handling
- Symbol movement detection (moved code)
- Method extraction and range tracking
- Incremental diff merge strategy for large changes
- Deleted/modified file handling

## Out of Scope

- Advanced similarity heuristics (covered separately)
- Commit message parsing for context
- Multi-repo diff strategies (v2+)

## Table of Contents

1. [Symbol ID Algorithm](#1-symbol-id-algorithm)
2. [Git Diff Strategy](#2-git-diff-strategy)
3. [File Rename Handling](#3-file-rename-handling)
4. [Symbol Movement](#4-symbol-movement)
5. [Changelog](#5-changelog)

---

## 1. Symbol ID Algorithm

### 1.1 Symbol ID Generation

_(To be detailed: path + name + range formula, collision handling)_

### 1.2 ID Stability Within Snapshot

_(To be detailed: deterministic ID generation per Snapshot)_

---

## 2. Git Diff Strategy

### 2.1 Diff Computation

_(To be detailed: added, modified, deleted, renamed file detection)_

### 2.2 Incremental Behavior

_(To be detailed: partial indexing strategy for large diffs)_

---

## 3. File Rename Handling

### 3.1 Rename Detection

_(To be detailed: Git rename threshold and detection)_

### 3.2 Rename as Delete + Add

_(To be detailed: v1 strategy of treating renames as delete + add)_

---

## 4. Symbol Movement

### 4.1 Moved Code Detection

_(To be detailed: detecting symbols moved to different files)_

### 4.2 Range-Based Continuity

_(To be detailed: approach for tracking symbol continuity)_

---

## 5. Changelog

| Date       | Version | Editor | Summary                                                                       |
| ---------- | ------- | ------ | ----------------------------------------------------------------------------- |
| 2025-12-08 | 0.1     | @agent | Placeholder created; references ingest_spec.md §5.5. Symbol ID algorithm TBD. |

---

## References

- [Ingest Specification](./ingest_spec.md) – Symbol ID stability (§5.5), incremental behavior (§2.5)
- [README.md](./README.md) – Incremental indexing goals (§3.1)
