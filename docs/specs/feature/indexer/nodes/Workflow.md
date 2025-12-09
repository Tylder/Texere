# Workflow Node (Optional, V2+)

**Purpose**: Track long-running orchestrations and automation (Airflow, Temporal, Step Functions,
GitHub Actions, etc.).

**Status**: Optional — Add when you have orchestration/automation systems and need to track workflow
evolution, step dependencies, or execution tracing.

---

## Schema

| Property      | Type      | Constraints | Notes                                                                                            |
| ------------- | --------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:workflowName`                                                             |
| `snapshotId`  | string    | Required    | Foreign key to Snapshot                                                                          |
| `name`        | string    | Required    | Workflow name (e.g., `payment-processing`, `data-pipeline`)                                      |
| `kind`        | enum      | Required    | "AIRFLOW" \| "TEMPORAL" \| "STEP_FUNCTIONS" \| "GITHUB_ACTION" \| "JENKINS_PIPELINE" \| "CUSTOM" |
| `entryPoint`  | string    | Optional    | Entry point symbol name or boundary identifier                                                   |
| `description` | string    | Optional    | What this workflow does                                                                          |
| `createdAt`   | timestamp | Required    | When indexed                                                                                     |

```cypher
CREATE CONSTRAINT workflow_id_unique IF NOT EXISTS
FOR (n:Workflow) REQUIRE n.id IS UNIQUE;
```

---

## Relationships

| From → To                  | Type            | Property          | Meaning                              |
| -------------------------- | --------------- | ----------------- | ------------------------------------ |
| Workflow → Symbol          | `[:CONTAINS]`   | —                 | Workflow contains/calls a step       |
| Workflow → Boundary        | `[:TRIGGERS]`   | —                 | Workflow triggers boundary/endpoint  |
| Boundary → Workflow        | `[:STARTS]`     | —                 | Boundary initiates workflow          |
| Symbol → Workflow          | `[:PART_OF]`    | —                 | Symbol is part of workflow execution |
| Workflow → ExternalService | `[:DEPENDS_ON]` | `kind: 'SERVICE'` | Workflow depends on external service |

---

## When to Use

Add `Workflow` nodes when:

- You have Airflow DAGs, Temporal workflows, or Step Functions state machines
- You need to track workflow evolution, step dependencies, or execution patterns
- You want to understand orchestration logic and data pipelines
- You need to debug failed workflows or trace execution paths
- You're building workflow observability or performance monitoring
- You need to understand service coupling via orchestrations
- You're analyzing data pipeline dependencies or lineage

---

## Examples

### Airflow DAG

```cypher
(workflow:Workflow {
  id: 'snap123:daily-user-sync',
  snapshotId: 'snap123',
  name: 'daily-user-sync',
  kind: 'AIRFLOW',
  entryPoint: 'extract_users',
  description: 'Daily ETL pipeline to sync user data from external source to warehouse'
})

-- Workflow contains multiple tasks (symbols)
(task1:Symbol {name: 'extract_users'})
(task2:Symbol {name: 'transform_users'})
(task3:Symbol {name: 'load_warehouse'})

(workflow)-[:CONTAINS]->(task1)
(workflow)-[:CONTAINS]->(task2)
(workflow)-[:CONTAINS]->(task3)

-- Task dependencies form execution order
(task1)-[:REFERENCES {type: 'CALL'}]->(task2)
(task2)-[:REFERENCES {type: 'CALL'}]->(task3)

-- Workflow depends on external data source
(workflow)-[:DEPENDS_ON {kind: 'SERVICE'}]->(source:ExternalService {name: 'User API'})
```

### Temporal Workflow

```cypher
(workflow:Workflow {
  id: 'snap123:payment-processing-workflow',
  name: 'payment-processing-workflow',
  kind: 'TEMPORAL',
  entryPoint: 'ProcessPayment',
  description: 'Long-running workflow for payment processing with retries and error handling'
})

(chargeActivity:Symbol {name: 'ChargePaymentActivity'})
(validateActivity:Symbol {name: 'ValidateTransactionActivity'})
(notifyActivity:Symbol {name: 'NotifyMerchantActivity'})

(workflow)-[:CONTAINS]->(chargeActivity)
(workflow)-[:CONTAINS]->(validateActivity)
(workflow)-[:CONTAINS]->(notifyActivity)

-- Temporal activities with orchestration logic
(chargeActivity)-[:REFERENCES {type: 'CALL'}]->(validateActivity)
(validateActivity)-[:REFERENCES {type: 'CALL'}]->(notifyActivity)

(workflow)-[:DEPENDS_ON {kind: 'SERVICE'}]->(stripe:ExternalService {name: 'Stripe'})
```

### Step Functions State Machine

```cypher
(workflow:Workflow {
  id: 'snap123:process-s3-upload',
  name: 'process-s3-upload',
  kind: 'STEP_FUNCTIONS',
  entryPoint: 'startProcessing',
  description: 'Orchestrates S3 file processing: validate → transform → store'
})

(validateHandler:Symbol {name: 'validateS3File'})
(transformHandler:Symbol {name: 'transformFileFormat'})
(storeHandler:Symbol {name: 'storeInDatabase'})

(workflow)-[:CONTAINS]->(validateHandler)
(workflow)-[:CONTAINS]->(transformHandler)
(workflow)-[:CONTAINS]->(storeHandler)

