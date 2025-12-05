# Testing Strategy for Python Applications

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Active

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Overview: The Testing Trophy](#2-overview-the-testing-trophy)
- [3. Tool Responsibilities](#3-tool-responsibilities)
- [4. What to Test by Level](#4-what-to-test-by-level)
- [5. Python-Specific Considerations](#5-python-specific-considerations)
- [6. Folder Structure & Organization](#6-folder-structure--organization)
- [7. Setup: pytest Configuration](#7-setup-pytest-configuration)
- [8. Mocking & Patching](#8-mocking--patching)
- [9. Async/Await Testing](#9-asyncawait-testing)
- [10. Running Tests](#10-running-tests)
- [11. Anti-Patterns: What NOT to Test](#11-anti-patterns-what-not-to-test)
- [12. Coverage Goals](#12-coverage-goals)
- [13. CI/CD Integration](#13-cicd-integration)
- [14. References](#14-references)
- [15. Changelog](#15-changelog)

---

## 1. Scope

**In Scope:**

- High-level testing philosophy (testing trophy; level distribution)
- Tool selection and responsibilities (mypy, ruff, pytest, pytest-asyncio)
- What to test at each level (unit, integration, E2E)
- Python-specific testing patterns (async/await, type hints)
- Folder structure and test organization
- Fixture usage and setup configurations
- Mocking and patching strategies
- Anti-patterns and what NOT to test
- Coverage goals and targets
- CI/CD integration examples

**Out of Scope:**

- Detailed per-project configuration (covered in [testing_specification.md](./testing_specification.md))
- Specific command-line flags (see [testing_specification.md § 6](./testing_specification.md#6-commands--workflows))
- Nx monorepo orchestration (this is Python; monorepo patterns differ)
- Specific code examples for all test types (examples provided; see [testing_specification.md](./testing_specification.md) for exhaustive examples)

---

## 2. Overview: The Testing Trophy

### 2.1 Why Pyramid is Outdated

The **testing pyramid** (many unit tests, few integration tests) is outdated. Modern tools (pytest, mock libraries) make **integration tests** the largest, most valuable category.

**Cite as:** §2.1

### 2.2 The Testing Trophy Model

```
┌─────────────────────────────────┐
│   E2E Tests (Playwright/etc.)   │ ← Full app workflows, API integration
│         (Few, Slow)             │ → Highest confidence; real environment
├─────────────────────────────────┤
│  Integration Tests (pytest)     │ ← Components + mocked dependencies
│      (Many, Medium speed)       │ → **LARGEST SECTION (60-70%)**
├─────────────────────────────────┤   Highest ROI; catches real bugs
│   Unit Tests (pytest)           │ ← Pure functions, isolated logic
│      (Some, Very fast)          │ → Lowest confidence
├─────────────────────────────────┤
│   Static Tests (mypy, ruff)     │ ← Type checking, linting
│        (Very fast)              │ → Prevents broad categories of errors
└─────────────────────────────────┘
```

**Key Principle:** Integration tests have the highest return on investment (ROI).  
**Cite as:** §2.2

---

## 3. Tool Responsibilities

### 3.1 Testing Tools & Their Purposes

| Tool                       | Purpose                       | Environment      | Speed   | Confidence          | Cite As |
| -------------------------- | ----------------------------- | ----------------- | ------- | ------------------- | ------- |
| **mypy** (§3.1.1)          | Static type checking          | No runtime        | Instant | Low (catches typos) | §3.1.1  |
| **ruff** (§3.1.2)          | Code standards enforcement    | No runtime        | Instant | Low                 | §3.1.2  |
| **pytest** (§3.1.3)        | Unit & integration testing    | Python runtime    | Fast    | Medium              | §3.1.3  |
| **pytest-asyncio** (§3.1.4) | Async test support           | Python runtime    | Fast    | Medium              | §3.1.4  |
| **unittest.mock** (§3.1.5) | Mocking and patching          | Python runtime    | Fast    | High                | §3.1.5  |

**Row-by-row references:**

- mypy: §3.1.1
- ruff: §3.1.2
- pytest: §3.1.3
- pytest-asyncio: §3.1.4
- unittest.mock: §3.1.5

---

## 4. What to Test by Level

### 4.1 Static Tests (mypy + ruff)

**Write:** All code  
**Focus:** Type safety, unused variables, import cycles, code style

Tests that don't require execution:

- Type safety (mypy catches None dereferences, type mismatches)
- Unused variables and imports
- Import cycles
- Code style and naming conventions

**Cite as:** §4.1

### 4.2 Unit Tests (pytest)

**Write:** 20-30% of tests  
**Focus:** Pure functions and logic in isolation

```python
# tests/test_utils.py
from texere.utils import format_timestamp


def test_format_timestamp_with_unix_epoch():
    """Test timestamp formatting for epoch time."""
    result = format_timestamp(0)
    assert result == "1970-01-01T00:00:00Z"


def test_format_timestamp_with_current_time():
    """Test timestamp formatting for recent time."""
    result = format_timestamp(1609459200)  # 2021-01-01 00:00:00 UTC
    assert result == "2021-01-01T00:00:00Z"
```

**What NOT to test (§4.2):**

- Third-party library behavior
- Implementation details (private methods)
- File I/O or network calls (use mocks instead)

**Cite as:** §4.2

### 4.3 Integration Tests (pytest + mocks)

**Write:** 60-70% of tests ← **LARGEST SECTION (§2.2)**  
**Focus:** Components with their dependencies (real or mocked)

```python
# tests/test_workflow_integration.py
from unittest.mock import Mock, patch
from texere.orchestration.workflow import WorkflowEngine
from texere.persistence.checkpoint import CheckpointStore


class TestWorkflowWithCheckpoints:
    """Integration tests for workflow with checkpoint persistence."""

    @patch('texere.persistence.checkpoint.CheckpointStore')
    def test_saves_state_after_step(self, mock_store_class):
        """Test that workflow saves state after each step."""
        mock_store = Mock(spec=CheckpointStore)
        mock_store.save = Mock(return_value=True)
        
        engine = WorkflowEngine(checkpoint_store=mock_store)
        engine.add_step("step1", lambda: 42)
        
        result = engine.execute()
        
        mock_store.save.assert_called_once()
        assert result == 42
```

**What to test (§4.3.1):**

- Function calls and their side effects
- State transitions
- Error handling and edge cases
- Integration between multiple functions/classes

**What NOT to test (§4.3.2):**

- Third-party library internals
- Database implementation details (test your queries, not the DB engine)

**Cite as:** §4.3

### 4.4 End-to-End Tests (Playwright, API tests, or acceptance tests)

**Write:** 5-10% of tests  
**Focus:** Full workflows in real environment

```python
# tests/e2e/test_workflow_execution.py
import pytest
from playwright.sync_api import sync_playwright
from texere.server import run_server


@pytest.fixture
def app_server():
    """Start app server for E2E tests."""
    server = run_server(port=8000)
    yield server
    server.stop()


def test_user_can_submit_workflow_via_api(app_server):
    """Test end-to-end workflow submission and execution."""
    import requests
    
    response = requests.post(
        "http://localhost:8000/api/workflows",
        json={
            "name": "test_workflow",
            "steps": [{"type": "python", "code": "return 42"}]
        }
    )
    
    assert response.status_code == 200
    workflow_id = response.json()["id"]
    
    # Query execution results
    result = requests.get(f"http://localhost:8000/api/workflows/{workflow_id}")
    assert result.json()["status"] == "completed"
```

**What to test (§4.4.1):**

- Critical user journeys
- Full API workflows
- Cross-system integration

**What NOT to test (§4.4.2):**

- Third-party services you don't control
- Every possible code path (use unit/integration tests instead)

**Cite as:** §4.4

---

## 5. Python-Specific Considerations

### 5.1 Type Hints and Testing

#### 5.1.1 Using Type Hints to Reduce Tests

With proper type hints, mypy catches entire categories of bugs:

```python
def process_data(data: dict[str, int]) -> list[str]:
    """Process data safely with type hints."""
    results: list[str] = []
    for key, value in data.items():
        results.append(f"{key}: {value}")
    return results


# mypy validates at "compile time":
# - data must be dict[str, int] (not str or None)
# - return must be list[str]
# - You don't need tests for type mismatches
```

**Cite as:** §5.1.1

#### 5.1.2 Testing Type-Safe Code

Once types are correct, focus tests on logic:

```python
def test_process_data_formats_correctly():
    """Test that formatting produces expected output."""
    result = process_data({"a": 1, "b": 2})
    assert result == ["a: 1", "b: 2"]


# Don't test:
# - process_data(data="invalid")  # mypy prevents this
# - process_data(data=None)       # mypy prevents this
```

**Cite as:** §5.1.2

### 5.2 Async/Await Testing

#### 5.2.1 Testing Async Functions

Use `@pytest.mark.asyncio` for async tests:

```python
import pytest


@pytest.mark.asyncio
async def test_fetch_data_async():
    """Test async function execution."""
    from texere.api import fetch_data
    
    result = await fetch_data("https://example.com/api")
    assert result is not None
```

**Cite as:** §5.2.1

#### 5.2.2 Mocking Async Dependencies

Use `AsyncMock` for async function mocks:

```python
from unittest.mock import AsyncMock
import pytest


@pytest.mark.asyncio
async def test_with_async_mock():
    """Test function that calls async dependency."""
    async_dep = AsyncMock(return_value={"status": "ok"})
    
    result = await async_dep()
    assert result["status"] == "ok"
```

**Cite as:** §5.2.2

### 5.3 Testing with Context Managers

#### 5.3.1 Example: Testing Resource Cleanup

```python
from contextlib import contextmanager


@contextmanager
def database_connection(url: str):
    """Context manager for database connection."""
    db = open_connection(url)
    try:
        yield db
    finally:
        db.close()


def test_context_manager_closes_connection():
    """Test that context manager cleans up resources."""
    from unittest.mock import Mock, patch
    
    with patch('database.open_connection') as mock_open:
        mock_db = Mock()
        mock_open.return_value = mock_db
        
        with database_connection("sqlite://test.db"):
            pass
        
        mock_db.close.assert_called_once()
```

**Cite as:** §5.3.1

---

## 6. Folder Structure & Organization

### 6.1 Mirror Directory Structure

Keep tests in `tests/` directory with mirror structure to `src/`:

```
src/texere/
├── __init__.py
├── orchestration/
│   ├── __init__.py
│   ├── workflow.py
│   └── graph.py
└── persistence/
    ├── __init__.py
    └── checkpoint.py

tests/
├── __init__.py
├── conftest.py
├── test_workflow.py           ← Mirrors src/texere/orchestration/workflow.py
├── test_graph.py              ← Mirrors src/texere/orchestration/graph.py
├── test_checkpoint.py         ← Mirrors src/texere/persistence/checkpoint.py
└── integration/
    ├── test_end_to_end.py
    └── fixtures/
        └── sample_workflows.py
```

**Cite as:** §6.1

### 6.2 Benefits of Mirror Structure

- Clear separation of source and test code
- pytest auto-discovers `tests/test_*.py` files
- Easy to exclude tests from distribution (package excludes `tests/` automatically)
- Scalable for monolithic or monorepo projects

**Cite as:** §6.2

### 6.3 Test Organization: What Tests Go Where

#### 6.3.1 Unit Tests: `test_<module_name>.py`

- Pure utility functions
- Standalone classes and methods
- Business logic without I/O
- Mathematical algorithms

**Cite as:** §6.3.1

#### 6.3.2 Integration Tests: `test_<feature_name>.py`

- Classes with dependencies (mocked)
- Workflows across multiple functions
- State management and transitions
- Error handling across components

**Cite as:** §6.3.2

#### 6.3.3 E2E Tests: `tests/integration/test_*.py` or `tests/e2e/test_*.py`

- Full API workflows
- Multi-step processes
- Real database/service integration
- User journey scenarios

**Cite as:** §6.3.3

---

## 7. Setup: pytest Configuration

### 7.1 Root-Level Configuration (pyproject.toml)

```toml
[tool.pytest.ini_options]
# Test discovery
testpaths = ["tests"]
python_files = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"

# Async support
asyncio_mode = "auto"

# Coverage reporting
addopts = [
  "--cov=src/texere",
  "--cov-report=html:htmlcov",
  "--cov-report=term-missing",
  "--cov-branch",
]

[tool.coverage.run]
branch = true
source = ["src/texere"]

[tool.coverage.report]
fail_under = 70
exclude_lines = [
  "pragma: no cover",
  "def __repr__",
  "if TYPE_CHECKING:",
]
```

**Cite as:** §7.1

### 7.2 Shared Fixtures (conftest.py)

```python
# tests/conftest.py
import pytest


@pytest.fixture
def sample_workflow():
    """Provide sample workflow data."""
    return {
        "name": "test",
        "steps": [{"type": "print", "message": "hello"}]
    }
```

**Cite as:** §7.2

---

## 8. Mocking & Patching

### 8.1 When to Mock

| When to Mock                    | Example                                   | Cite As |
| ------------------------------- | ----------------------------------------- | ------- |
| **External APIs**               | API calls, HTTP requests                  | §8.1.1  |
| **Databases**                   | File I/O, database queries                | §8.1.2  |
| **Slow operations**             | Long-running processes, network requests  | §8.1.3  |
| **Stateful dependencies**       | Services with state (cache, session)      | §8.1.4  |
| **Side effects**                | Logging, metrics, external events         | §8.1.5  |

**Cite as:** §8.1

### 8.2 Mock Patterns

```python
from unittest.mock import Mock, patch, MagicMock, AsyncMock


# Simple mock
mock_fn = Mock(return_value=42)
assert mock_fn() == 42

# Verify calls
mock_fn.assert_called_once()
mock_fn.assert_called_with(1, 2)

# Patch at module level
@patch('module.Class')
def test_with_patch(mock_class):
    ...

# Patch with monkeypatch fixture
def test_with_monkeypatch(monkeypatch):
    monkeypatch.setattr(obj, 'attr', new_value)
```

**Cite as:** §8.2

---

## 9. Async/Await Testing

### 9.1 Marking Async Tests

```python
import pytest


@pytest.mark.asyncio
async def test_async_function():
    """Test async function."""
    result = await async_operation()
    assert result is not None
```

**Cite as:** §9.1

### 9.2 Testing Concurrent Operations

```python
import asyncio
import pytest


@pytest.mark.asyncio
async def test_concurrent_execution():
    """Test running async operations concurrently."""
    async def step1():
        await asyncio.sleep(0.1)
        return "result1"
    
    async def step2():
        await asyncio.sleep(0.1)
        return "result2"
    
    results = await asyncio.gather(step1(), step2())
    assert results == ["result1", "result2"]
```

**Cite as:** §9.2

---

## 10. Running Tests

### 10.1 Common Commands

```bash
pytest                      # Run all tests
pytest -v                   # Verbose
pytest --cov                # With coverage
pytest tests/test_file.py   # Single file
pytest -k "test_name"       # Pattern match
pytest -x                   # Stop on first failure
pytest --pdb                # Drop to debugger on failure
ptw                         # Watch mode (pytest-watch)
```

**Cite as:** §10.1

---

## 11. Anti-Patterns: What NOT to Test

### 11.1 Forbidden Testing Practices

| Anti-Pattern                        | Why Forbidden                              | Cite As |
| ----------------------------------- | ------------------------------------------ | ------- |
| **Third-party library behavior**    | Test your integration, not their code      | §11.1.1 |
| **Implementation details**          | Test behavior, not private methods         | §11.1.2 |
| **Type mismatches**                 | mypy prevents this; no test needed         | §11.1.3 |
| **Props/argument validation**       | Type hints + mypy handle this              | §11.1.4 |
| **100% coverage obsession**         | Diminishing returns beyond 80%             | §11.1.5 |
| **Complex test fixtures**           | Keep fixtures focused and reusable         | §11.1.6 |
| **Shared state between tests**      | Each test must be independent              | §11.1.7 |
| **sleep() or fixed waits**          | Use mocks and async patterns instead       | §11.1.8 |

---

## 12. Coverage Goals

### 12.1 Coverage Targets

| Metric                                       | Target       | Strategy                                                        |
| -------------------------------------------- | ------------ | --------------------------------------------------------------- |
| **Overall Coverage**                         | 70-80%       | Focus on integration tests (§2.2); unit tests 20-30%; E2E 5-10% |
| **Critical Paths** (auth, data processing)   | 100%         | High confidence required                                        |
| **Obsession with 100%**                      | Anti-Pattern | Bad tests at 100% worse than no tests; see §11.1                |

**Key Point:** Don't obsess over coverage % — focus on behavior.

**Cite as:** §12.1

---

## 13. CI/CD Integration

### 13.1 Example GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"
      
      - name: Format check (black)
        run: black --check src/
      
      - name: Lint (ruff)
        run: ruff check src/
      
      - name: Type check (mypy)
        run: mypy src/
      
      - name: Run tests with coverage
        run: pytest --cov=src/texere --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
```

**Cite as:** §13.1

---

## 14. References

### Related Specifications

- **Testing Specification (Implementation):** [testing_specification.md](./testing_specification.md) — Detailed per-project setup, configuration, and examples
- **High-level spec:** [../../README.md § Engineering Specs](../README.md)

### External References

- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy) — Kent C. Dodds (philosophy)
- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio)
- [unittest.mock Documentation](https://docs.python.org/3/library/unittest.mock.html)
- [Python Type Checking with mypy](https://mypy.readthedocs.io/)
- [Ruff Documentation](https://docs.astral.sh/ruff/)

**Cite as:** §14

---

## 15. Changelog

| Date       | Version | Editor | Summary                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-05 | 1.0     | @agent | Initial Python-specific testing strategy. Adapted from JavaScript specs; features pytest + pytest-asyncio, type hints with mypy, mirror directory structure, async/await patterns, mocking with unittest.mock, CI/CD GitHub Actions examples. Status: Active. Testing trophy: 60-70% integration, 20-30% unit, 5-10% E2E. |

---

## Summary of Spec

- Formal document metadata (Version 1.0, Last Updated Dec 5 2025, Status: Active)
- Quick Navigation with anchor links for easy citation
- Explicit "In Scope" and "Out of Scope" sections
- Numbered all sections (§1–§15) for full citability
- Testing trophy model adapted for Python (pytest-based)
- Tool responsibilities: mypy, ruff, pytest, pytest-asyncio, unittest.mock
- Coverage targets: 65-80% (modern Python best practices)
- Async testing with `@pytest.mark.asyncio`
- Mocking patterns with unittest.mock
- Mirror directory structure (tests/ vs src/)
- Anti-patterns section with forbidden practices
- References to testing_specification.md for implementation details
