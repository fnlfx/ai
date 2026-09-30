// WCAG contrast of the theme's text/background pairs, on the look the funnel renders:
// theme with localThemeOverrides laid over it, key by key.
//   lowContrast(doc) -> ["option.activeTextColor #f8fafc on option.activeBgColor #f2552c = 3.28:1, needs 4.5:1", ...]

// [text key, background key, minimum ratio]: 4.5 for body text, 3 for the bold button label.
const PAIRS = [
  ['app.colorText', 'app.backgroundColor', 4.5],
  ['h1.color', 'app.backgroundColor', 4.5],
  ['h2.color', 'app.backgroundColor', 4.5],
  ['paragraph.color', 'app.backgroundColor', 4.5],
  ['option.color', 'option.backgroundColor', 4.5],
  ['option.activeTextColor', 'option.activeBgColor', 4.5],
  ['card.color', 'card.backgroundColor', 4.5],
  ['button.color', 'button.backgroundColor', 3],
];

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function effective(doc) {
  const theme = isObj(doc?.theme) ? doc.theme : {};
  const out = {};
  for (const g of new Set([...Object.keys(theme), ...Object.keys(doc?.localThemeOverrides ?? {})])) {
    out[g] = { ...(isObj(theme[g]) ? theme[g] : {}), ...(isObj(doc?.localThemeOverrides?.[g]) ? doc.localThemeOverrides[g] : {}) };
  }
  return out;
}

// #rgb / #rrggbb only; anything else (empty, alpha, not a colour) is skipped, not judged.
function luminance(hex) {
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
  if (!m) return NaN;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function lowContrast(doc) {
  const t = effective(doc);
  const hex = (key) => { const [g, k] = key.split('.'); return t[g]?.[k]?.value; };
  return PAIRS.flatMap(([fg, bg, min]) => {
    const r = ratio(hex(fg), hex(bg));
    return r < min ? [`${fg} ${hex(fg)} on ${bg} ${hex(bg)} = ${r.toFixed(2)}:1, needs ${min}:1`] : [];
  });
}
