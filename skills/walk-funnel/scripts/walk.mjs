#!/usr/bin/env node
// One random walk through a saved funnel version, as a visitor on a phone: from the first screen to
// the first paywall or checkout, answering every question, never paying.
//   node walk.mjs <preview_url> [--seed <n>] [--answer <element_id>=<option|text|YYYY-MM-DD>]...
//                                            [--answer <screen_id>=<button text>]...
// Answers are random from the seed unless pinned; inputs get test data by type. Prints the outcome,
// the seed and one line per screen; saves walk.json and one PNG per step to
// funnelfox/<funnel_id>/walks/<version>-<seed>/ (the last 5 walks per funnel are kept).
// Headless Chrome like shot.mjs (chrome.mjs): throwaway profile, trackers blocked, no window.
import { randomInt } from 'node:crypto';
import { mkdirSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs as parseFlags } from 'node:util';
import { SAFE_ID, funnelDir } from '../../../hooks/lib.mjs';
import { NO_CHROME, capture, fetchPreviewData, findChrome, launch, navigate, openTab, parsePreview, previewPrototype, settle, sleep, sweepProfiles } from '../../screenshot-funnel/scripts/chrome.mjs';

export const MAX_STEPS = 40;
export const KEEP_WALKS = 5;
const SCREEN_CAP_MS = 15_000;
const NAV_WAIT_MS = 10_000;
const AUTO_WAIT_MS = 60_000;
const ENABLE_WAIT_MS = 3_000;
const AUTO = '(moves on by itself)';
const USAGE = 'usage: node walk.mjs <preview_url> [--seed <n>] [--answer <element_id>=<answer>]...';

// Screens that end the walk: anything that sells.
const PAYWALL_TYPES = new Set(['Plans', 'PriceOptions', 'Checkout', 'WalletButton', 'Plan']);
const AUTH_TYPES = new Set(['Authorization', 'OAuthButton']);
// Moves on by itself once its animation ends.
const AUTO_TYPES = new Set(['Loader', 'Processing']);
// Need a visitor's hand but the walk cannot work them.
const UNSUPPORTED_TYPES = new Set(['Scratch', 'Raw']);

/** Deterministic 32-bit PRNG (mulberry32): same seed, same answers. */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n) => Math.floor(next() * n);
  return { int, pick: (xs) => xs[int(xs.length)], between: (lo, hi) => lo + int(hi - lo + 1) };
}

/** Visible text of option/button copy: no tags, single spaces, lower case. */
export const plain = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
export const norm = (s) => plain(s).toLowerCase();

