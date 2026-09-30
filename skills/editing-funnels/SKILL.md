---
name: editing-funnels
description: How to read and change a FunnelFox funnel design safely with the FunnelFox MCP tools. Use whenever the user asks to look at, change, fix, copy or restructure a FunnelFox funnel or any part of one (screens, paywalls, quiz questions and options, copy and text, prices and plans, buttons, navigation and branching, visibility rules, legal text, colours, fonts and rebrands, screenshots), or when funnel_design_get, funnel_design_update or funnel_screenshot_get is involved.
---

# Editing a FunnelFox funnel

A funnel design is one JSON document (up to several MB). You work on it as a local file with scripts;
the document never enters the conversation. Scripts live in this skill's base directory:
`scripts/index.mjs` (structure index), `scripts/upload.mjs` (validate, then upload) and
`kit/validate.cjs` (the editor's validator).

**In the main conversation, when the `designer` subagent does the funnel work:**

- Read `funnelfox/<funnel_id>/index.txt` first, if it exists, before you brief the designer or
  answer a structural question ("is there a paywall?", "what is the last screen?"). The plugin's
  hook writes it on every `funnel_design_get`: a screen-by-screen overview (screen types, plans,
  options, navigation), a few KB.
- Never read or query `design.json` yourself, not even to double-check a report. Trust the report
  or send the designer a follow-up.
- Brief it with the funnel id or name, the user's goal verbatim and facts you know. Add no
  requirements or constraints the user did not state.
<!-- s5:shots -->
- Visual goals (new funnel, redesign, rebrand): before you report, open the screenshots the
  designer saved under `funnelfox/<funnel_id>/shots/` yourself (Read), check them against the
  designing-funnels visual quality list, and send the designer a follow-up for anything that falls
  short. You are the second pair of eyes; do not relay "looks good" unseen.
<!-- /s5:shots -->
- Reply to the user as step 7 says: the funnel as `[Title](editor_url)`, screens and elements by
  their visible title or text, no ids or version numbers.

## Workflow

Aim for few turns: every tool call costs seconds. When several reads are independent, do them in
one `node -e` script that prints all of them.

1. **Find the funnel.** `funnel_list` resolves names to ids. `project_id` is the id from
   `project_list` (filter by name with `query`), never the project's alias.
2. **Get it.** Call `funnel_design_get`. If the funnelfox plugin's hook is active, a note follows the
   result with the local path (`funnelfox/<funnel_id>/design.json`), the version and the structure
   index. Use it: do not download again and do not re-run the index overview. Without that note, do
   it yourself:
   ```sh
   curl -fsS --create-dirs -o funnelfox/<funnel_id>/design.json "<download_url>"
   curl -fsS -o funnelfox/<funnel_id>/design.orig.json "<download_url>"   # untouched copy for diffs
   node <skill dir>/scripts/index.mjs funnelfox/<funnel_id>/design.json
   ```
   Keep a separate directory per funnel; never use shared fixed names like `/tmp/design.json`.
   Below, `design.json` means that file.
3. **Pick the screens** the goal touches from the index. Look at the screen you will edit with
   `node <skill dir>/scripts/index.mjs design.json --screen <screen id or #n>`. It shows element ids,
   types, text previews, `LEGAL` marks, nesting and navigation. Print raw JSON only for the one
   element you are about to change:
   `jq -c '.screens[] | select(.id=="S") | .elements[] | select(.id=="E")' design.json`.
   Which prop or style key controls something (colours, background image, padding, fonts, button
   look): `references/props.md`. Never query or read `kit/prototype.schema.json`.
4. **Edit only what the goal needs.** Change the file in place with a short `node` script
   (see below). Keep every id you did not create, keep `schemeVersion`, and leave other screens alone.
5. **Upload:** `node <skill dir>/scripts/upload.mjs design.json "<upload_url>"`. It validates the file
   with the kit and uploads it only if it is valid. It prints `200` on success; otherwise it prints
   the validation errors or the HTTP error, uploads nothing, and exits non-zero. Fix and run it
   again. There is no separate validate step.
   <!-- s5:shots -->
   **Visual goals only** (redesign, rebrand, layout, "make it look like…"): look before you save.
   Call `funnel_screenshot_get` with `funnel_id` and the `upload_id`, and `screen_ids` for 2–4
   screens that show the change (no ids = the first 4). The plugin's hook saves the PNGs under
   `funnelfox/<funnel_id>/shots/` and lists the paths; open them with Read (without the hook, curl
   each `url`). Check them against the designing-funnels quality list, fix, upload again to the same
   `upload_url`, and shoot again if the change was large. The render is static: charts and anything
   drawn by scripts (custom HTML widgets, animations, Lottie) are missing (the tool's `note` says
   what); do not "fix" those. Static inline SVG and HTML do paint.
   <!-- /s5:shots -->
6. **Save:** `funnel_design_update` with `funnel_id`, `version` and `upload_id` from step 2. The
   server validates again. Send `dry_run: true` first only for bulk or
   structural edits (adding, removing or moving screens, rewiring navigation across screens, edits
   on many screens). A single-element change goes straight to the real save.
7. **Report** which screens and elements changed, anything you repaired that was broken before, and
   that the save is a new **unpublished** version. Nothing is live until someone publishes it in the
   FunnelFox editor. Name the funnel as `[Title](editor_url)` when the tool gave an editor_url and
   describe screens and elements by their visible title or text (the Intro screen's "Get started"
   button). No funnel, screen, element or upload ids or version numbers in anything meant for the
   user; ids belong only in tool calls and briefs between agents.
   <!-- s5:shots -->
   Say whether you looked at screenshots.
   <!-- /s5:shots -->

### Editing recipes

```sh
node -e '
const fs = require("fs"), f = process.argv[1], d = JSON.parse(fs.readFileSync(f, "utf8"));
const s = d.screens.find((s) => s.id === "S");
s.elements.find((e) => e.id === "E").props.content = "New heading";
fs.writeFileSync(f, JSON.stringify(d));' funnelfox/<funnel_id>/design.json
```

Find things with `jq` (read-only), for example every button text on a screen:
`jq -r '.screens[] | select(.id=="S") | .elements[] | select(.type=="Button") | "\(.id) \(.props.text)"' design.json`.

**Bulk edits** (every button, all copy, many screens): write one script that loops over
`d.screens` and changes exactly the targeted fields. Never hand-edit dozens of screens through the
conversation. Verify the result with one `node -e` check script (or `--screen` on a sample screen) and
`upload.mjs`, not by reading the file.

## Hard rules

- Run one command per Bash call, without `;`, `&&` or `|| echo` chains: permission rules usually
  allow single `curl`, `jq` and `node` commands only. Read exit codes from the tool result.
- Upload only with `scripts/upload.mjs`: it validates, then PUTs. A raw `curl` PUT skips the local
  check, so errors surface only at `funnel_design_update`.
- Never `cat` or Read the design, print a whole screen, or put design JSON in a tool argument. Image
  urls can be multi-megabyte inline data.
- Order lives in `screens[]`. `tree` must list the same screen ids in the same order; groups may wrap
  them. When you add, move or remove a screen, change both. See `references/structure.md`.
- Ids are opaque. Never rename existing ids. New ids must be unique: screen, element, option, list
  item and review ids.
- Elements marked `__llm.legal` (shown as `LEGAL`) carry required disclosures. Never delete them or
  drop their disclosures as a side effect, and keep their prices in sync with the plans. See
  `references/content.md`.
<!-- s5:theme -->
- Funnel-wide look (colours, fonts, corner radius) goes in `localThemeOverrides`. Never change
  `theme` or `themeId`: the upload is refused. Read `references/theme.md` first.
<!-- /s5:theme -->
<!-- s5:shots -->
- Never say how something looks without a screenshot of it taken in this task.
<!-- /s5:shots -->
- Do not invent URLs, emails or store links. Use ones already in the funnel or given by the user.
- Upload URLs expire after 15 minutes. If yours expired, call `funnel_design_get` again for fresh
  ones. The hook keeps your unsaved edits when the version has not changed.
- Errors: see `references/errors.md`. In short:
  - `validation_failed`: read `details.errors`, fix minimally (including damage that predates your
    edit), PUT again and retry with the same `upload_id`, then tell the user what you repaired.
  - `precondition_failed` for a stale version: get the design again, re-apply your edit to the
    fresh file, and save.
  - `precondition_failed` about the scheme: do not retry. Tell the user; an old funnel is upgraded
    by opening it once in the FunnelFox editor.

## References (read the one the task needs)

- `references/structure.md`: screens, elements, hierarchy, tree and ids; adding, duplicating,
  moving and deleting screens and elements; header and layout.
- `references/logic.md`: actions, navigation, branching, conditional visibility, `{{variables}}`.
- `references/content.md`: text and rich text, plans and prices, legal copy, element notes.
<!-- s5:theme -->
- `references/theme.md`: rebrand, colours and fonts funnel-wide: `localThemeOverrides`, the key
  set to change, font leaves, what wins over the theme.
<!-- /s5:theme -->
- `references/props.md`: every element type's props and style keys, and screen-level styles
  (background colour and image, padding, header).
- `references/errors.md`: what the validator and the server check, and how to handle each error.
