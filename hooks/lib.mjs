// Shared by the hooks. They lean on the editing-funnels skill's scripts (index, kit scheme); a hook
// that cannot load them fails open, and the model follows the skill's manual steps instead.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { kitMismatch } from '../skills/editing-funnels/scripts/kit.mjs';

export const SKILL = fileURLToPath(new URL('../skills/editing-funnels/', import.meta.url));
export const INDEX = `${SKILL}scripts/index.mjs`;

export async function readStdin() {
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  return JSON.parse(s);
}

/** The tool result arrives as a JSON string, an MCP content array, or an object; find the object `is` accepts in it. */
export function findResult(v, is, depth = 0) {
  if (depth > 6 || v == null) return null;
  if (typeof v === 'string') {
    try { return findResult(JSON.parse(v), is, depth + 1); } catch { return null; }
  }
  if (typeof v !== 'object') return null;
  if (!Array.isArray(v) && is(v)) return v;
  for (const x of Object.values(v)) {
    const d = findResult(x, is, depth + 1);
    if (d) return d;
  }
  return null;
}

export const SAFE_ID = /^[0-9A-Za-z_-]+$/;

/**
 * funnelfox/<funnel_id>/ under the project dir, created if needed. The first time it creates
 * funnelfox/, it adds funnelfox/.gitignore (`*`) so no design or screenshot gets committed.
 */
export function funnelDir(input, funnelId) {
  const root = join(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd(), 'funnelfox');
  const dir = join(root, funnelId);
  const firstUse = !existsSync(root);
  mkdirSync(dir, { recursive: true });
  if (firstUse) writeFileSync(join(root, '.gitignore'), '*\n');
  return dir;
}

export const emit = (hookSpecificOutput) => process.stdout.write(JSON.stringify({ hookSpecificOutput }));

export async function loadIndex() {
  try { return await import(pathToFileURL(INDEX).href); } catch { return null; }
}

/** null when the kit can judge this doc; otherwise why not (the server still validates every save). */
export function kitProblem(doc) {
  const why = kitMismatch(doc?.schemeVersion);
  return why && `${why}; the server still validates on funnel_design_update`;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Key-order-insensitive equality, so a server re-serialization still counts as the same design. */
export function deepEqual(a, b) {
  if (a === b) return true;
  const bothObjects = typeof a === 'object' && typeof b === 'object' && a !== null && b !== null;
  if (!bothObjects || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => k !== '__system');
  const kb = Object.keys(b).filter((k) => k !== '__system');
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
}

function label(s) {
  const title = s.title ? ` "${String(s.title).slice(0, 40)}"` : '';
  return `${s.id}${title}`;
}

/** Up to 8 ids, then a count of the rest. */
function capIds(ids) {
  const more = ids.length > 8 ? `,…(${ids.length})` : '';
  return ids.slice(0, 8).join(',') + more;
}

/** What differs inside one screen that exists in both designs, e.g. "edited t1; added b2; props". */
function screenChanges(o, c) {
  const oe = new Map((o.elements ?? []).map((e) => [e?.id, e]));
  const ce = new Map((c.elements ?? []).map((e) => [e?.id, e]));
  const added = [...ce.keys()].filter((id) => !oe.has(id));
  const removed = [...oe.keys()].filter((id) => !ce.has(id));
  const edited = [...ce.keys()].filter((id) => oe.has(id) && !same(oe.get(id), ce.get(id)));
  const parts = [];
  if (edited.length) parts.push(`edited ${capIds(edited)}`);
  if (added.length) parts.push(`added ${capIds(added)}`);
  if (removed.length) parts.push(`removed ${capIds(removed)}`);
  for (const k of ['title', 'customId', 'props', 'styles', 'hierarchy']) if (!same(o[k], c[k])) parts.push(k);
  return parts.join('; ') || 'changed';
}

/** Short human summary of what differs between two designs, screen by screen. */
export function changes(orig, cur) {
  const os = Array.isArray(orig?.screens) ? orig.screens : [];
  const cs = Array.isArray(cur?.screens) ? cur.screens : [];
  const oById = new Map(os.map((s) => [s?.id, s]));
  const cById = new Map(cs.map((s) => [s?.id, s]));
  const out = [];

  const added = cs.filter((s) => !oById.has(s?.id));
  const removed = os.filter((s) => !cById.has(s?.id));
  if (added.length) out.push(`added screens: ${added.map(label).join(', ')}`);
  if (removed.length) out.push(`removed screens: ${removed.map(label).join(', ')}`);

  const keptOrigOrder = os.filter((s) => cById.has(s?.id)).map((s) => s.id);
  const keptCurOrder = cs.filter((s) => oById.has(s?.id)).map((s) => s.id);
  if (!same(keptOrigOrder, keptCurOrder)) out.push('screen order changed');

  const changed = [];
  for (const c of cs) {
    const o = oById.get(c?.id);
    if (o && !same(o, c)) changed.push(`  ${label(c)}: ${screenChanges(o, c)}`);
  }
  if (changed.length) {
    const shown = changed.slice(0, 25);
    if (changed.length > 25) shown.push(`  … ${changed.length - 25} more`);
    out.push(`changed screens (${changed.length}):\n${shown.join('\n')}`);
  }

  const topKeys = new Set([...Object.keys(orig ?? {}), ...Object.keys(cur ?? {})]);
  const top = [...topKeys].filter((k) => k !== 'screens' && !same(orig?.[k], cur?.[k]));
  if (top.length) out.push(`other top-level keys changed: ${top.join(', ')}`);

  return out.length ? out.join('\n') : 'no changes';
}
