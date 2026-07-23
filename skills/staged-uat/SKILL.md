---
name: staged-uat
description: >-
  Drive a LIVE deployed web app (staging/production URL) through real user journeys in a browser to
  verify it, capture screenshot evidence, and write per-role user manuals. Use whenever the user wants
  a running site tested/explored/walked through rather than code tested: exercising multiple roles or
  tenants (admin, manager, staff, customer) across one or more frontends; flows like invite → signup
  → email OTP → first login; checking a deployed app against a PRD/spec or Swagger and producing a
  coverage or findings report; logging bugs with repro steps and screenshots; probing permission
  boundaries; or generating role-based user manuals/how-tos from the running UI - even when they never
  say "UAT" (e.g. "test all the roles on staging", "screenshot each screen and write a how-to per user
  type"). Scales one flow to a full campaign; uses subagents; assumes a temp-email tool and browser
  driver (playwright-cli). NOT for unit tests, CI e2e setup, code review, debugging deploys/infra, or
  a11y audits.
---

# Staged UAT — driving a live multi-role platform to evidence + manuals

## What this skill is for

You are testing a **deployed, running** web platform (staging) that serves **several user roles across
tiers** — typically a chain like *platform admin → tenant/business staff → end customers*. The goal is
not unit tests; it's to **exercise real user journeys end to end against the live site**, prove the
implementation matches the spec, capture **screenshot evidence of every step**, record what's wrong or
divergent, and turn all of that into a **user manual per role**.

This is inherently a **campaign**, not a single task: dozens of scenarios, multiple simultaneous logged-in
roles, emails flying between them, and hours of browser work. It only stays manageable if you **structure it
first** and **orchestrate it with subagents** — one operator clicking through 60 scenarios serially will
lose the thread. So the spine of this skill is: *build the structure, bootstrap the world once, then fan
scenarios out to subagents that each return structured evidence, then consolidate and author from that
evidence.*

**Lumina** — a fictional multi-tenant clinic-booking SaaS (Super Admin creates clinics → Clinic Manager
and Front-desk staff run one → Patients book appointments; three frontends plus a documented API) — is
the worked example throughout. Substitute your own sites, roles, and tools.

## The non-negotiables (read before touching anything)

These are lessons paid for in real runs. Ignore them and you will corrupt a shared environment, leak
secrets, get safety-blocked, or produce evidence you can't trust.

1. **Staging is shared and usually can't be reset.** Other people's data lives there. Create only data you
   own (prefix everything, e.g. `UAT…`), never touch foreign tenants/accounts, and **round-trip every
   state-changing action** (reassign X → verify → reassign back) so the world ends as it started. When a
   scenario *must* consume data irreversibly (hard-delete, account deletion), **plan a dedicated throwaway
   target for it** rather than sacrificing a reusable one.

2. **Never persist live credentials or session state to disk.** Writing auth cookies / `state-save` JSON
   into the repo gets flagged as credential materialization — and it's unnecessary. Keep named browser
   sessions resident in the automation daemon and **re-login on expiry** from a credentials ledger. If any
   secret (API key, token) lands in an evidence file, **redact it** (and revoke it if you can).

3. **A live CDN can lie about HTTP status.** Fronting CDNs (CloudFront, etc.) frequently rewrite origin
   4xx into `200 + SPA-index HTML`, and may cache that error page. So **classify API probes by
   content-type, not status code**: real JSON 2xx = allowed; real JSON 4xx = denied; `200 + text/html` =
   denied-but-masked. Cache-bust and contrast against a resource you *do* own to tell a real denial from a
   stale cache. This matters doubly for security probes, where a masked 403 looks like a breach.

4. **Every finding and every screenshot must be reproducible and attributable.** Subagents return
   **structured results** (status / summary / evidence paths / accounts touched / observations / data),
   not prose. Screenshots follow a fixed naming scheme per flow. Findings are numbered and quote exact
   on-screen wording. If you can't point to the evidence, it didn't happen.

5. **Everything traces to the spec or the deployed API.** Scenarios are *seeded* from the PRD × the live
   OpenAPI/Swagger, not invented ad hoc. When the implementation diverges from the spec, that **divergence
   is itself a first-class finding** (a "drift"), not something to silently paper over.

## The phases

Run these in order. Each links to a reference file with the detailed mechanics — read the reference when
you enter that phase.

### Phase 0 — Recon (a hard prerequisites gate)
The campaign depends on **external tooling that needs auth and installation** — a temp-email service and a
browser driver. Treat this phase as a **gate**: verify each tool is actually installed, connected, and
authenticated *before* planning, and if something is missing, **tell the user how to set it up and stop**
rather than flailing or trying to work around it. A run started without working tools wastes hours.

Verify, and surface any gap to the user (concrete setup in `references/tooling.md` → "Prerequisites"):
- **Temp-email** (e.g. mailmatter MCP): the MCP server must be configured/connected *and* authenticated —
  mailmatter needs an **API key created** and the MCP wired into the client. Smoke-test it (derive an
  address / list inboxes). If it's not connected, the user must set it up first.
- **Browser driver** (e.g. playwright-cli skill or a Playwright MCP): must be installed and, for
  playwright-cli, the skill installed into the project. Smoke-test (`playwright-cli --version`, open one
  page). If missing, point the user at the install (playwright-cli: `github.com/microsoft/playwright-cli`,
  then `playwright-cli install --skills` in the project).
- **Subagent/Workflow harness** available (this skill assumes it).

Only once the tools pass: curl each staging host for reachability, and **find the deployed API spec** — a
Swagger UI almost always links its raw OpenAPI docs (e.g. `/docs` → `/docs/spec/*.yaml`); download them
**into `artifacts/<run>/openapi/`** — they are the authoritative inventory of what's *actually* deployed
(often more, or different, than the source or the PRD), and the persisted copies are what a later delta
round diffs against.

### Phase 1 — Build the test base
Turn the spec + deployed API into a **scenario inventory** and a written **test-base guideline** the whole
campaign refers to. Establish the source-of-truth hierarchy (which doc arbitrates naming, scope, roles),
map the role tiers, and — critically — **reconcile three sources**: the spec (what *should* exist), the
source repos if available (what was *written*), and the deployed OpenAPI + live UI (what's *actually up*).
→ **`references/scenario-matrix.md`**

### Phase 2 — Plan discovery
Design the **account bootstrap chain** (top-down: each tier's accounts are created by the tier above it),
the per-site route sweep, and the numbered **scenario matrix** grouped by role/area, each scenario with
its preconditions, steps, expected result, and evidence target. Decide the run batching (what's sequential
vs parallel). → **`references/scenario-matrix.md`** (matrix) + **`references/orchestration.md`** (batching)

### Phase 3 — Execute in staged runs (orchestrated)
**Bootstrap first, sequentially** (you can't invite a tenant's staff before the tenant exists). Then **fan
independent scenarios out to subagents in parallel**, each on its own browser session(s) and mailbox(es),
each returning a structured result. Consolidate after each run; resume cleanly across interruptions. Use
the bundled workflow template as the skeleton. → **`references/orchestration.md`** + **`references/tooling.md`**
+ **`assets/uat-workflow-template.js`**

### Phase 4 — Consolidate evidence
Maintain the living artifact set across runs: a **findings log** (numbered, severity-tagged, exact wording),
a **coverage matrix** (scenario → status → evidence), an **accounts ledger** (the true environment state),
and a **screenshot manifest**. → **`references/artifacts.md`**

### Phase 5 — Author the role manuals
From the screenshot evidence base, write **one operation manual per role**, using the **real on-screen UI
names** (not spec aliases), folding findings into honest "known limitation" notes (never sell a bug as a
feature), with every embedded image link verified. → **`references/manuals.md`**

### Phase 6 — Executive report
Triage the findings into a single report for the spec owner / PM: grouped by **disposition** — needs a spec
decision (drift), needs a dev fix (bug), needs infra (e.g. CDN), and what's **verified working**. →
**`references/artifacts.md`** (report structure)

## Scaling to the ask

Not every invocation is a 6-run campaign. Match the effort:

- **"Write manuals from this evidence folder"** → jump to Phase 5 (`references/manuals.md`).
- **"Test just the invite→signup→first-login flow and screenshot it"** → Phase 0 recon + one scenario from
  Phase 3 with the `references/tooling.md` idioms; skip the full matrix.
- **"UAT the whole platform and give me manuals"** → the full arc, Phases 0–6.
- **"The spec changed" / "re-test what we found" (a prior round's artifacts exist)** → a **delta round**,
  not a fresh campaign: `references/delta-round.md`.

When in doubt, still do Phase 0 (recon) and a lightweight Phase 1 (know your roles and your API surface)
before executing — skipping them is how campaigns drift into ad-hoc flailing.

## Reference map

| File | When to read |
|---|---|
| `references/scenario-matrix.md` | Phases 1–2: building the test base + scenario matrix from spec × deployed API; SoT hierarchy; drift tracking |
| `references/orchestration.md` | Phase 3: staged runs, sequential bootstrap → parallel fan-out, the structured-return schema, session/mailbox assignment, interruption recovery |
| `references/tooling.md` | Phase 3: temp-email idioms, browser-session hygiene, same-origin API probing, the CDN-masking classifier, screenshot naming, safety mechanics |
| `references/artifacts.md` | Phases 4 & 6: formats for findings / coverage / accounts / manifest, and the executive report |
| `references/delta-round.md` | Round N (a prior round's artifacts exist): what-changed detection with canary probes, findings re-baseline verdicts, regression-set selection |
| `references/manuals.md` | Phase 5: authoring per-role manuals from evidence |
| `assets/uat-workflow-template.js` | Phase 3: copy-and-fill orchestration script skeleton (bootstrap → fan-out → consolidate) |
