# Workflow Relationships – CONTAINS, TRIGGERS, STARTS, PART_OF (V2+)

**Category**: Orchestration  
**Status**: Optional (v2+) — Only applicable when using [Workflow](../nodes/Workflow.md) nodes.  
**Semantic**: "What are the workflow steps and orchestration triggers?"

---

## Purpose

Captures long-running orchestration flows (Airflow DAGs, Temporal workflows, Step Functions, Jenkins
pipelines, GitHub Actions).

---

## Properties (All Workflow Edges)

| Property    | Type      | Required | Notes                     |
| ----------- | --------- | -------- | ------------------------- |
| `createdAt` | timestamp | Yes      | When relationship created |

---

## Sub-Types & Patterns

### [:CONTAINS] – Workflow Contains Step

A Workflow contains/includes a Symbol or Boundary as a step.

```cypher
(workflow:Workflow {
  name: 'daily-user-sync',
  kind: 'AIRFLOW'
})-[:CONTAINS]->(step:Symbol {
  name: 'extract_users'
})

(workflow)-[:CONTAINS]->(step2:Symbol {name: 'transform_users'})
(workflow)-[:CONTAINS]->(step3:Symbol {name: 'load_warehouse'})

-- Workflow containing a boundary trigger
(workflow:Workflow {
  name: 'process-order',
  kind: 'TEMPORAL'
})-[:CONTAINS]->(boundary:Boundary {
  kind: 'HTTP',
  endpoint: '/webhooks/order-status'
})
```

**Semantic**: Symbol/Boundary is a step in this workflow.

**Common patterns**:

- Airflow task
- Temporal activity
- Step Functions state
- Pipeline stage

### [:TRIGGERS] – Workflow Triggers Boundary

A Workflow triggers an external boundary (invokes an endpoint/handler).

```cypher
(workflow:Workflow {
  name: 'payment-workflow',
  kind: 'TEMPORAL'
})-[:TRIGGERS]->(boundary:Boundary {
  kind: 'HTTP',
  endpoint: '/api/process-refund'
})

-- Workflow triggers Lambda
(workflow:Workflow {
  name: 'data-pipeline',
  kind: 'STEP_FUNCTIONS'
})-[:TRIGGERS]->(boundary:Boundary {
  kind: 'LAMBDA',
  endpoint: 'transformData'
})
```

**Semantic**: Workflow execution calls this boundary/endpoint.

**Common patterns**:

- Invoke HTTP endpoint
- Trigger Lambda function
- Call gRPC service
- Invoke child workflow

### [:STARTS] – Boundary Starts Workflow

A Boundary initiates/starts a workflow execution.

```cypher
-- HTTP endpoint starts async workflow
(boundary:Boundary {
  kind: 'HTTP',
  endpoint: '/api/submit-batch'
})-[:STARTS]->(workflow:Workflow {
  name: 'batch-processing',
  kind: 'TEMPORAL'
})

-- Event triggers workflow
(boundary:Boundary {
  kind: 'CONSUMER',
  endpoint: 'order-events'
})-[:STARTS]->(workflow:Workflow {
  name: 'order-fulfillment'
})
```

**Semantic**: Boundary execution initiates this workflow.

**Common patterns**:

- HTTP request triggers async job
- Event triggers workflow
- Webhook starts orchestration
- Cron job starts pipeline

### [:PART_OF] – Symbol Part of Workflow

A Symbol is part of workflow execution (alternative to CONTAINS).

```cypher
(sym:Symbol {name: 'validatePayment'})
-[:PART_OF]->
(workflow:Workflow {name: 'payment-workflow'})

-- Symbol indirectly part of workflow via call
(sym2:Symbol {name: 'chargeCard'})
-[:PART_OF]->
(workflow)
```

**Semantic**: Symbol participates in workflow (can be direct step or indirect via calls).

**Use when**: Symbol is called during workflow but not explicitly a step.

---

## Source → Target Pairs

