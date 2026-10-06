# Raw (custom HTML) elements

## Data

`{ id, type: "Raw", customId?, visibility?, props: { __html, preserveFormatting? }, styles: { container } }`

- `__html`: one string of HTML, `<style>` and `<script>`. A full HTML document is fine: the
  `<html>`, `<head>` and `<body>` wrappers are dropped, their content kept.
- `preserveFormatting`: an editor paste setting only, no effect on the funnel. Leave it.
- Locales translate the whole string, key `<element id>.__html` in
  `locales["<locale id>"].strings`. A locale with that key has its own copy: repeat every `__html`
  change there.
- Copy, prices, brand names and colours in `__html` are plain code: they don't follow plan prices,
  `localThemeOverrides` or locale strings (except the `.__html` copy).

## How it runs

On every screen open, return visits included:
1. `{{variables}}` are filled in (see `logic.md`).
2. `body { … }` rules are removed from `<style>`.
3. The markup is inserted in place: no wrapper box, no style isolation.
4. Once the screen's other elements are on the page, scripts run in order. A `<script src>` loads
   before the next one runs; if it fails to load, no later script of the element runs.

So:
- **CSS is page-wide.** `button { … }` or `* { margin: 0 }` restyles the whole screen, built-in
  elements too. Scope selectors under your own root class (`.bmi-card button`).
- **Each `<script>` is wrapped in a function.** Its top-level `const`, `let` and `function` are
  invisible to other scripts and to `onclick="…"`. Use `addEventListener` or `window.myFn = …`.
- **No cleanup on screen close.** Listeners on `window`/`document`, timers and intervals keep
  running and stack up on each visit. Listen on your own elements, or guard with a `window` flag.
- **JS variables reset each visit.** Persist values in `fox.inputs` or `localStorage`.
- **A `{{variable}}` changing on an open screen re-inserts the markup; scripts don't re-run.** In
  scripted markup, use `fox.inputs.get` instead.

## Built-in elements from code

Each is wrapped in
`<div class="element" id="<customId or id>" data-element-id="<id>" data-element-type="<type>">`,
with the element as first child: `document.getElementById('signup-btn').children[0]` is the button
of the Button with customId `signup-btn`.

## `fox` API

`window.fox` is ready when scripts run.

### `fox.inputs`

One funnel-wide store: answers from built-in elements plus values scripts add. Every value is also
a `{{variable}}`.

- `get(name)`: by element id, then customId or variable name. Returns the stored value or `null`,
  not always a string:
  - Input: `{ value: "25", type: "text" }` → `get('age')?.value`
  - Options: `{ id, value, label }`; multi-select: an array of them
  - DatePicker: `{ year, month, day }` (month 1–12)
  - a script's value: as stored

  Use `Number(…)` before maths.
- `set(name, value)` writes to the first match:
  1. a reserved name (`email`, `_USERID_`, `checkout`, `_password_`, `firebase-password`): a plain
     variable
  2. an element on the current screen with that id
  3. an input element on the current screen with that customId
  4. an input element answered earlier with that customId
  5. otherwise, a new variable

  Fill an Input (hidden too) with its own shape: `set('el_ab12', { value: '24.5', type: 'number' })`.
  `_USERID_` sets the visitor's user id (e.g. from your own backend).
- `getAll()`: `{ <customId or id>: value }`.
- `subscribe(fn)` = `subscribeAll(fn)`: `fn(name, value)` runs on any change; filter by `name`.
- `setEmail(email, consent?)`: stores it and saves it to the visitor's profile, which passes it to
  connected integrations. `getEmail()`: a string or `null`.

Show a script's value in Text as `{{inputs.<name>}}`. `{{<name>}}` also works, but a save that adds
a new `{{name}}` no element provides is refused.

### `fox.navigation`

- `goNext()`: the next screen in `screens[]`.
- `goToId(ref)`: the first screen whose id or customId is `ref`.
- `goToIndex(n)`: 0-based position in `screens[]`.
- `goBack()`: `history.back()`. A visitor who came from an ad or another page leaves the funnel;
  with no history it does nothing.
- An unknown `goToId` target does nothing (only a console error). `goToIndex` past the end, or
  `goNext()` on the last screen, rejects the promise the call returns; `try/catch` around the call
  catches nothing. Either way the visitor stays on the screen.

Screen ids in Raw code are not screen actions: moving, deleting or renaming a screen doesn't update
them.

### Other

- `fox.trackCustom(name, payload)`: a custom event to connected analytics.
- `fox.sandbox`: `true` in preview and test mode.
- `fox.locale`: browser language, e.g. `"en-US"`.
- `fox.experiment`: `{ id, funnel }` when in an experiment.
- `fox.onRestoreReplies(fn)`: runs when a returning visitor's answers are restored.
- `fox.stripe.setCustomerId(id)`: Stripe Checkout uses that customer; an unknown id means no
  Checkout.

### Older code

Still works. Recognise it, don't write it:
- `navigation.navigateToId`, `navigateToNext`, `navigateToBack`, `navigateToScreen(screen)`.
- `fox.state`, `fox.params.preview`.
- Fields with `data-state-id="<element id>"` + `data-state-type` (`Email`, `Text`, `Options`,
  `OptionsMulti`, `DatePicker`), optionally `data-state-value` / `data-state-value-key`: they save
  on every `input`/`change`.

## Funnel-wide code

Code for every screen (pixels, global scripts) is `customHead`, a top-level string in the design,
not a Raw element.

## Screenshots

Screenshots show only static markup: no scripts or `on…` handlers, and CSS applies only to the Raw
element. Ask the user to check scripts in the editor's interactive preview.

## Editing

Raw code is written by the funnel's author: do not edit it unless asked.

The index overview shows where Raw code navigates as `raw →` (a missing target is a warning). The
`--screen` view shows a Raw element's script flag, visible text, `fox.navigation` targets,
`fox.inputs` names and `{{variables}}`; read the code for the rest. To edit, write `__html` to a
file, edit the file, write it back; don't patch code inside the JSON string.
