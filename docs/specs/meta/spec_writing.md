# Specification Authoring Guide

**Document Version:** 1.1  
**Last Updated:** December 2025  
**Status:** Active

This guide defines how to create and maintain specs. Every feature or behavioral change must have a
governing spec that is easy to navigate from the high-level spec and easy to cite in code, tests,
and PRs. This guide is **especially written for LLM agents**—see § 9–11 for agent-specific rules.

---

## 1. Purpose & Scope

- Establish a consistent spec format (sections, numbering, tables) so contributors can scan and
  cross-reference quickly.
- Require spec-first changes: specs must exist or be updated before implementation starts.
- Ensure the **high-level spec** links to every other spec, and every spec links back to it.
- Make every requirement **citable** so agents can trace decisions back to authoritative source.

## 2. Core Rules

1. **Spec-first**: No code without an updated spec section describing the change.
2. **One spec per feature/domain**: Each feature area or package gets its own spec in `docs/specs/`
   (sorted into `system/` for product/behavior and `engineering/` for tooling/quality and `meta/`
   for governance).
3. **Bidirectional navigation**: High-level spec lists all specs (with audiences/sections). Each
   spec's intro links back to the high-level spec.
4. **Numbered sections**: Use `## 1., 1.1, 1.2` etc. for referenceable clauses.
5. **Citable identifiers**: When referencing a requirement, cite `spec_name §x.y` in code, tests,
   and PRs.
6. **Scope + out-of-scope**: Every spec states both to reduce ambiguity.
7. **Tables over prose for lookups**: Endpoints, data fields, acceptance criteria go in tables.
8. **Change logging**: Update `Document Version` and `Last Updated` on meaningful edits; note
   decisions in a short "Changelog" section with explicit dates and versions.

## 3. Standard Spec Structure (suggested)

1. **Title block**: name, version, last updated, status.
2. **Quick Navigation**: anchor links to sections most readers need first.
3. **Audience & Role**: who should read this (backend, frontend, infra, PM).
4. **Scope / Out of Scope**: crisp bullets.
5. **System Overview & Code Map**: diagram or list of key files/packages.
6. **Behavior / Requirements**: numbered clauses; include tables for routes, state, data shapes.
7. **Non-Functional**: performance, accessibility, security, observability targets (quantified).
8. **Edge Cases & Errors**: expected failures, error codes, recovery paths.
9. **References**: split into:
    - **External Documentation**: Links to authoritative sources (official docs, RFCs, best practices) for all external
      technologies mentioned.
    - **Internal Documentation**: Links to other specs and the high-level spec sections with brief descriptions.
10. **Testing Guidance**: how to validate; required test types; cite relevant sections.
11. **Changelog**: date, editor, version, summary of changes.

## 4. Cross-Referencing & Navigation

- **High-level spec duties**: maintain a table listing every spec file, primary audience, and key
  sections for quick lookup. Update it whenever a new spec is added or renamed.
- **Per-spec duties**: include a "References" section (not "Dependencies & References") that is split into:
    - **External Documentation**: Links to authoritative sources (official docs, RFCs, best practices)
    - **Internal Documentation**: Links back to the high-level spec and any sibling specs with descriptions
- **Always cite external docs**: Every claim about external technologies (LangGraph, RAG, databases) must link to the
  latest official documentation.
- **Section citations**: use `spec_file §number` (e.g., `backend.md §5.2`) in tests, PRs, and code
  comments when enforcing behavior.

## 5. Writing Conventions

- Prefer present tense, active voice, concise sentences.
- Use tables for routes, data models, config keys, and acceptance criteria.
- Keep code snippets short; mark them as illustrative, not authoritative, unless the spec's purpose
  is to lock a contract.
- Mark open questions as **TBD** with an owner.
- Keep terminology consistent with the glossary in the high-level spec (or add entries there).
- **Avoid vague language**: "should be good" ❌ → "LCP ≤2.0s p75" ✓

## 6. Checklists

**Author checklist**

- [ ] Spec exists/updated before coding.
- [ ] Scope and out-of-scope stated.
- [ ] Sections numbered; quick navigation present.
- [ ] References section added with External Documentation and Internal Documentation subsections.
- [ ] All external technology claims link to official docs (latest versions).
- [ ] Internal cross-refs added (back to high-level spec + related specs with descriptions).
- [ ] Tables for any routes/data/acceptance criteria.
- [ ] Changelog entry with explicit date + version number.
- [ ] All requirements are numbered or table-sourced (citable).
- [ ] Non-functional targets are quantified, not vague.
- [ ] Open questions marked **TBD** with owner.

**Reviewer checklist**

