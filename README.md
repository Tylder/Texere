# Texere

An LLM-powered agent platform for understanding codebases and implementing changes across multiple frontends.

## Overview

Texere is a three-tier system built on Python (LangGraph) and TypeScript:

1. **Orchestration Core** — Stateful LangGraph workflows for code understanding and change implementation
2. **API & Transport Layer** — HTTP + async streaming boundary exposing the core to clients
3. **Client Layer** — Web UI, CLI, MCP servers, and other TS-based frontends

## Architecture

- **Core:** Python + LangGraph for multi-step, stateful agent workflows
- **API:** HTTP/JSON endpoints with SSE or WebSocket streaming
- **Clients:** TypeScript via shared client library; multiple applications (web, CLI, MCP)
- **State:** Threads (long-lived contexts) and Runs (individual workflow executions)

See [High-Level Architecture Spec](docs/specs/system/high_level_architecture_spec.md) for detailed component descriptions.

## Key Concepts

- **Thread:** Long-lived context tied to a user, repo, or project
- **Run:** Individual execution of a workflow on a thread
- **Tool:** Internal service invoked by the core (code search, AST, test runner, VCS, etc.)
- **Async Transport:** Streaming mechanism for incremental results and state updates

## Quick Start

### Prerequisites

- Python 3.10+
- pip and venv (built-in to Python)
- ~200MB disk space for dependencies

### 1. Clone & Navigate to Project

```bash
cd /home/anon/Texere
```

### 2. Create Virtual Environment

Create an isolated Python environment to avoid system-wide conflicts:

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate

# On Windows (PowerShell):
# venv\Scripts\Activate.ps1

# On Windows (Command Prompt):
# venv\Scripts\activate.bat
```

You should see `(venv)` in your terminal prompt when activated.

### 3. Install Development Dependencies

```bash
# Upgrade pip first
pip install --upgrade pip

# Option A: Install latest compatible versions (recommended)
pip install -e ".[dev]"

# Option B: Install locked versions for reproducibility
pip install -r requirements-lock.txt
```

This installs:
- Core dependencies (langgraph 1.0.4, langchain 1.1.2, pydantic 2.12.5)
- Development tools (pytest 9.0.1, black 25.11.0, mypy 1.19.0, ruff 0.14.8)

**Installed Versions (as of 2025-12-05):**
```
langgraph==1.0.4
langchain==1.1.2
langchain-core==1.1.1
pydantic==2.12.5
pytest==9.0.1
black==25.11.0
ruff==0.14.8
mypy==1.19.0
```

### 4. Run Tests

```bash
# Run all tests
pytest tests/ -v

# Run specific test module
pytest tests/test_workflow_state.py -v
pytest tests/test_graph_compilation.py -v
pytest tests/test_checkpoint_persistence.py -v

# Run with coverage
pytest tests/ --cov=src/texere --cov-report=html

# Run in watch mode (requires pytest-watch)
pip install pytest-watch
ptw tests/
```

### 5. Verify Installation

```bash
# Quick validation script
python3 << 'EOF'
from texere.orchestration import WorkflowState, create_workflow_graph
print("✅ Texere imports working correctly")
print(f"✅ WorkflowState has {len(WorkflowState.__annotations__)} fields")
graph = create_workflow_graph()
print("✅ Graph created successfully")
EOF
```

## Development Workflow

### Code Quality

```bash
# Format code
black src/ tests/

# Lint code
ruff check src/ tests/

# Type checking
mypy src/

# All checks at once
black src/ tests/ && ruff check src/ tests/ && mypy src/ && pytest tests/
```

### Environment Variables

Create a `.env` file in the project root for development configuration:

```bash
# Copy the example
cp .env.example .env

# Edit as needed
nano .env
```

Available variables:
- `PYTHONPATH` - Set to `src` to ensure imports work correctly
- `CHECKPOINT_DIR` - Directory for SQLite checkpoints (default: `./.texere/checkpoints`)
- `LOG_LEVEL` - Logging level (DEBUG, INFO, WARNING, ERROR)

### Running Specific Tests

```bash
# Unit tests only
pytest tests/test_workflow_state.py -v

# Integration tests only
pytest tests/test_graph_compilation.py -v
pytest tests/test_checkpoint_persistence.py -v

# Run with detailed output
pytest tests/ -vv

# Run and stop on first failure
pytest tests/ -x

# Run last failed tests
pytest tests/ --lf
```

## Project Structure

```
Texere/
├── venv/                          # Virtual environment (created locally)
├── src/texere/                    # Main source code
│   ├── orchestration/
│   │   ├── state.py              # WorkflowState definition
│   │   └── graph.py              # LangGraph implementation
├── tests/                         # Test suite (26 passing tests)
│   ├── test_workflow_state.py
│   ├── test_graph_compilation.py
│   └── test_checkpoint_persistence.py
├── docs/
│   └── specs/                     # Architecture specifications
├── pyproject.toml                # Project configuration
├── README.md                      # This file
└── IMPLEMENTATION_SUMMARY.md      # Slice 1 summary
```

## Deactivating Virtual Environment

When you're done developing:

```bash
deactivate
```

Your terminal prompt will return to normal (no more `(venv)` prefix).

## Troubleshooting

### Module Not Found Errors

```bash
# Ensure you're in the virtual environment
which python3  # Should show path to venv/bin/python3

# Reinstall the package
pip install -e ".[dev]"
```

### Import Errors

```bash
# Set PYTHONPATH explicitly
export PYTHONPATH=src:$PYTHONPATH
python3 -m pytest tests/
```

### Permission Denied (macOS/Linux)

```bash
# Make venv activation executable
chmod +x venv/bin/activate
source venv/bin/activate
```

### Old Virtual Environment

```bash
# Remove and recreate
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev]"
```

## Documentation

- **[Specification Index](docs/specs/README.md)** — Entry point for agents; links to all specs
- **[High-Level Architecture](docs/specs/system/high_level_architecture_spec.md)** — System overview and component details
- **[Slice 1 Implementation](SLICE_1_IMPLEMENTATION.md)** — Detailed technical report
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** — Executive summary

## Current Status

✅ **Slice 1: Complete** - Minimal WorkflowState & Graph Foundation
- 26/26 tests passing
- WorkflowState with 17 fields
- LangGraph integration working
- SQLite checkpointing functional

🔄 **Slice 2: In Planning** - LLM Integration & Planning Node

## Next Steps

1. Ensure virtual environment is activated: `source venv/bin/activate`
2. Run tests to verify setup: `pytest tests/ -v`
3. Read [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical details
4. Check [docs/specs/](docs/specs/) for architecture specifications

## License

(TBD)
