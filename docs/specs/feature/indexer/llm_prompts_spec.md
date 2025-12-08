# Texere Indexer – LLM Prompts & Feature Mapping Specification

**Document Version:** 0.1 (Placeholder)  
**Last Updated:** December 2025  
**Status:** Pending Implementation

## Overview

This specification defines LLM prompt templates and expected outputs for feature mapping,
test↔feature association, and endpoint↔feature association within the Texere Indexer.

## Scope

- Prompt templates for feature mapping, test↔feature, endpoint↔feature
- JSON schema for LLM outputs
- Feature manifest format (features.yaml)
- Confidence and uncertainty handling
- Fallback strategies for LLM failures

## Out of Scope

- LLM model selection or fine-tuning
- Rate limiting or token budgets
- Multi-language LLM support beyond English

## Table of Contents

1. [Feature Manifest Format](#1-feature-manifest-format)
2. [LLM Prompts](#2-llm-prompts)
3. [Output Schemas](#3-output-schemas)
4. [Confidence & Fallback](#4-confidence--fallback)
5. [Changelog](#5-changelog)

---

## 1. Feature Manifest Format

### 1.1 features.yaml Structure

_(To be detailed: feature definitions, endpoints, symbols)_

---

## 2. LLM Prompts

### 2.1 Feature Mapping Prompt

_(To be detailed: map Symbol/Endpoint to Feature)_

### 2.2 Test↔Feature Mapping Prompt

_(To be detailed: link TestCase to Feature)_

### 2.3 Endpoint↔Feature Mapping Prompt

_(To be detailed: link Endpoint to Feature)_

---

## 3. Output Schemas

### 3.1 Feature Mapping Output

_(To be detailed: JSON structure with feature names, confidence, reasoning)_

---

## 4. Confidence & Fallback

### 4.1 Confidence Scoring

_(To be detailed: how to assess LLM confidence)_

### 4.2 Fallback Strategies

_(To be detailed: heuristic fallbacks when LLM uncertain)_

---

## 5. Changelog

| Date       | Version | Editor | Summary                                                                    |
| ---------- | ------- | ------ | -------------------------------------------------------------------------- |
| 2025-12-08 | 0.1     | @agent | Placeholder created; references ingest_spec.md §5.4. Prompt templates TBD. |

---

## References

- [Ingest Specification](./ingest_spec.md) – LLM usage context (§2.1C, §5.4)
- [Texere Indexer README](./README.md) – Graph model (§4.1.2, §4.3.3)
