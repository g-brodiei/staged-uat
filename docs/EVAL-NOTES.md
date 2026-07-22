# staged-uat — eval harness notes

What we learned building and measuring this skill. Written for whoever revisits the harness, so the
same dead ends aren't re-walked.

## Iteration history

| Iter | What changed | Result |
|---|---|---|
| 1 | First 3 evals (campaign-structure / manuals-from-evidence / scoped-flow), 23 assertions | with 100% vs base 80% (+20pp). Wins **all** in skill-specific rigor |
| 2 | Added `tooling-prerequisites-gate` after user feedback (mailmatter API key + MCP, `playwright-cli install --skills`) | eval-0: 12/12 vs 8/12. New assertion discriminated cleanly, no regression |
| 3 | eval-1 rebuilt with 4 "traps"; eval-2's compound assertion split + credential rule rephrased | eval-2: 7/7 vs 4/7 (gap 0.333→0.429). eval-1: all 4 traps appeared not to discriminate — **at n=1** |
| 4 | Retired the 4 "dead" assertions; added the cancellation-window trap | with-skill 4/5 vs baseline 3/5. Purity discriminator **reversed** vs iter-3 (19 vs 12) |
| 5 | **Re-ran eval-1 at n=3 per arm** | Settled it: the effect is real, the *threshold* was wrong, and one retired trap was retired too early |

## The biggest lesson: n=1 conclusions were wrong in *both* directions

Iterations 3 and 4 drew confident conclusions from a single run per arm. Iteration 5 (n=3) overturned
several of them:

| Measure | n=1 read | n=3 truth |
|---|---|---|
| Total provenance leakage | "0 vs 80 — decisive" then "19 vs 12 — reversed, it's noise" | with-skill **[2, 25, 8]** vs baseline **[50, 45, 33]** — **no overlap** (max 25 < min 33), ~3.7× on the mean. **Real.** |
| `no-api-workarounds` | "dead trap, baseline passes it" → retired | baseline **1/3 runs** piped `PATCH /api/appointments/{id}` into staff manuals. Weak but real. **Reinstated.** |
| Zero-total-leak as a pass bar | assumed achievable | fails **0/3 in both arms** — it discriminated nothing because every run emits *some* provenance |

Three habits follow:

1. **Never retire or crown an assertion on n=1.** Both the false negative (a trap called dead) and the
   false positive (a discriminator called decisive) came from single samples.
2. **Separate the signal from the threshold.** Leakage was always the right *thing* to measure; "zero
   leaks" was the wrong *bar*. Report continuous metrics continuously, and set the pass/fail bar on the
   part that is unambiguously wrong — here, citing `findings #N` at an end user (3/3 vs 1/3), versus a
   footer noting the doc derives from a UAT run, which is defensible provenance.
3. **Look at range overlap, not just means.** Non-overlapping ranges at n=3 are far more convincing than
   a big gap between two single runs.

## Where the skill actually adds value: authoring judgment, not reading comprehension

The traps that ask "will the author *notice* something in the evidence folder?" mostly fail to
discriminate — a capable model reads a folder well, unaided. Both arms consistently refused to document
unimplemented features, used on-screen labels over spec aliases, and caught the spec-vs-observed
cancellation contradiction.

What *does* separate the arms is how the evidence is **turned into a deliverable for a specific
audience**:

- `manuals-index-produced` — **the most robust discriminator in the whole harness: 5/5 runs across
  iterations 3–5** (with-skill always ships an index; the baseline ships three orphan files, never once).
- `no-findings-id-citations` — with-skill 3/3 clean, baseline 1/3. The baseline hands end users manuals
  citing `findings #3` with `（證據：artifacts/uat01/…）` captions and a `✅ 實測通過` appendix: correct
  content, wrong document — a UAT report wearing a manual's clothes.

Design assertions there. And note the corollary still holds — a genuinely non-discriminating assertion
costs grading effort for no signal, so retiring one is right; just retire it on evidence, not on a
single sample. (`uses-onscreen-ui-names`, `unimplemented-features-not-presented-as-available` and
`howto-numbered-steps` remain retired; the underlying rules stay in `references/manuals.md`.)

## Prefer deterministic checks over grader judgment

Two scripts in this workspace turn judgment calls into facts, and both surfaced sharper results than a
grader reading prose:

- `check_links.py <manuals_dir>` — every `![](…)` resolves; catches fabricated figures.
- `check_manual_purity.py <manuals_dir>` — counts internal-provenance leaks (`findings #N`,
  `artifacts/uat…/` in prose, `UAT` talk, ✅/實測 markers) after stripping image markdown.

Where a check can be scripted, script it: it is cheaper, reproducible, and immune to a grader being
generous. Grader judgment is still needed for things like "does this treat tooling as a prerequisite gate".

## Split compound assertions

`named-session-and-screenshot-naming` bundled two independent behaviours; the baseline had one and not the
other, and the compound hid it. Splitting widened the measured gap (0.333 → 0.429) *and* made each failure
name one concrete missing behaviour. Also: phrase safety assertions as "**states** the rule", not "does not
do X" — otherwise a run passes by silence (the baseline "passed" no-credential-persistence simply by never
saving state, while actively exporting `storageState` elsewhere).

## Known-broken: the automated description optimizer

`scripts/run_loop.py` was unusable here and its numbers should not be trusted:

- `run_eval.py` locates a "project root" by walking up from **cwd**, plants a stub command file there, and
  runs a bare `claude -p` from that directory. Launched from the skill-creator plugin dir it resolved to
  `/home/g-brodiei` — a bare home dir with no browser/email tooling and no project context.
- A headless Claude there, asked to "test the staging site", answers directly instead of consulting a
  skill. Measured **precision 100% / recall 0–17%**, and a rewrite scored *worse* than the original.
- It then crashed (`claude -p exited 1`) at iteration 3.

We did **not** apply its output. The shipped description was hand-written using the one sound principle it
surfaced (lead with trigger conditions, add explicit `NOT for…` boundaries). **That half is reasoned, not
measured** — re-test it from a real project directory if it ever matters.

Packaging constraints worth knowing: description must be **≤1024 chars** and contain **no angle brackets**
(use `→`, not `->`).
