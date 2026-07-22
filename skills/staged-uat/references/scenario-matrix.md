# Building the test base and scenario matrix (Phases 1–2)

The point of this phase is to turn "test the platform" into a **finite, ordered, spec-anchored list of
scenarios** with clear evidence targets — so execution is a checklist, not improvisation.

## Reconcile three sources of truth

A deployed platform has three descriptions of itself, and they disagree. You need all three:

1. **The spec** (PRD / design docs / glossary) — what the product is *supposed* to do, and the authoritative
   names for entities, roles, and permissions. Establish the **SoT hierarchy** early: which single document
   arbitrates each kind of fact (naming, scope, permission rules), so when they conflict you know who wins.
2. **The source repos** (if you have them) — what was actually *written*. Route tables, permission guards,
   and which UI strings map to which schema fields. Exploring these tells you the real page inventory and
   the real gating logic, which is often subtler than the spec.
3. **The deployed OpenAPI + live UI** — what's *actually up right now*. This is ground truth for the
   campaign. The deployed API spec frequently exposes endpoints the UI never wires, or behaves differently
   from both the spec and the source.

**Find the deployed API spec first.** A Swagger UI page (`/docs`, `/api-docs`, `/swagger`) almost always
declares its raw spec URL(s) in the page source — grep the HTML for `.yaml`/`.json`/`urls:`. Download every
spec (there's often one per namespace: consumer / admin / super / venue). Parse them into a flat endpoint
list (method + path + summary + tags) — this is your **coverage denominator**: the set of behaviors that
exist to be tested.

When source repos are available, dispatch **parallel explorer subagents** (one per repo/app) to produce a
route + feature + role-gating inventory. This is far faster than reading serially and gives you the page
list the UI sweep will walk.

## Map the role tiers

Write down every role, which tier it sits in, **which site/host it logs into**, and **how its account gets
created** (self-signup? invited by whom?). This table drives the bootstrap order (Phase 2) and the manual
set (Phase 5). Note the UI-name ↔ schema-name mapping per role — you'll write scenarios in UI names but
probe APIs in schema names, and the manuals must use the on-screen names.

Example shape:

| Tier | UI name (on screen) | schema/role | Login site | Account created by |
|---|---|---|---|---|
| Platform | Super Admin | `super_admin` | platform host | pre-seeded |
| Tenant | 診所主管 (Clinic Manager) | `clinic_manager` | console host | Platform invite → `/activate?token=` |
| Client | 病患 (Patient) | `patient` | patient-app host | clinic sends invite → email link |

## Seed the scenario matrix

Cross the **spec's feature list** with the **deployed endpoint list** to enumerate scenarios. Group them by
role/area with a short prefix code (e.g. `P-` platform, `A-` tenant staff admin, `AP-` appointment
lifecycle, `PT-` patient account, `FD-` front-desk ops, `API-` API-only surface, `X-` cross-role
negative). Each row:

| field | content |
|---|---|
| id | stable code, e.g. `C-INV-05` |
| scenario | one line |
| precondition | what must already exist (ties to bootstrap + prior scenarios) |
| key assertion(s) | what proves it works — the thing to screenshot / check |
| evidence target | the flow folder screenshots land in |

Deliberately include:
- **Happy paths** for every major feature.
- **Negative / permission scenarios** — a role attempting what it must NOT be able to do. These are where
  real defects hide. Give them their own group (`X-`) and probe both the UI (is the control hidden/blocked?)
  and the API (does the server reject it?), because UIs hide buttons while servers stay open, or vice versa.
- **Boundary/lifecycle** — expiry, quotas, soft-delete/restore, once-flags, state machines.
- **Cross-tier isolation** — cookies/tokens from one tier against another's namespace.

## Track drift as first-class findings

As you build the matrix you'll already spot places where the deployed reality contradicts the spec (an
endpoint the PRD says is one thing and the spec comment says another; a UI label that differs from the
glossary). **Log these immediately** in the findings file with a `[Spec-drift]` tag. Drift is a primary
deliverable — the spec owner needs to decide whether to fix the code or update the spec. Don't "correct" for
it silently in your own understanding; surface it.

## Output of this phase

- A **test-base guideline** doc (conventions: tooling, safety rules, naming, artifact layout) the whole
  campaign refers back to.
- A **discovery/plan** doc holding the account bootstrap chain, the route sweep checklists per site, and the
  numbered scenario matrix.
- The downloaded API specs and the endpoint inventory.

Keep both docs living — you'll update the matrix with status and add drift as you execute.
