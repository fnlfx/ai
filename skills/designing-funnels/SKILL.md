---
name: designing-funnels
description: What makes a FunnelFox web funnel convert, and how to change one without hurting trust. Use when the user asks to improve, design, build, optimize or review a funnel, quiz, paywall or checkout for conversion; to add screens, offers, discounts, countdowns, social proof, personalization or a results screen; or asks why a funnel underperforms. Not needed for plain mechanical edits such as "change this text to X" or "set the price to $9.99".
---

# What makes a funnel good

A FunnelFox funnel is a mobile web quiz that sells a subscription. The visitor answers questions,
sees that the product fits them, and pays. Every screen must either learn something the funnel
uses later, build trust, or move the visitor toward paying. Cut or merge screens that do none.

**Mechanics live in the `editing-funnels` skill**: how to read and save the design, ids, tree and
screen order, navigation, visibility, `{{variables}}`, plans and prices, and the legal-copy rules.
Load it before changing anything. This skill decides *what* to change; editing-funnels decides *how*.

## Before you change anything

1. Read the funnel's structure (editing-funnels index) and name its stages: entry, questions,
   value/proof, results, email, paywall, checkout, after purchase. See `references/flow.md`.
2. Call `project_context_get`: what the user told FunnelFox about the product, audience, brand and
   voice, and their own instructions, which you follow. Check it against the funnel's own copy and
   match both. Never switch the product's name, claims or tone.
3. Collect the facts you may use: prices, plan names, stats, reviews, press quotes, guarantees,
   links. Everything a new screen states must come from the funnel, the project context or the user.
4. Building from a copy of another funnel (a template, or an earlier draft of this one)? Everything
   in it is a leftover until you have checked it: every line of copy, every claim and price, every
   element style, against these rules and the brand.

## Rules

- **Edit before you add.** Improve an existing screen when it already has the job (a proof screen,
  a results screen). Add a screen only for a missing stage, and put it where that stage belongs.
  Copy the structure and styles of a similar screen in the same funnel so it looks native.
- **Never invent facts.** No made-up user counts, ratings, percentages, reviews, testimonials,
  press mentions, expert endorsements, guarantees, discounts or URLs. Reuse the funnel's own, or
  write copy that needs no number. If a stronger claim needs data you do not have, say what the
  user should supply. A figure you believe is public ("50M+ customers", "160+ countries") is
  still invented unless the user or the funnel gave it. The same holds for trust badges and
  assurances: "trusted by …", "most popular", "bank-grade security", "cancel anytime", "no fees",
  "free forever".
- **Honest urgency only.** A countdown or "limited-time" offer must really end: when it expires the
  visitor sees the full price. Use the full-price twin in `references/timed-offers.md`. Never fake
  scarcity ("only 3 spots left"), never reset a timer to fake a deadline.
- **No prices you were not given.** If the user gave no prices and the project has no products, put
  no numbers on a paywall: no placeholders, no list prices you remember, no "free forever". End the
  funnel on an honest next step instead (create an account, get the app, join the waitlist, leave
  an email) and ask for the plans and prices in your report. The same goes for fees, limits, rates
  and speeds: describe what the product does, never promise a figure or a guarantee.
