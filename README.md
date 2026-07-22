# staged-uat

A [Claude Code](https://claude.com/claude-code) **skill** for running end-to-end UAT against a *live*
deployed web app across every user role — driving the real UI in a browser, capturing screenshot
evidence, logging findings, and turning all of it into a **user manual per role**.

It is built for the case where "test it" means a campaign, not a task: several user tiers
(platform admin → tenant staff → end customers), multiple frontends, invite/OTP emails flying between
roles, and dozens of scenarios. That only stays coherent if you structure it first and orchestrate it
with subagents — which is what this skill encodes.

## Quick start

Install it for every project you work on:

```bash
git clone https://github.com/g-brodiei/staged-uat.git ~/.claude/skills/staged-uat
```

That's the whole install — Claude Code discovers skills by directory. Start (or restart) Claude Code
and confirm it's there:

```bash
ls ~/.claude/skills/staged-uat/SKILL.md   # should exist
```

Then just describe the job in your own words — the skill triggers on its own:

> *"Walk through our staging site as each role, screenshot every step, and write me a how-to per user type."*

Or invoke it explicitly with `/staged-uat`.

⚠️ It drives **real** tools that this repo does not install — see
[Prerequisites](#prerequisites-not-bundled) before your first run. More install options
(per-project, symlink) are under [Install](#install).

## What it does

Six phases, each with a reference file the model reads when it gets there:

| Phase | |
|---|---|
| 0 · Recon | A hard **prerequisites gate** — verify the tooling is installed and authenticated, and reachability + the deployed API spec. Stop and tell the user if something's missing. |
| 1 · Test base | Reconcile spec × source × **deployed OpenAPI** into a scenario inventory; establish the source-of-truth hierarchy and role map. |
| 2 · Plan | Top-down account bootstrap chain, per-site route sweeps, a numbered scenario matrix (including negative/permission scenarios). |
| 3 · Execute | **Sequential bootstrap, then parallel fan-out** to subagents that each return a structured result. |
| 4 · Consolidate | findings log · coverage matrix · accounts ledger · screenshot manifest. |
| 5 · Manuals | One operation manual per role, authored from the screenshot evidence. |
| 6 · Report | Findings triaged by disposition: needs a spec decision / needs a dev fix / needs infra / verified working. |

It also encodes the non-obvious things that cost real time to learn — never persisting session
cookies to disk, round-tripping every state change on a shared environment, and classifying API
probes by **content-type rather than status code** (a fronting CDN will happily rewrite a 403 into
`200 + HTML` and cache it).

**Not for:** unit/integration tests in code, CI e2e setup, code review, debugging a failing deploy, or
a single-page accessibility audit.

## Prerequisites (not bundled)

The skill drives real tools. It does **not** install them, and its Phase 0 gate will stop and tell you
what's missing rather than improvising:

- **A temporary-email tool** — e.g. the [mailmatter](https://mailmatter.dev) MCP server. Needs an API
  key created *and* the MCP server configured in your client.
- **A browser driver** — e.g. [playwright-cli](https://github.com/microsoft/playwright-cli)
  (`playwright-cli install --skills` in your project), or a Playwright MCP.
- **A subagent / Workflow harness** — the orchestration model assumes you can fan work out to subagents.

## Install

Claude Code loads skills from directories — there is no package manager step. Pick whichever scope
fits; in all three the target directory **must be named `staged-uat`**, because the directory name is
the skill name.

**1. Global — available in every project (recommended):**

```bash
git clone https://github.com/g-brodiei/staged-uat.git ~/.claude/skills/staged-uat
```

**2. Per-project — committable, so teammates get it too:**

```bash
git clone https://github.com/g-brodiei/staged-uat.git your-project/.claude/skills/staged-uat
rm -rf your-project/.claude/skills/staged-uat/.git   # vendor it in, then commit it
```

**3. Symlink — one source of truth across many projects:**

```bash
git clone https://github.com/g-brodiei/staged-uat.git ~/src/staged-uat
ln -s ~/src/staged-uat your-project/.claude/skills/staged-uat
```

Edits to the clone then apply everywhere. (Symlinks don't travel through git, so this is a local
convenience, not a team setup.)

### Verify and use

```bash
ls ~/.claude/skills/staged-uat/SKILL.md    # or your-project/.claude/skills/...
```

Restart Claude Code so it picks up the new skill. It then triggers **automatically** when you describe
a matching job ("test all the roles on staging and screenshot each step"), or you can call it directly
with `/staged-uat`.

### Updating

```bash
git -C ~/.claude/skills/staged-uat pull
```

The skill files live at the repo root, so cloning *into* a directory named `staged-uat` yields a
working skill with no further steps. `README.md`, `LICENSE`, `docs/` and `tools/` sit alongside them
and are ignored by the skill loader.

## What's in here

```
SKILL.md          the skill entry point (workflow, non-negotiables, phase map)
references/       the detailed mechanics, read per-phase
assets/           a copy-and-fill orchestration script skeleton
tools/            two reusable checkers (see below)
evals/            the eval set used to validate the skill
docs/EVAL-NOTES.md  how it was validated, and the eval-design lessons
```

The two checkers in `tools/` are useful on their own when authoring manuals from evidence:

```bash
python3 tools/check_links.py <manuals_dir>          # every ![](…) resolves; catches fabricated figures
python3 tools/check_manual_purity.py <manuals_dir>  # no internal test provenance leaked into user docs
```

## How it was validated — and the caveats

Measured against a no-skill baseline on three evals (campaign structure, manuals-from-evidence,
scoped single flow), graded on objective assertions:

- **100% vs 80%** overall on the first pass, with every win landing on the hard-won specifics — the
  tooling gate, no-credential-persistence, shared-env round-tripping, CDN content-type classification,
  and the temp-email watermark idiom — rather than on generic campaign structure, which a capable model
  already does well.
- **12/12 vs 8/12** on the campaign-structure eval after adding the Phase 0 prerequisites gate.

Two things worth stating plainly rather than burying:

1. **The manual-purity discriminator is noisy at n=1.** It measured 0 leaks vs 66 in one iteration and
   then *reversed* (19 vs 12) in the next. Treat the manuals eval as unproven until someone runs it
   with n≥3 per arm.
2. **The skill description was hand-tuned, not optimizer-tuned.** The automated description optimizer
   was unusable here — its harness runs a bare headless session from a resolved project root with no
   browser/email tooling, so the skill never gets consulted and recall collapses to ~0 regardless of
   wording. Its output was discarded.

Full detail, including the traps that *failed* to discriminate and why, is in
[`docs/EVAL-NOTES.md`](docs/EVAL-NOTES.md).

## License

MIT — see [LICENSE](LICENSE).
