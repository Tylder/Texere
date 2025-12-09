# [:IMPACTS] – Incident Impact

**Category**: Incident  
**Semantic**: "How does this incident relate to the codebase?"

---

## Purpose

Represents incident-to-codebase relationships: root causes and impacts. Consolidates: incidents
caused by symbols/endpoints, incidents affecting features/entities.

**Key Characteristic**: `type` property distinguishes root cause vs. impact; enables incident
analysis and blame tracking.

---

## Properties

| Property     | Type      | Required | Notes                                     |
| ------------ | --------- | -------- | ----------------------------------------- |
| `type`       | enum      | Yes      | 'CAUSED_BY' \| 'AFFECTS'                  |
| `severity`   | enum      | Optional | 'critical' \| 'high' \| 'medium' \| 'low' |
| `confidence` | float     | Optional | Analysis confidence (0.0–1.0)             |
| `createdAt`  | timestamp | Yes      | When relationship created                 |

---

## Sub-Types

### CAUSED_BY – Root Cause Analysis

```cypher
(incident:Incident)-[r:IMPACTS {type: 'CAUSED_BY', severity: 'critical', confidence: 0.95}]->(symbol:Symbol)
(incident:Incident)-[r:IMPACTS {type: 'CAUSED_BY', severity: 'high', confidence: 0.8}]->(endpoint:Boundary)
```

**Semantic**: Incident was directly caused by code (bug, incorrect logic, missing validation).

**Common root causes**:

- Logic error in symbol
- Missing input validation
- Null pointer dereference
- Race condition
- Performance regression

### AFFECTS – Impact Scope

```cypher
(incident:Incident)-[r:IMPACTS {type: 'AFFECTS', severity: 'high'}]->(feature:Feature)
(incident:Incident)-[r:IMPACTS {type: 'AFFECTS', severity: 'medium'}]->(endpoint:Boundary)
(incident:Incident)-[r:IMPACTS {type: 'AFFECTS', severity: 'critical'}]->(symbol:Symbol)
```

**Semantic**: Incident impacts (breaks, degrades, or affects correctness of) code or feature.

**Distinction from CAUSED_BY**:

- `CAUSED_BY`: Code directly responsible for incident
- `AFFECTS`: Code impacted by incident (may be upstream or downstream)

**Common impacts**:

- Feature unavailable due to upstream service failure
- Boundary degraded due to database issue
- Symbol execution blocked by missing dependency

---

## Source → Target Pairs

| Source   | Type      | Target          | Cardinality | Notes                             |
| -------- | --------- | --------------- | ----------- | --------------------------------- |
| Incident | CAUSED_BY | Symbol          | optional    | Bug/defect in symbol              |
| Incident | CAUSED_BY | Boundary        | optional    | Boundary mishandling              |
| Incident | AFFECTS   | Symbol          | optional    | Symbol broken/unavailable         |
| Incident | AFFECTS   | Boundary        | optional    | Boundary degraded                 |
| Incident | AFFECTS   | Feature         | optional    | Feature unavailable               |
| Incident | AFFECTS   | ExternalService | optional    | External service dependency issue |

---

## Schema

```cypher
-- Index for incident analysis
CREATE INDEX impacts_type IF NOT EXISTS
FOR ()-[r:IMPACTS]-() ON (r.type);

CREATE INDEX impacts_type_severity IF NOT EXISTS
FOR ()-[r:IMPACTS]-() ON (r.type, r.severity);

-- Example: Get incidents caused by symbol
MATCH (sym:Symbol {id: $symbolId})
  <-[r:IMPACTS {type: 'CAUSED_BY'}]-(incident:Incident)
RETURN incident, r.severity, r.confidence
ORDER BY r.severity DESC
```

---

## Query Patterns

### Root Cause Analysis

