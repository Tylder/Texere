#!/usr/bin/env bash
set -euo pipefail

FIXTURE_PATH="${FIXTURE_PATH:-/home/dan/Texere/packages/graph-ingest-connector-scip-ts/fixtures/index.scip}"
WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$(dirname "$FIXTURE_PATH")"

cat > "$WORK_DIR/package.json" <<'JSON'
{
  "name": "scip-fixture",
  "private": true,
  "type": "module",
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
JSON

cat > "$WORK_DIR/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true
  },
  "include": ["src/**/*"]
}
JSON

mkdir -p "$WORK_DIR/src"
cat > "$WORK_DIR/src/index.ts" <<'TS'
export function fixture(message: string): string {
  return `Hello ${message}`;
}
TS

pushd "$WORK_DIR" >/dev/null
npm install --silent --no-fund --no-audit
npx --yes @sourcegraph/scip-typescript index
popd >/dev/null

cp "$WORK_DIR/index.scip" "$FIXTURE_PATH"
echo "SCIP fixture written to $FIXTURE_PATH"