/** Does visible text match a design label? {{variables}} in the label match anything. */
export function labelMatches(label, visible) {
  const parts = norm(label).split(/\{\{[^}]*\}\}/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${parts.join('.*')}$`).test(norm(visible));
}

/** argv → { preview, seed, pins: Map<id, string[]> }; throws with a usage message. */
export function parseArgs(argv) {
  let parsed;
  try {
    parsed = parseFlags({ args: argv, allowPositionals: true, options: { seed: { type: 'string' }, answer: { type: 'string', multiple: true } } });
  } catch (e) { throw new Error(`${e.message}\n${USAGE}`); }
  const { values, positionals } = parsed;
  if (positionals.length !== 1) throw new Error(USAGE);
  let seed;
  if (values.seed !== undefined) {
    if (!/^\d{1,10}$/.test(values.seed) || Number(values.seed) > 0xffffffff) throw new Error(`--seed takes a whole number 0..4294967295, got ${values.seed}`);
    seed = Number(values.seed);
  } else seed = randomInt(0, 2 ** 31);
  const pins = new Map();
  for (const a of values.answer ?? []) {
    const i = a.indexOf('=');
    const id = a.slice(0, i);
    if (i < 1 || !SAFE_ID.test(id) || !a.slice(i + 1).trim()) throw new Error(`--answer takes <element_id>=<answer>, got ${a}`);
    pins.set(id, [...(pins.get(id) ?? []), a.slice(i + 1).trim()]);
  }
  return { preview: parsePreview(positionals[0]), seed, pins };
}

const walkElements = (screen) => (screen.elements ?? []).filter((e) => e && typeof e === 'object');

/** Every pin must name a question, input, date or screen of this version, with an answer it can take. */
export function checkPins(pins, proto) {
  const screens = new Map(proto.screens.flatMap((s) => [[s.id, s], ...(s.customId ? [[s.customId, s]] : [])]));
  const elements = new Map(proto.screens.flatMap((s) => walkElements(s).map((e) => [e.id, e])));
  for (const [id, answers] of pins) {
    const s = screens.get(id);
    if (s) {
      const buttons = walkElements(s).filter((e) => e.type === 'Button' && e.props?.action?.type === 'navigate');
      for (const a of answers) if (!buttons.some((b) => labelMatches(b.props.text, a))) throw new Error(`screen ${id} has no Continue-type button "${a}"; buttons: ${buttons.map((b) => `"${norm(b.props.text)}"`).join(', ') || 'none'}`);
      continue;
    }
    const e = elements.get(id);
    if (!e) throw new Error(`--answer ${id}: no such element or screen in this version`);
    if (e.type === 'Options') {
      for (const a of answers) if (!optionFor(e, a)) throw new Error(`--answer ${id}: no option "${a}"; options: ${e.props.options.map((o) => `"${optionLabel(o) || o.value}"`).join(', ')}`);
      if (answers.length > 1 && !e.props.multi) throw new Error(`--answer ${id}: single-choice question, pin one answer`);
    } else if (e.type === 'DatePicker') {
      if (answers.length > 1 || !/^\d{4}-\d{2}-\d{2}$/.test(answers[0])) throw new Error(`--answer ${id}: a date is pinned as YYYY-MM-DD`);
    } else if (e.type !== 'Input') throw new Error(`--answer ${id}: a ${e.type} takes no answer; pin Options, Input, DatePicker or a screen's button`);
    else if (answers.length > 1) throw new Error(`--answer ${id}: pin one value`);
  }
}

/** What an option shows: its text, else its emoji, else nothing (an image tile). */
export const optionLabel = (o) => plain(o.text) || (o.image?.type === 'emoji' ? o.image.emoji ?? '' : '');

/** The design option a pin names, by its visible label or its value. */
export function optionFor(el, answer) {
  return el.props.options.find((o) => optionLabel(o) && labelMatches(optionLabel(o), answer)) ?? el.props.options.find((o) => norm(o.value || o.id) === norm(answer));
}

/**
 * Index on the page of the button for option `o` of `offered`, matched by visible label. Options
 * sharing a label (image tiles without text, duplicates) are told apart by their order. -1 if absent.
 */
export function optionIndex(o, offered, onScreen) {
  const label = optionLabel(o);
  const same = offered.filter((x) => optionLabel(x) === label);
  const matches = onScreen.flatMap((v, i) => (labelMatches(label, v) ? [i] : []));
  return matches.length ? matches[Math.min(same.indexOf(o), matches.length - 1)] : -1;
}

/** Labels shown more than once in one question (the walk cannot tell those options apart). */
export function duplicateLabels(el) {
  const seen = new Map();
  for (const o of el.props?.options ?? []) seen.set(plain(o.text), (seen.get(plain(o.text)) ?? 0) + 1);
  return [...seen].filter(([t, n]) => t && n > 1).map(([t]) => t);
}

// Text fields that ask for a measure or a name, guessed from their id and placeholder; first match wins.
// ponytail: a few common units; anything else gets "Test answer" and a stuck walk names the field.
const TEXT_GUESSES = [
  [/name/i, 'Alex'], [/lb|ibs/i, '160'], [/ft|feet/i, '5'], [/kg|weight/i, '70'], [/cm|height/i, '170'], [/age|years/i, '30'],
];

/** Test data a visitor would type, by input type. */
export function inputValue(el, r, seed) {
  const p = el.props ?? {};
  switch (p.type) {
    case 'email': return `walk.${seed}@example.com`;
    case 'phone': return '+12025550143';
    case 'password': return 'Walk-test-2468';
    case 'number': {
      const lo = Number.isFinite(p.min) ? p.min : 18;
      const hi = Number.isFinite(p.max) ? p.max : Math.max(lo, 65);
      return String(r.between(Math.ceil(lo), Math.floor(Math.max(lo, hi))));
    }
    default: {
      const hint = `${el.id} ${el.customId ?? ''} ${p.placeholder ?? ''}`;
      return TEXT_GUESSES.find(([re]) => re.test(hint))?.[1] ?? 'Test answer';
    }
  }
}

