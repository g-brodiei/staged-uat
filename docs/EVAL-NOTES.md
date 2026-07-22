# staged-uat — eval harness notes

What we learned building and measuring this skill. Written for whoever revisits the harness, so the
same dead ends aren't re-walked.

## Iteration history

| Iter | What changed | Result |
|---|---|---|
| 1 | First 3 evals (campaign-structure / manuals-from-evidence / scoped-flow), 23 assertions | with 100% vs base 80% (+20pp). Wins **all** in skill-specific rigor |
| 2 | Added `tooling-prerequisites-gate` after user feedback (mailmatter API key + MCP, `playwright-cli install --skills`) | eval-0: 12/12 vs 8/12. New assertion discriminated cleanly, no regression |
| 3 | eval-1 rebuilt with 4 "traps"; eval-2's compound assertion split + credential rule rephrased | eval-2: 7/7 vs 4/7 (gap 0.333→0.429). eval-1: **all 4 traps failed to discriminate** |
| 4 | Retired the 4 dead assertions; added the cancellation-window trap | (see grading in `iteration-4/`) |

## The central lesson: test *authoring judgment*, not *reading comprehension*

The four traps in iteration 3 all failed the same way. Each one hid a fact in the evidence folder and
asked "will the author notice?" — spec promises a feature findings says doesn't exist; a glossary pushing
English aliases against on-screen Chinese names; a dangled `PATCH /api/...` workaround; a flow with no
screenshots inviting a fabricated figure. **The no-skill baseline caught all four unaided.** A capable
model reads a folder well. That is not where a skill adds value.

What *did* discriminate was how the manual is **written for its reader**:

- `no-internal-artifact-references` — **0 leaks vs 80**. The baseline shipped end-user manuals citing
  `findings #3`, captioned `（證據：artifacts/uat01/…）`, with a `✅ 實測通過` appendix. Correct content,
  wrong document: a UAT report wearing a manual's clothes. The skill's manual-authoring discipline moves
  provenance to the index and leaves clean user documentation.
- `manuals-index-produced` — baseline shipped three orphan files, no index.

Both are about **turning evidence into a deliverable for a specific audience**, which is exactly what the
skill teaches and what the base model doesn't do by default. Design assertions there.

Corollary: a non-discriminating assertion is not free — it costs grading effort and returns no signal.
Retire it, even if the rule behind it is genuinely good and stays in the skill. (We retired
`uses-onscreen-ui-names`, `unimplemented-features-not-presented-as-available`, `no-api-workarounds`,
`howto-numbered-steps` for exactly this reason; the rules remain in `references/manuals.md`.)

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
