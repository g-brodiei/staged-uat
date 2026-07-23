# Delta rounds: round N against a changed spec or deployment

Use this when a **prior round's artifacts exist** (`artifacts/uat01/`, …) and the trigger is a **spec
revision**, a suspected **redeploy**, or "re-test what we found". A delta round is NOT a fresh campaign:
its deliverable is a **verdict on every prior finding** plus **targeted re-execution**, not a full matrix
rerun. Run ids continue the sequence (`uat02`, `uat03`, …).

## Step 1 — Establish what actually changed (never assume)

Two axes move independently between rounds; check both:

- **The spec axis.** Diff the new spec revision against the revision the prior round tested — and persist
  which revision *this* round tests (copy it, or record its git rev, under `artifacts/<run>/`) so round
  N+1 has a baseline too. Every changed claim is a re-judgement trigger for Step 2.
- **The deployment axis.** Download the live OpenAPI specs into `artifacts/<run>/openapi/` and diff them
  against the prior round's persisted copies (`artifacts/<prev>/openapi/`). Then — critically —
  **identical spec shape does NOT mean identical deployment.** Path counts can match exactly while the
  backend was silently redeployed under them (bugs fixed, features removed, new regressions). Before
  asserting anything about the deployment, run **canary probes**: re-execute 2–3 known-bug repros from
  the prior findings ledger — spread them across services/frontends (a partial redeploy shows in one and
  not another) and prefer cheap, deterministic repros. A canary that now passes proves a silent fix; a
  new error (e.g. a global 500) proves a regression — either way, a redeploy that no spec diff would
  reveal. Also record each frontend's **bundle hash** (the hashed asset filenames in the site's
  index.html) per round and compare to detect frontend redeploys the same way; if the prior round
  recorded none, record them now and lean on canaries this round.

## Step 2 — Re-baseline the findings ledger

Re-judge **every prior finding** against the new spec revision, one verdict each:

| Verdict | Meaning |
|---|---|
| `RESOLVED-BY-SPEC` | the spec moved to match the implementation — closed, no code change needed |
| `STILL-OPEN` | the finding still contradicts the current spec — carries forward |
| `REVERSED` | the spec moved the *other* way — the implementation now contradicts the new spec (lags it, or still ships what the revision removed) |
| `NEW` | introduced by the spec change, or surfaced by canaries/probes — gets a fresh finding number |

Verdicts apply to **positive** findings too, read as "does the verification still hold?" — a
`[Security PASS]` whose underlying rule the revision changed is no longer sign-off evidence; re-queue it
as a `NEW` assertion instead of carrying the pass forward. And when a prior finding lacks a `spec-ref`
anchor, backfill it as you re-judge, so the *next* round is mechanical.

Write the result to `artifacts/<run>/rebaseline.md`: one row per prior finding
(`# · verdict · one-line rationale · spec-ref`). This is the delta round's primary deliverable — the
spec owner reads it as "what of everything we logged is still true." The `spec-ref` anchors recorded per
finding (see `references/artifacts.md`) are what make this pass semi-mechanical; without them every
finding's spec claim must be re-located by hand.

## Step 3 — Select the regression set (not the full matrix)

Rerun only:

1. **Prior bug findings** — is each one silently fixed, unchanged, or worse? (Your canaries already
   sampled this; now cover the rest of the bug list.)
2. **The prior round's deferred/backlog (待補) items** from the coverage matrix — and if an item's
   original blocker still holds, re-defer it explicitly with the reason, don't silently drop it.
3. **Assertions newly introduced by the spec change** — the `REVERSED` and `NEW` sets from Step 2.

Everything that passed round N−1 under a spec claim *and* a deployment that both held still stays green
by reference — mark it so in the coverage matrix explicitly ("PASS (uat01, unchanged)") rather than
re-running or leaving it ambiguous.

## Step 4 — Execute as a (smaller) normal round

Same orchestration, artifact, and safety conventions as any run: new run id, findings numbering
**continues** from the prior ledger (verdicts annotate old findings; only `NEW` items get new numbers),
and the **accounts ledger carries forward** as the re-login source. Expect browser sessions from the
prior round to be gone — re-login from the ledger, don't hunt for resident sessions.

If the round invalidated manual content — a feature the revision removed, a permission step that
changed, a "known limitation" now verdicted fixed — patch the affected sections of the existing role
manuals per `references/manuals.md`; don't re-author the set.
