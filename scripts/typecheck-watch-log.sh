#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="logs/typecheck.log"

mkdir -p logs
: > "$LOG_FILE"
trap 'rm -f "$LOG_FILE"' EXIT

# Generate route types for Next.js apps
pnpm --filter web exec next typegen
pnpm --filter docs exec next typegen

# Run Nx's check-types target for all projects that have it, with watch mode
nx run-many --target=check-types --all --watch 2>&1 \
  | tee >(node scripts/filter-logs.mjs "$LOG_FILE")
