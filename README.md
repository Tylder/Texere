# Texere (skeleton)

Quick start for the CLI, Command-Line Interface, and development environment.

## Prereqs
- Python 3.11 (recommended 3.11.9)
- Hatch (installed automatically in Docker)

## Local usage
```
hatch env create
hatch run ui        # launches the terminal UI (early stub)
hatch run texere run --prompt "Hello"  # streams a fake LLM, Large Language Model, response
```

## Docker
```
docker compose up app
```
Bind-mounted volumes store checkpoints/logs under `.texere/`.

## Notes
- `texere run --prompt` executes a minimal Plan via the router/executor and streams output.
- The terminal UI is evolving; the CLI path is primary for now.
- Specs live in `specs/`; see adapter routing and event schemas for contracts.