/** Keeps the newest `keep - 1` walk folders of a funnel so the new walk makes `keep`. */
export function pruneWalks(dir, keep = KEEP_WALKS) {
  let names;
  try { names = readdirSync(dir); } catch { return []; }
  const old = names.map((n) => ({ n, t: statSync(join(dir, n)).mtimeMs })).sort((a, b) => b.t - a.t).slice(keep - 1).map((x) => x.n);
  for (const n of old) rmSync(join(dir, n), { recursive: true, force: true });
  return old;
}

// --- In the page. Each function is serialised and run with Runtime.evaluate. ---

function pageState() {
  const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  return {
    path: location.pathname,
    ids: [...document.querySelectorAll('#page [data-element-id], dialog[open] [data-element-id]')].filter(shown).map((el) => el.dataset.elementId),
    dialogs: [...document.querySelectorAll('dialog[open]')].map((d) => [...d.querySelectorAll('[data-element-id]')].map((el) => el.dataset.elementId)),
  };
}

function dismissCookies(id, reject, accept) {
  const box = document.querySelector(`[data-element-id="${id}"]`);
  const buttons = box ? [...box.querySelectorAll('button')] : [];
  const t = (b) => b.innerText.replace(/\s+/g, ' ').trim().toLowerCase();
  const b = buttons.find((x) => reject && t(x) === reject) ?? buttons.find((x) => /reject|decline|necessary only/.test(t(x))) ?? buttons.find((x) => accept && t(x) === accept);
  if (!b) return null;
  b.click();
  return t(b);
}

function closePopup(id) {
  const d = document.querySelector(`[data-element-id="${id}"]`)?.closest('dialog[open]');
  if (!d) return false;
  const x = d.querySelector('button.close');
  if (x) x.click();
  else d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return true;
}

function optionLabels(id) {
  const el = document.querySelector(`[data-element-id="${id}"]`);
  // The label, else what the tile shows (an emoji, or nothing for a picture).
  return el ? [...el.querySelectorAll('button.option')].map((b) => (b.querySelector('.label') ?? b).innerText.trim()) : [];
}

function clickOption(id, index) {
  document.querySelector(`[data-element-id="${id}"]`).querySelectorAll('button.option')[index].click();
}

function fillInput(id, value) {
  const box = document.querySelector(`[data-element-id="${id}"]`);
  const input = box?.querySelector('input, textarea');
  if (!input) return false;
  input.focus();
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
  const consent = box.querySelector('button.consent-checkbox-wrapper');
  if (consent) consent.click();
  return true;
}

// Date fields: with no `value`, lists what can be chosen; with one, sets that field.
function dateField(id, field, value) {
  const box = document.querySelector(`[data-element-id="${id}"]`);
  const el = box?.querySelector(`select.${field}, input.${field}`);
  if (!el) return null;
  if (value === undefined) {
    if (el.tagName === 'SELECT') return { select: [...el.options].filter((o) => !o.disabled).map((o) => o.value) };
    return { min: Number(el.min) || null, max: Number(el.max) || null };
  }
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, String(value));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function buttonState(id) {
  const b = document.querySelector(`[data-element-id="${id}"] button`);
  return b ? { disabled: b.disabled, text: b.innerText.replace(/\s+/g, ' ').trim() } : null;
}

function clickButton(id) {
  document.querySelector(`[data-element-id="${id}"] button`)?.click();
}

// --- The walk. ---

