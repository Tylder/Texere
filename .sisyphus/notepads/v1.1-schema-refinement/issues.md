# v1.1 Schema Refinement - Issues & Edge Cases

**Task**: Task 2 - Schema DDL Update & Migration **Timestamp**: 2026-02-14T13:15:00Z **Status**: IN
PROGRESS

## Schema Migration Edge Cases

### 1. Implementation Blockers (Expected)

After updating schema DDL and StoreNodeInput interface, the following files have LSP errors that
will be resolved in Task 3:

- `nodes.ts`: storeNode() missing `role` field in Node construction (line 160)
- `nodes.ts`: NodeType.FileContext doesn't exist, should be NodeType.Artifact + NodeRole.FileContext
  (line 183)
- `search.test.ts`: All tests use old NodeType enum values (Decision, Solution, Requirement)
- `edges.ts`: References EdgeType.DeprecatedBy which is now EdgeType.Replaces

These are EXPECTED and will be fixed in Task 3 (storeNode implementation) and Task 4 (createEdge
implementation).

### 2. Migration Function Design Decisions

**needsMigration() detection strategy**: Attempts to SELECT role column. If it fails, migration is
needed.

- **Rationale**: Simple, reliable, no version tracking needed
- **Edge case**: If database is corrupted or has partial schema, this will trigger migration

**Edge type deletion**: RELATED_TO and MOTIVATED_BY edges are deleted during migration

- **Rationale**: These edge types were removed from the type system
- **Impact**: 0 edges in current database (20 nodes, 7 edges, none are RELATED_TO or MOTIVATED_BY)

**Node type mapping fallback**: Unknown types map to knowledge/finding

- **Rationale**: Safe default for unexpected data
- **Edge case**: If custom types were added outside the enum, they become knowledge/finding

### 3. FTS5 Rebuild Strategy

FTS5 table is contentless (`content=''`), so it must be rebuilt by:

1. DROP old nodes_fts table
2. CREATE new nodes_fts with role column
3. Triggers automatically populate FTS5 when nodes are INSERTed

**Critical**: Migration must INSERT nodes AFTER creating new schema, so triggers fire and populate
FTS5.

### 4. Transaction Safety

Entire migration runs in a single transaction:

- Backup old data
- Drop old schema
- Create new schema
- Insert migrated data

If any step fails, entire migration rolls back. Database remains in old state.

## Known Limitations

1. **No rollback mechanism**: Once migration completes, cannot revert to old schema
2. **No version tracking**: Migration is one-way, no schema version table
3. **Console logging only**: No structured migration log or audit trail
4. **Deleted edges not logged**: RELATED_TO and MOTIVATED_BY edges are silently deleted

## Next Steps (Task 3)

- Update storeNode() to include role, source, status, scope in INSERT
- Update storeNode() to use NodeType.Artifact + NodeRole.FileContext for anchor targets
- Update all SQL SELECT statements to include new columns
- Update search.test.ts to use new enum values
- Update edges.ts to use EdgeType.Replaces instead of DeprecatedBy
