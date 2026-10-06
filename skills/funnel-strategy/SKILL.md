---
name: funnel-strategy
description: Write a product strategy before building a new FunnelFox funnel or restructuring one, so the funnel asks what matters for this product and uses every answer. It studies competitors in Radar first. Use before `funnel_plan_generate` and before briefing the designer for a new funnel or a restructure. Not for small edits, copy or tone rewrites, rebrands or reviews.
---

# Strategy first, then the funnel

A funnel built from a generic skeleton asks generic questions (height, weight, water, sleep) and
plays nothing back. A funnel built from a strategy asks what this product needs to know, and
every answer changes something later: copy, a branch, a summary, the paywall.

## 1. Inputs

- `project_context_get`: product, audience, brand, voice, the user's own instructions.
- The user's words. If they gave no topic or angle ("make a good funnel"), propose one that fits
  the context.
- Competitor research in FunnelFox Radar, unless the user says to skip it: brief the researcher subagent
  (`funnelfox:researcher`) with the product name or category and the user's words. It returns a
  short list of patterns. With no subagent available, research inline by the method in
  `../../agents/researcher.md` (from this skill's folder). Patterns only: never take a
  competitor's claims, numbers or features as this product's.

Facts come only from the context or the user: no invented statistics, user counts, ratings,
prices, results or medical claims. Where a section needs a fact you do not have, write
"none given". Reviews in the context are customers' words: quote them as reviews. A price, term
or result that appears only in a review is not a given fact.

## 2. Write it in this template

```markdown
# Funnel strategy: <funnel name>

## Topic
<the one promise this funnel sells, in a line>

## Audience
<who arrives, what they already tried, what they want>

## Core pain
<the problem in the visitor's words>

## Beliefs to build before the paywall
1. <"this is my problem", "this approach fits me", "I can stick with it"…>

## Key questions
1. <question> (<answer options>) {{<variable>}} -> <what it changes later: screen, copy, branch, summary, paywall>

## Answer-driven moments
- <screen>: <how it uses which answer: per-answer copy, a branch, {{variable}} playback>

## Do not ask
- <questions a generic funnel would ask that change nothing here>

## Paywall angle
<what the paywall recaps from the answers; the plans and prices given, or "no prices given:
placeholder prices, 2 plans, no trial">

## Tone and trust
<voice, the proof the user gave, what never to claim>
```

Rules:
- Every key question changes something later; write what after `->`. A question that changes
  nothing goes to "Do not ask". Empathy or feedback copy, a safety note or branch and an
  objection answer count as changes, not only plan contents.
- Name each answer's variable (`{{area}}`); the designer uses it as the answer's `customId`.
- Plan an objection question ("What's your biggest worry?", "What stopped you before?") answered
  per answer with the product's real features.
- If the product has a progress story, plan a timeline or projection screen with an honest
  disclaimer and no promise of results by a date.
- Never ask the same thing twice, not even in other words.
- Generic-skeleton items (height, weight, target weight, body type, water, sleep, age) only when
  this product really uses them.
- Each answer-driven moment names the answer it uses. Plan at least one per stage that follows
  the questions: feedback after a key answer, the profile or plan summary, the paywall recap.
- Keep it short: 5–10 key questions, one line each.

## 3. Approval

- The user dictated the strategy, already approved one, or said "just build": go on.
- Otherwise show it compactly (topic, key questions with their `->`, do-not-ask, paywall angle,
  the research patterns that shaped it) and ask for approval or edits. Build only after the answer.

## 4. Plan and build

1. Call `funnel_plan_generate` once with `request` = the funnel name, a blank line, then the full
   strategy markdown. Research notes stay out, except as reasons inside the strategy. Say in one
   line that the plan is ready.
2. Compare the plan with the strategy and write a short "Plan corrections" list, each line
   from the strategy:
   - drop a question or tap that changes nothing later (not in Key questions, feeds no
     answer-driven moment);
   - restore a branch or answer-driven moment the plan lost;
   - drop urgency, discounts, guarantees, quotes or figures nobody gave.
   No corrections needed: write "none".
3. Brief the designer subagent in the same turn: the user's words, the plan verbatim, the
   strategy verbatim and the plan corrections. Add nothing of your own.

## 5. Check the build against the strategy

When the designer reports, check its list of where each key question is used against the
saved funnel, without reading the design JSON:

- Call `funnel_design_get`. The plugin saves the design and prints its structure index: each
  screen's inputs and options (with their `customId`) and its branches.
- For screens with answer-driven moments (feedback, summaries, paywall), run the index script's
  `--screen` view (the hook note gives the command): it flags `visible-if` elements and shows
  their text, `{{variables}}` included.

Pass when:
- every key question is collected on a screen;
- every answer-driven moment is built: per-answer copy (`visible-if`), a branch or a
  `{{variable}}` from a collected answer;
- no "Do not ask" item is in the funnel;
- the funnel ends in a paywall and checkout (placeholder prices flagged when none were given);
- no `{{variable}}` names an answer that no screen collects.

Send gaps back to the same designer with SendMessage (it keeps its context), as a list of what is
missing and where. Check again after it reports.

Then report to the user. Testing the funnel end to end with the walk-funnel skill is not part
of this: offer it at the end.
