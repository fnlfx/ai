---
name: start
description: Your first FunnelFox result in two minutes. Pick a funnel, then get a conversion review, a copy rewrite in a new tone or a rebrand to your colors, with screenshots. Checks your sign-in first.
argument-hint: "[funnel name] [review | tone <tone> | rebrand <colors>]"
disable-model-invocation: true
allowed-tools: mcp__plugin_funnelfox_funnelfox__project_info mcp__plugin_funnelfox_funnelfox__project_list mcp__plugin_funnelfox_funnelfox__funnel_list mcp__plugin_funnelfox_funnelfox__funnel_get mcp__plugin_funnelfox_funnelfox__funnel_screenshot_get
---

# First win with FunnelFox

The user just installed the plugin. Get them from nothing to a visible result fast: few questions,
few tool calls, short messages. What they typed after the command: `$ARGUMENTS`. It may name a
funnel, an action, or both; skip every question it already answers.

## 1. Signed in?

The FunnelFox tools are the `mcp__plugin_funnelfox_funnelfox__*` ones. If they are missing, only an
`authenticate` tool is there, or the first call fails with an auth error (401, unauthorized,
needs authentication), stop and reply only:

> One step first: sign in to FunnelFox. Run `/mcp`, choose **plugin:funnelfox:funnelfox**, then
> **Authenticate**, and approve in the browser. Then run `/funnelfox:start` again.

Do not call `authenticate` yourself and do not show the raw error.

If a tool is refused for a missing permission later (`funnel_create` needs `funnel:edit`), say in
one line which permission is missing and how to add it: `/mcp` → **plugin:funnelfox:funnelfox** →
**Clear authentication**, then **Authenticate** again and tick it.

## 2. Pick a funnel

Call `project_list`. With several projects, pass each `project_id` to `funnel_list` (up to 5
projects; beyond that ask which project first). If the argument names a funnel, use `funnel_list`'s
`title` filter and go on if exactly one matches. Otherwise show at most 10 funnels as a numbered
list: title, and the project name when there are several projects. No ids. Ask which one.

No funnels at all: say so, and that they can create one in the FunnelFox dashboard, then stop.

## 3. Offer three actions

For the chosen funnel, offer exactly these (skip if the argument already chose one):

1. **Review it for conversion** (fastest, changes nothing): the top fixes, with screenshots.
2. **Rewrite the copy in a new tone**: ask the tone if they did not say it (playful, premium, calm…).
3. **Rebrand it to your colors**: ask for the colors (hex codes or a brand name) and, optionally, a font.

## 4. Do it

Hand the work to the `designer` subagent. Brief it with the funnel's id and title, the user's words
verbatim, and the lines below; the editing-funnels and designing-funnels skills tell it how.

- **Review:** "Design review only, do not save. Give the 3 fixes most likely to raise conversion,
  each with the screen's visible title, what is wrong and the concrete change. Name the ids of up
  to 4 screens that show them, for a screenshot." Take no other action.
- **Tone or rebrand:** first call `funnel_create` with `from_funnel_id` and the title
  `<original title> (<tone or brand> draft)`, so the user's funnel stays untouched. Brief the
  designer on the new funnel id, not the original.

If the funnel is in an older design format (`precondition_failed` about the scheme, from any tool),
stop and reply only this, with `[Title](editor_url)` from `funnel_get`:

> [Title](editor_url) uses an older design format. Open it in the FunnelFox editor, make any small
> edit and let it save (no publish needed), then run `/funnelfox:start` again.

## 5. Show the result

Call `funnel_screenshot_get` on the funnel you reported on (the copy, for tone or rebrand), with the
screen ids the designer named, or none for the first 4. Open the saved PNGs with Read before you
describe them. If the call fails or returns no usable image, do not retry or troubleshoot: say in
one line that screenshots aren't available right now, and still give the rest, so the user can
preview it in the editor. Then reply in under ~15 lines:

- What was found or changed, by visible screen titles and text.
- The screenshot file paths.
- Review: "Nothing changed yet. Want me to apply these fixes? I'll work on a copy and show you
  screenshots." Applying works like a tone rewrite: on a copy, then a screenshot.
- Tone or rebrand: "Saved as an unpublished copy. Your original funnel is untouched."
- A link to open it in the FunnelFox editor: `[Title](editor_url)`, with the `editor_url` from
  `funnel_create`, `funnel_design_get` or `funnel_get`. Never build the URL yourself.
- One line on what to try next: another of the three actions, or any change in plain words.
