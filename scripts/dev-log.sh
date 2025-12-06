#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="logs/dev.log"

mkdir -p logs
: > "$LOG_FILE"
trap 'rm -f "$LOG_FILE"' EXIT

NX_TERMINAL_OUTPUT_STYLE=stream-without-prefixes \
FORCE_COLOR=0 \
nx run-many --target=dev --all --parallel --outputStyle=stream-without-prefixes 2>&1 \
  | tee >(node scripts/filter-logs.mjs "$LOG_FILE")
