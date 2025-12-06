# Texere Mastra Backend

Mastra orchestration layer for Texere – agents, workflows, and tools for AI-powered code
understanding and implementation.

## Structure

```
src/mastra/
├── agents/        # Role-specific LLM agents (Interpreter, Planner, Implementer, etc.)
├── tools/         # Mastra-specific tool implementations
├── workflows/     # Multi-step orchestration workflows
└── index.ts       # Entry point: Mastra instance configuration
```

## Development

Start the Mastra dev server with Studio UI (for testing agents and workflows):

```bash
# From monorepo root
pnpm --filter mastra dev

# Or from this directory
mastra dev
```

Studio will be available at `http://localhost:4111` with:

- **Agents tab**: Test agents interactively, switch models, tune temperature
- **Workflows tab**: Visualize workflows, run step-by-step with custom inputs
- **Tools tab**: Run individual tools to debug behavior
- **Observability tab**: View traces of agent and workflow execution
- **Swagger UI**: API documentation at `http://localhost:4111/swagger-ui`

## Building

```bash
pnpm --filter mastra build
```

Creates `.mastra/output/` with production-ready Hono HTTP server.

## Testing

```bash
pnpm --filter mastra test          # Run tests
pnpm --filter mastra test:coverage # With coverage report
```

## Configuration

- **`.env`** – LLM API keys, server port, host
- **`src/mastra/index.ts`** – Mastra instance setup and agent/workflow registration
- **`tsconfig.json`** – TypeScript strict mode
- **`project.json`** – Nx task configuration

## Spec Reference

- **Architecture**: `docs/specs/README.md` (§ 3–7)
- **Mastra Orchestrator**: `docs/specs/feature/mastra_orchestrator_spec.md`
- **Tool Abstraction**: `docs/specs/feature/texere-tool-spec.md`
