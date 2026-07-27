# Full re-verification: re-clicking an existing campaign end to end

Use this when a prior round's artifacts exist **and** the round is a **sign-off / closure / acceptance
gate**, follows a **major refactor or re-platform**, or the user **asks for a full run**. It is the third
round type — distinct from a **delta round** (`references/delta-round.md`), which re-judges findings and
re-runs a regression subset. A delta answers *"is what we already logged still true?"*; a full
re-verification answers *"does the whole platform still pass, clicked fresh, right now?"*

The one rule that separates this mode from every other: **`PASS by reference` is forbidden.** Every
scenario in the canonical matrix gets a **fresh verdict**, a **fresh owning agent**, and a **fresh
evidence path** this round — no scenario inherits a pass from a prior round, no matter how unchanged the
spec or deployment looks. A delta round leans on "green by reference" by design; carrying that habit into
a closure gate is exactly the failure this mode exists to prevent.

Re-clicking the whole matrix is only affordable because you **replay the round-1 script suite**
(`references/replayable-scripts.md`) headlessly rather than re-driving every click by hand; the LLM budget
then goes to triaging replay failures, spec-conformance judgment, and hunting new issues. A replayed green
is a *mechanical* pass, not a spec pass — judgment still runs on top (Step 5's re-probe and per-scenario
wording review are not something a selector can decide).

## The hard gate — when this mode is mandatory

**A sign-off / closure / acceptance round MUST run a full re-verification.** The only alternative is an
**explicit, recorded waiver**: in that round's `PLAN.md` and coverage matrix, state exactly what was
covered by reference instead of re-clicked, and name who accepted that risk. A silent delta at a closure
gate — marking most of the matrix `PASS (unchanged)` and signing off — must not be reachable.

**Violating the letter of this gate is violating its spirit.** "I ran a delta that touched the important
things" is not a full re-verification and is not a waiver. Either re-click the whole matrix, or write the
waiver down with an owner.

Why it is this strict — the failure modes a delta cannot reach, each paid for in a real closure run:

- A **saved record edited in a narrow way silently dropped unrelated data** (editing only a letter's
  recipient wiped the letter body). No delta touched it, because no delta ever re-edited a
  previously-saved record. Content that ships *after the author dies* — the author can never read it back
  to notice.
- A **"fixed" verdict from a prior round was false**, because the prior round's canary probed a surface
  the real app never uses (see Step 5). Distribution-specific: one origin patched, another still broken.
- A **single logged symptom was actually systemic** — one double-fired request in the ledger turned out
  to be every write and auth mutation double-firing, visible only when the whole matrix was re-clicked.

None were reachable from a regression subset. They were reachable only by re-clicking scenarios that had
"passed by reference" for several rounds.

| Rationalization | Reality |
|---|---|
| "The spec didn't change, so this scenario can't have regressed." | The **deployment** moves independently of the spec. Identical spec shape ≠ identical behavior — that is the whole premise of the delta canary. At a closure gate you re-click, you don't infer. |
| "We tested this in round 1 and it passed; re-running is wasteful." | Round 1's pass is evidence about round 1's build. Closure signs off on *today's* build. A pass you didn't observe this round is not evidence you can sign your name under. |
| "The delta covered the risky areas; the rest is low-risk." | The data-loss bug above lived in a "low-risk, unchanged" edit path for three rounds. You do not know where the next one is — that is why the matrix is the matrix. |
| "There's no time before the deadline to re-click everything." | Then you write a **waiver** naming what you skipped and who accepted it. You do not silently pass-by-reference and call it a full run. Time pressure is the argument *for* recording the gap, not for hiding it. |
| "`PASS (unchanged)` is a legitimate coverage-matrix state — the delta skill says so." | It is legitimate **in a delta round**. This is not a delta round. In this mode that state is a coverage hole wearing a pass's clothes. |

### Red flags — STOP, you are about to run a delta and call it a sign-off

- You are about to write `PASS (uat0N, unchanged)` in a **closure / acceptance** round.
- You scoped a "regression set" instead of the full matrix for a sign-off gate.
- You are reasoning "the spec is stable, so the deployment is stable."
- You are signing off on a build you did not click through **this round**.
- There is no waiver in `PLAN.md`, yet part of the matrix has no fresh verdict.

**All of these mean: re-click the full matrix, or write the waiver with an owner. Nothing in between.**

## Step 1 — Rebuild the canonical scenario matrix, fresh-verdict every row

