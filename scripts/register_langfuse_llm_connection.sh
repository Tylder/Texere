#!/usr/bin/env bash
# Register or update a Langfuse LLM connection for an OpenAI-compatible endpoint.
#
# Usage:
#   scripts/register_langfuse_llm_connection.sh \
#     --name "Remote GPU" \
#     --base-url "https://<host>/v1" \
#     --api-key "<api-key>" \
#     --models "qwen2.5:7b,qwen2.5:14b" \
#     --default "qwen2.5:7b"
#
# Requires: curl, jq. Assumes Langfuse API at http://localhost:3333 (adjust via LANGFUSE_API).

set -euo pipefail

LANGFUSE_API="${LANGFUSE_API:-http://localhost:3333/api}"
NAME=""
BASE_URL=""
API_KEY=""
MODELS=""
DEFAULT_MODEL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) NAME="$2"; shift 2 ;;
    --base-url) BASE_URL="$2"; shift 2 ;;
    --api-key) API_KEY="$2"; shift 2 ;;
    --models) MODELS="$2"; shift 2 ;;
    --default) DEFAULT_MODEL="$2"; shift 2 ;;
    *) echo "Unknown arg $1"; exit 1 ;;
  esac
done

if [[ -z "$NAME" || -z "$BASE_URL" || -z "$API_KEY" || -z "$MODELS" || -z "$DEFAULT_MODEL" ]]; then
  echo "Missing required args"; exit 1
fi

# Langfuse uses session cookies; for simplicity this script assumes an existing admin session cookie in cookies.txt
# You can obtain it by logging into Langfuse UI and exporting cookies, or adapt to use an API token if available.

if [[ ! -f cookies.txt ]]; then
  echo "cookies.txt not found. Export your Langfuse session cookies to cookies.txt first."; exit 1
fi

payload=$(cat <<EOF
{
  "name": "$NAME",
  "provider": "openai",
  "baseUrl": "$BASE_URL",
  "apiKey": "$API_KEY",
  "defaultModel": "$DEFAULT_MODEL",
  "customModels": $(printf '[%s]' "$(echo "$MODELS" | awk -F, '{for(i=1;i<=NF;i++){printf "%s\"%s\"", (i>1?",":""), $i}}')")
}
EOF
)

curl -sS -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -X POST "$LANGFUSE_API/llm-connections" \
  -d "$payload" | jq
