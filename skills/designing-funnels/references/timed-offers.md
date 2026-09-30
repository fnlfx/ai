# Timed offers and the full-price twin

A paywall that shows a countdown Timer together with a discount (a struck-through price, a promo
bar, "50% OFF") promises a limited-time offer. If the countdown ends and the visitor still gets the
same discounted price, the urgency is fake: misleading to buyers and a legal exposure for the
merchant, the same class of problem as broken legal copy. So the offer must really expire into the
full price. FunnelFox's own editor does this with a **full-price twin**
(https://funnelfox.com/docs/elements/timer).

## When it applies

Whenever you build or edit a paywall that has both a Timer and a discount. Skip it only when the
user explicitly asks for different expiry behaviour, or a twin already exists (a screen titled
"… (no discount)" that the Timer's completion leads to). Never create a second twin; update the
existing one when prices change.

## The discounted paywall

- Timer text says what ends: "Your 50% discount ends in {{countdown}}" — not a vague "Hurry!".
  A few minutes (e.g. 10–15) is typical.
- The discounted plan shows the full price struck through (`oldPrice`) and the discounted amount as
  the charged price. Headline or badge states the real discount, correctly computed.
- Billing disclosures quote the discounted amount actually charged today and the renewal price
  (full price if the discount is for the first period only). Follow editing-funnels's legal rules.

## Building the twin (use editing-funnels for the mechanics)

1. **Clone** the discounted paywall, and any separate checkout screen it navigates to, with fresh
   ids throughout (editing-funnels "Duplicate a screen"). Title each clone "<title> (no discount)".
2. **Strip the offer on the twin**: remove the Timer and any promo-code element; delete every
   `oldPrice` (plan props and `priceBlock`); make the full price the charged price; rewrite
   discount wording in headlines, badges and billing disclosures to the full price. Its legal
   elements stay, with amounts matching what the twin charges.
3. **Place** the twins at the end of the funnel (end of `screens[]` and `tree`). Give every action on
   a twin an explicit screen target (for example the twin checkout, then the original after-purchase
   screen); a screen at the end must not rely on `null` "next screen".
4. **Wire expiry** on the original paywall's Timer:
   `props.completeAction = { "type": "navigate", "payload": { "type": "const", "value": "<twin id>" } }`,
   `props.persistent = true` (the countdown survives reloads and returns),
   `props.synchronizedCountdown = false`.
   A returning visitor whose countdown has ended lands on the full-price twin.
5. Validate, and report that the funnel now has a "(no discount)" screen and why; users sometimes
   delete it thinking it is a stray copy.

## Never

- A countdown that restarts on every visit, or expires into the same price.
- "Only N left", "N people are viewing this", or any scarcity the funnel cannot back.
- A discount percentage computed from an invented "original" price.
