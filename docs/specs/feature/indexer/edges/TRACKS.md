# [:TRACKS] – Evolution & Versioning

**Category**: Evolution  
**Semantic**: "When did this appear or change?"

---

## Purpose

Represents change history: tracks when snapshot-scoped nodes were introduced and modified across
snapshots. Enables temporal analysis and evolution tracking.

**Key Characteristic**: `event` property distinguishes introduction vs. modification; supports
version history queries.

---

## Properties

| Property    | Type      | Required | Notes                                     |
| ----------- | --------- | -------- | ----------------------------------------- |
| `event`     | enum      | Yes      | 'INTRODUCED' \| 'MODIFIED'                |
| `createdAt` | timestamp | Yes      | When relationship created (at index time) |

No additional properties.

---

## Sub-Types

### INTRODUCED – First Appearance

```cypher
(symbol:Symbol)-[r:TRACKS {event: 'INTRODUCED'}]->(snapshot:Snapshot)
(feature:Feature)-[r:TRACKS {event: 'INTRODUCED'}]->(snapshot:Snapshot)
(testCase:TestCase)-[r:TRACKS {event: 'INTRODUCED'}]->(snapshot:Snapshot)
```

**Semantic**: Node first appeared in this snapshot (commit).

**Constraints**:

- One per node (earliest snapshot where node exists)
- Multiple nodes can be INTRODUCED in same snapshot
- Snapshot timestamp marks creation time

### MODIFIED – Change Event

```cypher
(symbol:Symbol)-[r:TRACKS {event: 'MODIFIED'}]->(snapshot:Snapshot)
(feature:Feature)-[r:TRACKS {event: 'MODIFIED'}]->(snapshot:Snapshot)
(testCase:TestCase)-[r:TRACKS {event: 'MODIFIED'}]->(snapshot:Snapshot)
```

**Semantic**: Node was modified (content changed) in this snapshot.

**Constraints**:

- Multiple per node (every snapshot where content changed)
- Only appears in later snapshots (after INTRODUCED)
- Snapshot timestamp marks modification time

---

## Source → Target Pairs

| Source   | Event      | Target   | Cardinality   | Notes              |
| -------- | ---------- | -------- | ------------- | ------------------ |
| Symbol   | INTRODUCED | Snapshot | exactly 1     | First snapshot     |
| Symbol   | MODIFIED   | Snapshot | optional (0+) | Change snapshots   |
| Feature  | INTRODUCED | Snapshot | exactly 1     | Feature definition |
| Feature  | MODIFIED   | Snapshot | optional (0+) | Feature changes    |
| TestCase | INTRODUCED | Snapshot | exactly 1     | Test addition      |
| TestCase | MODIFIED   | Snapshot | optional (0+) | Test updates       |
| Endpoint | INTRODUCED | Snapshot | exactly 1     | Endpoint creation  |
| Endpoint | MODIFIED   | Snapshot | optional (0+) | Endpoint changes   |
| SpecDoc  | INTRODUCED | Snapshot | exactly 1     | Doc creation       |
| SpecDoc  | MODIFIED   | Snapshot | optional (0+) | Doc updates        |

---

## Schema

```cypher
-- Index for evolution queries
CREATE INDEX tracks_event IF NOT EXISTS
FOR ()-[r:TRACKS]-() ON (r.event);

-- Index for version history
CREATE INDEX tracks_snapshot_event IF NOT EXISTS
FOR ()-[r:TRACKS]->(snap:Snapshot) ON (snap.id, r.event);

-- Example: Get symbol evolution
MATCH (sym:Symbol {id: 'snap-123:src/auth/jwt.ts:validateToken:10:0'})
  -[r:TRACKS {event: event}]->(snap:Snapshot)
RETURN snap, r.event
ORDER BY snap.timestamp ASC
```

---

## Query Patterns

### Symbol Evolution Timeline

```cypher
-- When was symbol introduced and modified?
MATCH (sym:Symbol {filePath: 'src/auth.ts', name: 'validateToken'})
  -[r:TRACKS {event: event}]->(snap:Snapshot)
RETURN snap, r.event
ORDER BY snap.timestamp ASC

-- All snapshots where symbol changed
MATCH (sym:Symbol {filePath: 'src/auth.ts', name: 'validateToken'})
  -[r:TRACKS {event: 'MODIFIED'}]->(snap:Snapshot)
RETURN snap
ORDER BY snap.timestamp DESC
```

### Change Detection Between Commits

```cypher
-- Symbols modified between two commits
MATCH (snap1:Snapshot {commitHash: 'old-hash'})
MATCH (snap2:Snapshot {commitHash: 'new-hash'})
MATCH (sym:Symbol)-[r1:TRACKS {event: 'INTRODUCED'}]->(snap_intro)
MATCH (sym)-[r2:TRACKS {event: 'MODIFIED'}]->(snap_modified:Snapshot)
WHERE snap_intro.timestamp <= snap2.timestamp
  AND snap_modified.timestamp <= snap2.timestamp
  AND snap_modified.timestamp > snap1.timestamp
RETURN DISTINCT sym
```

### Feature Timeline

```cypher
-- When was feature introduced and updated?
MATCH (f:Feature {id: 'payment-processing'})
  -[r:TRACKS {event: event}]->(snap:Snapshot)
RETURN snap, r.event, snap.timestamp, snap.commitHash
ORDER BY snap.timestamp ASC
```

### Release Analysis

