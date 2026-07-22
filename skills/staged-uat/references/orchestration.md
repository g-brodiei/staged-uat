# Orchestrating the run (Phase 3)

A UAT campaign is too big for one linear pass. Structure it as **staged runs**, each run a batch of
scenarios executed by **subagents** that return structured results you consolidate. This is what keeps 60+
scenarios, many simultaneous roles, and cross-role emails coherent.

## The bootstrap is sequential; scenarios fan out in parallel

The single most important structural decision: **bootstrap the account world top-down and sequentially**,
then **fan independent scenarios out in parallel**.

- **Sequential bootstrap** — each tier creates the next: Super Admin creates the tenant + invites the top
  tenant admin; the tenant admin invites managers/staff; staff open end-user accounts and invite end users.
  You cannot parallelize this — step N's output (an invite email, a new account) is step N+1's input. Run it
  as one ordered phase (or a `pipeline`/sequential workflow), capturing every created credential into the
  accounts ledger as you go.
- **Parallel fan-out** — once the world exists, most scenarios are independent. Assign each subagent its
  **own browser session(s)** and **own mailbox(es)** so they don't collide, and run them concurrently. Two
  scenarios that touch the *same* record must either be in the same agent or serialized; disjoint targets
  run freely.

## Structured returns (the contract)

Every scenario subagent returns the same JSON shape so the orchestrator can consolidate mechanically and
chain data between phases. Require this schema:

```json
{
  "status": "PASS | PARTIAL | FAIL",
  "summary": "one paragraph",
  "evidence": ["absolute/path/NN_desc.png", "..."],
  "accounts": [{"role": "...", "email": "...", "password": "...", "note": "..."}],
  "observations": ["exact-UI-wording findings, drift, bugs, UX notes"],
  "data": {"ids": "...", "links": "...", "anything later phases need": "..."}
}
```

- `PARTIAL` means the flow completed but an assertion deviated or a sub-step was blocked — this is the most
  common and most valuable status; it's where drift and bugs surface.
- `data` is how you pass a captured invite link / OTP-derived state / new record id to a later stage.
- `observations` must quote the **actual on-screen text**, because that text becomes both a finding and
  manual copy later.

## The run template

Copy `assets/uat-workflow-template.js` and fill it in. Its shape:

1. **Phase: bootstrap** — one sequential agent (or a short pipeline) that builds the account chain and
   returns the ledger. Everything downstream depends on it; abort the run if it fails.
2. **Phase: fan-out** — `parallel()` over independent scenarios, each an agent with its assigned session +
   mailbox, all returning the structured schema.
3. **Phase: verify** — a final agent that re-checks the end state matches expectations (roster, statuses,
   inventory).

Give each agent a **shared COMMON preamble** (read the guideline + tooling references, environment facts,
the safety rules, session/mailbox assignment) and a **specific task**. Pass the structured-return JSON
schema to force the shape.

## Give each agent exclusive sessions and mailboxes

Concurrency bugs in a UAT run look like "another agent was logged into my session" or "I read someone else's
email." Prevent them: in each agent's prompt, name the **exact** browser sessions and mailbox scenarios it
owns, and tell it to touch nothing else and never run `close-all`/`kill-all`. Sessions are named per role
(`-s=primary`, `-s=am1`, …); mailboxes are named per identity (`uat01-primary`, `uat01-receiver3`, …).

## Consolidate after every run

Don't wait until the end. After each run completes, read every agent's structured result and immediately:
- append numbered entries to the **findings log** (with severity tags),
- flip the **coverage matrix** rows to their status with an evidence pointer,
- update the **accounts ledger** to the true new state (mark deleted/locked/consumed accounts),
- redact any secret that leaked into an evidence file.

This keeps the artifacts trustworthy and means an interruption never loses more than one run's worth of
bookkeeping.

## Surviving interruptions

Long campaigns hit rate/spend limits and session expiry. Design for resumption:
- **Workflows resume from cache** — re-invoking the same script with the run id replays completed agents
  instantly and only re-runs the failed/edited step. Read the run journal before assuming a cached result
  was empty.
- **Individual agents resume from transcript** — you can send a stopped agent a continuation message and it
  picks up with full context.
- **Sessions expire (JWT TTL)** — every agent prompt must say "if redirected to login, re-login with the
  ledger credentials," so an expired session self-heals instead of failing the scenario.
- **Spend limits** mid-run are normal — note where it stopped, resume when lifted.

## Batching guidance

A sensible batching for a full platform (adapt to your role tiers):
- Run 0: tooling smoke (temp-email send/receive, each site reachable, one login, screenshot pipeline).
- Run 1: bootstrap the whole account chain (+ the scenarios that naturally fall out of creating it).
- Run 2: the back-office / staff scenarios + a per-role "difference sweep" (same pages, each role, diff the
  visible nav/controls).
- Run 3: the end-user main line (account, membership, content).
- Run 4: the asynchronous / worker-driven features (scheduled releases, jobs) — these need real wall-clock
  waits, so isolate them.
- Run 5: API-only surfaces (curl/same-origin), cross-role negative matrix, gap-fill.
- Run 6: author manuals from the accumulated evidence.

Keep each run's disjoint sessions in mind when parallelizing across runs that overlap in time.