- [ ] Requirements are testable and cite section numbers.
- [ ] No contradictions with other specs; cross-refs present.
- [ ] References section has both External Documentation and Internal Documentation.
- [ ] All external technology references link to official/latest documentation.
- [ ] Terminology matches glossary.
- [ ] Open questions are labeled TBD with owners.
- [ ] Changelog format is explicit: `| YYYY-MM-DD | x.y | @editor | actionable summary |`

## 7. File Naming & Location

- Place specs in `docs/specs/` with kebab_case names, grouped under:
  - `system/` – product behavior, features, user-facing workflows, content
  - `engineering/` – tooling, code quality, testing, CI/CD, formatting, infrastructure
  - `meta/` – process governance, authoring guides, decision-making frameworks
- Example: `system/routes.md`, `engineering/ci_cd.md`, `meta/spec_writing.md`.
- If multiple specs cover one domain, name them clearly (`admin_ui.md`, `routes.md`).
- Update the high-level spec's spec table when adding or renaming a file.

## 8. Spec Completeness Criteria

**Draft** status means:

- Scope and audience stated.
- Core structure present (sections 1–4 at minimum).
- Open questions marked **TBD** with owner.
- May be incomplete in non-functional or edge cases.
- Agent guidance: "Is this complete enough to implement against?" If no, ask the user.

**Active** status means:

- All sections complete (1–11).
- **All requirements are numbered or in tables; all requirements must be citable** (e.g.,
  `spec_name §3.2`).
- No vague language ("should be good", "handle gracefully") — all criteria quantified or specific.
- Cross-refs to related specs and high-level spec present.
- No contradictions with other specs (if found, flag and ask).
- Changelog with explicit dates and versions.

**Deprecated** status means:

- Marked as such with reason.
- Kept for historical reference; agents should not reference deprecated specs for new work.

## 9. Citation Mandate (for Agents & Code)

**Every requirement, constraint, and non-functional target must be citable:**

- **Numbered sections**: `## 3. Requirements` → `### 3.1 User auth` → citable as `spec_name §3.1`
- **Tables**: Each row is implicitly numbered; reference via table header + row context (e.g.,
  "Routes table, POST /api/users" or "Perf table, LCP target")
- **Non-functional**: Nest under numbered headers, not prose-only
  - ❌ Bad: "Performance should be optimized."
  - ✓ Good: "### 3.1 Performance. LCP ≤2.0s p75; INP ≤200ms; CLS ≤0.08."
- **In code/tests**, cite the governing section:
  - `// Implements spec_name §3.2`
  - Test description: `"should enforce password reset 24h TTL per spec_name §2.2"`

## 10. When Agents Should Ask for Clarification

Agents should **not guess**; flag and ask the user before proceeding:

1. **Ambiguous requirement**: "This could mean X or Y; which is correct?"
2. **Missing acceptance criteria**: "The spec says 'support mobile' but doesn't define the
   breakpoint or test matrix."
3. **Contradiction detected**: "Spec §4.1 says X, but §6.2 appears to contradict it; which is
   authoritative?"
4. **TBD items blocking implementation**: "Spec §5 has **TBD**; should I define this first, or
   should I propose a solution?"
5. **Scope creep**: "This request goes beyond the spec's scope (§1); should I update the spec or
   defer this?"
6. **Missing cross-ref**: "This spec doesn't link to [related_spec.md], which seems relevant; is it
   intentional?"
7. **Incomplete spec for implementation**: "This spec is Draft status; is it complete enough to
   build against, or should we wait for Active status?"

## 11. Bad vs Good Examples

### ❌ Bad Spec (pitfalls agents should flag)

```markdown
# User Auth Spec

Status: Active

We need to support login and logout. Users should be able to reset their password if they forget it.
Performance should be good. Errors should be handled gracefully.
```

Problems agents should flag:

- ❌ No numbered sections → not citable
- ❌ Vague language ("good", "gracefully")
- ❌ No acceptance criteria or success metrics
- ❌ No table for error codes or flows
- ❌ No scope / out-of-scope clarity
- ❌ No non-functional quantified targets
- ❌ Not testable without interpretation

**Agent action**: Ask user to restructure before implementation.

### ✓ Good Spec (Active-quality benchmark)

