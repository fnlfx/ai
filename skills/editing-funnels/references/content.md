# Content: text, prices, legal copy, element notes

## Where text lives

- Text: `props.content`. `props.type` is `h1`, `h2` or `paragraph`.
- Button: `props.text`. It is always plain text; markup is stripped.
- Options: `props.options[].text`. Each option has an `id`, and sometimes a `value` and an `image`.
- List: `props.items[].text`.
- Input: `props.placeholder`, and `props.consent.text` when `props.consent.enabled`. There is no label
  prop. `props.type` is `text`, `email`, `number`, `phone` or `password`.
- Timer: `props.text` / `props.buttonText`.
- Plan: see below.
- Screen title: `screens[].title` (editor-only), and the header title in `props.header.title`.

Change only the field you mean to. When you rewrite copy, keep the length close to the original:
screens are about 375 px wide.

## Rich text

A Text element with `props.contentType: "html"` (and CookieConsent `props.text`) renders inline
HTML. Only these tags are allowed: `<strong>`, `<em>`, `<s>`, `<u>`, `<a href target rel>`,
`<span style="color: #rrggbb">` and `<br>`. Nothing block-level is allowed, and `color` is the only
CSS property. One element has one font size, weight and family, so different sizes need separate
elements. Keep existing formatting tags when you edit text unless the user asks to remove them. The
server rejects other markup on elements you changed.

## Plans and prices

A paywall's Plans element contains Plan elements (nested in the hierarchy). A Plan's price is in
several fields, and they must agree:

- `props.title`: plan name, such as "1 month"
- `props.price`: the displayed price line, such as "$13.99 / month"
- `props.priceBlock.price`: the amount charged today
- `props.priceBlock.label`: the renewal price and period
- `props.priceBlock.oldPrice` and `props.oldPrice`: optional struck-through "was" prices. Nobody is
  billed these amounts.
- `props.currency`: required, such as "USD"

A Plan never needs a product entity: adding or repricing one is an edit of these fields. What
visitors see depends on `props.checkout`:

- **No `checkout`:** the plan shows its own text. Edit the fields above.
- **With `checkout`** (the id of a Checkout element): once the provider's offer loads (a paid offer
  without a trial), the funnel replaces the displayed price (and the "was" prices, and `priceBlock`
  on a discounted offer) with the provider's amounts. Editing that plan's price text changes
  nothing visitors see. Say so, and
  send the user to the payment settings in the FunnelFox editor to change the price. Leave
  `checkout` as it is.

What the customer is charged is set in the payment configuration: the Checkout element's
`props.providers` (or a `checkout` action, such as a Plan's `clickAction`), managed in the
FunnelFox editor's payment settings with the provider's price ids. Do not create or edit that.
After adding or repricing a plan, tell the user to connect or check the plan's price in the payment
settings.

When you change a price, update all of these together, plus every legal disclosure on that screen
that quotes it (see below). `--screen` mode prints `price= today= renew= old=` for each plan. On
screens with no plan selector, such as checkouts and one-time offers, the disclosure's amounts must
equal what the rest of the screen charges. Legal copy must match what is actually charged: for a
checkout-linked plan that is the provider's price, not the plan's text.

## Legal copy (`__llm.legal`)

An element with `__llm.legal` set carries legally required disclosure copy. The value is its class:
`subscription_hint`, `policy_footer`, `privacy_note`, `plan_disclosure`, `checkout_disclosure` or
`charge_disclosure` (subscription hints, policy footers naming Terms of Use, Privacy Policy,
Subscription Policy or Cookie Policy, privacy notes, per-plan billing disclosures, checkout and
immediate-charge disclosures). The merchant is legally exposed if this copy disappears or becomes
inaccurate. These rules override any "replace the copy" instruction:

1. **Never delete a legal element or drop its disclosures as a side effect** of restyling,
   shortening, rewriting a screen, or any bulk edit. When new copy lands on a legal element, merge
   it so the disclosure survives inside the new wording.
2. **Meaning-preserving rewording is fine.** Every disclosure must survive: that it is a paid
   subscription, that it auto-renews, the renewal price and period, how to cancel, and every policy
   the original names.
3. **Keep prices accurate.** Amounts in legal copy must match the plans that screen actually sells,
   using the charged price, not a "was" price. Keep exactly one billing disclosure per plan: add
   one (class `plan_disclosure`) when you add a plan, and remove it when you remove the plan.
4. **Edit a legal element beyond this only when the user explicitly targets it**, for example
   "change the footer text to X". "Rewrite this screen" is not explicit.

The server refuses a save that drops a legal element from a screen that still sells the same
plans, or that leaves a disclosure quoting no price the screen's plans sell. It checks every
screen, not only the ones you changed, and it compares only `$` amounts: disclosures in other
currencies are yours to keep right.

## Element notes

- **Timer:** `{{countdown}}` in `text`/`buttonText` shows the remaining time. `persistent: true`
  keeps one countdown across screens and reloads. `completeAction` fires at zero.
- **Popup:** ships hidden (`visibility` const `false`) and is revealed by a `visibility` action from
  another element.
- **Checkout:** leave `props.providers` and `props.methods` alone. The user's payment settings
  manage them. Payment UI is always the Checkout element, never rebuilt from inputs and buttons.
- **Options:** an option's icon is `image: { "type": "emoji", "emoji": "🔥" }` (or
  `{ "type": "none" }`). Never put a leading emoji inside the option text. On one screen, either all
  options get icons or none do. When tapping an option already navigates (the Options element has a
  navigate action), do not add a Continue button.
- **Image:** set a descriptive `alt`. Never print or copy a `url` that starts with `data:`; it can
  be megabytes.
- **Raw:** custom HTML/JS written by the funnel's author. Do not edit it unless asked. How it
  works: `raw.md`.
- **Chart:** data visualisations are the Chart element, never an image.
- **Links:** use URLs already in the funnel or given by the user. Never invent or guess a URL, email
  or store link; leave it unset and tell the user what is missing.
