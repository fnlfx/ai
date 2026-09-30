# Theme: colours, fonts and the funnel-wide look

Read this before any change to how the whole funnel looks: rebrand, new colours, new font, rounder
buttons, dark mode.

## Three fields, one rule

- `theme`: a **snapshot** of the project theme the funnel uses (every group, every key). It is not
  yours to edit. The editor refreshes every key you have not overridden from the project theme each
  time the funnel opens, so an edit here is overwritten in the editor, while the published funnel
  keeps showing it: the two disagree. Uploads that change `theme` are refused.
- `themeId`: which project theme the funnel follows. Never change or remove it. Uploads that change
  it are refused.
- `localThemeOverrides`: **the funnel's own look.** A sparse copy of the theme's shape: only the
  groups and keys you want different. A key present here is "touched": the editor keeps it, and it
  wins over the snapshot everywhere (editor, preview, published funnel).

Effective look = `theme` with `localThemeOverrides` laid over it, key by key. Each leaf is replaced
whole (`{ "value": …, "unit": … }`), never merged inside.

- To change a key: set it in `localThemeOverrides.<group>.<key>`.
- To go back to the project theme for a key: delete it from `localThemeOverrides`. When a group
  becomes empty, delete the group too; empty groups are not allowed.
- `fonts` lists the project's uploaded fonts. Never edit it.

`funnel_design_get` delivers `theme` exactly as the editor shows it on open, so what you read is the
base your overrides land on. Leave `theme` and `themeId` exactly as delivered.

## Groups hold copies, not links

Every group has its own colour keys. They start as copies of the `app` colours but are separate
values: changing `app.colorPrimary` alone does not recolour buttons, selected options or the
progress bar. For a new brand, set the keys of every group that shows the brand.

**Rebrand key set** (all colours are `{ "value": "#RRGGBB", "unit": "hex" }`; 8-digit `#RRGGBBAA`
works too):

| Group | Keys |
|---|---|
| `app` | `backgroundColor`, `colorPrimary`, `colorSecondary`, `colorText`, `fontFamily` (font leaf) |
| `button` | `backgroundColor`, `color` (label), `borderRadius` (`{ "value": 16, "unit": "px" }`) |
| `option` (quiz answers) | `backgroundColor`, `borderColor`, `color`, `activeBorderColor`, `activeBgColor`, `activeTextColor` |
| `card` | `backgroundColor`, `color` |
| `h1`, `h2`, `paragraph`, `link` | `color` |
| `input` | `borderColor`, `focusBorderColor` |
| `progressBar` | `lineColor`, `lineBgColor` |
| `loader` | `colorStart`, `colorEnd` |

Other keys exist (sizes, weights, padding, `app.colorTextOnPrimary`, `input.backgroundColor`,
`h3`, …); they follow the shapes in `props.md`. Add them when the brand needs them, for example on
a dark background, where inputs keep a light `input.backgroundColor` unless you change it and
`input.color` too.

<!-- s5:theme -->
## Contrast

`scripts/upload.mjs` refuses an upload whose overrides make one of these pairs fail, and names the
pair and ratio. Check contrast of every text/background pair you set, by arithmetic, not by eye, and pick a
text colour that passes (WCAG contrast ratio at least 4.5:1 for body text, 3:1 for large or bold
text): `button.color` on `button.backgroundColor`, `option.color` on `option.backgroundColor`,
`option.activeTextColor` on `option.activeBgColor`, `card.color` on `card.backgroundColor`, text
and heading colours on `app.backgroundColor`, `input.color` on `input.backgroundColor`. Selected
states matter most: a static screenshot shows no option selected, so a failing active pair (white
on a mid-tone brand colour) never shows up in it. A brand accent too light for white text gets a
dark text colour, or a pale tint of the accent as the selected background.

## Dark or saturated surfaces

The rebrand key set assumes a light page. On a dark or strongly coloured background also set the
keys that otherwise stay dark-on-light:

- `progressBar.backColor` (the back arrow), `progressBar.textColor` and the `counter*Color` keys;
  `progressBar.lineBgColor` visible against the background but quieter than `lineColor`.
- `loader.colorStart` and `loader.colorEnd` both brand tones (a gradient that ends in the text or
  background colour reads as a leftover), `loader.colorBg`, `loader.colorText`.
- `option`, `card` and `input` surfaces a step lighter than the page, with their text colours,
  including `input.backgroundColor`, `input.color` and `input.placeholderColor`.
- `app.colorPrimary`, `app.colorSecondary` and `app.colorTextOnPrimary`: elements without a group
  of their own (list markers, spinners, some badges and accents) read these, so the secondary
  colour must also work on the background.

