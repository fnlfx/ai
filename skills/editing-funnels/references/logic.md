# Actions, navigation, visibility, variables

## Actions

Interactive elements (Button, Options, Processing, Timer and others) carry an action in their
props: `props.action`, or `completeAction` / `clickAction` on a Timer. Checkout-style elements
nest more actions under provider configs, such as `successAction` or `failActions`. An action is
`{ "type": "<kind>", "payload": <expression> }`, and the most common payload is a constant
`{ "type": "const", "value": … }`.

- `navigate`: go to another screen.
  - `value: null` goes to the **next screen in `screens[]` order**.
  - `value: "<screen id>"` jumps to that screen, which must exist.
- `link`: open an external URL. Never invent one.
- `checkout`: start a payment with the configured provider.
- `visibility` / `scroll`: show, hide or scroll to another element on the same screen, for example
  to reveal a Popup.

To find where a screen leads, use the index (`→ next,#12`) or `--screen` mode. Do not grep raw JSON.

## Branching

A navigate whose payload is `switch_input_value` picks the target by a previous answer:

```json
{ "type": "navigate", "payload": {
  "type": "switch_input_value", "inputId": "<Options element id>", "strict": true,
  "values": [["<option id>", "<screen id>"], ["<option id>", null]] } }
```

- `values` is an array of `[key, target]` **pairs**, not objects.
- With `strict: true` (the default; keep it), each key is an **option id** of the source Options
  element (or a plan id for a Plans source). It is never the option's `value` or its label.
  `strict: false` changes only Options and PricePicker sources: their keys become the option
  `value`s. An Input source always matches its typed text, and a Plans source always its plan ids,
  whatever `strict` says.
- A `null` target, and any answer with no pair, goes to the next screen.
- The branching action can sit on the Options element itself or on a Continue button after it. The
  index shows it as `branch on <element id>: key→#n …`, and `--screen` lists the option ids.

When you add an option to a branched question, decide where it leads and add its pair, or let it
fall through to "next" deliberately. When you delete an option, remove its pair.

## Conditional visibility

An element renders only while the expression in its **top-level `visibility` field** is true
(`screens[].elements[].visibility`, next to `props`, never inside `props`). An individual option
uses its `visible` prop instead. `{ "type": "const", "value": true }` means always shown and `false` means hidden. Popups ship
hidden and are revealed by a `visibility` action.

A condition is a predicate over an operand. Predicates combine with
`{ "type": "&&" | "||", "predicates": [ … ] }`:

```json
{ "type": "in", "left": { "type": "country" }, "right": { "type": "const", "value": ["US", "DE"] } }
```

Only `in` / `notIn` take an array as the right value. `has` / `notHas` and `===` / `!==` take one
string, `>` / `<` and `selected` / `selectedAtLeast` a number.

Which predicate fits which operand (the server rejects a mismatch):
- `country`, `browser`, `os`: `in` / `notIn`, never `===`. Countries are ISO 3166-1 alpha-2 codes.
  OS values are `ios`, `android`, `other`; browser values are lowercase names such as `chrome`,
  `safari`, `instagram` (the validator lists the allowed ones if you pick a wrong one).
- `traffic_type`: `in` / `notIn` only, with `paid` / `organic`.
- `url_parameter`: `===`, `!==`, `has`, `notHas`.
- `input` operand `{ "type": "input", "id": "<element id>" }`. Its source decides the predicate:
  - text, email or phone Input: `===`, `!==`, `has`, `notHas`
  - number Input: `===`, `!==`, `>`, `<`
  - single-select Options: `in`, `notIn`
  - multi-select Options (`props.multi: true`): `has`, `notHas`, `===`, `selected`,
    `selectedAtLeast`
- `empty` / `notEmpty` fit every operand. "Any answer given" is
  `{ "type": "notEmpty", "left": { "type": "input", "id": "<element id>" } }`, never an `||` over
  every option.
- Compare Options answers by **option id**: `"right": { "type": "const", "value": ["<option id>"] }`
  for `in` / `notIn`, `"value": "<option id>"` for `has` / `notHas`.

## Variables in text

Text can embed `{{name}}`, which is substituted at runtime:
- `{{<customId>}}` of an Input or Options element (a raw element id also works). An Options answer
  renders its option label.
- `{{query.<param>}}` for URL parameters.
- `{{countdown}}` inside a Timer's own `text` / `buttonText`.
- Names the funnel reserves, with no element behind them: `{{user.<field>}}`, `{{inputs.<name>}}`,
  `{{email}}`, `{{checkout}}`, `{{_USERID_}}`, `{{_password_}}` and `{{firebase-password}}`. Use
  them only when the funnel already does or the user asks.

A placeholder with no source renders literally, and the server rejects new ones. Reference only
inputs that exist. When you rename a `customId` or delete an input, update every `{{…}}` that used it.
