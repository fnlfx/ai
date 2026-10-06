#!/usr/bin/env node
// Structure index of a FunnelFox design, so you never read the JSON whole.
//   node index.mjs <design.json>                   overview: every screen in order + warnings
//   node index.mjs <design.json> --screen <id|#n>  one screen: its elements as a tree with text previews
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Types that make a screen worth noticing; the rest (Text, Image, Button, Container, List) is layout.
const QUIET = new Set(['Text', 'Image', 'Button', 'Container', 'List']);

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const plain = (s) => String(s ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const q = (s, n = 60) => JSON.stringify(clip(plain(s), n));

/** Flatten tree to [{id, group}] in order. */
function treeScreens(tree) {
  const out = [];
  for (const item of arr(tree)) {
    if (!isObj(item)) continue;
    if (item.type === 'Group') for (const c of arr(item.children)) out.push({ id: c?.id, group: item.title ?? item.id });
    else out.push({ id: item.id, group: null });
  }
  return out;
}

/** Every navigate action under v: {kind:'next'|'screen'|'branch', target?, source?, key?}. */
function navigates(v, out = []) {
  if (Array.isArray(v)) { for (const x of v) navigates(x, out); return out; }
  if (!isObj(v)) return out;
  if (v.type === 'navigate' && isObj(v.payload)) {
    const p = v.payload;
    if (p.type === 'const') out.push(p.value == null ? { kind: 'next' } : { kind: 'screen', target: p.value });
    else if (p.type === 'switch_input_value' || p.type === 'switch_traffic_type')
      for (const t of arr(p.values)) out.push({ kind: 'branch', source: p.inputId ?? p.type, key: t?.[0], target: t?.[1] ?? null });
  }
  for (const x of Object.values(v)) navigates(x, out);
  return out;
}

// ---------- Raw code ----------

// Only a whole literal argument counts. goToId('a' + x), goToId(`a${x}`), goToId('{{v}}') (filled in before the
// script runs) and goToIndex(i) are computed (→ ?).
const LITERAL = String.raw`(['"\x60])([^'"\x60\\\n]*)`;
const FOX_NAV = new RegExp(String.raw`\bfox\s*\??\.\s*navigation\s*\??\.\s*(\w+)\s*(?:\?\.)?\s*\(\s*(?:${LITERAL}\2\s*\)|(\d+)\s*\))?`, 'g');
const FOX_NAV_REF = /\bfox\s*\??\.\s*navigation\b/g;
const FOX_INPUT = new RegExp(String.raw`\bfox\s*\??\.\s*inputs\s*\??\.\s*(?:get|set)\s*(?:\?\.)?\s*\(\s*(?:${LITERAL}\1\s*[,)])?`, 'g');
// Where JS runs: <script> bodies, on…= attributes, javascript: links.
const JS_REGIONS = /<script\b[^>]*>([\s\S]*?)<\/script\s*>|\son\w+\s*=\s*(?:"([^"]*)"|'([^']*)')|\bhref\s*=\s*(?:"javascript:([^"]*)"|'javascript:([^']*)')/gi;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const computed = (s) => s == null || s.includes('${') || s.includes('{{');
const ENTITIES = { quot: '"', '#34': '"', '#x22': '"', apos: "'", '#39': "'", '#x27': "'", amp: '&', lt: '<', gt: '>' };
const decodeEntities = (s) => s.replace(/&(quot|apos|amp|lt|gt|#34|#39|#x22|#x27);/gi, (_, e) => ENTITIES[e.toLowerCase()]);
// A '/' after one of these (or at the start, or after these keywords) opens a regex literal, not a division.
const REGEX_BEFORE = new Set('(,=:[!&|?{};+-*%<>~^');
const REGEX_KEYWORD = /\b(?:return|typeof|case|in|of|void|delete|new|throw)$/;

// JS with line and block comments removed. Strings and regex literals are copied as they are, so '//' in a URL or a
// quote in /'/g changes nothing.
function stripComments(js) {
  let out = '', prev = '';
  for (let i = 0, quote = null; i < js.length; i++) {
    const c = js[i];
    if (quote) {
      out += c;
      if (c === '\\') out += js[++i] ?? '';
      else if (c === quote) { quote = null; prev = c; }
    } else if (c === '/' && js[i + 1] === '/') {
      while (i < js.length && js[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && js[i + 1] === '*') {
      const end = js.indexOf('*/', i + 2);
      i = end < 0 ? js.length : end + 1;
      out += ' ';
    } else if (c === '/' && (prev === '' || REGEX_BEFORE.has(prev) || REGEX_KEYWORD.test(out.trimEnd()))) {
      let j = i + 1;
      for (let cls = false; j < js.length && js[j] !== '\n'; j++) {
        if (js[j] === '\\') j++;
        else if (js[j] === '[') cls = true;
        else if (js[j] === ']') cls = false;
        else if (js[j] === '/' && !cls) break;
      }
      out += js.slice(i, j + 1);
      i = j;
      prev = '/';
    } else {
      if (c === "'" || c === '"' || c === '`') quote = c;
      out += c;
      if (!/\s/.test(c)) prev = c;
    }
  }
  return out;
}

/** The JS that runs in a Raw element's __html, outside HTML comments, with JS comments removed. `runs`: any at all. */
function rawJs(html) {
  const parts = [...String(html ?? '').replace(HTML_COMMENT, ' ').matchAll(JS_REGIONS)].map((m) => {
    const k = m.findIndex((x, n) => n > 0 && x != null);
    return k === 1 ? m[1] : decodeEntities(m[k]); // attribute values are HTML-encoded, a script body is not
  });
  return { runs: parts.length > 0, js: parts.map(stripComments).join('\n') };
}

/** fox.navigation calls in Raw JS: {kind: 'next'|'back'|'id'|'index'|'computed', ref?, index?}. */
function rawNavigation(js) {
  const matches = [...js.matchAll(FOX_NAV)];
  const calls = matches.map(([, m, , ref, index]) => {
    if (m === 'goNext' || m === 'navigateToNext') return { kind: 'next' };
    if (m === 'goBack' || m === 'navigateToBack') return { kind: 'back' };
    if ((m === 'goToId' || m === 'navigateToId') && !computed(ref)) return { kind: 'id', ref };
    if (m === 'goToIndex' && index != null) return { kind: 'index', index: Number(index) };
    return ['goToId', 'navigateToId', 'goToIndex', 'navigateToScreen'].includes(m) ? { kind: 'computed' } : null;
  }).filter(Boolean);
  // fox.navigation used another way (an alias, a destructured method) navigates somewhere unknown.
  if ((js.match(FOX_NAV_REF) ?? []).length > matches.length) calls.push({ kind: 'computed' });
  return calls;
}

/** Every fox.navigation call of a screen's Raw elements, with the element. */
const rawCalls = (s) => arr(s?.elements).filter((e) => e?.type === 'Raw')
  .flatMap((e) => rawNavigation(rawJs(e.props?.__html).js).map((c) => ({ ...c, el: e.id })));

// Where a Raw call leads: 'next', 'back', '?', or the 0-based screen index (-1: no such screen). As the runtime
// resolves fox.navigation: goToId takes the first screen whose id or customId matches; goToIndex is 0-based.
const rawDest = (screens, c) => {
  if (c.kind === 'next' || c.kind === 'back') return c.kind;
  if (c.kind === 'computed') return '?';
  if (c.kind === 'index') return screens[c.index] ? c.index : -1;
  return screens.findIndex((x) => x?.id === c.ref || x?.customId === c.ref);
};
const missingRef = (c) => (c.kind === 'id' ? c.ref : `goToIndex(${c.index})`);
/** The overview's label for a Raw call (#3, MISSING:x); `long` adds the screen id, as the --screen view shows it. */
const rawLabel = (screens, c, long = false) => {
  const d = rawDest(screens, c);
  if (typeof d === 'string') return d;
  if (d < 0) return `MISSING${long ? ' ' : ':'}${missingRef(c)}`;
  return long ? `#${d + 1} ${screens[d].id}` : `#${d + 1}`;
};

const dupes = (ids) => [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

function hierarchyIds(node, out = []) {
  if (!isObj(node)) return out;
  if (typeof node.id === 'string' && node.id !== '__root__') out.push(node.id);
  for (const c of arr(node.children)) hierarchyIds(c, out);
  return out;
}

export function warnings(doc) {
  const w = [];
  const screens = arr(doc.screens);
  const ids = screens.map((s) => s?.id);
  const idSet = new Set(ids);
  for (const d of dupes(ids)) w.push(`duplicate screen id ${d}`);
  const tIds = treeScreens(doc.tree).map((t) => t.id);
  for (const d of dupes(tIds)) w.push(`tree lists screen ${d} twice`);
  for (const id of tIds) if (!idSet.has(id)) w.push(`tree lists ${id}, which is not in screens[]`);
  const tSet = new Set(tIds);
  for (const id of ids) if (!tSet.has(id)) w.push(`screen ${id} is missing from tree`);
  if (tIds.length === ids.length && tIds.some((id, i) => id !== ids[i]) && ids.every((id) => tSet.has(id)))
    w.push('tree order differs from screens[] order (the editor would rebuild tree flat and drop groups)');
  for (const s of screens) {
    const els = arr(s?.elements).map((e) => e?.id);
    for (const d of dupes(els)) w.push(`screen ${s.id}: duplicate element id ${d}`);
    const h = hierarchyIds(s?.hierarchy);
    const hSet = new Set(h), eSet = new Set(els);
    for (const id of h) if (!eSet.has(id)) w.push(`screen ${s.id}: hierarchy names unknown element ${id}`);
    for (const id of els) if (!hSet.has(id)) w.push(`screen ${s.id}: element ${id} is not in hierarchy`);
    for (const n of navigates(s)) if (n.target != null && !idSet.has(n.target)) w.push(`screen ${s.id}: navigates to missing screen ${n.target}`);
    for (const c of rawCalls(s)) if (rawDest(screens, c) === -1)
      w.push(`screen ${s.id}: Raw ${c.el} navigates to missing screen ${missingRef(c)}`);
  }
  return [...new Set(w)];
}

const isLegal = (e) => Boolean(e?.__llm?.legal);

function screenLine(s, i, pos, screens) {
  const els = arr(s.elements);
  const counts = {};
  for (const e of els) if (!QUIET.has(e?.type)) counts[e.type] = (counts[e.type] ?? 0) + 1;
  const legal = els.filter(isLegal).length;
  const notable = Object.entries(counts).map(([t, n]) => (n > 1 ? `${t}×${n}` : t));
  if (legal) notable.push(`legal×${legal}`);
  const where = (t) => (pos.has(t) ? `#${pos.get(t)}` : `MISSING:${t}`);
  const nav = new Set();
  const branches = {};
  for (const n of navigates(s.elements)) {
    if (n.kind === 'next') nav.add('next');
    else if (n.kind === 'screen') nav.add(where(n.target));
    else (branches[n.source] ??= []).push(`${n.key}→${n.target == null ? 'next' : where(n.target)}`);
  }
  const raw = new Set(rawCalls(s).map((c) => rawLabel(screens, c)));

  const customId = s.customId && s.customId !== s.title ? ` [${s.customId}]` : '';
  const type = s.props?.type && s.props.type !== 'default' ? ` (${s.props.type})` : '';
  let line = `#${i + 1} ${s.id} ${q(s.title ?? '', 40)}${customId}${type} · ${els.length} el`;
  if (notable.length) line += ` · ${notable.join(' ')}`;
  if (nav.size) line += ` · → ${[...nav].join(',')}`;
  if (raw.size) line += ` · raw → ${[...raw].join(',')}`;
  for (const [src, list] of Object.entries(branches)) line += `\n    branch on ${src}: ${[...new Set(list)].join(' ')}`;
  for (const e of els) {
    const cid = e?.customId ? `[${e.customId}]` : '';
    if (e?.type === 'Options') {
      const ids = arr(e.props?.options).map((o) => o?.id).join(',');
      line += `\n    options ${e.id}${cid}${e.props?.multi ? ' multi' : ''}: ${ids}`;
    }
    if (e?.type === 'Input') line += `\n    input ${e.id}${cid} ${e.props?.type ?? ''}`;
  }
  return line;
}

/** max caps the screen lines (warnings still cover every screen); more is appended to the "… N more screens" line. */
export function indexText(doc, { max = Infinity, more = '' } = {}) {
  const screens = arr(doc.screens);
  const pos = new Map(screens.map((s, i) => [s?.id, i + 1]));
  const group = new Map(treeScreens(doc.tree).map((t) => [t.id, t.group]));
  const lines = [`scheme ${doc.schemeVersion} · ${screens.length} screens (screens[] order = funnel order; → next = following screen; raw → = fox.navigation in Raw code)`];
  let last;
  screens.slice(0, max).forEach((s, i) => {
    const g = group.get(s?.id) ?? null;
    if (g !== last && g) lines.push(`[group ${q(g, 40)}]`);
    last = g;
    lines.push(screenLine(s, i, pos, screens));
  });
  if (screens.length > max) lines.push(`… ${screens.length - max} more screens${more ? `: ${more}` : ''}`);
  const w = warnings(doc);
  if (!w.length) lines.push('no structural warnings');
  else {
    lines.push(`WARNINGS (${w.length}):`, ...w.slice(0, 30).map((x) => `  - ${x}`));
    if (w.length > 30) lines.push(`  … ${w.length - 30} more`);
  }
  return lines.join('\n');
}

// ---------- one screen ----------

/** Raw: size, script flag, visible text, fox.navigation targets, fox.inputs names, {{variables}}. */
function rawPreview(html, screens) {
  const code = String(html ?? '');
  const text = plain(code.replace(HTML_COMMENT, ' ').replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' '));
  const { runs, js } = rawJs(code);
  const nav = rawNavigation(js).map((c) => `→ ${rawLabel(screens, c, true)}`);
  const inputs = [...new Set([...js.matchAll(FOX_INPUT)].map(([, , name]) => (computed(name) ? '?' : name)))];
  const vars = [...new Set([...code.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((m) => m[1]))];
  return [
    `[custom html ${code.length} chars${runs ? ', script' : ''}]`,
    text && q(text, 60),
    ...new Set(nav),
    inputs.length && `inputs=${inputs.join(',')}`,
    vars.length && `vars=${vars.join(',')}`,
  ].filter(Boolean).join(' ');
}

function preview(e, screens) {
  const p = e.props ?? {};
  switch (e.type) {
    case 'Text': return q(p.content, 90) + (p.contentType === 'html' ? ' html' : '') + (p.type ? ` ${p.type}` : '');
    case 'Button': return q(p.text);
    case 'Image': return `${q(p.alt ?? '', 40)} ${String(p.url ?? '').startsWith('data:') ? '[inline data url]' : clip(String(p.url ?? ''), 60)}`;
    case 'Input': return `${p.type ?? ''} ${q(p.placeholder ?? '', 40)}`;
    case 'Plan': {
      const old = p.oldPrice ? ` old=${q(p.oldPrice, 20)}` : '';
      return `${q(p.title ?? '', 30)} price=${q(p.price ?? '', 30)} today=${q(p.priceBlock?.price ?? '', 20)} renew=${q(p.priceBlock?.label ?? '', 30)}${old}`;
    }
    case 'Timer': {
      const duration = typeof p.duration === 'object' ? JSON.stringify(p.duration) : p.duration ?? '';
      return `${q(p.text ?? '', 50)} ${duration}${p.persistent ? ' persistent' : ''}`;
    }
    case 'List': return `${arr(p.items).length} items: ${arr(p.items).slice(0, 3).map((x) => q(x?.text ?? '', 30)).join(' ')}`;
    case 'Raw': return rawPreview(p.__html, screens);
    default: return '';
  }
}

const alwaysShown = (expr) => expr.type === 'const' && expr.value === true;

/** Screen number from "#3" / "3" (unless a screen is literally called that), else the index of that id. */
function screenIndex(screens, sel) {
  const isPosition = /^#?\d+$/.test(sel) && !screens.some((s) => s?.id === sel);
  return isPosition ? Number(sel.replace('#', '')) - 1 : screens.findIndex((s) => s?.id === sel);
}

function screenHeader(s, i) {
  const header = Object.entries(s.props?.header ?? {})
    .filter(([, v]) => v && typeof v !== 'object')
    .map(([k, v]) => (v === true ? k : `${k}=${clip(String(v), 30)}`))
    .join(' ');
  const customId = s.customId ? ` [${s.customId}]` : '';
  const autoNav = s.props?.autoNavigation?.enabled ? ' · autoNavigation' : '';
  return `#${i + 1} ${s.id} ${q(s.title ?? '', 60)}${customId} type=${s.props?.type ?? 'default'} · header: ${header || '-'}${autoNav}`;
}

function elementFlags(e) {
  const flags = [];
  if (isLegal(e)) flags.push('LEGAL');
  if (e.styles?.container?.position?.value === 'fixed') flags.push('fixed');
  if (e.visibility && !alwaysShown(e.visibility)) flags.push(e.visibility.type === 'const' ? 'hidden' : 'visible-if');
  return flags;
}

function optionLine(o, pad) {
  const value = o?.value && o.value !== o.id ? ` value=${o.value}` : '';
  const hidden = o?.visible && !alwaysShown(o.visible) ? ' {hidden/conditional}' : '';
  return `${pad}  - ${o?.id} ${q(o?.text ?? '', 50)}${value}${hidden}`;
}

export function screenText(doc, sel) {
  const screens = arr(doc.screens);
  const i = screenIndex(screens, sel);
  const s = screens[i];
  if (!s) throw new Error(`no screen ${sel} (give a screen id or a 1-based position like #3)`);
  const pos = new Map(screens.map((x, k) => [x?.id, k + 1]));
  const byId = new Map(arr(s.elements).map((e) => [e?.id, e]));
  const lines = [screenHeader(s, i)];
  const target = (t) => (t == null ? 'next' : pos.has(t) ? `#${pos.get(t)} ${t}` : `MISSING ${t}`);
  const walk = (node, depth) => {
    for (const c of arr(node?.children)) {
      const e = byId.get(c?.id);
      const pad = '  '.repeat(depth);
      if (!e) { lines.push(`${pad}${c?.id} (in hierarchy, no such element)`); continue; }
      byId.delete(c.id);
      const flags = elementFlags(e);
      const nav = navigates(e.props).map((n) => (n.kind === 'branch' ? `${n.key}→${target(n.target)}` : `→ ${target(n.target)}`));
      const customId = e.customId ? ` [${e.customId}]` : '';
      const flagText = flags.length ? ` {${flags.join(',')}}` : '';
      const navText = nav.length ? ` ${[...new Set(nav)].join(' ')}` : '';
      lines.push(`${pad}${e.id} ${e.type}${customId} ${preview(e, screens)}${flagText}${navText}`.trimEnd());
      if (e.type === 'Options') for (const o of arr(e.props?.options)) lines.push(optionLine(o, pad));
      walk(c, depth + 1);
    }
  };
  walk(s.hierarchy, 1);
  for (const [id, e] of byId) lines.push(`  ${id} ${e?.type} (NOT in hierarchy)`);
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [file, flag, sel] = process.argv.slice(2);
  if (!file || (flag && flag !== '--screen') || (flag && !sel)) {
    console.error('usage: node index.mjs <design.json> [--screen <id|#n>]');
    process.exit(2);
  }
  try {
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    console.log(flag ? screenText(doc, sel) : indexText(doc));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