```cypher
-- What symbols were added in snapshot?
MATCH (snap:Snapshot {id: 'snap-release-1.0'})
  <-[r:TRACKS {event: 'INTRODUCED'}]-(sym:Symbol)
RETURN sym, sym.kind
ORDER BY sym.name

-- What changed between releases?
MATCH (snap1:Snapshot {branch: 'v1.0'})
MATCH (snap2:Snapshot {branch: 'v1.1'})
MATCH (sym:Symbol)
  -[r:TRACKS {event: 'MODIFIED'}]->(snap_modified:Snapshot)
WHERE snap1.timestamp < snap_modified.timestamp
  AND snap_modified.timestamp <= snap2.timestamp
RETURN DISTINCT sym
```

### Feature Introduction Tracking

```cypher
-- First snapshot where feature appears
MATCH (f:Feature {id: $featureId})
  -[r:TRACKS {event: 'INTRODUCED'}]->(intro_snap:Snapshot)
OPTIONAL MATCH (f)-[r2:TRACKS {event: 'MODIFIED'}]->(mod_snap:Snapshot)
WITH intro_snap, COUNT(mod_snap) as mod_count
RETURN intro_snap, mod_count as modification_count
```

### Test Coverage History

```cypher
-- When was test added/modified?
MATCH (test:TestCase {id: $testId})
  -[r:TRACKS {event: event}]->(snap:Snapshot)
RETURN snap, r.event, snap.timestamp
ORDER BY snap.timestamp ASC
```

### Longitudinal Analysis

```cypher
-- Symbol count over time
MATCH (snap:Snapshot)
OPTIONAL MATCH (sym:Symbol)-[r:TRACKS {event: 'INTRODUCED'}]->(snap)
RETURN snap.timestamp, COUNT(sym) as symbols_introduced
ORDER BY snap.timestamp
LIMIT 100
```

---

## Constraints & Indexes

- **Event Index**: `tracks_event` for filtering INTRODUCED vs. MODIFIED
- **Snapshot Index**: `tracks_snapshot_event` for time-based queries
- **Cardinality**: Low (1 INTRODUCED per node; 0+ MODIFIED per node)
- **Ordering**: Snapshots naturally ordered by timestamp

---

## Common Use Cases

1. **Change history**: "When was this symbol added?"
2. **Regression tracking**: "What changed between v1.0 and v1.1?"
3. **Release notes**: "What's new in this release?"
4. **Feature evolution**: "How has feature X changed over time?"
5. **Blame/audit**: "Who introduced this bug?"
6. **Temporal queries**: "What was the codebase like on date X?"

---

## Implementation Notes

### Introduction Detection

**INTRODUCED** edge is created when:

1. Node first appears in a snapshot (syntactic analysis)
2. Previous snapshots don't contain node with same identity

**Node identity** determined by:

- Symbol: filePath + name + location (line, col)
- Feature: id (from features.yaml)
- TestCase: filePath + test name

### Modification Detection

**MODIFIED** edge is created when:

1. Node exists in consecutive snapshots
2. Content differs (via hash/checksum of properties)
3. Not a deletion/re-addition

**Content comparison**:

- Symbol: hash of startLine, endLine, docstring, isExported
- Feature: hash of name, description
- TestCase: hash of body/assertions

### Deletion Semantics

Deleted nodes:

- Keep INTRODUCED edge (historical record)
- Keep MODIFIED edges (change history)
- Get marked `isDeleted: true` in latest snapshot
- No separate DELETED edge (use isDeleted flag)

### Time Ordering

```cypher
-- Snapshots ordered by commit timestamp
MATCH (sym:Symbol)-[r:TRACKS]->(snap:Snapshot)
WITH sym, snap, r.event as event
ORDER BY snap.timestamp ASC
RETURN snap.timestamp, event
```

---

## Performance Notes

- **Lookup Cost**: O(log N) via snapshot timestamp index
- **Timeline Queries**: Fast (follows snapshot ordering)
- **Range Queries**: Efficient via timestamp index
- **Cardinality**: Low (1–100 TRACKS edges per symbol)

---

## Temporal Query Patterns

### Point-in-Time Analysis

```cypher
-- What symbols existed on specific date?
MATCH (sym:Symbol)
  -[intro:TRACKS {event: 'INTRODUCED'}]->(snap_intro:Snapshot)
OPTIONAL MATCH (sym)
  -[del:TRACKS {event: 'DELETED'}]->(snap_del:Snapshot)
WHERE snap_intro.timestamp <= timestamp('2024-01-01')
  AND (snap_del IS NULL OR snap_del.timestamp > timestamp('2024-01-01'))
RETURN sym
```

### Change Rate Analysis

```cypher
-- Most frequently modified symbols
MATCH (sym:Symbol)-[r:TRACKS {event: 'MODIFIED'}]->(snap:Snapshot)
RETURN sym, COUNT(r) as modification_count
ORDER BY modification_count DESC
LIMIT 20
```

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Core schema
- [Symbol.md](../nodes/Symbol.md) – Symbol definition
- [Feature.md](../nodes/Feature.md) – Feature definition
- [TestCase.md](../nodes/TestCase.md) – Test definition
- [Snapshot.md](../nodes/Snapshot.md) – Snapshot definition
- [IN_SNAPSHOT.md](./IN_SNAPSHOT.md) – Version membership (complementary)
- [CONTAINS.md](./CONTAINS.md) – Hierarchy (static structure vs. TRACKS evolution)
