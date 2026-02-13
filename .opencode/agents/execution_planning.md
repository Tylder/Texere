---
description: |
  Execution Planning Workflow - Create or revise PHASE-PLAN by executing Tasks 1-7
  from docs/engineering/execution/creation/phase-plan/ inline. Works with declared
  state snapshot (trusts RESEARCH assertions). No special uncertainty handling.
mode: subagent
temperature: 0.2
tools:
  read: true
  write: true
  serena: true
  bash: true
permission:
  task:
    '*': 'deny'
    'research': 'allow'
  bash:
    '*': 'deny'
    'find *': 'allow'
    'git log *': 'allow'
---

# Execution Planning Workflow

## Purpose

Create or revise PHASE-PLAN by executing Tasks 1-7 from framework documentation. Produce draft
PHASE-PLAN, research artifacts, and ready for user approval.

---

## Workflow

```pseudocode
ENTRY_POINT(coordinator_input):

  context = coordinator_input.context
  session_state = coordinator_input.session_state

  feature_slug = context.feature_slug
  phase_slug = context.phase_slug

  IF phase_slug not provided:
    RETURN error("phase_slug required for planning")

  // Step 1: Initialize PHASE-PLAN context
  phase_plan_dir = "docs/execution/{feature_slug}/{phase_slug}"
  research_dir = "{phase_plan_dir}/_research"
  phase_plan_path = "{phase_plan_dir}/{phase_slug}-PHASE-PLAN.md"

  // Check: create or revise
  IF phase_plan_path exists:
    existing_plan = read_file(phase_plan_path)
    mode = "revise"
  ELSE:
    existing_plan = null
    mode = "create"

  // Step 2: Get research state from session (state snapshot only, not uncertainty)
  research_state = session_state.research_findings.state_snapshot IF session_state.research_findings ELSE null

  // Step 3: Execute Tasks 1-7 sequentially
  task_results = []

  // TASK 1: Research Phase Context
  task1 = execute_task_1(feature_slug, phase_slug, research_state)
  task_results.append({task: 1, result: task1})
  IF task1.status == "critical_error":
    RETURN escalation_result(task1.error)

  // TASK 2: Define Contracts
  task2 = execute_task_2(feature_slug, phase_slug, task1)
  task_results.append({task: 2, result: task2})

  // TASK 3: Plan Test Coverage
  task3 = execute_task_3(feature_slug, phase_slug, task1)
  task_results.append({task: 3, result: task3})

  // TASK 4: Define Success Criteria
  task4 = execute_task_4(feature_slug, phase_slug, task1, task2, task3)
  task_results.append({task: 4, result: task4})

  // TASK 5: Specify Mocks
  task5 = execute_task_5(feature_slug, phase_slug, task3)
  task_results.append({task: 5, result: task5})

  // TASK 6: Break Into Tasks
  task6 = execute_task_6(feature_slug, phase_slug, task_results[0:5])
  task_results.append({task: 6, result: task6})

  // TASK 7: Fill Template
  task7 = execute_task_7(feature_slug, phase_slug, task_results[0:6], existing_plan)
  task_results.append({task: 7, result: task7})

  // Step 4: Write phase plan to disk
  write_file(phase_plan_path, task7.phase_plan_content)

  // Step 5: Write research artifacts
  write_research_artifacts(research_dir, task_results)

  // Step 6: Check for escalations (contradictions found during planning)
  escalation = check_planning_escalations(task_results)

  // Step 7: Return to coordinator
  result = {
    status: IF escalation THEN "escalate" ELSE "complete",
    mode: mode,
    phase_plan_path: phase_plan_path,
    phase_plan_status: "draft",  // Requires user approval
    research_artifacts_location: research_dir,
    artifacts_count: count_artifacts(task_results),
    escalation: escalation
  }

  RETURN result

// ============================================================================
// TASK IMPLEMENTATIONS
// ============================================================================

// Each task references framework docs: docs/engineering/execution/creation/phase-plan/0X-*.md
// This workflow does NOT duplicate those docs, only executes them

FUNCTION execute_task_1(feature_slug, phase_slug, research_state):

  // Task 1: Research Phase Context
  // Ref: docs/engineering/execution/creation/phase-plan/01-research-phase-context.md

  // Read SPEC, REQ, parent IMPL-PLAN
  // Identify: phase dependencies, constraints, SPEC requirements

  task_result = {
    task: 1,
    status: "complete",
    phase_context: {
      spec_requirements: [],
      dependencies: [],
      constraints: [],
      key_decisions: []
    },
    artifacts: {
      "phase-research.md": "",  // Created during task execution
      "research-contradictions.md": ""
    }
  }

  // Pseudocode: actual implementation reads framework task doc
  // Returns: research findings + artifacts

  RETURN task_result

FUNCTION execute_task_2(feature_slug, phase_slug, task1_result):

  // Task 2: Define Contracts
  // Ref: docs/engineering/execution/creation/phase-plan/02-define-contracts.md

  // Input contract: what upstream phase must provide
  // Output contract: what this phase guarantees downstream
  // Internal contracts: task-to-task boundaries

  task_result = {
    task: 2,
    status: "complete",
    contracts: {
      input_contract: {},
      output_contract: {},
      internal_contracts: []
    },
    artifacts: {
      "phase-contracts.md": ""
    }
  }

  RETURN task_result

FUNCTION execute_task_3(feature_slug, phase_slug, task1_result):

  // Task 3: Plan Test Coverage
  // Ref: docs/engineering/execution/creation/phase-plan/03-plan-test-coverage.md

  // Unit test strategy, integration test strategy, E2E test strategy
  // Coverage thresholds, test file locations, assertion focus

  task_result = {
    task: 3,
    status: "complete",
    test_plan: {
      unit_tests: {},
      integration_tests: {},
      e2e_tests: {}
    },
    artifacts: {
      "test-coverage-plan.md": ""
    }
  }

  RETURN task_result

FUNCTION execute_task_4(feature_slug, phase_slug, task1, task2, task3):

  // Task 4: Define Success Criteria
  // Ref: docs/engineering/execution/creation/phase-plan/04-define-success-criteria.md

  // Success criterion: "QC passes" (for each QC gate)
  // Success criterion: "All tests pass"
  // Success criterion: "Code coverage meets threshold"
  // etc.

  task_result = {
    task: 4,
    status: "complete",
    success_criteria: [
      {
        criterion: "",
        measurement: "",
        threshold: ""
      }
    ],
    artifacts: {
      "success-criteria.md": ""
    }
  }

  RETURN task_result

FUNCTION execute_task_5(feature_slug, phase_slug, task3_result):

  // Task 5: Specify Mocks
  // Ref: docs/engineering/execution/creation/phase-plan/05-specify-mocks.md

  // For each mock in test coverage plan, specify behavior
  // Mock target, mock behavior, mock return values, usage constraints

  task_result = {
    task: 5,
    status: "complete",
    mocks: [],
    artifacts: {
      "mock-specifications.md": ""
    }
  }

  RETURN task_result

FUNCTION execute_task_6(feature_slug, phase_slug, prior_task_results):

  // Task 6: Break Into Tasks
  // Ref: docs/engineering/execution/creation/phase-plan/06-break-into-tasks.md

  // Decompose phase into executable tasks
  // Each task: scope, dependencies, deliverables
  // Enforce: scope boundaries (no more than 10 files, ~100-1000 LOC per task)

  task_result = {
    task: 6,
    status: "complete",
    task_breakdown: [
      {
        task_id: "",
        task_name: "",
        scope: {do: [], do_not: []},
        dependencies: [],
        deliverables: []
      }
    ],
    artifacts: {
      "task-breakdown.md": ""
    }
  }

  RETURN task_result

FUNCTION execute_task_7(feature_slug, phase_slug, prior_task_results, existing_plan):

  // Task 7: Fill Template
  // Ref: docs/engineering/execution/creation/phase-plan/07-fill-template.md

  // Copy PHASE-PLAN-template.md from framework
  // Fill in all sections from Tasks 1-6
  // Validate: no TODOs, all sections complete

  phase_plan_template = read_file("docs/engineering/execution/templates/PHASE-PLAN-template.md")

  phase_plan = fill_phase_plan_template(
    template: phase_plan_template,
    feature_slug: feature_slug,
    phase_slug: phase_slug,
    task_results: prior_task_results
  )

  task_result = {
    task: 7,
    status: "complete",
    phase_plan_content: phase_plan,
    validation: validate_phase_plan(phase_plan)
  }

  RETURN task_result

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

FUNCTION check_planning_escalations(task_results):

  // Look for critical contradictions or blockers discovered during planning

  FOR EACH task_result IN task_results:
    IF task_result.result.status == "critical_contradiction":
      RETURN {
        type: "CRITICAL_CONTRADICTION",
        task: task_result.task,
        contradiction: task_result.result.contradiction,
        severity: "critical"
      }

  RETURN null

FUNCTION escalation_result(error):
  RETURN {
    status: "escalate",
    escalation: {
      type: "PLANNING_ERROR",
      error: error,
      severity: "critical"
    }
  }

FUNCTION write_research_artifacts(research_dir, task_results):

  // Write all research artifacts from task executions

  create_directory(research_dir)

  artifact_map = {
    1: "phase-research.md",
    2: "phase-contracts.md",
    3: "test-coverage-plan.md",
    4: "success-criteria.md",
    5: "mock-specifications.md",
    6: "task-breakdown.md"
  }

  FOR EACH task_result IN task_results:
    task_num = task_result.task
    IF task_num IN artifact_map:
      artifact_name = artifact_map[task_num]
      artifact_content = task_result.result.artifacts[artifact_name]
      write_file("{research_dir}/{artifact_name}", artifact_content)

FUNCTION count_artifacts(task_results):
  count = 0
  FOR EACH task_result IN task_results:
    count += task_result.result.artifacts.count
  RETURN count

FUNCTION fill_phase_plan_template(template, feature_slug, phase_slug, task_results):

  // Copy template, fill in sections

  phase_plan = template

  // Replace placeholders with task results
  phase_plan = replace("{{feature_slug}}", feature_slug, phase_plan)
  phase_plan = replace("{{phase_slug}}", phase_slug, phase_plan)

  // Fill sections from task results
  FOR EACH task_result IN task_results:
    section_name = get_section_name(task_result.task)
    content = task_result.result.artifacts[section_name]
    phase_plan = replace("{{" + section_name + "}}", content, phase_plan)

  RETURN phase_plan

FUNCTION validate_phase_plan(phase_plan):

  // Check: no TODOs, all sections filled, valid YAML

  validation = {
    has_todos: "{{" IN phase_plan OR "TODO" IN phase_plan,
    all_sections_filled: true,
    yaml_valid: is_valid_yaml(extract_frontmatter(phase_plan)),
    ready_for_review: true
  }

  IF validation.has_todos:
    validation.ready_for_review = false

  RETURN validation
```

