# staged-uat

A [Claude Code](https://claude.com/claude-code) **skill** for running end-to-end UAT against a *live*
deployed web app across every user role — driving the real UI in a browser, capturing screenshot
evidence, logging findings, and turning all of it into a **user manual per role**.

It is built for the case where "test it" means a campaign, not a task: several user tiers
(platform admin → tenant staff → end customers), multiple frontends, invite/OTP emails flying between
roles, and dozens of scenarios. That only stays coherent if you structure it first and orchestrate it
with subagents — which is what this skill encodes.

## Quick start

```bash
/plugin marketplace add g-brodiei/staged-uat
/plugin install staged-uat@staged-uat
```

Then just describe the job in your own words — the skill triggers on its own:

> *"Walk through our staging site as each role, screenshot every step, and write me a how-to per user type."*

Or invoke it explicitly with `/staged-uat`.

⚠️ It drives **real** tools that this repo does not install — see
[Prerequisites](#prerequisites-not-bundled) before your first run. Other install routes (from source,
or manually without the plugin system) are under [Installation](#installation).

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

## Installation

### From Marketplace (recommended)

```bash
/plugin marketplace add g-brodiei/staged-uat
/plugin install staged-uat@staged-uat
```

### From Source

```bash
git clone https://github.com/g-brodiei/staged-uat.git
/plugin install /path/to/staged-uat
```

### Manual (no plugin system)

The skill is a plain directory, so you can also drop it in yourself — the target directory **must be
named `staged-uat`**, since the directory name is the skill name:

```bash
git clone https://github.com/g-brodiei/staged-uat.git /tmp/staged-uat
cp -r /tmp/staged-uat/skills/staged-uat ~/.claude/skills/staged-uat   # or your-project/.claude/skills/
```

### Verify and use

Restart Claude Code, then run `/plugin` to confirm `staged-uat` is installed and enabled. The skill
triggers **automatically** when you describe a matching job ("test all the roles on staging and
screenshot each step"), or you can call it directly with `/staged-uat`.

### Updating

```bash
/plugin marketplace update staged-uat
```

Releases are versioned in `.claude-plugin/plugin.json` and tagged `vX.Y.Z`, so the marketplace can tell
when a newer version is available. See [docs/RELEASING.md](docs/RELEASING.md) and
[CHANGELOG.md](CHANGELOG.md).

## What's in here

```
.claude-plugin/    plugin + marketplace manifests (name, version, source)
skills/staged-uat/ the skill itself
  SKILL.md           entry point (workflow, non-negotiables, phase map)
  references/        detailed mechanics, read per-phase
  assets/            copy-and-fill orchestration script skeleton
tools/             two reusable checkers (see below)
evals/             the eval set used to validate the skill
docs/              EVAL-NOTES.md (validation + lessons), RELEASING.md
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

- **Manuals-from-evidence, re-run at n=3 per arm** to settle an earlier noisy result. The skill produces
  end-user documentation; the baseline produces test reports wearing a manual's clothes:

  | | with skill | baseline |
  |---|---|---|
  | Internal-provenance leakage per run | **2, 25, 8** | **50, 45, 33** (no overlap; ~3.7× on the mean) |
  | Cites `findings #N` at end users | 0/3 runs | 2/3 runs |
  | Ships a manuals index | **3/3** | **0/3** |

One thing worth stating plainly rather than burying:

**The skill description was hand-tuned, not optimizer-tuned.** The automated description optimizer was
unusable here — its harness runs a bare headless session from a resolved project root with no
browser/email tooling, so the skill never gets consulted and recall collapses to ~0 regardless of
wording. Its output was discarded, and the shipped description rests on reasoning rather than
measurement.

Full detail, including the traps that *failed* to discriminate and why, is in
[`docs/EVAL-NOTES.md`](docs/EVAL-NOTES.md).

## License

MIT — see [LICENSE](LICENSE).