| Source   | Edge     | Target   | Cardinality | Notes                           |
| -------- | -------- | -------- | ----------- | ------------------------------- |
| Workflow | CONTAINS | Symbol   | optional    | Workflow contains step          |
| Workflow | CONTAINS | Boundary | optional    | Workflow contains boundary      |
| Workflow | TRIGGERS | Boundary | optional    | Workflow invokes boundary       |
| Boundary | STARTS   | Workflow | optional    | Boundary initiates workflow     |
| Symbol   | PART_OF  | Workflow | optional    | Symbol participates in workflow |

---

## Query Patterns

### Find Workflow Steps (Topologically Ordered)

```cypher
MATCH (workflow:Workflow {name: $workflowName})
MATCH (workflow)-[:CONTAINS]->(step:Symbol)
RETURN step.name, step.startLine
ORDER BY step.startLine
```

### Trace Workflow Execution Path

```cypher
-- What steps run and in what order?
MATCH (workflow:Workflow {name: $workflowName})
MATCH (workflow)-[:CONTAINS]->(step:Symbol)
MATCH (step)-[:REFERENCES {type: 'CALL'}*0..3]->(downstream:Symbol)
RETURN DISTINCT workflow.name, step.name, downstream.name
ORDER BY step.startLine
```

### Find Workflows Triggered by Boundary

```cypher
MATCH (boundary:Boundary {endpoint: $endpoint})
MATCH (boundary)-[:STARTS]->(workflow:Workflow)
RETURN workflow.name, workflow.kind, workflow.description
```

### Find All Boundaries Invoked by Workflow

```cypher
MATCH (workflow:Workflow {name: $workflowName})
MATCH (workflow)-[:TRIGGERS]->(boundary:Boundary)
RETURN boundary.endpoint, boundary.kind
```

### End-to-End Flow: Event → Workflow → Endpoint

```cypher
-- Complete flow: event → workflow start → workflow steps → invoked boundaries
MATCH (trigger:Boundary {kind: 'CONSUMER'})
MATCH (trigger)-[:STARTS]->(workflow:Workflow)
MATCH (workflow)-[:CONTAINS]->(step:Symbol)
MATCH (workflow)-[:TRIGGERS]->(invoked:Boundary)
RETURN trigger.endpoint as eventTrigger, workflow.name, step.name, invoked.endpoint
```

### Find Workflow Dependencies on External Services

```cypher
MATCH (workflow:Workflow)
OPTIONAL MATCH (workflow)-[:DEPENDS_ON {kind: 'SERVICE'}]->(service:ExternalService)
RETURN workflow.name, COLLECT(service.name) as externalServices
```

### Workflow Coupling Analysis

```cypher
-- Which workflows interact with each other?
MATCH (w1:Workflow)
MATCH (w1)-[:TRIGGERS]->(boundary:Boundary)
MATCH (boundary)-[:STARTS]->(w2:Workflow)
WHERE w1 <> w2
RETURN w1.name as source_workflow, w2.name as triggered_workflow, boundary.endpoint
```

### Workflow vs Boundary Triggering

```cypher
-- Which boundaries are triggered by workflows vs called directly?
MATCH (boundary:Boundary)
OPTIONAL MATCH (w:Workflow)-[:TRIGGERS]->(boundary)
OPTIONAL MATCH (caller:Symbol)-[:REFERENCES {type: 'CALL'}]->(target)
WHERE target.name = boundary.name OR target.id = boundary.handlerSymbolId
RETURN boundary.endpoint,
       CASE WHEN w IS NOT NULL THEN 'WORKFLOW_TRIGGERED' ELSE 'DIRECT_CALL' END as invocation_type,
       COLLECT(DISTINCT w.name) as workflows,
       COLLECT(DISTINCT caller.name) as direct_callers
```

### Parallel Workflow Steps

```cypher
-- Find steps that can run in parallel (no dependency between them)
MATCH (workflow:Workflow {name: $workflowName})
MATCH (workflow)-[:CONTAINS]->(step1:Symbol)
MATCH (workflow)-[:CONTAINS]->(step2:Symbol)
WHERE step1 <> step2
AND NOT (step1)-[:REFERENCES {type: 'CALL'}*]->(step2)
AND NOT (step2)-[:REFERENCES {type: 'CALL'}*]->(step1)
RETURN step1.name, step2.name, "CAN_PARALLELIZE" as recommendation
```

---

## Common Use Cases

