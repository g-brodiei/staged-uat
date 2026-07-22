# Authoring role manuals from evidence (Phase 5)

The manuals are the second half of the deliverable: **one operation manual per role**, written for the real
end user of that role, built from the screenshot evidence the campaign already captured. These are how-to
guides, not test reports.

## Author them with parallel subagents, grouped by tier

One agent per manual (or per closely-related pair) runs concurrently. Each agent:
- reads the **test-base guideline** (role definitions, UI-name↔schema-name table), the **findings log**
  (to fold in honest caveats), the **coverage matrix** (scenario→folder map), and the **manifest** (which
  screenshots exist);
- writes `manuals/<role>/index.md`;
- does **not** touch a browser — this is pure synthesis from evidence.

## Rules that make the manuals trustworthy

1. **Use the real on-screen UI names, not spec aliases.** The glossary may say "総監/Editor/Viewer" while the
   screen says "主要管理人/共同編輯人/訪客", and tabs may be "影像典藏/療癒" not "時光展廊/靜心". Manuals must
   match what the user actually sees. Add a one-line aside where the same role is worded differently in
   different menus, so users aren't confused.
2. **Reference every screenshot by relative path and caption it.** From `manuals/<role>/index.md`, a figure
   is `![caption](../../artifacts/<run>/<folder>/<file>.png)`. Only use paths that exist in the manifest.
   **Verify every image link resolves** before finishing — a dead figure link is the most common defect.
3. **Fold findings into honest "known limitation" notes — never sell a bug as a feature.** If timeline
   reorder doesn't persist (#61) or there's no download button (#62), say so plainly as a gentle "目前版本"
   note. Where the spec implies a capability the UI lacks, write "目前版本未提供" rather than pretending it
   exists — and never teach an API workaround in an end-user manual.
4. **Operational tone:** numbered steps, what to click, what to expect. A short 注意事項 / caveat box per
   chapter where the evidence showed one.
5. **Match the product's register.** A patient- or bereavement-facing product warrants a warm, careful
   tone; a back-office tool warrants terse precision. Read the room.

## Structure per manual

```
# <Platform> — <Role> 操作手冊
<one-paragraph role description + login URL>
## 目錄
## 第 N 章：<task>   (numbered steps + figures + optional 注意事項 box)
...
## 常見問題 / 已知限制   (drawn from findings)
```

Chapters follow the role's real journey. Derive the skeleton from that role's scenario groups — e.g. for an
end-user "primary": accept invite & register → home/dashboard → member management → content authoring →
settings → (role-specific special features) → account management. For staff roles: activate → invite
subordinates → the daily operational tasks → governance → audit.

## Figure budget

Enough to illustrate each distinct step, not every screenshot. A flagship end-user manual might run ~20–30
figures; a simple role, ~8–12. Pick the most illustrative shot per step; drop redundant ones. Every figure
maps to a distinct action.

## Index and consistency

Write a `manuals/README.md` index: the role→manual table with login sites, a suggested reading path per
audience, and links back to the guideline / plan / evidence. Keep the total figure count consistent between
the index and any report that cites it. Cross-manual references (e.g. editor manual pointing to the primary
manual's time-capsule chapter) should be plain text unless the target file already exists, to avoid dead
links.

## Verify before declaring done

- Every `![...](...)` path resolves on disk (scan all manuals).
- No spec-alias role names leaked in where UI names belong.
- Each manual opens with role + login site and ends with a caveats/FAQ section.
- The index lists all manuals and the counts match.
