---
name: walk-funnel
description: End-to-end test of a saved FunnelFox funnel. Walks one path through it as a visitor on a phone, from the first screen to the paywall or checkout, answering every screen and never paying, and reports the screen and the reason where it gets stuck. Use after changing navigation, branching, conditions or screens, before publishing, and when the user asks to test or QA a funnel or a branch.
---

# Walk a funnel

A walk answers one question: can a visitor get from the first screen to the paywall? It takes one
path, decided by its answers. Say the funnel works only after a walk printed `reached paywall`, and
name the answers it took; other branches are untested.

## Run

1. **Save first**: only a saved version can be walked. Take `preview_url` verbatim from
   `funnel_design_update`, `funnel_design_get` or `funnel_create`; never build or edit it.
2. **Pin only what the user named**; the walk picks every other answer at random. Find the element
   in the design and pin it by its visible text, one `--answer` per pin:
   - option: `--answer "<element_id>=<option text>"`, repeated for several options of a
     multi-choice question
   - input: `--answer "<element_id>=<text>"`; date: `--answer "<element_id>=YYYY-MM-DD"`
   - screen with several Continue-type buttons: `--answer "<screen_id>=<button text>"`

   A pin that matches nothing stops the run and lists the valid answers.
3. Run from the project directory:
   ```sh
   node "<skill dir>/scripts/walk.mjs" "<preview_url>" [--seed <n>] [--answer "<id>=<answer>"]...
   ```
   Exactly this form, nothing chained before or after it; anything else asks the user for
   permission. It takes a few seconds per screen. One walk per run: to cover several branches,
   run several walks with different pins, in parallel when you can.
4. After a fix, walk the new `preview_url` with the printed `--seed` to retake the same path.

## Read the result

Read the printout before opening any file:

```
stuck at <screen_id>: <reason>        (or: reached paywall <screen_id> / error: <what>)
seed 123  steps 7  (rerun: --seed 123)
files funnelfox/<funnel_id>/walks/<version>-<seed>
1 <screen_id> "<title>" → "<answer>", [Continue] → <next screen_id>
```

- Each step has a PNG in the files folder (`01-<screen_id>.png`, …) showing the screen just before
  it moved on; where picking an option moves on, that is before the pick. Open with Read only what
  you need, usually the stuck screen and the one before it. `walk.json` there logs every step, page
  error and alert.
- Stuck reasons:
  - `auth`: a sign-in screen. The walk never creates accounts, so it stops there; that is expected,
    and the screens after it are untested.
  - `Continue never enabled`: a required answer the walk could not give.
  - `nothing happened after [button]`: the button leads nowhere.
  - `blocked …: the page said "…"`: a validation alert.
  - `no way forward`: no Continue button and no auto-advance.
  - `loop`, `step cap`: navigation goes in circles or never reaches a paywall.
  - `page crashed`.
  - `unsupported element on screen: …` after any reason: custom code or an element the walk
    cannot operate, the likely cause.

  Tell the user the screen and the reason in plain words, then fix or ask.
- `design smell`: two options in one question with the same text; visitors cannot tell them apart.
- The walk fills inputs with test data (name Alex, `walk.<seed>@example.com`, numbers in range),
  rejects cookie banners, answers or closes popups, waits for loaders, and never presses payment or
  wallet buttons. That test data in a screenshot is not the user's.
- "Google Chrome is not installed…": tell the user that one line; the end-to-end check is still
  open.