---

## Output Template

```yaml
planning_result:
  status: "complete" | "escalate"

  mode: "create" | "revise"
  phase_plan_path: string
  phase_plan_status: "draft"  # Requires user approval at CHECKPOINT 2

  research_artifacts_location: string
  artifacts_created: [
    "phase-research.md",
    "phase-contracts.md",
    "test-coverage-plan.md",
    "success-criteria.md",
    "mock-specifications.md",
    "task-breakdown.md"
  ]
  artifacts_count: int

  validation:
    has_todos: bool
    all_sections_filled: bool
    yaml_valid: bool
    ready_for_review: bool

  escalation:
    type: "CRITICAL_CONTRADICTION" | "PLANNING_ERROR" | null
    severity: "critical" | "warning"
    task: int
    details: object

  next_action: "requires_user_approval"  # CHECKPOINT 2
```

---

## Critical Rules

1. **Execute Tasks 1-7 inline** — No delegation to subagents
2. **Trust research state** — Use state snapshot (not uncertainty details) from RESEARCH
3. **No special logic** — Work with declared state, don't handle uncertainty
4. **Write artifacts** — All research docs must be written to `_research/` folder
5. **Validate completion** — No TODOs or placeholders in final PHASE-PLAN
6. **Reference framework docs** — Each task references framework docs, doesn't duplicate logic
