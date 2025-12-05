# Testing Specification (Python)

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Active  
**Relationship:** Implementation spec; pairs with [testing_strategy.md](./testing_strategy.md) (philosophy)

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Overview & Framework Assignment](#2-overview--framework-assignment)
- [3. Unit & Integration Testing](#3-unit--integration-testing)
- [4. Fixtures & Setup](#4-fixtures--setup)
- [5. Test Organization](#5-test-organization)
- [6. Commands & Workflows](#6-commands--workflows)
- [7. Coverage & Quality Gates](#7-coverage--quality-gates)
- [8. Anti-Patterns & Forbidden Practices](#8-anti-patterns--forbidden-practices)
- [9. Async Testing](#9-async-testing)
- [10. Spec Discipline](#10-spec-discipline)
- [11. References](#11-references)
- [12. Changelog](#12-changelog)

---

## 1. Scope

**This is the implementation specification; for testing philosophy, see
[testing_strategy.md](./testing_strategy.md).**

**In Scope:**

- Unit testing setup (pytest + pytest-asyncio)
- Integration testing patterns
- Fixture organization and best practices
- Test file naming and colocated patterns
- Configuration details (pyproject.toml, pytest.ini)
- Coverage targets (line, branch, function)
- CI/CD quality gates (lint, typecheck, test, build)
- Mock and patch patterns (unittest.mock)
- Async/await testing with pytest-asyncio
- Code examples and patterns for each test type

**Out of Scope:**

- Testing philosophy and "why" (covered in [testing_strategy.md](./testing_strategy.md))
- Performance profiling tools
- Load testing or stress testing infrastructure
- Integration testing with external APIs (covered in testing_strategy.md)

---

## 2. Overview & Framework Assignment

**For testing philosophy and the testing trophy distribution, see
[testing_strategy.md § 2](./testing_strategy.md#2-overview-the-testing-trophy).**

This specification focuses on implementation details. Key targets from strategy:

- **Unit Tests:** 60-75% of test suite (§ testing_strategy.md §2.2)
- **Integration Tests:** 15-25% of test suite (§ testing_strategy.md §2.2)
- **End-to-End Tests:** 5-10% of test suite (§ testing_strategy.md §2.2)
- **Overall Coverage:** 70-80% lines (§7.1 below)

### 2.1 Test Framework Assignment (Why Each Tool)

| Framework                  | Purpose                       | Environment       | Cite As |
| -------------------------- | ----------------------------- | ----------------- | ------- |
| **mypy**                   | Static type checking          | No runtime        | §2.1.1  |
| **ruff**                   | Code standards enforcement    | No runtime        | §2.1.2  |
| **pytest**                 | Unit & integration tests      | Python runtime    | §2.1.3  |
| **pytest-asyncio**         | Async test support            | Python runtime    | §2.1.4  |
| **pytest-cov**             | Coverage reporting            | Python runtime    | §2.1.5  |
| **unittest.mock**          | Mocking and patching          | Built-in stdlib   | §2.1.6  |

**For tool responsibilities and why we chose them, see
[testing_strategy.md § 3.1](./testing_strategy.md#31-testing-tools--their-purposes).**

---

## 3. Unit & Integration Testing

### 3.1 Test File Organization Pattern

**DECISION: Colocated test files in `tests/` directory with mirror structure**

**Pattern:** `tests/test_<module_name>.py` mirrors `src/<package>/<module>.py` structure (§3.1.1)

#### 3.1.1 Folder Structure Example

```
src/texere/
├── orchestration/
│   ├── __init__.py
│   ├── workflow.py
│   └── graph.py
└── persistence/
    ├── __init__.py
    └── checkpoint.py

tests/
├── __init__.py
├── test_workflow.py          ← Tests for orchestration.workflow
├── test_graph.py             ← Tests for orchestration.graph
└── test_checkpoint.py        ← Tests for persistence.checkpoint
```

#### 3.1.2 Rationale for Mirror Structure

**Advantages:**

- **Modern Python Standard** (§3.1.2.1): pytest, unittest, and most frameworks default to separate `tests/` directory
- **CI/CD Clarity** (§3.1.2.2): Easily exclude test files from distribution; clear separation of source vs. test code
- **Monorepo/Monolithic Clarity** (§3.1.2.3): Single test directory for all tests; pytest discovers all automatically
- **Scalability** (§3.1.2.4): Supports large projects without polluting source directories
- **Testing Culture** (§3.1.2.5): Clear signal that tests are "separate concern"; emphasizes test rigor

### 3.2 Project-Level pytest Configuration

**DECISION: Single root-level pytest configuration in `pyproject.toml` (§3.2.1)**

#### 3.2.1 pyproject.toml Example

```toml
[tool.pytest.ini_options]
# Test discovery patterns
testpaths = ["tests"]
python_files = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"

# Async support
asyncio_mode = "auto"

# Coverage
addopts = [
  "--cov=src/texere",
  "--cov-report=html",
  "--cov-report=term-missing",
  "--cov-branch",
]

# Minimum coverage thresholds
[tool.coverage.run]
branch = true
source = ["src/texere"]

[tool.coverage.report]
exclude_lines = [
  "pragma: no cover",
  "def __repr__",
  "raise AssertionError",
  "raise NotImplementedError",
  "if __name__ == .__main__.:",
  "if TYPE_CHECKING:",
]
fail_under = 70

[tool.coverage.html]
directory = "htmlcov"
```

**Cite as:** §3.2.1

### 3.3 Test File Structure

#### 3.3.1 Example: Simple Unit Test

```python
# tests/test_workflow.py
import pytest
from unittest.mock import Mock, patch
from texere.orchestration.workflow import WorkflowEngine


class TestWorkflowEngine:
    """Unit tests for WorkflowEngine."""

    def test_init_creates_empty_graph(self):
        """Test that WorkflowEngine initializes with empty graph."""
        engine = WorkflowEngine()
        assert engine.graph is not None
        assert len(engine.graph.nodes) == 0

    def test_add_step_adds_to_graph(self):
        """Test that add_step correctly registers a node."""
        engine = WorkflowEngine()
        engine.add_step("step1", lambda: 42)
        
        assert "step1" in engine.graph.nodes
        assert engine.graph.nodes["step1"]() == 42

    def test_add_step_raises_on_duplicate(self):
        """Test that duplicate step names raise ValueError."""
        engine = WorkflowEngine()
        engine.add_step("step1", lambda: 42)
        
        with pytest.raises(ValueError, match="already exists"):
            engine.add_step("step1", lambda: 99)
```

**Cite as:** §3.3.1

#### 3.3.2 Example: Integration Test with Fixtures

```python
# tests/test_graph_compilation.py
import pytest
from unittest.mock import Mock, patch, AsyncMock
from texere.orchestration.graph import GraphCompiler
from tests.fixtures import sample_workflow_graph


class TestGraphCompilation:
    """Integration tests for graph compilation."""

    def test_compile_creates_executable_graph(self, sample_workflow_graph):
        """Test that compilation produces valid executable graph."""
        compiler = GraphCompiler()
        compiled = compiler.compile(sample_workflow_graph)
        
        assert compiled is not None
        assert callable(compiled.invoke)

    def test_compile_handles_missing_dependencies(self):
        """Test graceful error when step dependencies not satisfied."""
        graph = {
            "step2": {"depends_on": ["missing_step"]}
        }
        
        compiler = GraphCompiler()
        with pytest.raises(ValueError, match="dependency not found"):
            compiler.compile(graph)
```

**Cite as:** §3.3.2

### 3.4 Fixture Organization

#### 3.4.1 Shared Fixtures (conftest.py)

```python
# tests/conftest.py
import pytest
from unittest.mock import Mock
from texere.orchestration.workflow import WorkflowEngine


@pytest.fixture
def workflow_engine():
    """Provide a fresh WorkflowEngine instance."""
    return WorkflowEngine()


@pytest.fixture
def sample_workflow_graph():
    """Provide a sample workflow graph configuration."""
    return {
        "step1": {"fn": lambda: "result1", "depends_on": []},
        "step2": {"fn": lambda: "result2", "depends_on": ["step1"]},
    }


@pytest.fixture
def mock_database(monkeypatch):
    """Mock database connection."""
    mock_db = Mock()
    mock_db.query = Mock(return_value=[{"id": 1, "data": "test"}])
    return mock_db
```

**Cite as:** §3.4.1

#### 3.4.2 When to Use Fixtures vs. Setup Methods

| Pattern                  | Use Case                                | Example                                  | Cite As  |
| ------------------------ | --------------------------------------- | ---------------------------------------- | -------- |
| **Shared fixture**       | Reused across multiple test files       | `@pytest.fixture` in `conftest.py`       | §3.4.2.1 |
| **Local fixture**        | Used only in one test file              | `@pytest.fixture` in same test file      | §3.4.2.2 |
| **Class setup method**   | Shared state for class test methods     | `def setup_method(self):`                | §3.4.2.3 |
| **Parametrized fixture** | Test multiple inputs with same fixture  | `@pytest.mark.parametrize`               | §3.4.2.4 |

**Cite as:** §3.4.2

### 3.5 Mocking Best Practices

#### 3.5.1 Mocking External Dependencies

```python
from unittest.mock import Mock, patch, MagicMock, AsyncMock
import pytest


class TestWorkflowExecution:
    """Tests with mocked external dependencies."""

    @patch('texere.persistence.checkpoint.CheckpointStore')
    def test_save_checkpoint_calls_store(self, mock_store):
        """Test that checkpoints are persisted."""
        mock_store.return_value.save = Mock(return_value=True)
        
        from texere.orchestration.execution import ExecutionEngine
        engine = ExecutionEngine(checkpoint_store=mock_store.return_value)
        
        result = engine.save_checkpoint("state_data")
        
        mock_store.return_value.save.assert_called_once_with("state_data")
        assert result is True

    def test_mock_async_function(self):
        """Test mocking async functions with AsyncMock."""
        async_fn = AsyncMock(return_value="success")
        
        # In actual test: await async_fn()
        assert async_fn.return_value == "success"
```

**Cite as:** §3.5.1

#### 3.5.2 Mock Pattern Guidelines

| Pattern                     | Use                              | Example                                | Cite As  |
| --------------------------- | -------------------------------- | -------------------------------------- | -------- |
| **Mock()**                  | Simple function/method mock      | `Mock(return_value=True)`              | §3.5.2.1 |
| **MagicMock()**             | Mocks magic methods (\__call__)  | `MagicMock()` for callable objects     | §3.5.2.2 |
| **AsyncMock()**             | Async functions                  | `AsyncMock(return_value="result")`     | §3.5.2.3 |
| **@patch decorator**        | Patch at module level            | `@patch('module.Class')`               | §3.5.2.4 |
| **monkeypatch fixture**     | pytest-native patching           | `monkeypatch.setattr(obj, 'attr', val)` | §3.5.2.5 |

**Cite as:** §3.5.2

---

## 4. Fixtures & Setup

### 4.1 Fixture Scopes

| Scope        | Lifetime                | Use Case                           | Cite As |
| ------------ | ----------------------- | ---------------------------------- | ------- |
| **function** | Per test function       | Default; isolated test state       | §4.1.1  |
| **class**    | Per test class          | Shared setup for class tests       | §4.1.2  |
| **module**   | Per test module/file    | Expensive setup (DB init)          | §4.1.3  |
| **session**  | Entire test run         | Global resources (test DB)         | §4.1.4  |

**Cite as:** §4.1

### 4.2 Example: Database Fixture with Cleanup

```python
# tests/conftest.py
import pytest
from texere.persistence.database import Database


@pytest.fixture(scope="module")
def test_db():
    """Create test database; clean up after session."""
    db = Database(url="sqlite:///:memory:")
    db.init_schema()
    
    yield db  # Provide to test
    
    # Cleanup after all tests using this fixture
    db.close()


@pytest.fixture
def db_with_sample_data(test_db):
    """Populate test database with sample data."""
    test_db.insert("workflows", {"id": 1, "name": "test_workflow"})
    yield test_db
    test_db.execute("DELETE FROM workflows")  # Clean up after test
```

**Cite as:** §4.2

---

## 5. Test Organization

### 5.1 Test File Structure by Feature

```
src/texere/
├── orchestration/
│   ├── workflow.py
│   └── graph.py
└── persistence/
    └── checkpoint.py

tests/
├── conftest.py                   # Shared fixtures
├── test_workflow.py              # Tests for orchestration.workflow
├── test_graph.py                 # Tests for orchestration.graph
├── test_checkpoint.py            # Tests for persistence.checkpoint
└── integration/
    └── test_end_to_end.py        # Integration/E2E tests
```

**Cite as:** §5.1

### 5.2 Test Class Organization

```python
# tests/test_workflow.py

class TestWorkflowInit:
    """Tests for WorkflowEngine initialization."""
    
    def test_creates_empty_graph(self):
        ...


class TestWorkflowAddStep:
    """Tests for WorkflowEngine.add_step method."""
    
    def test_adds_step_to_graph(self):
        ...
    
    def test_raises_on_duplicate(self):
        ...


class TestWorkflowExecution:
    """Tests for WorkflowEngine.execute method."""
    
    def test_executes_single_step(self):
        ...
```

**Cite as:** §5.2

---

## 6. Commands & Workflows

### 6.1 Running Tests

| Command                      | Purpose                                     | Cite As |
| ---------------------------- | ------------------------------------------- | ------- |
| `pytest`                     | Run all tests                               | §6.1.1  |
| `pytest -v`                  | Verbose output; show each test name         | §6.1.2  |
| `pytest -k "test_name"`      | Run tests matching pattern                  | §6.1.3  |
| `pytest --cov`               | Run tests with coverage report              | §6.1.4  |
| `pytest -x`                  | Stop on first failure                       | §6.1.5  |
| `pytest -s`                  | Show print output (don't capture)           | §6.1.6  |
| `pytest --pdb`               | Drop into debugger on failure               | §6.1.7  |
| `pytest tests/test_file.py`  | Run single test file                        | §6.1.8  |
| `pytest tests/test_file.py::TestClass::test_method` | Run single test | §6.1.9  |
| `ptw` (pytest-watch)         | Continuous watch mode                       | §6.1.10 |

**Cite as:** §6.1

---

## 7. Coverage & Quality Gates

### 7.1 Coverage Targets (Mandatory)

| Metric     | Minimum | Target | Excluded From Coverage              | Cite As |
| ---------- | ------- | ------ | ----------------------------------- | ------- |
| Lines      | 65%     | 75-80% | `__init__.py`, `if TYPE_CHECKING:` | §7.1.1  |
| Functions  | 65%     | 75-80% | (same)                              | §7.1.2  |
| Branches   | 60%     | 70%    | (same)                              | §7.1.3  |

**For philosophy on coverage goals, see
[testing_strategy.md § 12](./testing_strategy.md#12-coverage-goals).**

**Cite as:** §7.1

### 7.2 Quality Gates (All MUST pass before merge)

| Gate             | Command                 | Threshold              | Cite As |
| ---------------- | ----------------------- | ---------------------- | ------- |
| **Format Check** | `black --check src/`    | 0 format violations    | §7.2.1  |
| **Lint**         | `ruff check src/`       | 0 errors               | §7.2.2  |
| **Typecheck**    | `mypy src/`             | 0 errors               | §7.2.3  |
| **Unit Tests**   | `pytest --cov`          | ≥65% lines, fail_under | §7.2.4  |
| **Build**        | `python -m build`       | 0 errors               | §7.2.5  |

**Enforcement:** All gates block PR merge. CI must pass before hand-off to QA.

**Cite as:** §7.2

---

## 8. Anti-Patterns & Forbidden Practices

**For the complete anti-patterns list and rationale, see
[testing_strategy.md § 11](./testing_strategy.md#11-anti-patterns-what-not-to-test).**

Key forbidden practices enforced in this spec:

- Test implementation details (private methods, internal state) — Brittle; breaks on refactor
- 100% coverage obsession — Diminishing returns; target 70-80%
- Shared test state between tests — Each test must be independent
- `sleep()` or fixed waits in tests — Use mocks and async test patterns
- Testing third-party library behavior — Test your integration, not their code
- Overly complex fixtures — Keep fixtures focused and reusable
- Mixing unit and integration tests in same class — Separate concerns

**Cite as:** §8

---

## 9. Async Testing

### 9.1 Testing Async Functions

**DECISION: Use `pytest-asyncio` with `asyncio_mode = "auto"` (§9.1.1)**

#### 9.1.1 Async Test Example

```python
# tests/test_async_execution.py
import pytest
from texere.orchestration.execution import AsyncExecutionEngine


class TestAsyncExecution:
    """Tests for async execution engine."""

    @pytest.mark.asyncio
    async def test_execute_async_step(self):
        """Test async step execution."""
        engine = AsyncExecutionEngine()
        
        async def async_step():
            return "result"
        
        result = await engine.execute_step(async_step)
        assert result == "result"

    @pytest.mark.asyncio
    async def test_execute_multiple_steps_concurrently(self):
        """Test concurrent execution of multiple async steps."""
        engine = AsyncExecutionEngine()
        
        async def step1():
            return "result1"
        
        async def step2():
            return "result2"
        
        results = await engine.execute_concurrent([step1, step2])
        assert results == ["result1", "result2"]
```

**Cite as:** §9.1.1

### 9.2 AsyncMock for Async Dependencies

```python
from unittest.mock import AsyncMock
import pytest


class TestAsyncWithMocks:
    """Tests with async mocks."""

    @pytest.mark.asyncio
    async def test_calls_async_dependency(self):
        """Test interaction with async dependency."""
        async_dep = AsyncMock(return_value="mocked_result")
        
        # Pass to component under test
        result = await async_dep()
        
        assert result == "mocked_result"
        async_dep.assert_called_once()
```

**Cite as:** §9.2

---

## 10. Spec Discipline

**This spec is binding and definitive.** All code must follow these rules:

### 10.1 Mandatory Requirements

- **Test file placement** (§3.1): Always in `tests/` directory with mirror structure
- **Test framework** (§2.1): pytest for all tests; pytest-asyncio for async
- **Naming** (§3.1): `test_<module_name>.py` matching source modules
- **Coverage targets** (§7.1): Minimum 65-70%, target 75-80%
- **Organization** (§5): Feature-scoped test files, class-based organization
- **Quality gates** (§7.2): All gates must pass before merge
- **Async tests** (§9): Use `@pytest.mark.asyncio` for async test functions

**Deviation Requires:** Explicit spec update + team consensus.

**Cite as:** §10.1

---

## 11. References

### Related Specifications

- **High-level spec:** [../../README.md § Engineering Specs](../README.md)
- **Testing Strategy (Philosophy & Principles):** [testing_strategy.md](./testing_strategy.md) — Covers why we test, testing trophy distribution, tools rationale, anti-patterns philosophy. Read this first for context.

### External Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio)
- [unittest.mock Documentation](https://docs.python.org/3/library/unittest.mock.html)
- [pytest-cov](https://pytest-cov.readthedocs.io/)
- [Python Type Checking with mypy](https://mypy.readthedocs.io/)
- [Ruff Documentation](https://docs.astral.sh/ruff/)

**Cite as:** §11

---

## 12. Changelog

| Date       | Version | Editor | Summary                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-05 | 1.0     | @agent | Initial Python-specific testing specification. Adapted from JavaScript specs; features pytest, pytest-asyncio, unittest.mock, pyproject.toml configuration, mirror directory structure for tests/, coverage targets (65-80%), async testing patterns, and integration with mypy/ruff quality gates. Status: Active. |

---

## Summary of Spec

- Formal document metadata (Version 1.0, Last Updated Dec 5 2025, Status: Active)
- Quick Navigation with anchor links for easy citation
- Explicit "In Scope" and "Out of Scope" sections
- Numbered all sections (§1–§12) for full citability
- Mirror directory structure for tests/ vs src/
- pytest + pytest-asyncio framework
- Coverage targets: 65-80% (matching modern Python best practices)
- Quality gates: format, lint, typecheck, test, build
- Async testing patterns with `@pytest.mark.asyncio`
- Fixture organization with conftest.py, scopes, and cleanup
- Mocking patterns with unittest.mock, AsyncMock
- Anti-patterns section with forbidden practices
- References to testing_strategy.md for philosophy
