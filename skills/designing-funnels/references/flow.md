# Funnel flow, quiz, proof and personalization

## Stages and order

A converting funnel reads like a short consultation: who are you, what do you want, here is proof
this works for people like you, here is your plan, start it.

1. **Entry** — one low-effort first tap (age range, goal, a simple preference). No sign-up, no
   long intro. The first screen's only job is to get that tap.
2. **Goal** — early (within the first three screens): what the visitor wants to achieve. The rest of
   the funnel and the paywall are framed by this answer.
3. **Profile questions** — the questions the product genuinely uses: level, habits, time available,
   obstacles, preferences.
4. **Proof and value** — between question groups: social proof, a short "why this works" or
   reassurance screen. Break a long run of questions with one of these every 4–6 questions.
5. **Results** — a summary or projection built from the answers ("your plan"). Often preceded by a
   short processing/loading screen (a few seconds, not a wait).
6. **Email** (optional) — framed around what the visitor receives ("where should we send your
   plan?"), before the paywall.
7. **Paywall** — the plan as the way to reach the goal they stated. See `paywall.md`.
8. **Checkout** — the Checkout element, on the paywall or on its own screen right after it.
9. **After purchase** — a final screen that tells the buyer exactly what happens next (download the
   app, check email, log in). Every funnel ends with one.

Typical length: 8–12 screens for warm or simple offers, 15–22 for cold traffic, up to ~30 for
assessment-style products. Longer is fine when each screen earns its place.

## When to add a screen, when to edit

- The stage exists (there is already a proof screen, a results screen): **edit it**, do not add a
  second one next to it.
- The stage is missing: **add one screen** at the stage's position, built by duplicating a similar
  screen in this funnel (same header, spacing, button style).
- The user names a position ("right before the paywall"): put it exactly there, and make sure
  the neighbours' navigation still flows through it.
- Do not add screens that only repeat what the next screen says.

## Quiz questions

- One question per screen. Short question as the headline; an optional one-line subtitle for why
  you ask.
- 3–6 answers for single choice; up to ~8–12 chips for "choose all that apply" (say so in the
  subtitle). Answers are short, parallel and mutually exclusive, and cover everyone (add "Other" /
  "Something else" when needed).
- Single-choice answers move on when tapped; no extra Continue button. Multi-choice and text
  inputs need a Continue button.
- Ask only what a later screen uses (results, plan, paywall copy, branching). If nothing uses an
  answer, cut the question or start using it.
- Mix formats to keep momentum: statement screens ("How true is this for you?" with 2–3 answers)
  validate pain points without making the visitor type.
- Emoji icons on answers: all answers on a screen or none.
- Sensitive questions (health, money, relationships) get a short reason and neutral wording.

## Social proof

- Put one proof screen early (within the first ~4 screens) and optionally one closer to the
  paywall, where doubt peaks.
- Pick the strongest **real** proof the funnel or user has: user count, store rating, a named
  review, press quotes, expert or institution backing. Reuse what already appears in the funnel
  (for example press quotes on the paywall).
- Tie it to the visitor: "People learning Spanish like you…" reads better than a generic boast, as
  long as the claim stays true.
- Without real numbers, use proof that needs none: what the product does for people in the
  visitor's situation, a restatement of an existing quote. Never invent a stat or a review.

## Personalization and results

- Play answers back with `{{customId}}` variables (an Options answer renders its label). Give the
  quiz's Options elements readable `customId`s if they have none, and use each only after it is
  answered.
- Write around the label so it reads well whatever the choice: "Language: {{language}}" or a list
  of "label: answer" rows is safer than weaving a label into a sentence.
- A results screen summarizes 3–5 answers, then states the plan's promise in one line and has one
  button onward. It sits after the questions and before email/paywall.
- Projections ("where you could be in 12 weeks") must be framed as possible, not guaranteed, and
  should use the Chart element, not an image.
- The paywall headline can echo the goal answer ("Your plan to {{goal}} is ready").

## Transitions and processing screens

- A transition screen: one headline, one or two sentences, optional image, one button. Use it to
  reassure ("Lots of people start from zero") or explain why the next questions matter.
- A processing screen before results builds anticipation; keep it short and its steps truthful to
  what the funnel does with the answers.

## After purchase

- State the next step and the one action to take (a store button, "check your email"). Use only
  links already in the funnel or given by the user.
- An upsell, if any, comes after the main purchase, is clearly optional and has an equally visible
  "No thanks".
