# Document structure

## Top level

- `schemeVersion`: the format version, such as `"v53"`. Never change it.
- `screens`: the screens **in funnel order**. Each screen holds its order, title and content.
- `tree`: the editor's screen list. It holds `{ "id", "type": "Screen", "title" }` refs, optionally
  wrapped in `{ "id", "type": "Group", "title", "children": [screen refs] }`. Groups are only labels
  in the editor sidebar.
<!-- s5:theme -->
- `theme`, `themeId`, `fonts`: never change them. The funnel-wide look (colours, fonts) goes in
  `localThemeOverrides`; see `theme.md`.
<!-- /s5:theme -->
- `progressBar`, `meta`: funnel-wide settings. Leave them alone unless the goal is about them.

### screens[] and tree must agree

The flattened `tree` must list exactly the screen ids of `screens[]`, in the same order. The editor
treats `screens[]` as the source of truth. On any mismatch it rebuilds `tree` flat from `screens[]`,
and every group is lost. The validator rejects a mismatch. So:

- **Move a screen:** move it in `screens[]` and move its ref in `tree` to the same position, inside
  the group it belongs to.
- **Add a screen:** insert it into `screens[]` and insert a ref `{ "id", "type": "Screen", "title" }`
  at the same position in `tree`.
- **Remove a screen:** remove it from both, then fix everything that pointed at it (see below).

The editor does not display the title in a tree ref; it shows `screens[].title`. When you rename a
screen, change `screens[].title` and keep the tree ref's title in step. Some older documents carry
extra fields on tree refs, such as a `children` copy of elements. Ignore them and never edit them.

## Screen

`{ id, type: "Screen", title, customId?, props, styles, elements, hierarchy }`

- `props.type` is the screen's role, for example `default`, `auth`, `paywall`, `checkout`,
  `upsell` or `finish`. Keep it unless asked.
- `props.header`: the header chrome above the content: `back`, `progressBar`, `counter`, `title`
  and a logo `image`. "Above the progress bar" means these props. Never rebuild header chrome such
  as back arrows, progress bars or step counters out of elements.
- `props.autoNavigation`: moves on without a tap. Leave it as it is unless asked.
- `elements`: a **flat** array of every element on the screen.
- `hierarchy`: the render tree, `{ "id": "__root__", "children": [{ "id": "<element id>",
  "children": [...] }] }`. It sets order and nesting, for example Plans containing Plan elements or
  a Container's children. Every element appears in the hierarchy exactly once, and the hierarchy
  names no unknown ids.

## Element

`{ id, type, props, styles, customId?, visibility?, __llm? }`

Types include Text, Image, Button, Options, Input, Container, List, Plans / Plan, Checkout,
Totals, Timer, Popup, Chart, Processing, Carousel, Reviews, Raw (custom HTML) and CookieConsent.
For the exact props and style keys of a type, see `references/props.md`. Never read or query
`kit/prototype.schema.json`.

`customId` is the readable name of an Input or Options element, and it is what `{{variables}}`
and analytics use.

## Layout

A screen renders top to bottom as the header, then the content flow in hierarchy order (it scrolls
when tall), then the **attached stack**. Every top-level element whose
`styles.container.position` is `{ "value": "fixed" }` is pinned to the bottom of the viewport, in
document order. A fixed element nested inside a Container stays in the flow. Primary CTAs and
footers are usually fixed. For an attached button set only `position` = `{ "value": "fixed" }` and
its gap from the screen edge with `styles.container.spacingBottom` (the editor's own attached button
uses 32 px); never set `top` or `bottom` on it (they are for `sticky`, and the editor and the live
page treat them differently). Screens render at about 375×700. Omitting spacing inherits the theme
default; when you set a gap, use 4/8/12/16/24/32/48 px.

## Ids

Ids are opaque strings. Match the style of the funnel's existing ids, such as 8 random
alphanumerics. Never rename an existing id: navigation, visibility, branching and analytics refer to
them. Every new screen, element, option, list item and review id must be unique across the whole
document. The server rejects a new duplicate.

## Recipes

**Edit one element.** Change only the props the goal names. Keep the `styles` and the other props.

**Delete an element.** Remove it from `elements` and remove its node from `hierarchy`. If it has
children, such as a Container, delete or re-parent them too. Then remove anything that referred
to it: `visibility` conditions on its input, `{{its customId}}` placeholders, and branching whose
`inputId` is this element.

**Add an element.** The safest way is to copy a similar element from the same funnel, give it a
fresh id (and fresh option or item ids), and insert its node into `hierarchy` at the right spot.

**Duplicate a screen** (the usual way to add one). Deep-copy a similar screen, then:
1. Give the screen, every element, and every option, item and review a new unique id.
2. Rewrite every internal reference to the old ids: hierarchy nodes, visibility conditions,
   `switch_input_value.inputId`, branching keys (option ids), and `{{…}}` placeholders that named
   the old ids.
3. Give it a new `title`, and a unique `customId` if the original had one.
4. Insert it into `screens[]` and `tree` at the same position.
5. Check navigation. `null` means "next screen", so the new neighbour order may change where
   screens lead.

**Delete a screen.** Remove it from `screens[]` and `tree`. Then find every navigate action
targeting its id (the index flags `MISSING:` targets) and re-point it, usually to `null`, the next
screen. Also remove `{{…}}` placeholders and visibility conditions that read inputs from that
screen.

**Move a screen.** Move it in both arrays. Then re-check `null` ("next") navigation around the old
and new positions, and any explicit targets that relied on the old order.
