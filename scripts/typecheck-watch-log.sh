#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="logs/typecheck.log"

mkdir -p logs
: > "$LOG_FILE"
PIDS=()
PIPE=""
FILTER_PID=""

cleanup() {
  if [[ -n "${PIDS[*]-}" ]]; then
    for pid in "${PIDS[@]}"; do
      kill "$pid" 2>/dev/null || true
    done
  fi
  if [[ -n "${FILTER_PID:-}" ]]; then
    kill "$FILTER_PID" 2>/dev/null || true
  fi
  if [[ -n "${PIPE:-}" && -p "$PIPE" ]]; then
    rm -f "$PIPE"
  fi
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

# Discover all projects in the workspace (used for conditional steps below)
ALL_PROJECTS=$(
  pnpm nx show projects --json \
    | node -e "process.stdin.once('data', d => { JSON.parse(d.toString()).forEach(p => console.log(p)); });"
)

# Generate route types for Next.js apps if they exist (avoid noisy 'No projects matched' messages)
if printf '%s\n' "$ALL_PROJECTS" | grep -qx "web"; then
  pnpm --filter web exec next typegen 2>&1 || true
fi
if printf '%s\n' "$ALL_PROJECTS" | grep -qx "docs"; then
  pnpm --filter docs exec next typegen 2>&1 || true
fi

# Discover all projects that expose the check-types target
PROJECTS=$(
  pnpm nx show projects --with-target=check-types --json \
    | node -e "process.stdin.once('data', d => { JSON.parse(d.toString()).forEach(p => console.log(p)); });"
)

if [[ -z "${PROJECTS// }" ]]; then
  echo "No projects with check-types target found." >&2
  exit 1
fi

# Aggregate watcher output through a FIFO so we can filter once and write the log file
PIPE=$(mktemp -u)
mkfifo "$PIPE"
cat "$PIPE" | tee >(node scripts/filter-logs.mjs "$LOG_FILE") &
FILTER_PID=$!

while read -r project; do
  (
    pnpm nx run "${project}:check-types" --watch --exclude-task-dependencies --output-style=stream-without-prefixes 2>&1 \
      | stdbuf -oL -eL sed -u "s|^|[${project}] |"
  ) > "$PIPE" &
  PIDS+=("$!")
done <<< "$PROJECTS"

# Keep the script alive while all watchers run; Ctrl+C to stop.
wait "${PIDS[@]}"