```cypher
-- What incident was caused by this symbol?
MATCH (sym:Symbol {id: $symbolId})
  <-[r:IMPACTS {type: 'CAUSED_BY'}]-(incident:Incident)
RETURN incident, r.severity, r.confidence, incident.description

-- Find critical incidents with root causes
MATCH (incident:Incident {severity: 'critical'})
  -[r:IMPACTS {type: 'CAUSED_BY', confidence: confidence}]->(cause)
WHERE confidence >= 0.8
RETURN incident, cause, r.severity, r.confidence
```

### Impact Scope

```cypher
-- What features are affected by incident?
MATCH (incident:Incident {id: $incidentId})
  -[r:IMPACTS {type: 'AFFECTS'}]->(feature:Feature)
RETURN feature, r.severity

-- Full impact scope (all affected nodes)
MATCH (incident:Incident {id: $incidentId})
  -[r:IMPACTS {type: 'AFFECTS'}]->(affected)
RETURN affected, labels(affected) as node_type, r.severity
ORDER BY r.severity DESC
```

### Incident Timeline

```cypher
-- All incidents affecting feature X
MATCH (f:Feature {id: 'payment'})
  <-[r:IMPACTS {type: 'AFFECTS'}]-(incident:Incident)
RETURN incident, r.severity, incident.timestamp
ORDER BY incident.timestamp DESC

-- Incidents in date range
MATCH (incident:Incident)
WHERE incident.timestamp >= timestamp('2024-01-01')
  AND incident.timestamp <= timestamp('2024-01-31')
OPTIONAL MATCH (incident)-[r1:IMPACTS {type: 'CAUSED_BY'}]->(cause)
OPTIONAL MATCH (incident)-[r2:IMPACTS {type: 'AFFECTS'}]->(affected)
RETURN incident, collect(DISTINCT cause) as root_causes, collect(DISTINCT affected) as impact_scope
```

### Blame Analysis

```cypher
-- Symbols with most incidents
MATCH (sym:Symbol)
  <-[r:IMPACTS {type: 'CAUSED_BY'}]-(incident:Incident)
RETURN sym, COUNT(incident) as incident_count, COUNT(DISTINCT incident.severity) as severity_count
GROUP BY sym
ORDER BY incident_count DESC
LIMIT 20

-- High-impact symbols (critical/high severity)
MATCH (sym:Symbol)
  <-[r:IMPACTS {type: 'CAUSED_BY', severity: severity}]-(incident:Incident)
WHERE severity IN ['critical', 'high']
RETURN sym, severity, COUNT(incident) as incident_count
GROUP BY sym, severity
ORDER BY incident_count DESC
```

### Service Outage Impact

```cypher
-- Boundaries affected by external service incident
MATCH (incident:Incident {description: '*Stripe outage*'})
  -[r:IMPACTS {type: 'AFFECTS'}]->(service:ExternalService)
MATCH (b:Boundary)-[:DEPENDS_ON {kind: 'SERVICE'}]->(service)
RETURN b, r.severity

-- Features broken by external service
MATCH (service:ExternalService {id: 'auth0'})
  <-[r:IMPACTS {type: 'AFFECTS'}]-(incident:Incident)
MATCH (sym:Symbol)-[:DEPENDS_ON {kind: 'SERVICE'}]->(service)
MATCH (f:Feature)-[:REALIZES {role: 'IMPLEMENTS'}]->(sym)
RETURN f, incident, r.severity
```

### Confidence-Based Analysis

```cypher
-- High-confidence root cause identification
MATCH (incident:Incident)
  -[r:IMPACTS {type: 'CAUSED_BY', confidence: confidence}]->(cause)
WHERE confidence >= 0.9
RETURN incident, cause, r.confidence

-- Low-confidence links (need investigation)
MATCH (incident:Incident)
  -[r:IMPACTS {type: 'CAUSED_BY', confidence: confidence}]->(cause)
WHERE confidence < 0.6
RETURN incident, cause, r.confidence
ORDER BY r.confidence ASC
```

### Prevention Tracking

```cypher
-- Tests covering root causes (prevention)
MATCH (incident:Incident {id: $incidentId})
  -[r:IMPACTS {type: 'CAUSED_BY'}]->(sym:Symbol)
OPTIONAL MATCH (test:TestCase)-[:REALIZES {role: 'TESTS'}]->(sym)
RETURN sym, COUNT(test) as test_coverage
```