Load the canonical matrix (`references/scenario-matrix.md` + the prior rounds' `coverage.md`). Every row
starts this round as `NOT-YET-VERIFIED`. A row leaves that state only by being re-clicked and getting one
of: `PASS` (with this round's evidence path), `FAIL` (→ finding), or `COULD-NOT-EXECUTE` (precondition
genuinely unmet — Step 4). There is no `PASS (unchanged)` transition in this mode.

Re-download the live OpenAPI specs into `artifacts/<run>/openapi/` and diff against the prior round's copies
(as a delta would) — but here the diff **informs** the run, it does not **scope** it. A stable diff does
not shrink the matrix.

## Step 2 — Coverage-completeness pre-flight (REQUIRED before fan-out)

Before dispatching any subagent, produce and check an assignment table — this is a required artifact, not
an optional sanity check:

| Requirement | Check |
|---|---|
| **Total coverage** | The union of all agents' assigned scenarios **equals** the canonical matrix. Every scenario ID is assigned. |
| **Single owner** | Each scenario is owned by **exactly one** agent (disjoint assignment — see Step 3 for why). |
| **No silent drop on re-plan** | If you collapse the agent plan (e.g. 6 owners → 5 to save sessions), re-run this check. Merging owners is where a whole group vanishes unnoticed — and a full-mode run that omits a group is **worse than a delta**, because it *claims* completeness. |

At **consolidation**, re-assert it: every scenario in the matrix has exactly one fresh verdict + owning
agent + evidence path this round. A scenario with no verdict is a **coverage hole**, and a coverage hole
in a sign-off round is a failed sign-off — surface it, don't paper it.

## Step 3 — Partition race-free, with a single barrier

Full re-verification runs the whole matrix at once, so parallel agents will collide on shared state unless
the partition is disjoint by **data-domain ownership**:

- **One agent owns each top-level entity's membership + content.** Two agents must never both mutate the
  same entity's members or data. Disjoint entities run in parallel safely.
- **The admin / staff agent avoids that entity's membership** — it exercises the admin tree, not the
  members another agent owns.
- **API / security probes run standalone** — read-mostly, no shared mutable state.
- **One barrier only.** A single gating agent restores the shared baseline (accounts, memberships, seeded
  content) to the known start state *before* the dependent agents launch. Everything after the barrier
  fans out. More than one barrier usually means the partition isn't actually disjoint — fix the partition,
  don't add barriers.

Same safety conventions as any round (`references/tooling.md`): round-trip every reversible mutation, and
end the round with the world in its start state.

## Step 4 — Classify every destructive scenario before re-running it

A first campaign *consumes* irreversible scenarios; a re-verification cannot blindly re-execute them.
Classify each destructive scenario, **record the class in the coverage matrix**, and run it per its class
— so the matrix never *implies* a full execution that didn't happen:

| Class | When | Re-run rule |
|---|---|---|
| `re-execute-with-round-trip` | the mutation is reversible (reassign, toggle, invite→revoke, rename) | execute for real, then restore; verify the world is unchanged at the end |
| `observe-and-cancel` | confirming is irreversible but the UI has a modal / preview / guard worth verifying | open it to capture the guard copy and state, then **CANCEL** — never confirm |
| `verify-end-state-only` | already consumed and not repeatable (hard-delete, account deletion, lockout auto-expiry) | assert the **persisted end state** as evidence; record explicitly that it was **not** re-executed, and why |

`COULD-NOT-EXECUTE` (from Step 1) is for scenarios whose precondition is genuinely unmet this round — keep
it as its own coverage state, visibly distinct from any kind of pass.

## Step 5 — Re-probe every "fixed" verdict on the surface the real app uses

A `RESOLVED` / "vendor fixed it" verdict from a prior round is re-verified here on the **surface the real
application actually calls** — not merely a convenient one:

- Apps authenticate with a **domain-locked httpOnly cookie**, so a browser app calls its **own origin**.
  A probe fired at a dedicated API host exercises a surface the app never touches — a fix (or a bug) there
  says nothing about what the app hits.
- Fixes are frequently **distribution-specific**: one origin's CDN behavior patched while another still
  masks 4xx as `200 + SPA HTML`. Probing the wrong origin is how a still-broken surface gets signed off as
  fixed.
- Apply the CDN-masking classifier from `references/tooling.md` **on the app's origin**: classify by
  content-type not status, cache-bust, contrast against a resource you do own.

## Step 6 — Reconcile finding IDs before any external verdict

Before asserting any externally-communicated verdict — a vendor rework notice, a closure report, a
"reported fixed but not landed" claim — reconcile **every finding number** against the canonical findings
ledger (`references/artifacts.md`). Asserting a verdict against the wrong ID is worse than none: it sends
the vendor chasing a different bug, and it surfaces (embarrassingly) when *they* catch the mismatch. One
reconciliation pass over the ledger before the notice goes out.

## Output

Same artifact set and orchestration as any run (`references/orchestration.md`, `references/artifacts.md`),
with three things this mode adds:

- a **coverage matrix with a fresh verdict on every row** (no `PASS (unchanged)`), plus a distinct
  `COULD-NOT-EXECUTE` section for genuinely unrunnable scenarios and the destructive-class tag per Step 4;
- the **Step 2 assignment table** as a persisted pre-flight artifact;
- if anything was covered by reference under time pressure, the **waiver** from the hard gate — in
  `PLAN.md` and the matrix, with an owner.
