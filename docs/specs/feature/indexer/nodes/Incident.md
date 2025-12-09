# Incident Node

**Category**: Cross-Snapshot  
**Purpose**: Reported issue/bug (persistent, not tied to specific snapshot).

---

## Properties

| Property      | Type      | Constraints | Notes                                                        |
| ------------- | --------- | ----------- | ------------------------------------------------------------ |
| `id`          | string    | UNIQUE      | Incident identifier (from incidents.yaml or external system) |
| `title`       | string    | Required    | Incident title                                               |
| `description` | string    | Optional    | Incident description                                         |
| `severity`    | enum      | Optional    | "critical" \| "high" \| "medium" \| "low"                    |
| `status`      | enum      | Required    | "open" \| "resolved" \| "archived"                           |
| `createdAt`   | timestamp | Required    | When incident occurred                                       |
| `resolvedAt`  | timestamp | Optional    | When resolved                                                |

---

## Schema

```cypher
CREATE CONSTRAINT incident_id_unique IF NOT EXISTS
FOR (n:Incident) REQUIRE n.id IS UNIQUE;

CREATE INDEX incident_severity IF NOT EXISTS
FOR (n:Incident) ON (n.severity);

CREATE (i:Incident {
  id: "INC-2024-001",
  title: "Payment endpoint timeout during peak hours",
  description: "POST /api/payments timeout >500ms under load",
  severity: "high",
  status: "open",
  createdAt: timestamp(1700000000),
  resolvedAt: null
})
```

---

## Relationships

### Outgoing (3 edge types)

| Edge                             | Target                    | Cardinality | Notes                  |
| -------------------------------- | ------------------------- | ----------- | ---------------------- |
| `[:IMPACTS {type: 'CAUSED_BY'}]` | [Symbol](./Symbol.md)     | optional    | Root cause is symbol   |
| `[:IMPACTS {type: 'CAUSES_BY'}]` | [Endpoint](./Endpoint.md) | optional    | Root cause is endpoint |
| `[:IMPACTS {type: 'AFFECTS'}]`   | [Feature](./Feature.md)   | optional    | Impacts feature        |

### Incoming

None. Incidents are created externally.

---

## Lifecycle

1. **Creation**: Created when incident reported (manual or automated)
2. **Investigation**: Root cause linked via `[:IMPACTS {type: 'CAUSED_BY'}]`
3. **Impact Analysis**: Affected features linked via `[:IMPACTS {type: 'AFFECTS'}]`
4. **Resolution**: Status updated to "resolved", `resolvedAt` set
5. **Archival**: Status updated to "archived" (retention policy)
6. **No Deletion**: Never deleted; soft status changes only

---

## Usage Patterns

### Find Incident Root Cause

```cypher
MATCH (i:Incident {id: $incidentId})-[r:IMPACTS {type: 'CAUSED_BY'}]->(cause)
RETURN cause
```

### Find Affected Features

```cypher
MATCH (i:Incident {id: $incidentId})-[r:IMPACTS {type: 'AFFECTS'}]->(f:Feature)
RETURN f
```

### Find Open Incidents

```cypher
MATCH (i:Incident {status: 'open'})
RETURN i
ORDER BY i.severity DESC, i.createdAt DESC
```

### Incident Impact Analysis

```cypher
MATCH (i:Incident {id: $incidentId})
OPTIONAL MATCH (i)-[r1:IMPACTS {type: 'CAUSED_BY'}]->(causeSymbol:Symbol)
OPTIONAL MATCH (i)-[r2:IMPACTS {type: 'AFFECTS'}]->(affectFeature:Feature)
OPTIONAL MATCH (causeSymbol)-[:TRACKS]->(snap:Snapshot)
OPTIONAL MATCH (affectFeature)-[:TRACKS]->(snap2:Snapshot)

RETURN {
  incident: i,
  rootCauseSymbol: causeSymbol,
  affectedFeatures: collect(DISTINCT affectFeature),
  relevantSnapshots: collect(DISTINCT snap) + collect(DISTINCT snap2)
}
```

### Find Critical Issues

```cypher
MATCH (i:Incident {severity: 'critical', status: 'open'})
RETURN i
ORDER BY i.createdAt DESC
```

### Incident History

```cypher
MATCH (i:Incident {id: $incidentId})
RETURN i.title, i.status, i.severity, i.createdAt, i.resolvedAt
```

---

## Constraints & Indexes

- **Unique Index**: `incident_id_unique` on `id`
- **Severity Index**: `incident_severity` on `severity` (filtering by criticality)
- **Cardinality**: Many incidents; persistent across snapshots
- **Manual Linking**: Root cause and impact edges are manually maintained (no auto-discovery in v1)

---

## Incident Tracking

### Manual Mapping Required

v1 does NOT auto-detect root causes. Incidents must be manually mapped:

```cypher
-- Add root cause mapping
MATCH (i:Incident {id: 'INC-001'})
MATCH (sym:Symbol {id: 'snap-123:...'})
CREATE (i)-[:IMPACTS {type: 'CAUSED_BY'}]->(sym)

-- Add impact mapping
MATCH (i:Incident {id: 'INC-001'})
MATCH (f:Feature {id: 'payment'})
CREATE (i)-[:IMPACTS {type: 'AFFECTS'}]->(f)
```

### Future Enhancements (v2+)

- LLM-assisted root cause detection
- Stack trace → symbol mapping
- Automated impact analysis

---

## Common Use Cases

1. **Incident context**: "What code caused incident X?"
2. **Impact assessment**: "Which features affected?"
3. **Historical tracking**: "How many critical incidents?"
4. **Regression prevention**: "Which tests should have caught this?"
5. **Trend analysis**: "Incident patterns by module/feature"

---

## Integration with Agent Workflows

Agents use incidents for:

- **Debugging**: "Show context for incident X"
- **Prevention**: "Fix root cause before release"
- **Improvement**: "Add tests to prevent recurrence"
- **Learning**: "Historical incident database"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Symbol.md](./Symbol.md) – Root cause
- [Endpoint.md](./Endpoint.md) – API endpoint involved
- [Feature.md](./Feature.md) – Feature impact
- [../edges/IMPACTS.md](../edges/IMPACTS.md) – Incident relationships
