# Texere — RepoTools MCP Manifest (sample, stdio)

> Purpose: expose **RepoTools** over **MCP, Model Context Protocol** so any MCP client (e.g., Claude Desktop / SDKs) can discover and call repo operations. This sample uses **STDIO transport** (v1). HTTP/SSE can be added later with identical schemas.

## 1) Server block
```json
{
  "server": {
    "name": "texere-repotools",
    "version": "0.1.0",
    "description": "RepoAdapter-backed repository tools for reading, diffing, and PR creation (PR tools gated by capabilities & policy).",
    "vendor": "texere.io"
  }
}
```

## 2) Transport (stdio)
```json
{
  "transport": {
    "type": "stdio",
    "command": "texere-app",
    "args": ["--mcp", "repotools", "--transport", "stdio"],
    "env": {
      "TEX_REPO_URL": "gh://org/repo",
      "GITHUB_TOKEN": "${GITHUB_TOKEN}",
      "TEX_REPO_SCOPES": "services/foo/**,packages/bar/**",
      "TEX_RATE_LIMIT_WARN": "100"
    }
  }
}
```

> In Phase 1 Docker, `texere-app` runs inside the container and listens on stdio for MCP messages.

## 3) Tool catalog
> **Note:** Tools are **capability-gated** at runtime. If `RepoAdapter.capabilities().pr == false`, `repo.open_pr` is **omitted**.

### 3.1 `repo.list_files`
```json
{
  "name": "repo.list_files",
  "description": "List repository file paths, optionally filtered by glob and/or ref (rev).",
  "risk": "READ",
  "input_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "glob": {"type": "string", "description": "Glob pattern, e.g., 'src/**/*.ts'"},
      "rev": {"type": "string", "description": "Commit SHA or ref; defaults to HEAD"}
    },
    "additionalProperties": false
  },
  "output_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "array",
    "items": {"type": "string"}
  }
}
```

### 3.2 `repo.read_file`
```json
{
  "name": "repo.read_file",
  "description": "Read a file's content at a given path and optional rev.",
  "risk": "READ",
  "input_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["path"],
    "properties": {
      "path": {"type": "string"},
      "rev": {"type": "string", "description": "Commit SHA or ref; defaults to HEAD"}
    },
    "additionalProperties": false
  },
  "output_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["path", "rev", "encoding", "content"],
    "properties": {
      "path": {"type": "string"},
      "rev": {"type": "string"},
      "encoding": {"type": "string", "enum": ["utf-8", "base64"], "description": "Text files are utf-8; binaries are base64"},
      "content": {"type": "string"}
    }
  }
}
```

### 3.3 `repo.git_diff`
```json
{
  "name": "repo.git_diff",
  "description": "Compute a diff between two refs; optionally limit to paths.",
  "risk": "READ",
  "input_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["base"],
    "properties": {
      "base": {"type": "string", "description": "Base commit SHA or ref"},
      "head": {"type": "string", "description": "Head commit SHA or ref; defaults to HEAD"},
      "paths": {"type": "array", "items": {"type": "string"}, "description": "Optional path filters"}
    },
    "additionalProperties": false
  },
  "output_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["files", "stats"],
    "properties": {
      "files": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["path", "status"],
          "properties": {
            "path": {"type": "string"},
            "status": {"type": "string", "enum": ["A", "M", "D", "R"]},
            "old_path": {"type": "string"},
            "add": {"type": "integer"},
            "del": {"type": "integer"}
          }
        }
      },
      "stats": {
        "type": "object",
        "required": ["files", "lines_added", "lines_removed"],
        "properties": {
          "files": {"type": "integer"},
          "lines_added": {"type": "integer"},
          "lines_removed": {"type": "integer"}
        }
      }
    }
  }
}
```

### 3.4 `repo.open_pr` (conditional)
> Exposed **only if** `capabilities.pr == true` and project rules/HITL allow.
```json
{
  "name": "repo.open_pr",
  "description": "Create a pull request from an existing branch (branch must already be pushed).",
  "risk": "WRITE",
  "input_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["title", "base", "head"],
    "properties": {
      "title": {"type": "string"},
      "body": {"type": "string"},
      "base": {"type": "string", "description": "Target branch, e.g., main"},
      "head": {"type": "string", "description": "Feature branch name"}
    },
    "additionalProperties": false
  },
  "output_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["pr_url", "pr_number", "branch"],
    "properties": {
      "pr_url": {"type": "string", "format": "uri"},
      "pr_number": {"type": "integer"},
      "branch": {"type": "string"}
    }
  }
}
```

