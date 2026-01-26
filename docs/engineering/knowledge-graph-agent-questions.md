#Questions the agent should be able to ask and find answers to using the data from repo ingest.

Below are **five realistic questions an agent should explicitly ask** when tasked with adding features to an existing
repository or understanding an external dependency. These are framed as **agent-internal clarification questions** that
directly reduce failure modes such as assumption drift, stale research, and incorrect integration. They are grounded in
common orchestration and continuity problems seen in long-running agent workflows .

---

### 1. What is the *actual integration boundary* for this feature?

**Why this matters:**
Agents frequently implement functionality at the wrong architectural layer.

**Typical sub-questions an agent must resolve:**

* Is this change expected at the API boundary, service layer, domain layer, or UI adapter?
* Are there existing extension points or patterns that must be reused?
* Are there explicit layering or dependency rules that forbid certain imports or calls?

**Failure if skipped:**
Feature “works” locally but violates architecture, breaks invariants, or is rejected in review.

---

### 2. What assumptions am I making about the external dependency’s behavior or guarantees?

**Why this matters:**
Most bugs come from undocumented or outdated assumptions about third-party libraries.

**Typical sub-questions:**

* Which behaviors are guaranteed by documented API contracts vs inferred from examples?
* Are version-specific behaviors relevant (breaking changes, deprecations)?
* Does the dependency make implicit guarantees about threading, retries, idempotency, or ordering?

**Failure if skipped:**
Agent bakes in assumptions that silently break on upgrade or edge cases.

---

### 3. What prior decisions or constraints already limit how this feature can be implemented?

**Why this matters:**
Agents often re-litigate or unknowingly violate settled decisions.

**Typical sub-questions:**

* Has this problem been solved or explicitly rejected before?
* Are there non-obvious constraints (performance, security, compliance, infra)?
* Are there “do not use” technologies or patterns already agreed upon?

**Failure if skipped:**
Agent proposes or implements solutions that conflict with established direction.

---

### 4. What evidence do I have that my understanding of the repo or dependency is current?

**Why this matters:**
Stale research is indistinguishable from hallucination unless freshness is checked.

**Typical sub-questions:**

* When was this code path last modified?
* Has the dependency version changed since the last known research?
* Are tests, docs, or examples aligned with the current implementation?

**Failure if skipped:**
Agent confidently applies outdated guidance that no longer matches reality.

---

### 5. What will break—or need to change—*outside* the immediate code I am touching?

**Why this matters:**
Local changes often have non-local consequences.

**Typical sub-questions:**

* Which downstream consumers depend on this API or behavior?
* Are there tests, docs, migrations, or configs that must be updated in parallel?
* Does this affect multiple repos, packages, or deployment pipelines?

**Failure if skipped:**
Feature appears correct in isolation but causes regressions elsewhere.