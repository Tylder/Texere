# Texere Agent Guidelines

Ground truth for agent behavior, code modification protocols, and project conventions.

## 🚨 CRITICAL REQUIREMENTS (MANDATORY)

### **Code Modification Protocol**

**⚠️ VIOLATION CONSEQUENCES: Any code modification without following this protocol will be rejected.**

After **ANY** prompt that modifies, creates, or deletes code:

1. **IMMEDIATELY** execute project validation commands
2. **VERIFY** all quality gates pass
3. **INCLUDE** complete validation results in response
4. **REPORT** any failures with specific error details
5. **NEVER** respond to user without validation confirmation

### **Validation Gates**

When code is modified, run these commands in order:

```bash
# Format check (if applicable to modified files)
# pnpm format:staged  # (when TypeScript/JS files modified)

# Type checking (Python core)
# mypy src/  # (when Python files modified)

# Linting (Python core)
# pylint src/  # (when Python files modified)

# Testing (when test coverage exists)
# pytest  # (Python tests)
# pnpm test  # (TS tests)

# Build (when applicable)
# pnpm build  # (TS frontends)
```

**Status:** TBD — Awaiting project setup to finalize exact commands.

---

## Communication Style

- **Concise:** One-word answers when possible; avoid unnecessary explanation.
- **Direct:** Answer the user's specific question without preamble or summary.
- **Professional:** No emojis; minimal exclamation points.
- **No flattery:** Skip positive adjectives; respond directly to the request.

## Planning vs. Implementation

- **Plan requests:** Provide discussion/analysis only. Require explicit approval before any code modifications.
- **Implicit requests:** Proceed with implementation and validation.

## Decision Points (Require User Approval)

Ask before making decisions about:

- Project quality standards and validation requirements
- Configuration changes affecting the entire codebase
- Architecture decisions affecting the entire codebase
- Changes to coding conventions or style guides
- Modifications to development workflows or processes
- Any change establishing new project standards

## Token Control

- **Soft gate:** 10,000 tokens — Begin summarizing before expanding
- **Hard gate:** 30,000 tokens or >$1 — Stop and propose options
- For repo-wide searches/reads, ask for narrowed glob patterns first
- Always scope reads to specific paths; avoid reading entire project root

## File Reading

- Use absolute paths only
- Prefer specific glob patterns over broad reads
- Read complete files (don't request specific line ranges if entire file fits)
- Don't re-read files already consumed in the conversation

## Code Search

- Use `finder` for semantic/conceptual searches
- Use `Grep` for exact text matches and symbol lookups
- Chain multiple targeted searches rather than one broad search

---

## Project-Specific Commands

(TBD: As development environment is set up, add project-specific:)

- Test suite invocation
- Format/lint commands
- Build commands
- CI/CD simulation
- Environment setup

## Glossary (Texere-specific)

- **Orchestration Core:** Python + LangGraph service executing workflows
- **Thread:** Long-lived context tied to user, repo, or project
- **Run:** Individual workflow execution on a thread
- **Async Transport:** Streaming mechanism (SSE/WebSockets) for client–server communication
- **TS Client Library:** Shared TypeScript library for all frontends
- **Tool:** Internal service invoked by core (code search, AST, test runner, VCS)

---

## Notes

- Reference [High-Level Architecture Spec](../docs/specs/system/high_level_architecture_spec.md) for system details
- Reference [Spec Index](../docs/specs/README.md) for documentation structure
