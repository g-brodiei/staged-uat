// Staged-UAT orchestration skeleton — copy, fill the <PLACEHOLDERS>, run via the Workflow tool.
// Pattern: sequential bootstrap (accounts depend on each other) -> parallel scenario fan-out
// (disjoint sessions/mailboxes) -> verify. Every agent returns the RESULT schema so the
// orchestrator consolidates mechanically. See references/orchestration.md + references/tooling.md.

export const meta = {
  name: '<run-id>-uat',              // e.g. uat01-bootstrap
  description: '<what this run does>',
  phases: [
    { title: 'Bootstrap', detail: 'create the account chain top-down (sequential)' },
    { title: 'Scenarios', detail: 'independent scenarios in parallel (own session + mailbox each)' },
    { title: 'Verify',    detail: 'end-state conformance' },
  ],
}

const ROOT = '<abs path>/artifacts/<run-id>'   // evidence root; agents mkdir -p their flow folders

// Shared preamble every agent gets. Keep the safety rules verbatim — they are load-bearing.
const COMMON = `You are running part of a UAT campaign against ONLINE STAGING (never local).
FIRST read: the test-base guideline (<path>), the tooling reference (browser + temp-email idioms),
and the accounts ledger (<ROOT>/accounts.md) if it exists.

Environment: <sites + which role logs in where>. Temp-email: any <handle>.<scenario>@mailmatter.dev
receives instantly; capture since=$(date +%s%3N) BEFORE triggering a send, then wait_for_email(scenario,
since, 55), retry once on null; links/OTP come from get_message.

SAFETY (non-negotiable): shared env — prefix created data with UAT, never touch foreign tenants/accounts,
round-trip every state change. NEVER state-save session/cookies to disk; on JWT expiry re-login from the
ledger. NEVER close-all/kill-all. Only use the browser sessions + mailbox scenarios named in YOUR task.
Classify API probes by content-type not status (200+text/html from the CDN = masked denial). Redact any
secret that lands in an evidence file.

Evidence: screenshots to <ROOT>/<flow>/NN_<desc>.png (mkdir -p first). Snapshot -> act by ref -> re-snapshot;
sleep 2 on slow loads. Return the structured result; observations must quote exact on-screen wording.`

const RESULT = {
  type: 'object',
  required: ['status', 'summary', 'evidence', 'accounts', 'observations', 'data'],
  properties: {
    status: { type: 'string', enum: ['PASS', 'PARTIAL', 'FAIL'] },
    summary: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },
    accounts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['role', 'email'],
        properties: {
          role: { type: 'string' }, email: { type: 'string' },
          password: { type: 'string' }, note: { type: 'string' },
        },
      },
    },
    observations: { type: 'array', items: { type: 'string' } },
    data: { type: 'object' },
  },
}

// ---------- Phase 1: Bootstrap (SEQUENTIAL — each tier creates the next) ----------
phase('Bootstrap')
const bootstrap = await agent(`${COMMON}

YOUR TASK — build the account chain top-down. Evidence folder(s): <ROOT>/BOOTSTRAP.
1. <top tier: create tenant/org + invite the top admin; fetch activation link from mailbox; activate>.
2. <that admin invites the next tier; activate each from its mailbox>.
3. <staff open end-user accounts / send invites as needed for downstream scenarios>.
Record EVERY created credential in accounts[]. Return links/ids the scenario phase needs in data.`,
  { label: 'bootstrap', phase: 'Bootstrap', schema: RESULT })

if (!bootstrap || bootstrap.status === 'FAIL') return { abortedAt: 'Bootstrap', bootstrap }

// ---------- Phase 2: Scenarios (PARALLEL — disjoint sessions/mailboxes) ----------
phase('Scenarios')
const SCENARIOS = [
  { label: 'A-staff-governance', session: 'tadmin', prompt: `<flows + assertions>` },
  { label: 'C-consumer-main',    session: 'primary', prompt: `<flows + assertions>` },
  { label: 'X-negative-matrix',  session: 'am1',     prompt: `<permission probes; classify by content-type>` },
  // ... one entry per independent scenario group; give each its OWN session + mailbox
]

const results = await parallel(
  SCENARIOS.map(s => () => agent(`${COMMON}

YOUR SESSIONS (exclusive): "${s.session}". Do NOT touch other sessions.
YOUR TASK — ${s.label}:
${s.prompt}`, { label: s.label, phase: 'Scenarios', schema: RESULT })),
)

// ---------- Phase 3: Verify end-state ----------
phase('Verify')
const verify = await agent(`${COMMON}

YOUR TASK — confirm the world matches expectations after this run (rosters, statuses, inventory,
any deliberate config overrides). Flag every deviation with exact wording. Evidence: <ROOT>/VERIFY.`,
  { label: 'verify', phase: 'Verify', schema: RESULT })

return { bootstrap, results: results.filter(Boolean), verify }

// After the run: read every structured result and consolidate into findings.md / coverage.md /
// accounts.md the SAME turn (references/artifacts.md). Resume from cache (same run id) if interrupted.