/** Runs a page function with JSON arguments and returns its value. */
const callIn = (chrome, tab) => async (fn, ...args) => {
  const { result, exceptionDetails } = await chrome.send('Runtime.evaluate', { expression: `(${fn})(...${JSON.stringify(args)})`, returnByValue: true }, tab.sessionId);
  if (exceptionDetails) throw new Error(`${fn.name}: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
  return result.value;
};

/** Which design screen the page shows: the one owning most of the visible element ids (an id may repeat across screens). */
export function screenOf(ids, owner) {
  const votes = new Map();
  for (const id of ids) for (const s of owner.get(id) ?? []) votes.set(s, (votes.get(s) ?? 0) + 1);
  return [...votes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** A fresh walk log; walk() fills it in, so a crash midway still leaves the steps so far. */
export const newLog = ({ preview, seed, pins }) => ({ preview_url: preview.url, funnel_id: preview.funnelId, version: preview.vid, seed, pins: Object.fromEntries(pins), outcome: null, reason: null, steps: [], smells: [], page_errors: [], console_errors: [], dialogs: [] });

async function walk({ preview, seed, pins }, proto, dir, chrome, log) {
  const r = rng(seed);
  const owner = new Map();
  for (const s of proto.screens) for (const e of walkElements(s)) owner.set(e.id, [...(owner.get(e.id) ?? []), s]);
  let crashed = false;
  let lastDialog = null;
  const tab = await openTab(chrome, (m) => {
    if (m.method === 'Runtime.exceptionThrown') log.page_errors.push({ step: log.steps.length + 1, text: (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 500) });
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') log.console_errors.push({ step: log.steps.length + 1, text: m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300) });
    else if (m.method === 'Inspector.targetCrashed') crashed = true;
    else if (m.method === 'Page.javascriptDialogOpening') {
      lastDialog = m.params.message;
      log.dialogs.push({ step: log.steps.length + 1, message: m.params.message });
      chrome.send('Page.handleJavaScriptDialog', { accept: true }, tab.sessionId).catch(() => {});
    }
  });
  await Promise.all([chrome.send('Runtime.enable', {}, tab.sessionId), chrome.send('Inspector.enable', {}, tab.sessionId)]);
  const page = callIn(chrome, tab);
  const seen = new Set();
  const smelled = new Set();
  const stop = (outcome, reason) => { log.outcome = outcome; log.reason = reason; return log; };

  // Waits until the page shows a known screen; returns { screen, state } or null.
  const current = async (until) => {
    while (Date.now() < until && !crashed) {
      const state = await page(pageState).catch(() => null);
      const screen = state && screenOf(state.ids, owner);
      if (screen) return { screen, state };
      await sleep(200);
    }
    return null;
  };
  // Waits for the page to leave `from` (another screen or another URL); returns the new screen or null.
  // Questions that pop up meanwhile (a loader asking along the way) are answered into `step`.
  const moved = async (from, path, ms, step, asked) => {
    const until = Date.now() + ms;
    while (Date.now() < until && !crashed) {
      await sleep(200);
      if (lastDialog) return null;
      const state = await page(pageState).catch(() => null);
      if (!state) continue;
      const s = screenOf(state.ids, owner);
      if (s && (s !== from || state.path !== path)) return s;
      await handlePopups(from, state, step, asked);
    }
    return null;
  };

  // Picks the answer(s) to a question and records them; returns the option indexes on the page to
  // click, null when it shows no options, or a stuck reason.
  const chooseOptions = async (e, step) => {
    const pinned = pins.get(e.id);
    const dups = duplicateLabels(e);
    if (dups.length && !smelled.has(e.id)) { smelled.add(e.id); log.smells.push(`${step.screen}: ${e.id} shows the same label on several options: ${dups.map((d) => `"${d}"`).join(', ')}`); }
    const onScreen = await page(optionLabels, e.id);
    // Design order, not screen order: shuffled options still give the same answer for a seed.
    const offered = e.props.options.filter((o) => onScreen.some((v) => labelMatches(optionLabel(o), v)));
    if (!offered.length) { step.notes.push(`${e.id}: no options shown`); return null; }
    let chosen;
    if (pinned) chosen = pinned.map((a) => optionFor(e, a));
    else if (e.props.multi) {
      const max = Math.min(offered.length, e.props.maxSelect || offered.length, 3);
      const pool = [...offered];
      chosen = Array.from({ length: 1 + r.int(max) }, () => pool.splice(r.int(pool.length), 1)[0]);
    } else chosen = [r.pick(offered)];
    const clicks = [];
    for (const o of chosen) {
      const index = optionIndex(o, offered, onScreen);
      if (index < 0) return `${e.id}: pinned option "${optionLabel(o) || o.value}" is not shown on this screen`;
      clicks.push(index);
    }
    const shown = chosen.map((o) => `"${optionLabel(o) || o.value || o.id}"`).join(' + ') + (pinned ? ' (pinned)' : '');
    step.answers.push({ element: e.id, type: 'Options', value: chosen.map((o) => o.value || o.id), shown });
    return clicks;
  };

  // Open popups, as a visitor meets them: a question in one is answered, buttons that only close it
  // (Yes / No asked during a loader) get one random click, a Continue in one is left for the step,
  // anything else is closed. `asked` keeps each popup to one go.
  const handlePopups = async (screen, state, step, asked) => {
    const els = walkElements(screen);
    for (const ids of state.dialogs) {
      const key = ids.join(' ');
      if (!ids.length || asked.has(key)) continue;
      asked.add(key);
      await sleep(400); // let it finish opening
      const inside = els.filter((e) => ids.includes(e.id));
      const questions = inside.filter((e) => e.type === 'Options');
      const replies = inside.filter((e) => e.type === 'Button' && !['navigate', 'link', 'checkout'].includes(e.props?.action?.type));
      if (questions.length) {
        for (const e of questions) {
          const clicks = await chooseOptions(e, step);
          for (const i of Array.isArray(clicks) ? clicks : []) { await page(clickOption, e.id, i); await sleep(150); }
        }
      } else if (replies.length) {
        const b = r.pick(replies);
        step.answers.push({ element: b.id, type: 'Button', value: plain(b.props.text), shown: `"${plain(b.props.text)}" (popup)` });
        await page(clickButton, b.id);
      } else if (!inside.some((e) => e.type === 'Button' && e.props?.action?.type === 'navigate')) {
        if (await page(closePopup, ids[0])) step.notes.push('closed a popup');
      }
      await sleep(400);
    }
  };

  await navigate(chrome, tab, preview.url);
  let at = await current(Date.now() + SCREEN_CAP_MS);
  if (!at) return stop('stuck', crashed ? 'page crashed' : 'the first screen never appeared (page error or unknown screen)');

  for (let n = 1; ; n++) {
    const { screen } = at;
    const els = walkElements(screen);
    const step = { n, screen: screen.id, title: screen.title || screen.customId || '', answers: [], action: null, next: null, png: null, notes: [] };
    log.steps.push(step);
    const shoot = async (ms = SCREEN_CAP_MS) => {
      const shot = await capture(chrome, tab, Date.now() + ms, {});
      step.png = `${String(n).padStart(2, '0')}-${screen.id}.png`;
      writeFileSync(join(dir, step.png), shot.png);
      if (shot.incomplete) step.notes.push(`shot may be incomplete: ${shot.incomplete}`);
    };
    const end = async (outcome, reason) => { if (!step.png) await shoot().catch(() => {}); return stop(outcome, reason); };

    if (crashed) return end('stuck', 'page crashed');
    if (els.some((e) => PAYWALL_TYPES.has(e.type))) return end('paywall', null);
    if (n > MAX_STEPS) return end('stuck', `step cap: ${MAX_STEPS} screens without reaching a paywall`);

    // Let the screen finish drawing before reading what is on it (an auto screen may move on meanwhile).
    const auto = els.some((e) => AUTO_TYPES.has(e.type) && e.props?.action?.type === 'navigate') || screen.props?.autoNavigation?.enabled === true;
    if (!auto) await settle(chrome, tab, Date.now() + SCREEN_CAP_MS, {}).catch(() => {});
    const state = (await page(pageState).catch(() => null)) ?? at.state;
    const visible = new Set(state.ids);
    const shown = els.filter((e) => visible.has(e.id));
    const isNav = (e) => e.type === 'Button' && e.props?.action?.type === 'navigate';
    const navButtons = shown.filter(isNav);

    // Sign-in: the walk never creates an account. Passable only when a Continue button does not need it.
    const auth = shown.filter((e) => AUTH_TYPES.has(e.type) || (e.type === 'Input' && e.props?.provider));
    if (auth.length) {
      const required = auth.some((e) => e.type !== 'OAuthButton' && e.props?.required !== false);
      if (required || !navButtons.length) return end('stuck', `auth: sign-in screen (${auth.map((e) => `${e.type} ${e.id}`).join(', ')}) and no way past it without an account`);
      step.notes.push('skipped sign-in');
    }

    // Cookie banner: rejected, not a funnel answer.
    for (const c of shown.filter((e) => e.type === 'CookieConsent')) {
      const clicked = await page(dismissCookies, c.id, norm(c.props?.rejectAllButton), norm(c.props?.acceptAllButton));
      if (clicked) { step.notes.push(`cookie banner: ${clicked}`); await sleep(400); }
    }

    const asked = new Set();
    await handlePopups(screen, (await page(pageState)) ?? state, step, asked);

    // Answer everything on the screen; the question that moves on by itself goes last. Answers can
    // reveal more fields (kg or lbs), so it looks again until nothing new shows up.
    let advancer = null;
    const answered = new Set();
    for (let pass = 0; pass < 5; pass++) {
      const ids = (await page(pageState))?.ids ?? [];
      const todo = els.filter((e) => ids.includes(e.id) && !answered.has(e.id) && !step.answers.some((x) => x.element === e.id) && ['Options', 'Input', 'DatePicker'].includes(e.type));
      if (!todo.length) break;
      for (const e of todo) {
        answered.add(e.id);
        const pinned = pins.get(e.id);
        const tag = pinned ? ' (pinned)' : '';
        if (e.type === 'Options') {
          const clicks = await chooseOptions(e, step);
          if (typeof clicks === 'string') return end('stuck', clicks);
          if (!clicks) continue;
          if (!e.props.multi && e.props.action?.type === 'navigate') { advancer = () => page(clickOption, e.id, clicks[0]); continue; }
          for (const i of clicks) { await page(clickOption, e.id, i); await sleep(150); }
        } else if (e.type === 'Input' && !e.props?.provider) {
          const value = pinned?.[0] ?? inputValue(e, r, seed);
          if (!(await page(fillInput, e.id, value))) { step.notes.push(`${e.id}: input field not found`); continue; }
          step.answers.push({ element: e.id, type: 'Input', value, shown: `"${value}"${tag}` });
        } else if (e.type === 'DatePicker') {
          const want = pinned?.[0]?.split('-').map(Number);
          const date = {};
          for (const [k, field] of [[0, 'year'], [1, 'month'], [2, 'day']]) {
            const f = await page(dateField, e.id, field);
            if (!f) break;
            let v;
            if (want) v = want[k];
            else if (f.select) v = f.select.length ? r.pick(f.select) : null;
            else v = field === 'year' ? r.between(f.min ?? 1970, f.max ?? f.min ?? 2000) : r.between(1, field === 'month' ? 12 : 28);
            if (v == null) break;
            await page(dateField, e.id, field, v);
            date[field] = Number(v);
          }
          const shownDate = [date.year, date.month, date.day].map((x, i) => String(x ?? '?').padStart(i ? 2 : 4, '0')).join('-');
          step.answers.push({ element: e.id, type: 'DatePicker', value: shownDate, shown: `${shownDate}${tag}` });
        }
      }
      await sleep(300);
    }
    const after = (await page(pageState)) ?? state;
    const inPopup = new Set(after.dialogs.flat());
    const live = els.filter((e) => after.ids.includes(e.id));

    const key = `${screen.id} ${JSON.stringify(step.answers.map((a) => a.value))}`;
    if (seen.has(key)) return end('stuck', `loop: back on ${screen.id} with the same answers`);
    seen.add(key);

    // How the screen moves on: the question itself, a Continue button, or by itself.
    let how;
    const from = after.path;
    lastDialog = null;
    if (advancer) {
      await shoot();
      how = 'answer';
      await advancer();
    } else if (live.some(isNav)) {
      const candidates = live.filter(isNav);
      const inDialog = candidates.filter((b) => inPopup.has(b.id));
      const pool = inDialog.length ? inDialog : candidates;
      const want = pins.get(screen.id) ?? (screen.customId && pins.get(screen.customId));
      const button = want ? pool.find((b) => labelMatches(b.props.text, want[0])) ?? null : r.pick(pool);
      if (!button) return end('stuck', `pinned button "${want[0]}" is not shown on this screen`);
      let st = await page(buttonState, button.id);
      for (const until = Date.now() + ENABLE_WAIT_MS; st?.disabled && Date.now() < until;) { await sleep(200); st = await page(buttonState, button.id); }
      await shoot();
      how = `[${st?.text || plain(button.props.text)}]${want ? ' (pinned)' : ''}`;
      if (!st) return end('stuck', `${button.id}: button not found on the page`);
      if (st.disabled) return end('stuck', `Continue never enabled: [${st.text}]${hint(live)}`);
      await page(clickButton, button.id);
    } else if (auto) {
      await shoot(2_000);
      how = AUTO;
    } else {
      await shoot();
      return end('stuck', `no way forward: no Continue button, no auto-advance${hint(live)}`);
    }
    step.action = how;

    const waitMs = how === AUTO ? AUTO_WAIT_MS : NAV_WAIT_MS;
    const next = await moved(screen, from, waitMs, step, asked);
    if (lastDialog) return stop('stuck', `blocked after ${how}: the page said "${lastDialog}"${hint(live)}`);
    if (crashed) return stop('stuck', 'page crashed');
    if (!next) return stop('stuck', `nothing happened after ${how} within ${waitMs / 1000}s${hint(live)}`);
    step.next = next.id;
    // A loop back to a screen with the same answers is caught on arrival.
    at = await current(Date.now() + SCREEN_CAP_MS);
    if (!at) return stop('stuck', 'the next screen never appeared');
  }
}

/** Elements on the screen the walk cannot work, named, for a stuck reason. */
const hint = (live) => {
  const odd = live.filter((e) => UNSUPPORTED_TYPES.has(e.type));
  return odd.length ? `; unsupported element on screen: ${odd.map((e) => `${e.type} ${e.id}`).join(', ')}` : '';
};

/** The printout: outcome, seed, steps, then one line per screen. */
export function report(log, dir) {
  const last = log.steps.at(-1);
  const lines = [
    log.outcome === 'paywall' ? `reached paywall ${last.screen}` : log.outcome === 'stuck' ? `stuck at ${last?.screen ?? 'start'}: ${log.reason}` : `error: ${log.reason}`,
    `seed ${log.seed}  steps ${log.steps.length}  (rerun: --seed ${log.seed})`,
    `files ${dir}`,
  ];
  for (const s of log.steps) {
    const answers = s.answers.map((a) => a.shown);
    if (s.action && s.action !== 'answer') answers.push(s.action);
    const tail = s.next ? ` → ${s.next}` : ` → (${log.outcome})`;
    lines.push(`${s.n} ${s.screen} "${s.title}"${answers.length ? ` → ${answers.join(', ')}` : ''}${tail}`);
  }
  for (const smell of log.smells) lines.push(`design smell: ${smell}`);
  if (log.page_errors.length) lines.push(`page errors: ${log.page_errors.length} (see walk.json)`);
  return lines.join('\n');
}

async function main(argv) {
  let args;
  try { args = parseArgs(argv); } catch (e) { console.error(e.message); return 2; }
  const exe = findChrome();
  if (!exe) { console.error(NO_CHROME); return 3; }

  let proto;
  try {
    proto = previewPrototype(await fetchPreviewData(args.preview));
    if (!proto) throw new Error('could not read the funnel design from the preview');
    checkPins(args.pins, proto);
  } catch (e) { console.log(`error: ${e.message}`); return 2; }

  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const walks = join(funnelDir({ cwd }, args.preview.funnelId), 'walks');
  const name = `${args.preview.vid}-${args.seed}`;
  rmSync(join(walks, name), { recursive: true, force: true });
  pruneWalks(walks);
  const dir = join(walks, name);
  mkdirSync(dir, { recursive: true });
  sweepProfiles();
  const chrome = launch(exe);
  const log = newLog(args);
  try {
    await walk(args, proto, dir, chrome, log);
  } catch (e) {
    Object.assign(log, { outcome: 'error', reason: e.message });
  } finally {
    await chrome.close();
  }
  writeFileSync(join(dir, 'walk.json'), JSON.stringify(log, null, 2));
  console.log(report(log, relative(cwd, dir) || dir));
  return log.outcome === 'paywall' ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  process.exitCode = await main(process.argv.slice(2));
}
