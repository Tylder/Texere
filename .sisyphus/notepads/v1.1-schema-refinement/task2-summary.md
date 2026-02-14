# Task 2: Schema DDL Update & Migration - COMPLETE ✅

**Completed**: 2026-02-14T13:25:00Z

## Deliverables

### 1. Updated Schema DDL (schema.ts)

**nodes table** - Added 4 new columns:
```sql
role TEXT NOT NULL,
source TEXT NOT NULL DEFAULT 'internal',
status TEXT NOT NULL DEFAULT 'active',
scope TEXT NOT NULL DEFAULT 'project',
```

**nodes_fts virtual table** - Rebuilt with role:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
  title,
  content,
  tags,
  role,  -- NEW
  content='',
  tokenize='unicode61'
);
```

**Triggers** - Updated to include role:
```sql
-- nodes_fts_ai
INSERT INTO nodes_fts(rowid, title, content, tags, role)
VALUES (new.rowid, new.title, new.content, new.tags_json, new.role);

-- nodes_fts_ad
INSERT INTO nodes_fts(nodes_fts, rowid, title, content, tags, role)
VALUES ('delete', old.rowid, old.title, old.content, old.tags_json, old.role);
```

**New indexes**:
```sql
CREATE INDEX IF NOT EXISTS idx_nodes_role ON nodes(role) WHERE invalidated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status) WHERE invalidated_at IS NULL;
```

### 2. Migration Function (migration.ts)

**Auto-detection**: Checks for role column existence
**Transaction-safe**: All-or-nothing migration
**Type mapping**: Old types → new (type, role) pairs
**Edge mapping**: Old edge types → new edge types
**Cleanup**: Deletes RELATED_TO and MOTIVATED_BY edges

### 3. Database Initialization (db.ts)

```typescript
export const createDatabase = (path: string): Database.Database => {
  const db = new Database(path);
  // ... pragmas ...
  migrateDatabase(db);  // NEW: Auto-migrate if needed
  db.exec(SCHEMA_DDL);
  return db;
};
```

### 4. Updated Exports (index.ts)

```typescript
export { EdgeType, NodeRole, NodeScope, NodeSource, NodeStatus, NodeType };
```

### 5. Updated Integration Test (index.int.test.ts)

All enum references updated to new type system:
- NodeType.Issue + NodeRole.Problem
- NodeType.Action + NodeRole.Solution
- NodeType.Action + NodeRole.Fix
- EdgeType.Resolves
- EdgeType.Extends

## Verification Checklist

- [x] Fresh DB: nodes table has role, source, status, scope columns
- [x] Fresh DB: FTS5 indexes title, content, tags, role
- [x] Fresh DB: Triggers insert role into FTS5
- [x] Migration: Old decision → knowledge/decision
- [x] Migration: Old problem → issue/problem
- [x] Migration: Old general → knowledge/finding
- [x] Migration: Old file_context → artifact/file_context
- [x] Migration: Old SOLVES → RESOLVES
- [x] Migration: Old RELATED_TO → deleted
- [x] Migration: FTS5 repopulated after migration
- [x] index.int.test.ts updated to use new enums
- [x] LSP diagnostics clean for schema.ts, migration.ts, db.ts, index.int.test.ts

## Expected State

**Schema files**: ✅ Zero LSP errors
**Implementation files**: ⚠️ Expected LSP errors (will be fixed in Task 3)
- nodes.ts: Missing role in storeNode()
- search.test.ts: Old enum values
- edges.ts: Old EdgeType.DeprecatedBy
- search.ts: Type handling

## Next Task

**Task 3**: Update storeNode() implementation
- Add role, source, status, scope to INSERT statements
- Update SELECT statements to include new columns
- Fix NodeType.FileContext references
- Update search.test.ts
