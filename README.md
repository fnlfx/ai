# FunnelFox for Claude Code

**Edit your web funnels at the speed of a prompt.**

Tell Claude Code what to change in your [FunnelFox](https://funnelfox.com) funnel: a headline, a
quiz question, a plan, a whole rebrand. Claude reads the funnel, makes the change, checks it with
the FunnelFox editor's own validator and saves it as an unpublished draft for you to review.

<!-- hero: before/after screenshot -->

## Get started in 2 minutes

1. Install the plugin in Claude Code:

   ```
   /plugin marketplace add fnlfx/ai
   /plugin install funnelfox
   ```

2. Sign in: run `/mcp`, choose `plugin:funnelfox:funnelfox`, then **Authenticate**. Your browser
   opens FunnelFox; pick the permissions and select **Approve**.
3. Run `/funnelfox:start`. Pick a funnel and get a conversion review, a copy rewrite in a new tone
   or a rebrand to your colors, with screenshots of the result.

## What you can ask

Name the funnel and say what you want, the way you'd brief a colleague:

- "In the *Sleep quiz* funnel, change the welcome headline to 'Sleep better in 7 days'."
- "Add a question after the age screen asking how many hours they sleep, with four options."
- "Review the paywall of *Keto 30* and tell me what would hurt conversion. Don't change anything yet."
- "Make a copy of *Keto 30* in our brand colors, #0B1F3A and #FF6B35, with the Inter font."
- "Rewrite the copy of *Sleep quiz* in a calmer, more premium tone."
- "Make every Continue button purple and show me screenshots."
- "Which plans and prices does the *Keto 30* paywall offer?"

Claude tells you which screens changed, by their titles, and links the funnel in the FunnelFox
editor. Preview it there and publish when you're happy.

## How it keeps you safe

- **Nothing goes live on its own.** Every save is a new unpublished version. Your live funnel
  changes only when you publish in the FunnelFox editor. `/funnelfox:start` goes further: tone
  rewrites and rebrands happen on a copy, so your original stays untouched.
- **Checked twice.** Claude validates every design locally with the editor's validator before
  uploading, and the FunnelFox server validates it again, so an invalid design is never saved.
- **You pick the permissions.** At sign-in you choose what Claude may see and do. A sign-in with
  only `funnel:view` can read but never save.

## Reference

### What's in the plugin

| Part | What it does |
|---|---|
| FunnelFox MCP server (`.mcp.json`) | Connects Claude Code to `https://mcp.funnelfox.com/mcp` with your FunnelFox sign-in. Lists funnels, reads and saves designs, renders screenshots, copies funnels; with the matching permissions, reads products, customer profiles, sessions and transactions. |
| `/funnelfox:start` | A guided first run: checks your sign-in, lists your funnels, and runs a review, tone rewrite or rebrand on the one you pick. |
| `editing-funnels` skill | How to change a design safely: work on a local copy, touch only what the goal needs, keep ids, navigation, prices and legal copy intact, validate before saving. Bundles a structure-index script and the editor's validator. |
| `designing-funnels` skill | What makes a funnel convert without hurting trust: screen order, quiz questions, paywalls, honest urgency and pricing. Loads for "improve / design / review this funnel" requests, not for plain edits. |
| `designer` subagent (`funnelfox:designer`) | Does the funnel work in its own context, so large designs stay out of your conversation, and returns a short report of what changed. Uses the same model as your session. |
| Download hooks | After `funnel_design_get`, save the design to `funnelfox/<funnel_id>/design.json` and its structure overview to `index.txt`. After `funnel_screenshot_get`, save the screen images to `funnelfox/<funnel_id>/shots/`. |

### Install and sign-in details

From a shell, install with `claude plugin marketplace add fnlfx/ai` and
`claude plugin install funnelfox@funnelfox`. To pin a version, add the marketplace at a tag:
`claude plugin marketplace add fnlfx/ai#<tag>`.

Sign in from a shell with `claude mcp login plugin:funnelfox:funnelfox`. In the browser, log in to
FunnelFox if you aren't already and pick the organization if you're in more than one. Claude Code
keeps the credential in your system's secure credential store (the macOS Keychain on a Mac), and
`/mcp` shows the server as connected.

### Permissions

Grant only what you need. For editing funnels, `funnel:view` plus `funnel:edit` is enough.

| Permission | Tools | Allows |
|---|---|---|
| (always) | `project_info`, `project_list` | `project_info`: the organization, permissions and how many projects the sign-in reaches. `project_list`: find projects by name (paged). |
| `funnel:view` | `funnel_list`, `funnel_get`, `funnel_design_get`, `funnel_screenshot_get`, `template_list`, `project_context_get` | List funnels, read their metadata, locales and designs, render screens to images, list FunnelFox templates, read the project context (product, audience, brand, voice). |
| `funnel:edit` | `funnel_design_update`, `funnel_create`, `locale_create` | Save a design as a new unpublished version; create a new draft funnel from a template or as a copy of another; add a locale to a funnel. These are the only tools that write. |
| `product:view` | `product_list`, `product_get` | Read products and their price lists. Read-only. |
| `customer:view` | `profile_list`, `profile_get`, `session_list`, `transaction_list` | Read end-user profiles (email, identifiers, country, the funnel they came from), their funnel sessions, and purchases, renewals and refunds. Read-only. |
| `analytics:view` | `funnel_list`, `transaction_list` | List funnels and read transactions. Read-only. |
| `experiment:view` | `funnel_list` | List funnels. Read-only. |

The sign-in never does more than you can do yourself in FunnelFox. It shows up in your project's
**Settings → API keys → MCP tokens**; revoke it there at any time. To sign out on your machine, use
**Clear authentication** in `/mcp` (or `claude mcp logout plugin:funnelfox:funnelfox`).

### What runs on your machine

So you can review it before installing:

- **Network**: the MCP connection goes to `https://mcp.funnelfox.com/mcp`, with the credential Claude Code stores. Designs and screenshots are downloaded from, and
  designs uploaded to, short-lived signed URLs that the FunnelFox server returns in its tool
  results (FunnelFox file storage). The plugin sends data nowhere else and collects no telemetry.
- **Files**: the download hooks write under `funnelfox/` in your project directory:
  - `funnelfox/.gitignore` containing `*`, written once when the hook creates `funnelfox/`, so git
    ignores everything in it;
  - per funnel, in `funnelfox/<funnel_id>/`: `design.json` (the copy Claude edits),
    `design.orig.json` (the untouched download, for diffs), `index.txt` (the structure overview),
    and `design.edited.json` or `design.edited-<time>.json` when the funnel changed on the server
    while you had unsaved edits (your edits are moved there, never overwritten);
  - screenshots, as `funnelfox/<funnel_id>/shots/<version or upload>/<screen_id>.png`.

  Delete the folder whenever you like.
- **Hooks**: two Node.js scripts, `hooks/design-get.mjs` and `hooks/screenshot-get.mjs`, run after
  `funnel_design_get` and `funnel_screenshot_get` return. They fail open: if anything goes wrong
  they step aside and Claude downloads the files itself.
- **Scripts**: `skills/editing-funnels/scripts/index.mjs` (structure index),
  `skills/editing-funnels/scripts/upload.mjs` (validates the design, then uploads it to the
  signed URL) and `skills/editing-funnels/kit/validate.cjs` (the FunnelFox editor's validator,
  generated from the editor's source) run locally with `node` on the design file.

### Privacy

The plugin runs locally and talks only to FunnelFox. Whatever the FunnelFox tools return enters
the model's context and goes to the model provider you use with Claude Code, like any other tool
result: funnel designs and, if you granted it, product data, customer profiles (including email
addresses), sessions and transactions. Leave `product:view` and `customer:view` unchecked at
sign-in if Claude should not see that data.

What FunnelFox does with your data is covered by the
[FunnelFox privacy policy](https://funnelfox.com/privacy-policy/). Revoke the sign-in in project
**Settings → API keys → MCP tokens** to cut off access immediately.

### Other MCP clients

The FunnelFox MCP server works without this plugin in any client that supports remote
(streamable HTTP) MCP servers with OAuth sign-in. The server sends its core editing rules to every
client, so the essentials apply everywhere; the skills, subagent, hooks and local validation are
Claude Code plugin features and are not available in other clients.

Add the server URL `https://mcp.funnelfox.com/mcp` in the client; it opens the same browser sign-in
on first use. In Claude Code without the plugin:

```sh
claude mcp add --transport http funnelfox https://mcp.funnelfox.com/mcp
```

then `/mcp` → `funnelfox` → **Authenticate**.

### Troubleshooting

- **`/mcp` shows the server as needing authentication, or tools answer 401**: you haven't signed
  in yet, or the sign-in was revoked. In `/mcp`, select `plugin:funnelfox:funnelfox` and choose
  **Authenticate**.
- **Saves are refused with a permission error**: the sign-in lacks `funnel:edit`. In `/mcp`, choose
  **Clear authentication**, then **Authenticate** again and grant `funnel:edit`.
- **A funnel is in an older design format**: open it once in the FunnelFox editor. That upgrades
  it; no edit or publish needed.
- **The hooks do nothing**: check that `node --version` prints 20 or later in the shell Claude Code
  uses.

### Requirements

- Claude Code (tested with 2.1.284).
- Node.js 20 or later on your `PATH`. The hooks and bundled scripts run with `node`.
- A FunnelFox account with access to the project you want to edit.

### License

Proprietary: © Adapty / FunnelFox, all rights reserved. You may install and use the plugin only
together with a FunnelFox account; redistribution and modification are not permitted. See
[`LICENSE`](LICENSE).