One dark screen in a light funnel (a hero or welcome screen): set its `styles.container`
`backgroundColor` and the same header keys in the screen's `styles.progressBar` (`backColor`,
`textColor`, `lineColor`, `lineBgColor`), plus the colours of the elements on it.

Elements with their own colour styles (price tags, badges, spinners, list markers) ignore the
theme; after a rebrand, find their `styles` colours with `jq` and set them to the brand palette.
<!-- /s5:theme -->

## Fonts

Set the family in `app.fontFamily` **and** in `h1.fontFamily`, `h2.fontFamily` and
`paragraph.fontFamily` (also `h3.fontFamily` if the funnel uses h3). `app.fontFamily` sets the
page's font, but a font is only loaded when a text group (`h1`, `h2`, `h3`, `paragraph`) or an
element style names it. With only `app.fontFamily` set, the funnel falls back to a system font.

A Google font leaf: `{ "value": "<exact family>", "unit": "google", "meta": "<category>" }`, for
example `{ "value": "Nunito", "unit": "google", "meta": "sans-serif" }`. `value` must be a Google
Fonts family name spelled exactly as on fonts.google.com; `meta` is its category: `sans-serif`,
`serif`, `display`, `handwriting` or `monospace`. `{ "value": "inherit", "unit": "inherit" }` means
"use the parent's font". Fonts the project uploaded (`unit: "user"`) are listed in `fonts`; use one
only by copying a leaf that already names it. A brand whose own font is not on Google Fonts gets
the closest Google family; say which one you picked in your report.

## What wins

Element `styles.*` beat screen `styles.container` (and screen `styles.progressBar`), which beat the
theme. So after a theme change, elements and screens that carry their own colours keep them. Check
for them (`jq` on `styles` of the screens you care about, or a screenshot) and decide per case.

Use element or screen styles only for deliberate one-off exceptions (one highlighted plan, one
dark hero screen). For a look that should apply funnel-wide, use `localThemeOverrides`, and remove
the one-off style copies that would fight it only when the goal says the whole funnel should
match.

## Worked example: rebrand to a green, rounded brand

Brand: green `#58CC02`, light green `#89E219`, text `#4B4B4B`, white background, light grey
surfaces `#F7F7F7` and borders `#E5E5E5`, blue accent `#1CB0F6`, rounded type (Nunito as the Google
stand-in for the brand font). White on the bright green is 2.1:1 and the blue on white 2.4:1, so
button fills and link text use deeper shades of the same hues (`#3C7F00`, 5.0:1; `#0A6FA3`, 5.5:1).

```js
const hex = (value) => ({ value, unit: 'hex' });
const nunito = { value: 'Nunito', unit: 'google', meta: 'sans-serif' };
const brand = {
  app: { backgroundColor: hex('#FFFFFF'), colorPrimary: hex('#58CC02'), colorSecondary: hex('#89E219'),
         colorText: hex('#4B4B4B'), fontFamily: nunito },
  button: { backgroundColor: hex('#3C7F00'), color: hex('#FFFFFF'), borderRadius: { value: 16, unit: 'px' } },
  option: { backgroundColor: hex('#FFFFFF'), borderColor: hex('#E5E5E5'), color: hex('#4B4B4B'),
            activeBorderColor: hex('#58CC02'), activeBgColor: hex('#D7FFB8'), activeTextColor: hex('#4B4B4B') },
  card: { backgroundColor: hex('#F7F7F7'), color: hex('#4B4B4B') },
  h1: { color: hex('#4B4B4B'), fontFamily: nunito },
  h2: { color: hex('#4B4B4B'), fontFamily: nunito },
  paragraph: { color: hex('#4B4B4B'), fontFamily: nunito },
  link: { color: hex('#0A6FA3') },
  input: { borderColor: hex('#E5E5E5'), focusBorderColor: hex('#1CB0F6') },
  progressBar: { lineColor: hex('#58CC02'), lineBgColor: hex('#E5E5E5') },
  loader: { colorStart: hex('#58CC02'), colorEnd: hex('#89E219') },
};
// Merge into existing overrides group by group; keep keys the funnel already overrides.
d.localThemeOverrides ??= {};
for (const [g, keys] of Object.entries(brand)) d.localThemeOverrides[g] = { ...d.localThemeOverrides[g], ...keys };
```

Run it inside the usual `node -e` edit script (read `design.json`, change `d`, write it back). Then
upload and save.
<!-- s5:shots -->
Before saving, screenshot a few screens (question, paywall) to check contrast and the font.
<!-- /s5:shots -->