```markdown
# User Authentication Spec

**Document Version:** 1.1  
**Last Updated:** December 2025  
**Status:** Active

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Requirements](#2-requirements)
- [3. Non-Functional](#3-non-functional)
- [4. Changelog](#4-changelog)

## 1. Scope

**In Scope:**

- Email/password login and logout
- Password reset via email link
- Session management (JWT tokens, 1h TTL)

**Out of Scope:**

- Social login (OAuth)
- Two-factor auth
- Account recovery without email

## 2. Requirements

### 2.1 Login Endpoint

POST `/api/auth/login` with `{ email, password }`

| Case                      | Behavior                                     | Status | Cite As |
| ------------------------- | -------------------------------------------- | ------ | ------- |
| Valid credentials         | Return JWT + user profile + 1h exp           | 200    | §2.1.1  |
| Invalid email/password    | Same error message for both (no enumeration) | 401    | §2.1.2  |
| >5 failed attempts in 15m | Lock account for 15m; notify user via email  | 429    | §2.1.3  |

### 2.2 Password Reset

1. User enters email → system sends reset link (valid 24h, signed JWT)
2. Link redirects to reset form → user enters new password
3. Success: new password hashed; user logged in with new JWT
4. Error: expired link → 401 with code `reset_expired` (cite §2.2.1)

## 3. Non-Functional

### 3.1 Performance

- Login endpoint p95 latency: ≤500ms (incl. DB + email send)

### 3.2 Security

- Passwords hashed with bcrypt (min 10 rounds)
- Reset tokens signed with HS256; verified on use
- Session JWT signed with HS256; exp claim enforced

## 4. Changelog

| Date       | Version | Editor | Summary                                 |
| ---------- | ------- | ------ | --------------------------------------- |
| 2025-12-02 | 1.1     | @agent | Added brute-force lockout rule (§2.1.3) |
| 2025-11-15 | 1.0     | @pm    | Initial spec                            |
```

Strengths agents should emulate:

- ✓ Numbered sections with citable anchors (§2.1, §2.1.1, etc.)
- ✓ Specific acceptance criteria; no vague language
- ✓ Table for flows and responses with citations
- ✓ Non-functional targets are quantified (p95 ≤500ms, bcrypt 10 rounds)
- ✓ Out-of-scope clearly stated
- ✓ Explicit date + version in changelog

## 12. Template (copy/paste)

```markdown
# <Spec Title>

**Document Version:** 1.0 \
**Last Updated:** <Month YYYY> \
**Status:** Draft/Active/Deprecated

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Audience](#2-audience)
- [3. Requirements](#3-requirements)
- [4. Non-Functional](#4-non-functional)
- [5. Edge Cases & Errors](#5-edge-cases--errors)
- [6. References](#6-references)
- [7. Testing Guidance](#7-testing-guidance)
- [8. Changelog](#8-changelog)

## 1. Scope

**In Scope:**

- Feature/behavior A
- Feature/behavior B

**Out of Scope:**

- Non-goal C

## 2. Audience

Who should read this (Frontend, Backend, Infra, QA, PM).

## 3. Requirements

### 3.1 Requirement Name

Clear statement with acceptance criteria.

| Item   | Behavior         | Cite As |
| ------ | ---------------- | ------- |
| Case 1 | Expected outcome | §3.1.1  |
| Case 2 | Expected outcome | §3.1.2  |

## 4. Non-Functional

### 4.1 Performance

- Metric target (e.g., LCP ≤2.0s p75)

### 4.2 Security

- Constraint (e.g., passwords hashed with bcrypt)

### 4.3 Accessibility

- WCAG 2.1 AA, with specific requirements

## 5. Edge Cases & Errors

### 5.1 Error Code: `auth_fail`

When: Invalid credentials  
Response: `{ error: "auth_fail", message: "..." }` (HTTP 401)  
Recovery: User can retry; see §3.1.3 rate limit

## 6. References

### External Documentation

- **OAuth 2.0**: https://oauth.net/2/
- **JWT**: https://jwt.io/
- **Related RFC/Standards**: [link]

### Internal Documentation

- [Related spec name](../sibling_spec.md) — Brief description of relationship and what to cross-reference
- [High-level spec](../../README.md) — System overview

## 7. Testing Guidance

- **Unit tests**: Validate each error case (§5) with cite references
- **Integration tests**: Test end-to-end flow per §3.1
- **Performance test**: Verify p95 latency per §4.1
- Test naming: "should [behavior] per spec_name §x.y"

## 8. Changelog

| Date       | Version | Editor | Summary      |
| ---------- | ------- | ------ | ------------ |
| YYYY-MM-DD | 1.0     | @name  | Initial spec |
```

## 13. Maintenance

- Treat this guide as the authority for spec format. If process changes, update this file and bump
  its version/date.
- When adding a new spec, update the high-level spec's index table in the same PR.
- If a spec is deprecated, mark its Status as "Deprecated" and keep the file for historical context.
- For agent feedback on spec quality, maintain a checklist (§6) and ask the user before proceeding
  with ambiguous specs.
