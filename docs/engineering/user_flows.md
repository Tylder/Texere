# Todo List UX Flows — Cleaned Drafts

This document refines three rough UX scripts for your AI-assisted coding system. The intent is to
preserve the original spirit while making the flows:

## Preference hierarchy (global → project → feature)

Your UX concept of **global**, **project**, and **feature** preferences should remain explicit in
the scripts:

- **Global preferences**: defaults that apply across all projects unless overridden (e.g., preferred
  stack, testing standards, formatting, repo conventions).
- **Project preferences**: defaults specific to the current repo/workspace (e.g., Next.js vs Remix
  for _this_ project, DB choice, lint rules).
- **Feature preferences**: scoped overrides for a particular feature/subproject (e.g., docs site
  uses static generation; auth uses a specific library).

**Resolution rule:** feature overrides project, project overrides global. When the system says it is
reusing context or conventions, that should be understood as reusing the applicable preference
layer(s), and it should surface which layer is being used when it materially affects decisions.

- consistent in structure and tone
- explicit about what the system _does_ vs what the user _decides_
- specific about what gets stored in the knowledge system (without prescribing implementation)

Conventions used below:

- **U:** User action or message
- **S:** System response
- Bracketed notes like **[State]** describe internal state changes the UI should surface

---

## 1) Project creation → Todo list implementation

### Goal

User creates a small web app with persistence and remote hosting, optionally importing an existing
UI reference.

### Flow

**U:** _Clicks_ **New project** → enters name `todo-list` → _opens_ the new project

**U:** “I’d like to create a todo list.”

**S:** “Understood. I’ll ask a few questions to lock in the minimum architecture decisions.”

**S (Q1):** “Target platform?”

- A) Web
- B) Desktop
- C) Mobile

**U:** “A”

**S (Q2):** “Do you need data to persist after closing the browser?” (Yes/No)

**U:** “Yes”

**S (Q3):** “Will multiple users edit the same list concurrently?” (Yes/No)

**U:** “No”

**S (Q4):** “Should it be accessible from the public internet (hosted)?” (Yes/No)

**U:** “Yes”

**S (Q5):** “Approximate number of users (range)?”

**U:** “1–10”

**S:** “Recommendation (based on your **global preferences**: **Next.js** for the web app and
**PostgreSQL** for production persistence. For local development, use **SQLite** with the same ORM
schema so dev/prod stay aligned.”

**U:** “Ok.”

**U:** “I already have a React UI from Google AI Studio. I copied it into the project under
`/references/ui`.”

**S:** “Acknowledged. I will treat `/references/ui` as a design reference, not as trusted production
code. I’ll review it and propose the minimum transformations required to match your project
conventions.”

**S:** “I inspected the UI reference. It uses inline styles. To keep styling consistent and
maintainable, I recommend converting to Tailwind CSS (or your chosen design system) and isolating
the imported markup into components.”

**U:** “Ok.”

**S:** “Proceeding with implementation.

**Implementation plan** (high level):

1. App shell and routing
2. Todo domain model + persistence
3. CRUD UI wired to API
4. Tests and basic CI

I will report progress with:

- what changed (files, modules)
- what was verified (tests/build)
- what remains open”

**S [State]:** Project status → `Implementing`

**S:** “Completed.

**Results:**

- MVP implemented end-to-end
- Test coverage target met (example: ≥80%)
- Local dev URLs:
  - App: `http://localhost:3000/`

**Next suggested iterations:**

- auth (optional)
- optimistic UI + error states
- basic analytics + logging
- deployment pipeline”

**S [State]:** Project status → `Ready for review`

---

## 2) Add a documentation site subproject

### Goal

Create a docs site as a sibling subproject and link to it from the main app.

### Flow

**U:** _Opens_ `todo-list` project → _Clicks_ **New subproject** → names it `documentation-site` →
_opens_ it

**U:** “I’d like to add a documentation site. Also add a link to it from the main site.”

**S:** “Understood. I’ll reuse the existing context and preferences:

- **Global preferences** (your defaults)
- **Project preferences** (repo layout, build tooling, conventions) If the docs site needs
  feature-specific overrides, I’ll propose them explicitly.”

**S:** “Recommendation: keep docs as a **static site** generated from Markdown (or MDX) and publish
it as a separate route or separate app. Build it in CI (for example: on push to `main`) and publish
the output artifact.”

**U:** “Ok, do it.”

**S:** “Proceeding.

**Implementation plan** (high level):

1. Create docs app (static)
2. Basic structure: home, architecture, API, changelog
3. Add link from main app header/footer
4. Add CI job to build and publish docs
5. Add tests / smoke checks

I will report:

- new routes/URLs
- how it is built
- where content lives
- how it is deployed”

**S [State]:** Subproject status → `Implementing`

**S:** “Completed.

**Results:**

- Docs site scaffolded and wired into the workspace
- Link added to main app
- Example dev URL:
  - Docs: `http://localhost:3001/`

**Verification:**

- Build passes
- Basic smoke checks pass

**Next suggested iterations:**

- auto-generate docs from code (types, OpenAPI)
- versioned docs if you expect breaking changes”

**S [State]:** Subproject status → `Ready for review`

### Notes / improvements vs the rough draft

- Makes the docs approach explicit (static generation) without overcommitting to a single tooling
  choice.
- Clarifies what “knowledge database” reuse means from a user’s perspective: conventions and
  existing repo context.

---

## 3) Add social login (OAuth providers)

### Goal

Add OAuth login with at least Google and Facebook, then support ordering and basic UX changes.

### Flow

**U:** _Opens_ `todo-list` project → _Clicks_ **New subproject** → names it `social-login` → _opens_
it

**U:** “I’d like to add social login to this app.”

**S:** “Understood. I’ll confirm the providers and any policy constraints, then implement a working
baseline using your existing **global** and **project** preferences. If auth introduces
feature-specific requirements (session strategy, DB tables, security hardening), I’ll record them as
**feature preferences**. We can iterate on UI after there’s a functional reference.”

**S (Q1):** “Which identity providers do you want to support initially?”

- A) Google
- B) Facebook
- C) GitHub
- D) X (Twitter)
- E) LinkedIn

**U:** “Google and Facebook.”

**S (Q2):** “Account model?”

- A) Login only (no local password)
- B) Login + optional password

**U:** “A”

**S (Q3):** “Do you need to link multiple providers to the same user account?” (Yes/No)

**U:** “Yes”

**S:** “Proceeding.

**Implementation plan** (high level):

1. Auth routes and session handling
2. Provider configuration (env, callbacks)
3. User/account linking model
4. Login UI
5. Tests and basic security checks

I will report:

- required environment variables
- callback URLs
- any migration changes
- verification performed (tests)”

**S [State]:** Subproject status → `Implementing`

**S:** “Completed.

**Results:**

- OAuth login working for selected providers
- Login page available at: `http://localhost:3000/login`
- Coverage for new auth paths meets target (example: 100% for auth module)

**Required setup (example):**

- Register OAuth apps with providers
- Add client IDs/secrets to `.env`
- Ensure redirect URIs match local and prod URLs”

**U:** “Make Google the top provider and Facebook the bottom provider.”

**S:** “Applied. Provider ordering updated in the login UI.”

**S:** “Updated page: `http://localhost:3000/login`”

**S [State]:** Subproject status → `Ready for review`

### Notes / improvements vs the rough draft

- Adds the missing account-linking decision, which is a common source of rework.
- Explicitly flags OAuth registration + env vars as required external steps.
- Keeps the rapid-iteration behaviour you want (ship baseline then refine UI), but removes hand-wavy
  phrasing.
