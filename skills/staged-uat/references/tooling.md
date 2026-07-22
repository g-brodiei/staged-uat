# Tooling idioms and safety mechanics (Phase 3)

Concrete conventions for the three tool families a run uses. Names below assume the **mailmatter MCP** and
the **playwright-cli** skill; if the environment provides a different temp-email service or a Playwright MCP,
translate the idioms — the *patterns* are what matter.

## Prerequisites — verify (and if needed, set up) before the run

These tools are **external services / installs with auth prerequisites**. Do this as a gate in Phase 0: if a
tool isn't ready, tell the user exactly what to do and stop — don't attempt the campaign without it.

- **Temp-email (mailmatter MCP).** Requires a mailmatter account with an **API key created**, and the
  **MCP server configured** in the client (so the `mcp__mailmatter__*` tools appear). Smoke-test by deriving
  an address or listing inboxes. If the tools aren't present, ask the user to create the API key and add the
  mailmatter MCP server before proceeding.
- **Browser driver (playwright-cli skill).** Requires the CLI installed and the skill installed into the
  project. If `playwright-cli --version` (or `npx --no-install playwright-cli --version`) fails: install per
  `github.com/microsoft/playwright-cli`, then run **`playwright-cli install --skills`** in the project to
  install the skill locally. Smoke-test by opening one page. (A Playwright MCP is an acceptable substitute —
  translate the session/screenshot idioms below to its tool surface.)
- **Subagent / Workflow harness.** This skill orchestrates with subagents; confirm they're available.

Do NOT hardcode or invent an API key/credential to "make it work" — surface the missing setup to the user.

## Temporary email (mailmatter MCP)

Temp email is how you receive invites, OTP codes, and release notifications without real inboxes.

- **One namespace (handle), one scenario per identity.** Any `<handle>.<scenario>@mailmatter.dev` address
  receives mail instantly with no setup. Give each test identity its own scenario label
  (`uat01-tadmin`, `uat01-primary`, `uat01-receiver3`) so inboxes never cross.
- **Capture the watermark BEFORE you trigger the send.** The idiom is: record `since = now` (unix ms), *then*
  do the UI action that sends the email, *then* `wait_for_email(scenario, since, timeout)`. If you grab
  `since` after triggering, you can miss the message. `wait_for_email` returning null is a normal timeout —
  retry once; a persistent null is itself a finding (email never sent).
- **Read via the message's extracted links.** `get_message` returns the text body plus verbatim extracted
  hrefs — take invite/activation/reset/letter links straight from there and hand them to the browser. OTP
  codes are in the body (6-digit is typical); regex them out.
- **Disambiguate same-mailbox sends by subject + timestamp** when one identity receives two emails (e.g. two
  invites). Clean up per-scenario with `delete_mailbox` when done.

## Browser automation (playwright-cli)

- **One named session per role**, resident in the daemon: `playwright-cli -s=<role> open <url>`, then
  `goto`. Sessions are cookie-isolated, so multiple roles can be logged in at once — this is what lets a
  primary invite a viewer who then accepts in a second session. `list` shows live sessions.
- **NEVER `state-save` auth/session JSON to disk.** (See safety, below.) Sessions persist in the daemon
  across turns; on JWT expiry, just log in again from the ledger. Never `close-all`/`kill-all` a shared set
  of sessions other agents may be using.
- **Act by snapshot refs.** `snapshot` first, then `click e15` / `fill e19 "…"`. After navigation or a slow
  SPA load, `sleep 2` then re-`snapshot` (pages often flash a loading state first).
- **Screenshots are the product.** `screenshot --filename=<abs path>`. Name them `NN_<short-desc>.png` with a
  two-digit step index, one folder per flow (`artifacts/<run>/<flow-id>/NN_desc.png`). Consistent naming is
  what makes the manifest and the manuals possible.
- **Viewports:** desktop (`resize 1440 900`) for back-offices; for a mobile-first consumer app, capture a
  mobile pass too (`resize 390 844`) since the manuals need it.
- **File uploads:** trigger the file chooser, then `upload <abs path>`. Generate small fixture media
  (a few-KB png via PIL, a 3s mp4/mp3 via ffmpeg, an oversized image to trip size warnings) in scratch.

## API-only surfaces and the CDN-masking classifier

Some behaviors have no UI (key issuance, quota override, venue endpoints) or you want to prove server-side
enforcement. Probe them **same-origin from a logged-in session** so the auth cookie attaches:

```
playwright-cli -s=<sess> eval "const r=await fetch('<path>',{method:'<M>',headers:{'Content-Type':'application/json'},body:<json|null>}); const t=await r.text(); return r.status+' | '+r.headers.get('content-type')+' | '+t.slice(0,200)"
```

**Classify the response by content-type, not status** — a fronting CDN often rewrites origin 403/404 into
`200 + text/html` (the SPA index) and may cache it:

| Observed | Means |
|---|---|
| real JSON 2xx with expected data | ALLOWED |
| real JSON 4xx (401/403/404/409/507) | DENIED / correctly rejected |
| `200` + `text/html` (SPA index; header like `x-cache: Error from cloudfront`) | DENIED but MASKED — treat as denied, note the masking |

To distinguish a **real** denial from a **stale cached** error: cache-bust the URL (`?cb=<n>`) and contrast
with a resource the caller genuinely owns (which should return true JSON). The masking is worth logging as
its own infra finding — it degrades UX (users see a generic "load failed" instead of a real message) and it
can make a security probe's masked 403 look like a breach if you only read the status.

For pure backend endpoints (venue API with an API-key header, no cookies), plain `curl -sS -i` is fine —
save the exact command + full headers+body to a `.txt` evidence file.

## Safety mechanics (non-negotiable)

- **Shared environment:** prefix all created data (`UAT…`); never open or mutate foreign tenants/accounts.
  Round-trip every state change. For irreversible scenarios (hard-delete, account deletion), use a dedicated
  throwaway target created for that purpose.
- **No credential persistence:** don't write cookies/tokens/session state to files in the repo. Keep a
  human-readable **accounts ledger** (emails + passwords + which mailbox) as the re-login source instead.
- **Redact leaked secrets:** if an agent writes a raw API key/token into an evidence file, `sed` it to a
  redaction marker and revoke the key. Add a `.gitignore` covering any `.env` and any auth-state dir.
- **Confirm before destructive, outward-facing actions** you can't undo; a shared staging env means someone
  else may depend on what you're about to delete.