-- State machine transitions
(validateHandler)-[:REFERENCES {type: 'CALL'}]->(transformHandler)
(transformHandler)-[:REFERENCES {type: 'CALL'}]->(storeHandler)
```

### GitHub Actions Workflow

```cypher
(workflow:Workflow {
  id: 'snap123:.github-workflows-test.yml',
  name: 'test-and-deploy',
  kind: 'GITHUB_ACTION',
  description: 'CI/CD: Run tests, build container, deploy to staging'
})

(testStep:Symbol {name: 'run_tests'})
(buildStep:Symbol {name: 'build_container'})
(deployStep:Symbol {name: 'deploy_staging'})

(workflow)-[:CONTAINS]->(testStep)
(workflow)-[:CONTAINS]->(buildStep)
(workflow)-[:CONTAINS]->(deployStep)

-- Sequential execution in GitHub Actions
(testStep)-[:REFERENCES {type: 'CALL'}]->(buildStep)
(buildStep)-[:REFERENCES {type: 'CALL'}]->(deployStep)
```

### Jenkins Pipeline

```cypher
(workflow:Workflow {
  id: 'snap123:Jenkinsfile-deploy',
  name: 'deploy-production',
  kind: 'JENKINS_PIPELINE',
  entryPoint: 'checkout',
  description: 'Multi-stage pipeline: build → test → deploy to production'
})

-- Pipeline stages as symbols
(checkout:Symbol {name: 'checkout'})
(build:Symbol {name: 'build'})
(test:Symbol {name: 'test'})
(deploy:Symbol {name: 'deploy'})

(workflow)-[:CONTAINS]->(checkout)
(workflow)-[:CONTAINS]->(build)
(workflow)-[:CONTAINS]->(test)
(workflow)-[:CONTAINS]->(deploy)

-- Pipeline flow
(checkout)-[:REFERENCES {type: 'CALL'}]->(build)
(build)-[:REFERENCES {type: 'CALL'}]->(test)
(test)-[:REFERENCES {type: 'CALL'}]->(deploy)
```

---

## Query Patterns

### Find All Workflows in a Snapshot

```cypher
MATCH (snap:Snapshot {id: $snapshotId})
MATCH (snap)<-[:IN_SNAPSHOT]-(workflow:Workflow)
RETURN workflow.name, workflow.kind, workflow.description
```

### Find Workflow Steps and Execution Order

```cypher
MATCH (workflow:Workflow {name: $workflowName})
MATCH (workflow)-[:CONTAINS]->(step:Symbol)
RETURN step.name
ORDER BY step.startLine
```

### Trace Workflow Dependencies

```cypher
MATCH (workflow:Workflow {name: $workflowName})
MATCH (workflow)-[:CONTAINS]->(step:Symbol)
MATCH (step)-[:REFERENCES*]->(dependency)
RETURN DISTINCT dependency.name as stepName
```

### Find External Services Called by Workflow

```cypher
MATCH (workflow:Workflow)
MATCH (workflow)-[:DEPENDS_ON {kind: 'SERVICE'}]->(service:ExternalService)
RETURN workflow.name, COLLECT(DISTINCT service.name) as externalServices
```

### Workflows That Use a Specific External Service

```cypher
MATCH (service:ExternalService {name: $serviceName})
MATCH (workflow:Workflow)-[:DEPENDS_ON {kind: 'SERVICE'}]->(service)
RETURN workflow.name, workflow.kind, workflow.description
```

### Workflow Call Graph (Which workflows trigger boundaries?)

```cypher
MATCH (workflow:Workflow)-[:TRIGGERS]->(boundary:Boundary)
MATCH (boundary)-[:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN workflow.name, boundary.endpoint, handler.name
```

### Find Workflows Triggered by HTTP Endpoints

```cypher
-- HTTP endpoints that start workflows
MATCH (boundary:Boundary {kind: 'HTTP'})
MATCH (boundary)-[:STARTS]->(workflow:Workflow)
RETURN boundary.endpoint, workflow.name, workflow.kind
```

### Workflows by Kind (distribution analysis)

```cypher
-- How many workflows of each type?
MATCH (workflow:Workflow)-[:IN_SNAPSHOT]->(snap:Snapshot {id: $snapshotId})
RETURN workflow.kind, COUNT(DISTINCT workflow) as count
```

---

## V1 → V2 Migration

**V1 (Current)**:

- Workflows/orchestrations represented as complex Symbol call graphs
- No explicit Workflow nodes
- Orchestration logic embedded in Symbol or Boundary definitions

**V2 Migration**:

1. Add `Workflow` node type
2. Parse workflow definitions from files (Airflow DAGs, Temporal workflows, Step Functions
   definitions, GitHub Actions YAML, Jenkins pipelines)
3. Create Workflow nodes with kind and entry point
4. Map workflow steps to Symbol nodes or Boundary entry points
5. Link step dependencies via existing `[:REFERENCES {type: 'CALL'}]`
6. Link external service dependencies via `[:DEPENDS_ON {kind: 'SERVICE'}]`
7. Track workflow evolution via `[:TRACKS]` relationships

---

## References

- **Graph Schema Spec**: `docs/specs/feature/indexer/graph_schema_spec.md` §2.4.6
- **Node Catalog**: `docs/specs/feature/indexer/nodes/README.md`
- **Related Nodes**: Symbol, Boundary, ExternalService