### 3.5 `repo.fetch` and `repo.checkout` (optional, low risk)
```json
{
  "name": "repo.fetch",
  "description": "Fetch latest from remote using shallow/partial settings (depth defaults to 1).",
  "risk": "READ",
  "input_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {"depth": {"type": "integer", "minimum": 1, "default": 1}},
    "additionalProperties": false
  },
  "output_schema": {"$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object"}
}
```
```json
{
  "name": "repo.checkout",
  "description": "Checkout ref into local cache worktree.",
  "risk": "READ",
  "input_schema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["ref"],
    "properties": {"ref": {"type": "string"}},
    "additionalProperties": false
  },
  "output_schema": {"$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object"}
}
```

## 4) Errors (normalized)
All tools return errors with the standard shape:
```json
{"error": {"code": "RateLimit", "message": "…", "meta": {"rate_limit_remaining": 0, "reset_at": "2025-11-09T12:00:00Z"}}}
```
Allowed codes: `AuthError`, `RateLimit`, `NotFound`, `Conflict`, `ProtectedPath`, `WriteDenied`, `InvalidPatch`, `Timeout`, `Network`, `NotImplemented`.

## 5) Metadata & gating
- The server includes `capabilities` in MCP `initialize` result (e.g., `{ "host": "github", "pr": true, "sparse_checkout": true }`).
- Tools with `risk = "WRITE"` may trigger **HITL**, Human-In-The-Loop interrupts upstream; clients should be ready to handle MCP pause/resume.

## 6) Example MCP calls
### 6.1 List files
**request**
```json
{"id":"1","method":"tools/call","params":{"name":"repo.list_files","arguments":{"glob":"src/**/*.ts"}}}
```
**response**
```json
{"id":"1","result":{"content":["src/a.ts","src/b.ts"]}}
```

### 6.2 Read file
**request**
```json
{"id":"2","method":"tools/call","params":{"name":"repo.read_file","arguments":{"path":"src/a.ts"}}}
```
**response**
```json
{"id":"2","result":{"content":{"path":"src/a.ts","rev":"HEAD","encoding":"utf-8","content":"export const x=1;\n"}}}
```

### 6.3 Open PR (only if supported)
**request**
```json
{"id":"3","method":"tools/call","params":{"name":"repo.open_pr","arguments":{"title":"feat: add /users/me","base":"main","head":"texere/run-123"}}}
```
**response**
```json
{"id":"3","result":{"content":{"pr_url":"https://github.com/org/repo/pull/123","pr_number":123,"branch":"texere/run-123"}}}
```

## 7) Security notes
- Tokens via env/secret manager; never persisted.
- `repo.open_pr` is **not** registered if capabilities/pr is false or project rules/HITL disallow.
- Binary reads return `encoding = "base64"`.

## 8) Versioning
- Manifest `version` follows server semver.
- Tool schemas are backward‑compatible within minor versions; breaking changes bump major.

## 9) Minimal full manifest (merged)
```json
{
  "server": {"name": "texere-repotools", "version": "0.1.0", "description": "Repo tools over MCP.", "vendor": "texere.io"},
  "transport": {"type": "stdio", "command": "texere-app", "args": ["--mcp","repotools","--transport","stdio"]},
  "tools": [
    {"name":"repo.list_files","description":"List repo file paths","risk":"READ","input_schema":{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"glob":{"type":"string"},"rev":{"type":"string"}},"additionalProperties":false},"output_schema":{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"array","items":{"type":"string"}}},
    {"name":"repo.read_file","description":"Read file content","risk":"READ","input_schema":{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","required":["path"],"properties":{"path":{"type":"string"},"rev":{"type":"string"}},"additionalProperties":false},"output_schema":{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","required":["path","rev","encoding","content"],"properties":{"path":{"type":"string"},"rev":{"type":"string"},"encoding":{"type":"string","enum":["utf-8","base64"]},"content":{"type":"string"}}}},
    {"name":"repo.git_diff","description":"Diff between refs","risk":"READ","input_schema":{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","required":["base"],"properties":{"base":{"type":"string"},"head":{"type":"string"},"paths":{"type":"array","items":{"type":"string"}}},"additionalProperties":false},"output_schema":{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","required":["files","stats"],"properties":{"files":{"type":"array","items":{"type":"object","required":["path","status"],"properties":{"path":{"type":"string"},"status":{"type":"string","enum":["A","M","D","R"]},"old_path":{"type":"string"},"add":{"type":"integer"},"del":{"type":"integer"}}}},"stats":{"type":"object","required":["files","lines_added","lines_removed"],"properties":{"files":{"type":"integer"},"lines_added":{"type":"integer"},"lines_removed":{"type":"integer"}}}}}
  ]
}
```

> To include `repo.open_pr`, the server appends that tool when `capabilities.pr == true` and project rules/HITL allow.

**Status:** Ready to copy into your repo and adapt. Use this as the base for your MCP server’s `manifest.json`. 

