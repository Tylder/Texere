---
description: |
  Execution Research Workflow - Lightweight discovery of current execution state.
  Trusts completion markers by default. Identifies uncertainty. Runs code_verifier
  only when orchestrator indicates uncertainty verification needed.
mode: subagent
temperature: 0.2
tools:
  read: true
  bash: true
  serena: false
  write: false
permission:
  task:
    '*': 'deny'
    'research': 'allow'
  bash:
    '*': 'deny'
    'find *': 'allow'
    'git log *': 'allow'
    'git diff *': 'allow'
    'ls -la *': 'allow'
---

# Execution Research Workflow

## Purpose

Discover current execution state without deep verification. Trust documented state (PHASE-TRACKING),
identify uncertainty (contradictions, staleness, missing docs), return findings to coordinator.

---

## Workflow

```pseudocode
ENTRY_POINT(coordinator_input):

  context = coordinator_input.context

  IF context.feature_slug not provided:
    RETURN error("feature_slug required")

  feature_slug = context.feature_slug

  // Step 1: Read IMPL-PLAN
  impl_plan_path = "docs/execution/{feature_slug}/{feature_slug}-IMPL-PLAN.md"
  impl_plan = read_file(impl_plan_path)

  IF impl_plan not found:
    RETURN {
      status: "complete",
      findings: {
        state_snapshot: {error: "IMPL-PLAN not found"},
        uncertainty_flags: ["Feature {feature_slug}: IMPL-PLAN missing"]
      }
    }

  // Step 2: Parse phases from IMPL-PLAN
  phases = parse_phases(impl_plan)
  IF phases.count == 0:
    RETURN {
      status: "complete",
      findings: {
        state_snapshot: {error: "No phases in IMPL-PLAN"},
        uncertainty_flags: ["IMPL-PLAN has no phases defined"]
      }
    }

  // Step 3: Lightweight discovery per phase
  findings = discover_state(feature_slug, phases)

  // Step 4: Identify escalation triggers (contradictions, critical uncertainties)
  escalation = detect_escalation_triggers(findings)

  // Step 5: Return findings to coordinator
  result = {
    status: IF escalation THEN "escalate" ELSE "complete",
    findings: findings,
    escalation: escalation
  }

  RETURN result

// ============================================================================
// DISCOVERY LOGIC
// ============================================================================

FUNCTION discover_state(feature_slug, phases):

  findings = {
    state_snapshot: {
      feature: feature_slug,
      phases: {},
      complete_count: 0,
      in_progress_count: 0,
      blocked_count: 0,
      unknown_count: 0,
      total_count: phases.count
    },
    uncertainty_flags: []
  }

  // For each phase, check its state
  FOR EACH phase IN phases:
    phase_state = discover_phase_state(feature_slug, phase)
    findings.state_snapshot.phases[phase.slug] = phase_state

    // Count by status
    IF phase_state.status == "complete":
      findings.state_snapshot.complete_count += 1
    ELSE IF phase_state.status == "in-progress":
      findings.state_snapshot.in_progress_count += 1
    ELSE IF phase_state.status == "blocked":
      findings.state_snapshot.blocked_count += 1
    ELSE:
      findings.state_snapshot.unknown_count += 1

    // Collect uncertainty flags
    IF phase_state.uncertainties:
      FOR EACH uncertainty IN phase_state.uncertainties:
        findings.uncertainty_flags.append(uncertainty)

  // Calculate progress
  findings.state_snapshot.progress_percent = (findings.state_snapshot.complete_count / phases.count) * 100

  // Determine next logical step
  findings.state_snapshot.next_logical_step = determine_next_step(findings.state_snapshot)

  RETURN findings

FUNCTION discover_phase_state(feature_slug, phase):

  phase_slug = phase.slug
  state = {
    slug: phase_slug,
    status: null,
    last_update: null,
    uncertainties: [],
    blockers: []
  }

  // Check 1: PHASE-TRACKING exists and is recent
  tracking_path = "docs/execution/{feature_slug}/{phase_slug}/PHASE-TRACKING.md"
  tracking = read_file(tracking_path)

  IF tracking not found:
    state.status = "unknown"
    state.uncertainties.append("No PHASE-TRACKING document")
    RETURN state

  // Parse PHASE-TRACKING for status
  parsed_tracking = parse_tracking(tracking)
  state.status = parsed_tracking.status  // complete | in-progress | blocked | unknown
  state.last_update = parsed_tracking.last_update

  // Check 2: Staleness
  days_since_update = days_since(state.last_update)
  IF days_since_update > 5 AND state.status != "complete":
    state.uncertainties.append("TRACKING stale: {days_since_update} days old")

  // Check 3: ISSUES.md for blockers
  issues_path = "docs/execution/{feature_slug}/{phase_slug}/ISSUES.md"
  issues = read_file(issues_path)

  IF issues found:
    blockers = parse_blockers(issues)
    IF blockers.count > 0:
      state.blockers = blockers
      state.uncertainties.append("{blockers.count} blockers in ISSUES.md")

  // Check 4: Recent git activity
  last_commit = get_last_commit(feature_slug, phase_slug)
  IF state.status == "complete" AND last_commit exists:
    days_since_last_commit = days_since(last_commit.date)
    IF days_since_last_commit < 1:
      state.uncertainties.append("Recent commits after completion mark (suspect staleness)")

  RETURN state

FUNCTION parse_tracking(tracking_content):

  // Extract from PHASE-TRACKING markdown:
  // Status line: "Status: complete | in-progress | blocked"
  // Last update: frontmatter or status line date

  status_line = find_line("Status:", tracking_content)
  IF status_line contains "complete":
    status = "complete"
  ELSE IF status_line contains "in-progress":
    status = "in-progress"
  ELSE IF status_line contains "blocked":
    status = "blocked"
  ELSE:
    status = "unknown"

  // Extract date from frontmatter last_updated
  last_update_line = find_line("last_updated:", tracking_content)
  last_update = parse_date(last_update_line) OR today()

  RETURN {
    status: status,
    last_update: last_update
  }

FUNCTION parse_blockers(issues_content):

  // Extract blocking issues from ISSUES.md
  // Pattern: severity = "blocker" or "critical"

  blockers = []

  sections = split_by_heading(issues_content)
  FOR EACH section IN sections:
    IF section contains "Severity" OR section contains "severity":
      IF section contains "blocker" OR section contains "critical":
        blocker = parse_issue(section)
        blockers.append(blocker)

  RETURN blockers

FUNCTION determine_next_step(state_snapshot):

  // Logic: what's the natural next phase?
  IF state_snapshot.complete_count == state_snapshot.total_count:
    RETURN "All phases complete. Feature ready for review."

  incomplete_phases = [phase FOR phase IN state_snapshot.phases IF phase.status != "complete"]

  IF incomplete_phases.count == 0:
    RETURN "All phases complete."

  // Find first in-progress phase
  in_progress = [phase FOR phase IN incomplete_phases IF phase.status == "in-progress"]
  IF in_progress.count > 0:
    RETURN "Continue {in_progress[0].slug} (in-progress)"

  // Find first not-started phase
  not_started = [phase FOR phase IN incomplete_phases IF phase.status == "unknown"]
  IF not_started.count > 0:
    RETURN "Start {not_started[0].slug} (next logical phase)"

  // Find blocked phases
  blocked = [phase FOR phase IN incomplete_phases IF phase.status == "blocked"]
  IF blocked.count > 0:
    RETURN "Unblock {blocked[0].slug} (currently blocked)"

  RETURN "Unknown next step"

// ============================================================================
// ESCALATION DETECTION
// ============================================================================

FUNCTION detect_escalation_triggers(findings):

  // Check for contradictions or critical uncertainties

  trigger = null

  // Check 1: Critical uncertainty flags
  FOR EACH flag IN findings.uncertainty_flags:
    IF flag contains ("blocker" OR "blocked" OR "critical" OR "missing"):
      trigger = {
        type: "UNCERTAINTY_CRITICAL",
        flag: flag,
        severity: "warning"
      }
      BREAK

  // Check 2: Recent activity on completed phases
  FOR EACH phase_key, phase IN findings.state_snapshot.phases:
    IF phase.status == "complete":
      FOR EACH uncertainty IN phase.uncertainties:
        IF uncertainty contains ("recent commits" OR "stale"):
          trigger = {
            type: "COMPLETION_UNCERTAINTY",
            phase: phase_key,
            uncertainty: uncertainty,
            severity: "warning"
          }
          BREAK

  // Check 3: Multiple blockers
  total_blockers = sum(phase.blockers.count FOR EACH phase IN findings.state_snapshot.phases)
  IF total_blockers > 0:
    trigger = {
      type: "BLOCKERS_FOUND",
      blocker_count: total_blockers,
      severity: "critical"
    }

  RETURN trigger

FUNCTION build_escalation(findings, trigger):

  // Format per EXECUTION-user-interaction-guide.md

  escalation = {
    type: trigger.type,
    severity: trigger.severity,
    research_summary: {
      feature: findings.state_snapshot.feature,
      phases_complete: findings.state_snapshot.complete_count,
      phases_total: findings.state_snapshot.total_count,
      uncertainty_count: findings.uncertainty_flags.count
    },
    details: {
      trigger: trigger,
      uncertainties: findings.uncertainty_flags
    },
    options: build_escalation_options(findings, trigger)
  }

  RETURN escalation

FUNCTION build_escalation_options(findings, trigger):

  // Options depend on trigger type

  IF trigger.type == "BLOCKERS_FOUND":
    RETURN [
      {
        letter: "A",
        description: "Investigate blockers",
        why: "Understanding blockers helps decide next steps"
      },
      {
        letter: "B",
        description: "Proceed assuming blockers are known",
        why: "If you're aware of blockers, can plan around them"
      },
      {
        letter: "C",
        description: "Defer feature until blockers resolved",
        why: "Conservative: wait for clear path"
      }
    ]

  ELSE IF trigger.type == "COMPLETION_UNCERTAINTY":
    RETURN [
      {
        letter: "A",
        description: "Verify phase completion with code_verifier",
        why: "Ensure 'complete' status matches actual implementation"
      },
      {
        letter: "B",
        description: "Trust PHASE-TRACKING completion mark",
        why: "TRACKING is source of truth if QC passed"
      }
    ]

  ELSE:
    RETURN [
      {
        letter: "A",
        description: "Address uncertainties",
        why: "Resolve unknowns before proceeding"
      },
      {
        letter: "B",
        description: "Proceed with caution",
        why: "Uncertainties noted but not blocking"
      }
    ]
```

