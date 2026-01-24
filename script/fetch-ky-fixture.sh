#!/usr/bin/env bash
set -euo pipefail

FIXTURE_ROOT="${GRAPH_KY_FIXTURE_PATH:-/tmp/graph-fixtures/ky}"
REPO_URL="https://github.com/sindresorhus/ky"
COMMIT="51b0129"

mkdir -p "$(dirname "$FIXTURE_ROOT")"

if [[ -d "$FIXTURE_ROOT/.git" ]]; then
  git -C "$FIXTURE_ROOT" fetch --all --prune
else
  git clone "$REPO_URL" "$FIXTURE_ROOT"
fi

git -C "$FIXTURE_ROOT" checkout "$COMMIT"

echo "ky fixture ready at $FIXTURE_ROOT (commit $COMMIT)"