- **Prices stay true.** A struck-through "was" price must be a price the product really charges
  (for example the monthly plan's price when anchoring a yearly plan per month). Savings, per-day
  and per-week figures must be correct arithmetic from real prices. Round down savings, never up.
- **Legal copy is untouchable except for accuracy.** Follow editing-funnels's legal-copy rules; every
  price or plan change updates the disclosures that quote it.
- **Personalize with real answers.** When the funnel personalises, play back what the visitor chose
  using `{{customId}}` variables from the quiz (see the caveat under Copy). Do not claim analysis
  the funnel does not do.
- **One primary action per screen.** One clear button; do not stack competing CTAs.
- **No dark patterns.** No pre-checked add-ons, hidden renewal terms, confirm-shaming ("No, I don't
  want to get better"), fake close buttons, or a cancel path that is hidden or misrepresented.

## Copy and images on mobile

- Screens are about 375 px wide. Headlines: one idea, up to ~8 words, two lines at most. Body: one
  or two short sentences. Buttons: 1–3 words that say what happens next ("Continue", "See my plan",
  "Start my plan").
- Address the visitor as "you". Lead with their outcome, not features. Plain words, no hype.
- Keep the funnel's language, spelling and capitalization style.
- Answer options are parallel in form, do not overlap, and cover the range ("Rarely" next to
  "A few times a year" makes the visitor guess).
- Every image gets a specific `alt` describing what it shows. Reuse images already in the funnel;
  never invent image URLs. Leave a slot empty and say so rather than guess.
- Say each thing once. A plan's price in its title and again in its price tag, or a subtitle that
  repeats the headline, reads as a template leftover. Remove template elements the new content does
  not need (placeholder badges, sample reviews, links to another product).
- `{{variables}}` render literally (`{{goal}}`) wherever there is no answer yet: in previews,
  screenshots and for a visitor who lands mid-funnel, so a screen that uses one looks broken to
  anyone reviewing it. Use `{{…}}` only when the goal asks for personalisation; otherwise write
  copy that fits every answer, and remove placeholders a copied template or draft brought along.
  Never in a headline, eyebrow or chip.

## Marketing-grade screens

When the goal is a new funnel, a redesign or "make it look like <brand>", each screen should look
like the brand's own marketing, not a filled-in template.

- **One focal point.** A short, large headline; one or two lines of support; one primary button
  pinned to the bottom of the viewport, so it is always visible without scrolling: a top-level
  Button with `styles.container.position` = `{ "value": "fixed" }` and `spacingBottom` for its
  gap, no `top`/`bottom` (editing-funnels, `references/structure.md`, Layout). Question screens whose options advance on tap need no extra
  button.
- **Use the whole screen.** Content huddled in the top third above an empty half looks unfinished.
  Pin the button, then fill or balance the space: the gap between the content and the pinned
  button should not be the biggest shape on the screen. On sparse screens (welcome, statement,
  loading, done) move the content block toward the optical centre with the screen's
  `styles.container.paddingTop` (about a quarter of the viewport) and set the headline larger
  (36–44 px). On list and question screens use taller options or cards (64–80 px) and generous
  gaps. Check it in the screenshot: if any empty band (between the content and the pinned button,
  or below the last option) is taller than about a quarter of the screen, the screen fails.
  Fix it by splitting the spare space rather than inflating elements: add about half of it to
  the screen's `paddingTop` so the block sits at the optical centre, or add a visual; options
  taller than ~80 px for one line of text look padded, not premium. Without
  brand images, build the visual from type, colour and components (see Craft without images
  below), never from invented image URLs.
- **Value and benefit screens** (a short list above a pinned button) end up top-heavy most
  often. Centre the block in the space between the header and the button: measure the empty band
  under it in the screenshot and add about half of it to the screen's `paddingTop`, or give the
  rows room (row gap 20–28 px, card padding 24 px) until the band is no taller than the space
  above the headline. Write each row as what the visitor gets ("Spend abroad like a local"), not
  a feature name ("Currency exchange"), in rows of similar length. The headline breaks into two
  balanced lines or fits on one.
- **Brand-consistent icons.** Emoji render in each device's own colours and ignore the theme; leave
  them out of options and lists unless the brand itself uses emoji. Use the same icon treatment
  on every question screen: one screen with icons next to one with bare text rows looks
  unfinished.
- **Every screen has its one primary action, the last one too.** A finish screen without a button
  is a dead end. Its button does the honest next step: a `link` to a URL the user or the funnel
  gave, or, for a well-known brand the user named, its homepage root (`https://www.<brand>.com`,
  no deep or app-store links) named in your report for the user to confirm.
<!-- s5:theme -->
- **Every theme-driven part in brand colours**, including the ones that are easy to miss: the
  back arrow and progress bar, loaders and spinners, selected and unselected options, price tags
  and badges, inputs. See editing-funnels `references/theme.md`.
<!-- /s5:theme -->
- **Craft without images.** Flat grey boxes and bare text rows read as a template. What the static
  components can do (all render the same in screenshots, the editor and the live page):
  - *Line icons as inline SVG.* A 24×24, stroke-only icon (Lucide/Feather style: `fill="none"`,
    `stroke` = the brand's primary colour, `stroke-width="2"`, round caps) as a data URL:
    `"data:image/svg+xml," + encodeURIComponent(svg)` built in a `node` script. Use it as an
    option's `image` (`{ "type": "file", "url": "<data URL>" }`), a List item's `marker`
    (`{ "type": "image", "src": "<data URL>" }`, size via `styles.markerImage.width/height`), or an
    Image element's `url` for one larger emblem. Draw only simple shapes you are sure of; one icon
    style across the funnel; in an option set, every option has an icon or none does.
  - *Tap affordance.* Options that advance on tap can carry a small chevron as `rightImage` (same
    data-URL form, a muted text colour) so they read as buttons, not static tiles.
  - *Aligned options.* An option already pads its text by 16 px; `styles.option.paddingHorizontal`
    adds to that. Leave it unset (or ≤ 8 px) so option text lines up with the headline instead of
    floating behind an empty-looking indent.
  - *Checklists that hang.* A List is a two-column grid, so wrapped lines stay aligned with the
    text column. Benefit rows read richer with a distinct icon per row (what each benefit is)
    than with the same checkmark four times, and each row says what the visitor gets, not a
    feature name. Give its container a background, radius and padding to make one card of benefit
    rows; never fake checkmarks with a glyph and spaces inside a Text.
  - *A hero from shapes.* A Raw element with static inline SVG (no scripts, no external URLs) can
    draw a composition in brand colours: layered or tilted cards, a gradient panel, soft circles,
    the product name set in the brand font. Keep it abstract: no fake UI with numbers or balances,
    no imitation of a logo you were not given.
  - *Depth.* A soft shadow (`shadowOffsetY` 8–16, blur 24–40, a low-alpha dark colour) or a tinted
    card on a white screen separates layers better than a grey border.
- **Short funnels** (a few screens): hook, one to three questions whose answers shape what follows,
  value or proof, then the next step. Every screen earns its place.

<!-- s5:shots -->
## Visual quality (check every screenshot against this)

For a redesign, rebrand or layout change, look at screenshots of the result before saving (how:
editing-funnels). For a new funnel or a rebrand, shoot **every** screen (several calls of up to 4).
Review like a strict art director: score each screen out of 10 against this list, and fix and
reshoot anything below 9. "Nothing needed fixing" on a first pass is rarely true. Check each screen
for:

- **Hierarchy:** the eye lands on the headline first, then the answer options or the offer, then
  the button. One idea per screen.
- **One clear primary action:** one button that stands out; secondary links look secondary.
- **Contrast:** text readable on its background everywhere, including selected options, button
  labels, cards, inputs and small print. Brand colours on a dark or saturated background often fail.
- **Spacing:** even gaps, nothing touching the screen edge, nothing cramped or floating alone; the
  main content and button fit without scrolling where the screen type allows it; no top-heavy
  screen over an empty lower half.
- **Brand consistency:** the same colours, font and corner radius on every screen; no leftover
  screens or elements in the old colours, no dark icons or back arrow on a dark background, no
  loader or gradient fading into an off-brand colour, no multicolour emoji.
- **Line breaks:** no headline, list row or paragraph whose last line is one short word
  (reword it or change the size); headlines break into balanced lines.
- **Leftovers:** no literal `{{…}}` in a headline, no duplicated prices or text, no template
  components the content does not use.
- **Honest content:** the redesign added no claims, numbers, badges or reviews the funnel did not
  already have.

Fix what fails, look again, then save. Never describe how the funnel looks from the JSON alone.
<!-- /s5:shots -->

## References (read the one the task needs)

- `references/flow.md`: funnel stages and order, quiz question design, transitions, social proof,
  personalization and results screens, the after-purchase screen, when to add a screen.
- `references/paywall.md`: paywall anatomy, plan presentation, anchoring, trials, checkout,
  what to review on a paywall.
- `references/timed-offers.md`: countdown and discount paywalls, and the full-price twin procedure.

## Report back

Tell the user what you changed and why it should help, which facts you reused, anything you did not
add because it would need data they have not given (stats, reviews, links), and that the result is
an unpublished version. Suggest an A/B test in FunnelFox Experiments for changes whose effect is
uncertain (https://funnelfox.com/docs/dashboard/experiments). Name the funnel as `[Title](editor_url)`
when the tool gave an editor_url, and describe screens and elements by their visible title or text,
never by funnel, screen, element or upload ids or version numbers.
