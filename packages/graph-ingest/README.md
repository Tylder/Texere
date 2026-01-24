# graph-ingest

Ingestion orchestration and CLI entrypoint.

## Scope

- Package: graph-ingest
- Runtime: shared (node/esm)
- Scope tag: scope:graph

## Responsibilities

- Define ingestion connector interface\n- Orchestrate repo ingestion workflows\n- Emit JSON dumps
  for inspection

## Non-goals

- SCIP-TS parsing implementation\n- Projection execution\n- Storage backend logic
