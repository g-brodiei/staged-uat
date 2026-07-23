# Artifacts: findings, coverage, accounts, manifest, report (Phases 4 & 6)

The campaign's durable output is a small set of living documents plus the screenshot tree and the
deployed API specs persisted in Phase 0 (`artifacts/<run>/openapi/`). Keep them under `artifacts/<run>/`
(run ids `uat01`, `uat02`, …). Update them **after every run**, not at the end.

## findings.md — the numbered observation log

Every observation gets a stable number and a severity/type tag, and quotes the **exact on-screen wording**.
The numbering is stable so findings can be cross-referenced from the coverage matrix, the manuals ("known
limitation, see #62"), and the executive report.

Tags to use:
- `[Spec-drift]` — implementation contradicts the spec; needs a spec-owner decision.
- `[Bug]` / `[Bug-major]` / `[Bug-minor]` — defect.
- `[Bug-infra]` — environment/deployment issue (CDN, cache, provider config).
- `[Gap]` — a spec'd capability with no UI/endpoint.
- `[UX]` — confusing but not broken.
- `[觀察]` / `[Note]` — confirmed-correct behavior worth recording (positives matter for sign-off).

Give every spec-anchored finding a **`spec-ref`** — the file + section + line of the spec claim it
contradicts or verifies (e.g. `prd/01_prd.md §5.6 L389`). This is what lets a delta round
(`references/delta-round.md`) re-judge a 100-finding ledger semi-mechanically against a revised spec,
instead of re-locating every claim by grep.

Group by area with headings. Example entries:

```
26. [Spec-drift-major] Cancellation window not enforced: spec §4.3 restricts patient self-cancel to
    ≥24h before the appointment, but a cancel at T-2h succeeded unblocked (PAT-CANCEL evidence).
    spec-ref: prd/01_prd.md §4.3 L112
62. [Spec-drift] Day-sheet print missing: the permission matrix grants Front-desk "print day sheet",
    but no print control exists anywhere in the console (DOM scan: 0 matches).
114. [Security PASS] 16 cross-tier/role probes, 0 breach / 0 mutation: cookie path-lock + CORS + backend
    rejects frontend tokens; every RBAC boundary enforced.
```

## coverage.md — the scenario status matrix

One row per scenario (mirrors the Phase-2 matrix), flipped to its outcome as runs complete. Columns:
id · scenario · status (✅ PASS / ◐ PARTIAL / ⬜ not-run) · evidence folder · note (with `#`-refs to findings).
Keep a **"not yet executed"** section listing what's deliberately deferred and *why* (needs a live wait,
needs test data you don't have, time-bound) — silence reads as "covered," so name the gaps.

## accounts.md — the environment ledger (source of truth for re-login)

The true current state of everything the campaign created: every account (role, email, password, mailbox,
status), and every test asset (records, ids, deliberate config overrides), with **struck-through / marked
entries for what was deleted, locked, or consumed**. This is the re-login source (replacing on-disk session
state) and the handoff doc for the next run. Note any live-environment caveats (e.g. a poisoned CDN cache
entry) so the next run doesn't misread them.

## MANIFEST.md — the screenshot index

A generated list of every screenshot grouped by flow folder, so manual authors can pick figures by
description without re-scanning the tree. Regenerate it before Phase 5:

```bash
for d in artifacts/<run>/*/; do echo "## $d"; ls "$d"*.png 2>/dev/null; done > MANIFEST.md
```

## REPORT.md — the executive report (Phase 6)

The one document for the spec owner / PM. Don't dump the 100+ findings raw — **triage by disposition**, so
each section maps to *who decides* and *what action*:

```
# UAT <run> — 彙整報告
## 1. 總結            (one paragraph: what works, and the shape of what doesn't)
## 2. 須拍板 (spec-drift) — table: # · topic · PRD reading · impl reality · priority
                          (these need a spec-owner ruling: fix code or update spec)
## 3. 產品缺陷 (bugs)   — grouped: functional / UI / copy-consistency
## 4. 基礎設施 (infra)  — CDN masking, cache poisoning, provider config — usually cross-cutting, high priority
## 5. 正向驗證         (verified-working: security, SLAs measured, key flows proven — needed for sign-off)
## 6. 覆蓋與待補       (what ran; what's deferred and why)
## 7. 環境現況         (end-state, for whoever picks up next)
```

Sort within each section by severity. Reference findings by number. Measure and cite anything that maps to a
**contract SLA** (release latency, job processing time, response time) — those are acceptance-gating.

## rebaseline.md — delta rounds only

A round N run re-judges every prior finding against the changed spec/deployment and records one verdict
per finding here (`# · verdict · rationale · spec-ref`). Verdict taxonomy and workflow:
`references/delta-round.md`.

## Bookkeeping discipline

- Keep counts consistent across docs (if the manifest says 108 figures, the index says 108).
- No stale status markers — when a run finishes, remove "in progress" language.
- The ledger must match reality — if a scenario deleted an account, strike it in the ledger the same turn.
