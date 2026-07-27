# Replayable scripts: write once in round 1, replay cheaply forever

The first campaign re-drives the whole matrix through the LLM anyway — so **capture each successful
scenario as a replayable browser script while you drive it.** Later rounds (`references/delta-round.md`,
`references/full-reverification.md`) then **replay the suite headlessly** instead of re-improvising every
click. Navigation cost drops from **(scenarios × rounds)** to **(scenarios × 1) + judgment**.

This is what makes #3's full-re-verification **hard gate** affordable: a sign-off round that forbids
`PASS by reference` becomes a script replay plus a judgment pass, not a token blowout that re-clicks ~60
scenarios by hand.

## What a script is — and is not

A script replays the **mechanical** part of a scenario: navigate → act (state change, round-tripped) →
capture evidence (screenshot / API-probe) → assert **mechanical facts**. Mechanical = things a selector or
a string match can decide:

- an HTTP probe returns real JSON `2xx`/`4xx` (classify by content-type per `references/tooling.md`);
- expected text is present / absent on the page;
- an order or a count **persists after reload** (the check that catches silent data loss).

A script is **not** the judgment. Spec-conformance ("does this match PRD §5.6?"), exact-wording review, and
"is this new behavior a bug?" cannot be frozen into a selector — they **stay LLM-judged** on replay. Keep
that line sharp: scripts assert facts, the LLM rules on meaning.

## Stable locators are mandatory (a script built on snapshot refs is broken by construction)

`references/tooling.md` teaches acting by **snapshot ref** (`click e15`) — correct for **live** driving,
**fatal** for a persisted script. Snapshot refs are regenerated on every `snapshot`; they will not survive
a rerun. So at drive time, when you land the successful action, **capture a durable locator for the
script**, not the ref you clicked:

- prefer `getByRole(role, { name })`, then `getByTestId`, then a stable CSS/text selector;
- never emit `e15`/`e19`-style refs into a script;
- if a control has no stable handle, that gap is worth a `[UX]`/`[Gap]` finding (untestable UI) as well as
  a fallback selector.

## Which scenarios get a script

**Every re-runnable scenario gets one — 1:1 with its coverage-matrix row.** Destructive or one-off
scenarios can't be naively replayed, so they map onto the `references/full-reverification.md`
destructive-scenario taxonomy, and the script matches the class:

| Class | Script form |
|---|---|
| `re-execute-with-round-trip` | full replay: act for real, assert, then restore; verify the world ends unchanged |
| `observe-and-cancel` | open the guard/modal, assert its copy + state, then **cancel** — never confirm |
| `verify-end-state-only` | assert the **persisted end state** only; no re-execution (the action was consumed in round 1) |

A scenario with **no** script is an explicit coverage-matrix state (see `references/artifacts.md`), never a
silent omission. Record the class alongside the script path so a replay round never *implies* a full
execution that didn't happen.

## Mechanism — pick the recorder/runner (a setup gate, like Phase 0 tooling)

Decide once per campaign how scripts are stored and replayed. Ranked:

| Option | What it is | Setup | Use when |
|---|---|---|---|
| **(a) `npx playwright test` specs** — durable target | real assertion framework, trace + screenshot-on-failure, headless + parallel; `codegen -o flow.spec.ts` records, `npx playwright test` replays | **gate:** the project must be a Playwright workspace — `@playwright/test` resolving at root, a `playwright.config`. If it isn't (a `playwright-cli` daemon config is **not** a Test-runner config), run `npm init playwright` + a one-line-spec smoke test **first**, or fall back | you can invest ~10 min of setup once; you want a lasting suite |
| **(b) `playwright-cli` shell batch** | an ordered list of `playwright-cli` commands run headless | none | zero-setup; you accept hand-rolled asserts + evidence |
| **(c) `playwright-cli run-code --filename=script.js`** | one self-contained `async page => {…}` per flow | none | zero-setup, single self-contained flow; no `import`/assertion framework |

Recommend **(a)** as the durable target; use **(b)/(c)** when you won't or can't initialize a workspace.
Verify the chosen runner can replay one flow end-to-end (a smoke test) **before** depending on the suite —
same discipline as the Phase 0 tooling gate.

## Replaying in a later round — what the LLM still does

In a delta or full-re-verification round, **replay the suite headlessly first**, then spend the LLM budget
only on the irreducible parts:

1. **triage every failure** (below) — the round's real work;
2. **spec-conformance + exact-wording judgment** on what replayed green (a mechanical pass is not a spec
   pass — the letter body can persist while its *content* is wrong);
3. **new-issue hunting** — scenarios and edge cases no script covers yet; capture the new ones as scripts too.

## When a script fails — triage, never silently skip

A script failure is a **signal to classify**, not a red X to route around. UI churn is exactly what UAT
exists to catch, so a failure is expected and informative:

| Classification | Signal | Action |
|---|---|---|
| **real regression** | behavior changed, spec did not | → numbered finding (`references/artifacts.md`); coverage row `FAIL` |
| **intended UI change** | the UI legitimately moved | → re-derive the locator/step, **update the script in place** with a one-line note; re-run. Cost paid once, amortized over all future rounds |
| **test-artifact rot** | flaky selector, timing, stale fixture — product is fine | → fix the script; not a product finding |

**Never silently skip.** A failed *or missing* script is an explicit coverage-matrix row (`FAIL` /
`no-script`), which is how this suite enforces #3's no-`PASS-by-reference` and coverage-completeness rules
**mechanically** instead of by operator discipline. Budget the round's LLM tokens for triage +
re-derivation — far less than re-driving everything, and spent where judgment is actually required.

## Bonus — a deliverable in its own right

The suite is a lasting artifact: an automated e2e regression suite the client keeps beyond the engagement,
seeded for free as a by-product of round 1. Store it campaign-level in an `e2e/` directory (a sibling of
the per-run `artifacts/<run>/` dirs, **not** inside them — it is reused across rounds, not scoped to one),
`e2e/<flow-id>.<ext>` per scenario, updated in place as the UI evolves.