---

## Constraints & Indexes

- **Type Index**: `impacts_type` for CAUSED_BY vs. AFFECTS filtering
- **Severity Index**: `impacts_type_severity` for priority-based queries
- **Cardinality**: Moderate (1–20 impacts per incident)
- **No Uniqueness**: Multiple incidents can affect same symbol

---

## Severity Levels

| Level        | Meaning                        | Examples                                          |
| ------------ | ------------------------------ | ------------------------------------------------- |
| **critical** | Complete system/feature outage | Database unreachable, all users affected          |
| **high**     | Major functionality broken     | Payment processing fails, authentication degraded |
| **medium**   | Partial functionality affected | Some users affected, workaround exists            |
| **low**      | Minor impact or edge case      | Cosmetic bug, specific condition                  |

---

## Common Use Cases

1. **Root cause analysis**: "Why did this incident happen?"
2. **Impact assessment**: "What's broken by this incident?"
3. **On-call debugging**: "Which symbols caused recent incidents?"
4. **Prevention**: "What tests should we add?"
5. **Postmortem**: "What was the scope of impact?"
6. **Incident history**: "Has this symbol caused incidents before?"

---

## Implementation Notes

### Root Cause Identification

Root causes identified via:

1. **Manual tagging** (incident report references code)
2. **Log analysis** (stack traces, error messages)
3. **LLM semantic analysis** (description → related symbols)
4. **Commit correlation** (incident date → recent commits)

**Confidence scoring**:

- **0.95–1.0**: Explicit stack trace or manual confirmation
- **0.7–0.95**: Strong correlation (recent commit, log message match)
- **0.5–0.7**: Semantic analysis (description mentions feature/endpoint)
- **<0.5**: Speculative (low confidence, needs investigation)

### Impact Propagation

```cypher
-- Transitive impact (through dependencies)
MATCH (incident:Incident {id: $incidentId})
  -[r1:IMPACTS {type: 'CAUSED_BY'}]->(cause:Symbol)
MATCH (cause)<-[r2:REFERENCES {type: 'CALL'}*0..3]-(dependent:Symbol)
RETURN dependent as potentially_affected
```

### Incident Classification

Incidents have lifecycle properties:

```cypher
{
  id: "INC-2024-001",
  title: "Payment Processing Error",
  description: "Stripe API timeout causing checkout failures",
  severity: "critical",
  status: "resolved",  -- open | investigating | resolved | postmortem
  createdAt: timestamp("2024-01-15T10:30:00Z"),
  resolvedAt: timestamp("2024-01-15T11:45:00Z"),
  postmortemUrl: "https://wiki.company.com/postmortem/inc-2024-001"
}
```

---

## Postmortem Template

For serious incidents, create postmortem linking to:

1. Root cause symbol(s) via `IMPACTS {type: 'CAUSED_BY'}`
2. Affected features/endpoints via `IMPACTS {type: 'AFFECTS'}`
3. Prevention measures (tests) via `REALIZES {role: 'TESTS'}`
4. Documentation via `DOCUMENTS`

---

## Performance Notes

- **Lookup Cost**: O(log N) via type/severity index
- **Incident Timeline**: Fast (incident timestamp ordered)
- **Impact Scope**: Moderate (traversal via edge type)

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Core schema
- [Incident.md](../nodes/Incident.md) – Incident definition
- [Symbol.md](../nodes/Symbol.md) – Code artifacts
- [Boundary.md](../nodes/Boundary.md) – API endpoints
- [Feature.md](../nodes/Feature.md) – Features
- [ExternalService.md](../nodes/ExternalService.md) – External dependencies
- [REFERENCES.md](./REFERENCES.md) – Code relations (transitive impact)
- [DEPENDS_ON.md](./DEPENDS_ON.md) – Dependencies (external service impact)
- [REALIZES.md](./REALIZES.md) – Testing (prevention via test coverage)