1. **Workflow Visualization**: Generate DAG diagrams
2. **Dependency Analysis**: What external services does workflow depend on?
3. **Bottleneck Detection**: Which steps have high cardinality?
4. **Resilience Planning**: Which workflow failures would impact end-users?
5. **Observability**: Instrument workflow tracing
6. **SLA Tracking**: Monitor workflow execution times
7. **Cost Analysis**: Which workflows use expensive services?
8. **Performance Optimization**: Identify parallelization opportunities

---

## Implementation Notes

### CONTAINS vs PART_OF

- **CONTAINS**: Explicit workflow step (declared in workflow definition)
- **PART_OF**: Implicit involvement (called during workflow execution)

```cypher
-- Airflow task (explicit step)
(dag:Workflow)-[:CONTAINS]->(extract_task:Symbol {name: 'extract'})

-- Function called by task (implicit participation)
(helper:Symbol {name: 'validateData'})-[:PART_OF]->(dag)
```

### TRIGGERS vs REFERENCES

- **TRIGGERS**: Workflow directly invokes boundary (orchestration call)
- **REFERENCES {type: 'CALL'}**: Symbol calls another symbol (code call)

```cypher
-- Workflow triggers boundary/endpoint
(workflow:Workflow)-[:TRIGGERS]->(api:Boundary)

-- Symbol in workflow calls helper
(step:Symbol)-[:REFERENCES {type: 'CALL'}]->(helper:Symbol)
```

### STARTS vs REFERENCES

- **STARTS**: Boundary initiates entire workflow (orchestration trigger)
- **REFERENCES**: Symbol calls step/function (code invocation)

```cypher
-- HTTP endpoint triggers workflow
(webhook:Boundary)-[:STARTS]->(workflow:Workflow)

-- Step calls another step
(step1:Symbol)-[:REFERENCES {type: 'CALL'}]->(step2:Symbol)
```

---

## V2+ Migration

**When to create**:

1. You have enabled [Workflow](../nodes/Workflow.md) nodes
2. You have orchestration/automation (Airflow, Temporal, Step Functions, GitHub Actions, Jenkins)
3. You need workflow tracing and dependency analysis

**Pattern**:

```cypher
-- Example: Airflow DAG with steps
MATCH (snap:Snapshot {id: $snapshotId})

-- Create workflow
CREATE (dag:Workflow {
  id: 'snap123:daily-user-sync',
  name: 'daily-user-sync',
  kind: 'AIRFLOW',
  description: 'ETL: extract → transform → load'
})-[:IN_SNAPSHOT]->(snap)

-- Find or create task symbols
MATCH (snap)<-[:IN_SNAPSHOT]-(extractTask:Symbol {name: 'extract_users'})
MATCH (snap)<-[:IN_SNAPSHOT]-(transformTask:Symbol {name: 'transform_users'})
MATCH (snap)<-[:IN_SNAPSHOT]-(loadTask:Symbol {name: 'load_warehouse'})

-- Add steps to workflow
MERGE (dag)-[:CONTAINS]->(extractTask)
MERGE (dag)-[:CONTAINS]->(transformTask)
MERGE (dag)-[:CONTAINS]->(loadTask)

-- Task dependencies
MERGE (extractTask)-[:REFERENCES {type: 'CALL'}]->(transformTask)
MERGE (transformTask)-[:REFERENCES {type: 'CALL'}]->(loadTask)

-- Workflow triggered by scheduled job
MATCH (trigger:Boundary {kind: 'JOB', endpoint: 'daily-sync-trigger'})
MERGE (trigger)-[:STARTS]->(dag)
```

---

## References

- **Graph Schema Spec**: `docs/specs/feature/indexer/graph_schema_spec.md` §3
- **Workflow Node**: `docs/specs/feature/indexer/nodes/Workflow.md`
- **Symbol Node**: `docs/specs/feature/indexer/nodes/Symbol.md`
- **Boundary Node**: `docs/specs/feature/indexer/nodes/Boundary.md`
- **DEPENDS_ON Edge**: [DEPENDS_ON.md](./DEPENDS_ON.md) (for SERVICE kind)
- **REFERENCES Edge**: [REFERENCES.md](./REFERENCES.md) (for CALL type)
