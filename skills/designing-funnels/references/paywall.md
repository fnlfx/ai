# Paywalls, plans and pricing

## Anatomy (top to bottom)

1. **Outcome headline** — the visitor's goal or plan, not the product name alone
   ("Your Spanish plan is ready" beats "Unlock Premium").
2. **Plan summary or visual** — 2–3 answers from the quiz, or the projection from the results
   screen. Makes the paywall feel like unlocking their result.
3. **Benefits** — 3–5 short lines, real features only, the one most relevant to their goal first.
4. **Plans** and the primary **CTA** directly under them.
5. **Legal copy** — renewal hint, per-plan billing disclosures, policy links (editing-funnels rules).
6. Optional trust below the fold: reviews, press quotes, FAQ (including "Can I cancel anytime?"),
   a money-back guarantee only if the merchant actually offers one. Long paywalls repeat the plans
   and CTA at the bottom.

## Presenting plans

- 2–3 plans. More options slow the decision.
- Preselect the plan you recommend (`defaultPlan` on the Plans element) and mark it with one badge
  ("Most popular" or "Best value"). One badge per paywall.
- Show every plan in the same unit so they compare at a glance: per week or per month for all, or
  per day for all. The charged amount and period stay visible on each plan.
- Savings claims compare the plan with a real alternative the visitor could buy here
  (for example 12 months vs 12 × the monthly price). Compute them, round down, and keep them next to
  the plan they describe.
- A struck-through "was" price must be a real price for the same period (the monthly plan's price
  when showing the yearly plan per month). Never an invented reference price.
- Put the recommended plan where the eye lands first; do not hide cheaper plans.
- Plan titles: plain durations ("1 month", "12 months"). Put the persuasion in the badge and the
  per-period price, not in the title.

## Trials and intro prices

- Name the trial and what happens after it on the plan itself: "7 days free, then $39.99 / year".
- An intro price (first period cheaper) always shows the renewal price next to it.
- "Cancel anytime" is fine only when true and when the cancel path is stated in the legal copy.
- The CTA says what happens: "Start free trial" for a trial, "Start my plan" / "Continue" for a
  paid start. Never "Continue" when tapping charges immediately and the screen hides that.

## Checkout

- Checkout is the Checkout element, on the paywall ("integrated", good for short funnels) or on its
  own screen right after it. Keep its providers and methods as configured.
- The checkout screen repeats what is being bought and for how much, with its legal disclosure.
- Remove distractions on checkout: no new offers, no extra questions.

## Reviewing a paywall — checklist

- Does the headline speak to the visitor's goal?
- Is one plan recommended, preselected and badged, and do all prices compare in one unit?
- Is every number (price, saving, per-day figure, "was" price) true and consistent with the
  plans and disclosures?
- Is there exactly one primary CTA above the fold, repeated at the bottom on long screens?
- Is any urgency real (see `timed-offers.md`)?
- Are benefits real features, short, and ordered by relevance to the goal?
- Is the legal copy intact and accurate?

Use FunnelFox Experiments (https://funnelfox.com/docs/dashboard/experiments) to test paywall
variants instead of guessing; price localization is covered at
https://funnelfox.com/docs/editor/pricing-localization.
