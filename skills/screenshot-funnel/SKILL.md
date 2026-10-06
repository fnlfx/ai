---
name: screenshot-funnel
description: See a saved FunnelFox funnel as a phone shows it. Takes screenshots of chosen screens on this computer with Chrome and saves them as PNG files to open with Read. Use after funnel_design_update to check a visual change (layout, colours, images, rebrand, new screens), or when the user asks how a screen looks.
---

# Screenshots of a funnel

You see a funnel only through screenshots. Never claim how a design looks (fits, readable, on
brand, "looks good") without a shot of the saved version.

## Shoot

1. **Save first.** Only saved versions can be shot. Take `preview_url` as it is, never build or
   edit it: from `funnel_design_update` after a save, or from `funnel_design_get` / `funnel_create`
   for the latest saved version (e.g. reviewing a funnel without editing).
2. **Pick a few screens**: the ones you changed, plus a neighbour if the change affects flow or
   theme. Not the whole funnel. At most 8 per run.
3. Run, from the project directory, with this skill's base directory:
   ```sh
   node "<skill dir>/scripts/shot.mjs" "<preview_url>" <screen_id> <screen_id>...
   ```
   Exactly this form, nothing chained before or after it, so it runs without a permission prompt.
   It takes about 5 seconds per screen.
4. It prints one line per screen: the PNG path
   (`funnelfox/<funnel_id>/shots/<version>/<screen_id>.png`), the path followed by
   `(may be incomplete: …)`, or `<screen_id>: failed (…)`. **Open every PNG with Read** before you
   say anything about it.

## Read the shots

- A shot is an iPhone-sized screen at 3×. A screen longer than the phone is shot whole, up to three
  phone screens tall; fixed elements such as the bottom button then sit at its very bottom.
- It is the real funnel runtime: scripts, charts, Lottie, custom HTML and fonts render.
- What depends on earlier answers or actions differs: `{{variables}}` show unfilled, checkout shows
  its state before a plan is picked, popups and timed offers show as they are on first load.
- A cookie banner the project shows to visitors can cover the bottom of a screen. It is not part of
  the design; do not "fix" it.
- "May be incomplete": the page was still loading or changing after 15 seconds. Judge only what is
  drawn; shoot again if what you need is missing.
- "The screen navigated on by itself": it moves on automatically (a loader); the shot shows the
  screen after it.
- "No such screen in this version": the id is wrong or the screen is not saved yet.
- "Google Chrome is not installed…": tell the user that one line, then go on without screenshots
  and say the visual check is still open.
