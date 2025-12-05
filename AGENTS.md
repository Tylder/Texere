# Texere Agent Guidelines

Ground truth for agent behavior, code modification protocols, and project conventions.

## 🚨 CRITICAL REQUIREMENTS (MANDATORY)

### **Code Modification Protocol**

**⚠️ VIOLATION CONSEQUENCES: Any code modification without following this protocol will be rejected.**

After **ANY** prompt that modifies, creates, or deletes code:

1. **IMMEDIATELY** run `make format` to format all code
2. **IMMEDIATELY** run `make lint` to check for linting errors
3. **FIX** any linting errors reported
4. **RUN** `make test` to verify tests still pass
5. **INCLUDE** complete validation results in response
6. **REPORT** any failures with specific error details
7. **NEVER** respond to user without validation confirmation

### **Validation Commands (in order)**

```bash
# Activate venv first (if not already active)
source venv/bin/activate

# 1. Format code (auto-fixes most style issues)
make format

# 2. Lint code (identifies remaining issues)
make lint

# 3. Run tests
make test

# OR run all three at once
make check
```

**All three must pass before responding to the user.**

### **Make Targets Available**

```bash
make install        # Install dev dependencies + setup pre-commit hooks
make format         # Format code with Black + Ruff
make lint           # Check linting with Ruff + type checking with mypy
make test           # Run pytest
make test-watch     # Run pytest in watch mode
make test-coverage  # Run pytest with coverage report
make check          # Run lint + test (all checks)
```

---

## Code Quality Tools

- **Black** — Code formatter (opinionated, enforces consistency)
- **Ruff** — Fast linter (replaces flake8, pylint, isort, etc.)
- **mypy** — Static type checker (enforces type hints)
- **pytest** — Test runner

**Configuration:** All tools configured in `pyproject.toml`

---

## Communication Style

- **Concise:** One-word answers when possible; avoid unnecessary explanation.
- **Direct:** Answer the user's specific question without preamble or summary.
- **Professional:** No emojis; minimal exclamation points.
- **No flattery:** Skip positive adjectives; respond directly to the request.

## Server & Process Management

- **DO NOT start/stop servers** — assume LangGraph dev server is already running
- **DO NOT run long-lived processes** — use Bash for one-off commands only
- **USE Playwright MCP tools** for UI testing (browser_navigate, browser_snapshot, browser_click, etc.)
- **Playwright runs in Docker** — use `http://host.docker.internal:2024` (not localhost or 127.0.0.1)
- LangGraph API is at `http://host.docker.internal:2024/docs` for docs, etc.

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

---

## Code Style & Architecture

### **LangGraph v1.0+ Compliance**

- Follow LangGraph v1.0+ patterns and APIs
- Use built-in savers (`SqliteSaver`, `AsyncPostgresSaver`) instead of custom checkpointers
- Factory functions must accept optional `RunnableConfig` parameter for CLI/Studio compatibility
- Return types must be properly typed (`CompiledStateGraph[YourState]`)
- Validate against latest LangGraph documentation before implementing
- Check CODE_REVIEW_LANGGRAPH.md for known issues and patterns

### **Tests are Mandatory**

- **Every code change must have corresponding tests**
- New functions require unit tests
- New features require integration tests
- All tests must pass before code is committed

### **Prefer Pure Functions**

- Keep functions **pure** (no side effects, deterministic)
- Avoid global state and mutable dependencies
- Pure functions are easier to test and reason about
- Inject dependencies as parameters

### **Code Containment**

- Keep functions **small and focused** (single responsibility)
- Avoid deeply nested logic; prefer early returns
- Minimize coupling between modules
- Use clear, descriptive names
- Document non-obvious behavior

### **Example: Good vs. Bad**

**❌ Bad: Impure, hard to test**
```python
db = {}  # Global state

def process_request(user_id: int):
    db[user_id] = compute_something()  # Side effect
    return db[user_id]
```

**✅ Good: Pure, testable**
```python
def process_request(user_id: int, store: dict[int, Any]) -> Any:
    result = compute_something()
    return result  # Caller handles storage
```

---

## Project Structure

```
Texere/
├── src/texere/                    # Main source code
│   ├── orchestration/
│   │   ├── state.py              # WorkflowState definition
│   │   └── graph.py              # LangGraph implementation
├── tests/                         # Test suite
│   ├── test_workflow_state.py
│   ├── test_graph_compilation.py
│   └── test_checkpoint_persistence.py
├── docs/
│   └── specs/                     # Architecture specifications
├── pyproject.toml                # Project configuration + tool settings
├── Makefile                       # Development commands
├── .pre-commit-config.yaml       # Git hooks configuration
├── .github/workflows/lint.yml    # CI/CD linting workflow
└── README.md                      # Setup & development guide
```

## Glossary (Texere-specific)

- **Orchestration Core:** Python + LangGraph service executing workflows
- **Thread:** Long-lived context tied to user, repo, or project
- **Run:** Individual workflow execution on a thread
- **Async Transport:** Streaming mechanism (SSE/WebSockets) for client–server communication
- **TS Client Library:** Shared TypeScript library for all frontends
- **Tool:** Internal service invoked by core (code search, AST, test runner, VCS)

---

## Specifications

**Always refer to specifications for architecture decisions and design patterns:**

- [Spec Index](docs/specs/README.md) — Entry point for all architecture specs
- [High-Level Architecture Spec](docs/specs/system/high_level_architecture_spec.md) — System overview and components
- Implementation specs in `docs/specs/` for detailed design decisions

## Notes

- Code that violates pure function principles or lacks tests will be rejected
- CI/CD enforces format, lint, and test requirements—local validation is your responsibility
- Use `.github/workflows/lint.yml` as reference for what CI will check