---

## Output Template

```yaml
research_result:
  status: "complete" | "escalate"

  findings:
    state_snapshot:
      feature: string
      phases:
        - slug: string
          status: "complete" | "in-progress" | "blocked" | "unknown"
          last_update: date
          uncertainties: [string]
          blockers: [object]
      complete_count: int
      in_progress_count: int
      blocked_count: int
      unknown_count: int
      total_count: int
      progress_percent: float
      next_logical_step: string

    uncertainty_flags: [string]

  escalation:
    type: "UNCERTAINTY_CRITICAL" | "COMPLETION_UNCERTAINTY" | "BLOCKERS_FOUND" | null
    severity: "critical" | "warning"
    research_summary:
      feature: string
      phases_complete: int
      phases_total: int
      uncertainty_count: int
    details:
      trigger: object
      uncertainties: [string]
    options: [
      {letter: "A", description: string, why: string},
      {letter: "B", description: string, why: string}
    ]
```

---

## Critical Rules

1. **Trust completion markers** — Accept PHASE-TRACKING "complete" as truth (unless staleness
   detected)
2. **Lightweight by design** — Read docs, don't run deep verification automatically
3. **Identify uncertainty** — Surface contradictions, staleness, missing docs
4. **Return findings, not decisions** — Coordinator decides what to do with uncertainty
5. **Report to coordinator** — Not user-facing (coordinator reports to orchestrator)
