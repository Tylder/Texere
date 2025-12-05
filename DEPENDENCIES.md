# Texere Dependencies

**Last Updated:** 2025-12-05  
**Status:** All dependencies at latest compatible versions  
**Python Version:** 3.10+

## Summary

Texere uses modern, actively-maintained Python packages for orchestration, testing, and code quality.

## Installation

### Option 1: Latest Compatible Versions (Recommended)

```bash
pip install -e ".[dev]"
```

Uses version constraints from `pyproject.toml`:
- Allows patch updates
- Receives security fixes automatically
- Recommended for development

### Option 2: Locked Versions (Reproducible)

```bash
pip install -r requirements-lock.txt
```

Uses exact versions tested with Slice 1:
- Guarantees reproducibility
- No surprises from version updates
- Good for CI/CD pipelines

## Core Runtime Dependencies

### LangGraph 1.0.4
**Purpose:** Orchestration framework for stateful workflows  
**Used For:** Graph compilation, state management, node execution  
**GitHub:** https://github.com/langchain-ai/langgraph

### LangChain 1.1.2
**Purpose:** LLM and tool integration framework  
**Used For:** LLM calls, tool definitions, message handling  
**GitHub:** https://github.com/langchain-ai/langchain

### LangChain-Core 1.1.1
**Purpose:** Core abstractions for LLM interfaces  
**Used For:** BaseMessage, BaseTool, tool schemas  
**GitHub:** https://github.com/langchain-ai/langchain

### Pydantic 2.12.5
**Purpose:** Data validation and configuration management  
**Used For:** Type validation, config models  
**GitHub:** https://github.com/pydantic/pydantic

### Python-DotEnv 1.2.1
**Purpose:** Environment variable loading  
**Used For:** Loading .env files for development configuration  
**GitHub:** https://github.com/theskumar/python-dotenv

## Development Dependencies

### Testing

#### Pytest 9.0.1
**Purpose:** Test framework and runner  
**Used For:** All unit and integration tests  
**GitHub:** https://github.com/pytest-dev/pytest

#### Pytest-AsyncIO 1.3.0
**Purpose:** Async test support  
**Used For:** Testing async functions  
**GitHub:** https://github.com/pytest-dev/pytest-asyncio

#### Pytest-Cov 7.0.0
**Purpose:** Code coverage reporting  
**Used For:** Coverage analysis and reports  
**GitHub:** https://github.com/pytest-dev/pytest-cov

#### Pytest-Watch 4.2.0
**Purpose:** Auto-rerun tests on file changes  
**Used For:** Development workflow (ptw command)  
**GitHub:** https://github.com/jorenretel/pytest-watch

### Code Quality

#### Black 25.11.0
**Purpose:** Code formatter (opinionated)  
**Used For:** Automatic code formatting  
**GitHub:** https://github.com/psf/black

#### Ruff 0.14.8
**Purpose:** Fast Python linter  
**Used For:** Code quality and style checking  
**GitHub:** https://github.com/astral-sh/ruff

#### MyPy 1.19.0
**Purpose:** Static type checker  
**Used For:** Type validation and correctness  
**GitHub:** https://github.com/python/mypy

## Dependency Management

### Security Updates

To check for security vulnerabilities:

```bash
pip install safety
safety check
```

### Updating Dependencies

To update all dependencies to latest compatible versions:

```bash
pip install --upgrade -e ".[dev]"
```

To update specific package:

```bash
pip install --upgrade langgraph
```

To see outdated packages:

```bash
pip list --outdated
```

## Version Compatibility Matrix

| Component | Version | Python | Status |
|-----------|---------|--------|--------|
| langgraph | 1.0.4 | 3.10+ | ✅ Latest |
| langchain | 1.1.2 | 3.10+ | ✅ Latest |
| langchain-core | 1.1.1 | 3.10+ | ✅ Latest |
| pydantic | 2.12.5 | 3.8+ | ✅ Latest |
| pytest | 9.0.1 | 3.8+ | ✅ Latest |
| black | 25.11.0 | 3.8+ | ✅ Latest |
| ruff | 0.14.8 | 3.7+ | ✅ Latest |
| mypy | 1.19.0 | 3.8+ | ✅ Latest |

## Known Issues

None currently reported with Slice 1 implementation.

## Adding New Dependencies

When adding new dependencies:

1. Add to appropriate section in `pyproject.toml`
2. Run `pip install -e ".[dev]"` to install
3. Test locally: `pytest tests/ -v`
4. Update `requirements-lock.txt`:
   ```bash
   pip freeze > requirements-lock.txt
   ```
5. Verify tests still pass
6. Document in this file

## Removing Dependencies

When removing dependencies:

1. Remove from `pyproject.toml`
2. Search codebase for imports
3. Ensure no code references it
4. Run `pip install -e ".[dev]"` to update environment
5. Run full test suite
6. Update `requirements-lock.txt`

## License Compliance

All dependencies are Apache 2.0, MIT, or BSD compatible:

- langgraph: MIT
- langchain: MIT
- pydantic: MIT
- pytest: MIT
- black: MIT
- ruff: MIT
- mypy: MIT

See individual package licenses for complete details.

## Support & Contact

For dependency issues:
- File an issue with version information
- Include `pip list` output
- Include Python version
- Include error messages

## See Also

- [README.md](README.md) - Setup and installation
- [pyproject.toml](pyproject.toml) - Dependency specifications
- [requirements-lock.txt](requirements-lock.txt) - Exact pinned versions
