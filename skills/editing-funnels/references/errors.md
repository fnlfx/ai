# Validation and save errors

## What checks what

- **`kit/validate.cjs`** (local; `scripts/upload.mjs` runs it before every upload) runs the
  editor's schema plus referential checks:
  - `tree` and `screens[]` hold the same ids in the same order
  - hierarchy and elements agree
  - element ids are unique within a screen
  - every navigate target exists
  It prints `VALID` with exit 0, or up to 40 errors with exit 1.
- **The server** (on `funnel_design_update`, also with `dry_run`) runs the same validator first.
  Only when that passes does it run its content checks, which the kit does not have:
  - legal copy: no legal element dropped from a screen that kept its plans, and every disclosure
    quotes a price that screen sells. These look at the **whole design**, not only what you
    changed, and compare `$` amounts only.
  - no id newly duplicated anywhere in the document (elements, options, items, reviews)
  - on the elements you changed: visibility predicates fit their operands, `{{placeholders}}`
    resolve, rich text uses only allowed markup

  <!-- s5:theme -->
  - the theme: `theme` and `themeId` exactly as `funnel_design_get` delivered them (`upload.mjs`
    checks this locally against `design.orig.json`), and `localThemeOverrides` only with known
    groups and keys in the right leaf shapes, no empty groups. See `theme.md`.
  <!-- /s5:theme -->

  So errors can come in two rounds: fix the schema errors, and the next save may report content
  errors. A file can pass locally and still get `validation_failed`, and an error on a screen you
  never touched (typically a stale price in a disclosure) can predate your edit.
- **Kit on another scheme:** if the design's `schemeVersion` differs from the scheme the plugin's
  kit knows (older or newer), the hook and `upload.mjs` skip local validation and say so. If the
  design is newer, tell the user to update the funnelfox plugin. The server still validates.

## validation_failed

Nothing was saved. `details.errors` lists each problem: schema errors with a path such as
`screens[5].elements[1].props.action.payload.value`, content errors with the screen or element id
(`screen "0LKgdIxV": …`).

1. Map a path to ids: `jq -r '.screens[5].id, .screens[5].elements[1].id' design.json`. Then
   inspect with `index.mjs --screen`.
2. Fix it minimally in `design.json`.
3. Upload again (`upload.mjs`) to the **same** `upload_url` and retry `funnel_design_update` with the **same** `upload_id`.
   If the URL expired, call `funnel_design_get` again and use the new values.

**Damage that predates your edit.** Older funnels often carry their own errors, such as a
navigate target pointing at a deleted screen, or an outdated style shape. The save is refused
until they are fixed too. To check, run `node <skill dir>/kit/validate.cjs design.orig.json`; for
a content error, look at the same screen in `design.orig.json`. Repair them minimally: re-point a
dangling navigate to `null` (next screen) or to the screen the user obviously meant, correct a
stale price in a disclosure, or drop the bad value. Do not restructure. Then tell the user exactly what you repaired and why.

<!-- s5:theme -->
**`theme: the theme snapshot was changed` / `themeId: …`.** Put the old value back (copy
`theme` / `themeId` from `design.orig.json`) and make the change in `localThemeOverrides`
instead (`theme.md`). If the project theme itself changed since your read, get the design again.
<!-- /s5:theme -->

## precondition_failed

- **Stale version** (the funnel was saved by someone else after your read): call
  `funnel_design_get` again. With the plugin's hook, your edited file is moved to
  `design.edited.json`, the fresh version lands in `design.json`, and the note lists the screens you
  had changed. Re-apply your edit to the fresh `design.json` (re-run your script), upload,
  and save with the new version and upload_id. Never upload your old file over the new version.
- **Scheme too old or too new** ("open it in the FunnelFox editor", "newer than the editor this
  server knows"): do not retry and do not edit `schemeVersion`. Tell the user. An old funnel is
  upgraded by opening it once in the FunnelFox editor. A too-new one needs the server to catch up.

## Other failures

- The upload returns a non-200 code, or the save says nothing was uploaded for `upload_id`: the URL
  expired (after 15 minutes) or the PUT failed. Call `funnel_design_get` again and PUT to the new
  `upload_url`.
- `too_large`: the design (together with its stored version) is over the server's limit, so it
  cannot be saved through MCP. Nothing was saved; do not retry. Tell the user.
- `unavailable`: a FunnelFox service (storage, migration or the validator) did not answer, or is
  not configured. Nothing was saved. Retry once shortly; if it fails again, tell the user.
- The sign-in is read-only (no `upload_url` in the result): you cannot save. Say so, and describe the
  change instead. To save, the user signs in again and grants `funnel:edit`: `/mcp` → funnelfox →
  Clear authentication, then Authenticate.
- Permission errors: call `project_info` for the sign-in's permissions and project count, and
  `project_list` (filter by name with `query`) for the projects it reaches.

## After a successful save

The result gives the new version. It is **not live**: someone must publish it in the FunnelFox
editor. Say that in your report. To edit again, use the new version. Calling
`funnel_design_get` again is the simplest way.
