// Headless Chrome on a phone, shared by shot.mjs (screenshots) and walk-funnel's walk.mjs (walks).
// System Chrome with a throwaway profile and no window, DevTools protocol over a pipe, trackers
// blocked, iPhone device profile. No npm dependencies.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SAFE_ID } from '../../../hooks/lib.mjs';

// iPhone 16 Pro / 17 Pro: 402×874 CSS px at 3×.
export const DEVICE = {
  width: 402, height: 874, deviceScaleFactor: 3, mobile: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
};
const METRICS = { width: DEVICE.width, height: DEVICE.height, deviceScaleFactor: DEVICE.deviceScaleFactor, mobile: DEVICE.mobile };
// Long screens are shot whole up to three phone screens tall.
const MAX_HEIGHT = 3 * DEVICE.height;
const NET_IDLE_MS = 500;
const DOM_QUIET_MS = 300;
// A request still open after this long is a long-poll, stream or beacon: it does not hold readiness.
const LONG_REQUEST_MS = 3_000;
export const NO_CHROME = 'Google Chrome is not installed. Install Google Chrome (https://www.google.com/chrome/) so Claude can see the funnel.';

/** <host>/preview/<funnel_id>/<variation>[/<screen>]?vid=<version> → its parts; throws on anything else. */
export function parsePreview(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error(`not a URL: ${raw}`); }
  // http only for a local stack (preview_url from a backend on this machine).
  const local = u.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(u.hostname);
  if (u.protocol !== 'https:' && !local) throw new Error(`not an https URL: ${raw}`);
  const m = /^\/preview\/([^/]+)\/([^/]+)(?:\/[^/]*)?\/?$/.exec(u.pathname);
  const vid = u.searchParams.get('vid');
  if (!m || !vid) throw new Error(`not a funnel preview URL (<host>/preview/<funnel_id>/<variation>?vid=<version>): ${raw}`);
  const [, funnelId, variation] = m;
  for (const v of [funnelId, variation, vid]) if (!SAFE_ID.test(v)) throw new Error(`unexpected characters in ${raw}`);
  return { url: u.href, origin: u.origin, funnelId, variation, vid, search: u.search };
}

/** The preview page of one screen: the screen id goes right after the variation segment. */
export const screenUrl = (p, screenId) => `${p.origin}/preview/${p.funnelId}/${p.variation}/${screenId}${p.search}`;

/**
 * Screen ids and custom ids of the version the preview serves, from the page's own data endpoint
 * (SvelteKit's __data.json, values flattened into one array). null when its shape is not recognised.
 * Needed because the preview silently shows the first screen for an unknown id.
 */
export function screenIds(body) {
  try {
    const d = body.nodes.find((n) => n?.type === 'data' && n.data?.[0]?.prototype !== undefined).data;
    const ids = new Set();
    for (const i of d[d[d[0].prototype].screens]) {
      for (const k of ['id', 'customId']) if (typeof d[d[i][k]] === 'string') ids.add(d[d[i][k]]);
    }
    return ids.size ? ids : null;
  } catch {
    return null;
  }
}

/**
 * The funnel design the preview serves ({ screens, … }), rebuilt from __data.json's flattened
 * array (devalue: values refer to each other by index, negative indexes are undefined/null/NaN…).
 * null when its shape is not recognised.
 */
export function previewPrototype(body) {
  try {
    const d = body.nodes.find((n) => n?.type === 'data' && n.data?.[0]?.prototype !== undefined).data;
    const memo = new Map();
    const at = (i) => {
      if (i < 0) return i === -1 ? undefined : null;
      if (memo.has(i)) return memo.get(i);
      const v = d[i];
      if (v === null || typeof v !== 'object') return v;
      // ["Date", …], ["Set", …]: typed values the walk never reads; kept raw.
      if (Array.isArray(v) && typeof v[0] === 'string') return v;
      const out = Array.isArray(v) ? [] : {};
      memo.set(i, out);
      for (const [k, x] of Object.entries(v)) out[k] = at(x);
      return out;
    };
    const proto = at(d[0].prototype);
    return Array.isArray(proto?.screens) ? proto : null;
  } catch {
    return null;
  }
}

/** The preview's data endpoint as JSON; throws when the funnel or version does not exist. */
export async function fetchPreviewData(p) {
  const res = await fetch(`${p.origin}/preview/${p.funnelId}/${p.variation}/__data.json${p.search}`, { signal: AbortSignal.timeout(30_000) });
  const body = res.ok ? await res.json().catch(() => null) : null;
  // A missing funnel or version arrives as HTTP 200 with an error node in it.
  const status = res.status === 404 ? 404 : body?.nodes?.find((n) => n?.type === 'error')?.status;
  if (status === 404) throw new Error('preview not found: check the funnel id, variation and version (vid)');
  return body;
}

/** Path to a Chrome-family browser, or null. FUNNELFOX_CHROME wins. */
export function findChrome(env = process.env, platform = process.platform, exists = existsSync) {
  if (env.FUNNELFOX_CHROME) return exists(env.FUNNELFOX_CHROME) ? env.FUNNELFOX_CHROME : null;
  const mac = ['Google Chrome', 'Chromium', 'Microsoft Edge', 'Brave Browser'];
  const win = (base) => base && [
    `${base}\\Google\\Chrome\\Application\\chrome.exe`,
    `${base}\\Chromium\\Application\\chrome.exe`,
    `${base}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${base}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
  ];
  const candidates = {
    darwin: mac.flatMap((n) => [`/Applications/${n}.app/Contents/MacOS/${n}`, `${env.HOME}/Applications/${n}.app/Contents/MacOS/${n}`]),
    linux: ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser']
      .flatMap((n) => ['/usr/bin/', '/usr/local/bin/', '/snap/bin/', '/opt/google/chrome/'].map((d) => d + n)),
    win32: [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].flatMap((b) => win(b) || []),
  }[platform] ?? [];
  return candidates.find((p) => exists(p)) ?? null;
}

/** Headless Chrome with the DevTools protocol on fds 3/4. Always pair with close(). */
export function launch(chrome) {
  const profile = mkdtempSync(join(tmpdir(), 'funnelfox-shot-'));
  const proc = spawn(chrome, [
    '--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
    '--disable-background-networking', '--disable-component-update', '--mute-audio', '--hide-scrollbars',
    '--password-store=basic', '--use-mock-keychain', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
  const [, , , toChrome, fromChrome] = proc.stdio;
  const pending = new Map();
  const listeners = new Set();
  let nextId = 0;
  let buf = '';
  fromChrome.setEncoding('utf8');
  fromChrome.on('data', (chunk) => {
    const parts = (buf + chunk).split('\0');
    buf = parts.pop();
    for (const part of parts) {
      const msg = JSON.parse(part);
      if (msg.id === undefined) { for (const fn of listeners) fn(msg); continue; }
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p?.reject(new Error(msg.error.message));
      else p?.resolve(msg.result);
    }
  });
  const gone = new Promise((resolve) => proc.once('exit', resolve));
  const failAll = (e) => { for (const p of pending.values()) p.reject(e); pending.clear(); };
  proc.once('error', (e) => failAll(e));
  gone.then(() => failAll(new Error('Chrome exited')));
  toChrome.on('error', () => {});

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    toChrome.write(JSON.stringify({ id, method, params, sessionId }) + '\0');
  });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (proc.exitCode === null && proc.signalCode === null) {
      send('Browser.close').catch(() => {});
      const t = setTimeout(() => proc.kill('SIGKILL'), 2_000);
      await gone;
      clearTimeout(t);
    }
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };
  // Last resort on a signal or crash: synchronous kill and cleanup.
  const killNow = () => {
    if (closed) return;
    closed = true;
    try { proc.kill('SIGKILL'); } catch {}
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } catch {}
  };
  const onSignal = () => { proc.kill('SIGKILL'); close().finally(() => process.exit(130)); };
  for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, onSignal);
  process.on('exit', killNow);
  return { proc, send, on: (fn) => listeners.add(fn), close, killNow };
}

// Runs in the page before its own scripts: remembers when the DOM last changed (nodes or text;
// attribute churn such as a playing Lottie does not count).
const OBSERVE = `
window.__ffLastMutation = performance.now();
new MutationObserver(() => { window.__ffLastMutation = performance.now(); })
  .observe(document, { childList: true, subtree: true, characterData: true });`;

// Readiness as seen from inside the page.
const PROBE = `(() => {
  const page = document.querySelector('#page');
  const finite = document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity);
  return {
    content: !!page && page.querySelector('.elements')?.childElementCount > 0,
    fonts: document.fonts.status === 'loaded',
    quietMs: performance.now() - (window.__ffLastMutation ?? 0),
    moving: finite.length,
    path: location.pathname,
  };
})()`;

// Analytics, ad pixels and session tracking never leave the browser: shots must not show up as
// visits in anyone's data. Chrome wildcard patterns (* matches anything, / included).
// ponytail: known-vendor list; a tracker not on it still fires. Fonts, images and CDNs load.
export const BLOCKED = [
  // FunnelFox's own funnel events, logs and sessions; Cloudflare web analytics
  '*/funnel/v1/event*', '*/funnel/v1/log/*', '*/funnel/v1/session*', '*/cdn-cgi/rum*', '*static.cloudflareinsights.com/*',
  '*connect.facebook.net/*', '*facebook.com/tr*',
  '*googletagmanager.com/*', '*google-analytics.com/*', '*doubleclick.net/*', '*googleadservices.com/*',
  '*posthog.com/*',
  '*hubspot.com/*', '*hs-scripts.com/*', '*hs-analytics.net/*', '*hs-banner.com/*', '*hsforms.com/*',
  '*hscollectedforms.net/*', '*hsadspixel.net/*', '*usemessages.com/*',
  '*analytics.ahrefs.com/*',
  '*analytics.tiktok.com/*',
  '*sc-static.net/*', '*tr.snapchat.com/*',
  '*ct.pinterest.com/*', '*s.pinimg.com/ct/*',
  '*redditstatic.com/ads/*', '*alb.reddit.com/*',
  '*clarity.ms/*', '*bat.bing.com/*',
  '*hotjar.com/*', '*hotjar.io/*',
  '*api.ipgeolocation.io/*',
  '*static.ads-twitter.com/*', '*analytics.twitter.com/*', '*t.co/i/adsct*',
  '*amplitude.com/*', '*mixpanel.com/*', '*mxpnl.com/*', '*segment.com/*', '*segment.io/*',
];

/** Same matching as Chrome's blocked-URL patterns, for tests and checks. */
export const isBlocked = (url) => BLOCKED.some((p) => new RegExp(`^${p.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(url));

/** Removes profiles left by runs that were killed outright (older than 10 minutes). */
export function sweepProfiles(now = Date.now()) {
  for (const name of readdirSync(tmpdir())) {
    if (!name.startsWith('funnelfox-shot-')) continue;
    const dir = join(tmpdir(), name);
    try { if (now - statSync(dir).mtimeMs > 600_000) rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One phone tab, trackers blocked: { sessionId, targetId, net }. `net` tracks the page's own
 * requests for readiness; `onEvent` gets every other protocol event of the tab.
 */
export async function openTab(chrome, onEvent = () => {}) {
  // A window of its own: a background tab is throttled and its animations never finish.
  const { targetId } = await chrome.send('Target.createTarget', { url: 'about:blank', newWindow: true });
  const { sessionId } = await chrome.send('Target.attachToTarget', { targetId, flatten: true });
  const net = { inflight: new Map(), lastActivity: Date.now() };
  // Only the page's own requests hold readiness: iframes (payment, chat, auth widgets) and
  // beacons keep the network busy for seconds without changing what the screen shows.
  const counts = (p) => p.frameId === targetId && !['Ping', 'CSPViolationReport', 'Preflight'].includes(p.type);
  chrome.on((m) => {
    if (m.sessionId !== sessionId) return;
    const id = m.params?.requestId;
    if (m.method === 'Network.requestWillBeSent' && counts(m.params)) { net.inflight.set(id, Date.now()); net.lastActivity = Date.now(); }
    else if ((m.method === 'Network.loadingFinished' || m.method === 'Network.loadingFailed') && net.inflight.delete(id)) { net.lastActivity = Date.now(); }
    else onEvent(m);
  });
  await Promise.all([
    chrome.send('Page.enable', {}, sessionId),
    chrome.send('Network.enable', {}, sessionId),
    chrome.send('Network.setBlockedURLs', { urls: BLOCKED }, sessionId),
    chrome.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVE }, sessionId),
    chrome.send('Emulation.setDeviceMetricsOverride', METRICS, sessionId),
    chrome.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId),
    chrome.send('Emulation.setUserAgentOverride', { userAgent: DEVICE.userAgent, platform: 'iPhone' }, sessionId),
  ]);
  return { sessionId, targetId, net };
}

/** Navigates the tab and resets readiness tracking; throws when the page cannot load. */
export async function navigate(chrome, tab, url) {
  tab.net.inflight.clear();
  tab.net.lastActivity = Date.now();
  const nav = await chrome.send('Page.navigate', { url }, tab.sessionId);
  if (nav.errorText) throw new Error(nav.errorText);
}

/**
 * Waits until the page settles or `deadline` passes; returns null when settled, else why not.
 * `state.path` is where the page was when shooting started: a screen that moves on by itself (a
 * loader with auto-navigation) is reported, not mistaken for the next one.
 */
export async function settle(chrome, tab, deadline, state = {}) {
  const { sessionId, net } = tab;
  let why = 'timed out';
  while (Date.now() < deadline) {
    await sleep(100);
    const now = Date.now();
    const busy = [...net.inflight.values()].some((t) => now - t < LONG_REQUEST_MS);
    if (busy) { net.lastActivity = now; continue; }
    if (now - net.lastActivity < NET_IDLE_MS) continue;
    const { result } = await chrome.send('Runtime.evaluate', { expression: PROBE, returnByValue: true }, sessionId);
    const s = result.value ?? {};
    state.path ??= s.content ? s.path : undefined;
    if (state.path && s.path !== state.path) return 'the screen navigated on by itself; this shows the next one';
    why = !s.content ? 'screen content never appeared' : !s.fonts ? 'fonts still loading' : 'page kept changing';
    if (s.content && s.fonts && s.quietMs >= DOM_QUIET_MS && !s.moving) return null;
  }
  return why;
}

// Tallest scrolling content: the funnel's body is one phone screen high and screens scroll inside it.
const CONTENT_HEIGHT = "Math.max(...[...document.querySelectorAll('*')].map((el) => el.scrollHeight))";

/**
 * Waits for the tab to settle and returns { png, incomplete }. A screen longer than the phone is
 * shot on a taller phone (up to MAX_HEIGHT), so nothing below the fold is missed; fixed elements
 * (the bottom button) then sit at the bottom of the whole screen.
 */
export async function capture(chrome, tab, deadline, state = {}) {
  const { sessionId } = tab;
  let why = await settle(chrome, tab, deadline, state);
  const { result } = await chrome.send('Runtime.evaluate', { expression: CONTENT_HEIGHT, returnByValue: true }, sessionId);
  const height = Math.min(Math.ceil(result.value || 0), MAX_HEIGHT);
  const tall = !why && height > DEVICE.height + 4;
  if (tall) {
    await chrome.send('Emulation.setDeviceMetricsOverride', { ...METRICS, height }, sessionId);
    // Below-the-fold images start loading now; a short settle of its own, within the same cap.
    why = await settle(chrome, tab, Math.max(deadline, Date.now() + 2_000), state);
  }
  const { data } = await chrome.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  if (tall) await chrome.send('Emulation.setDeviceMetricsOverride', METRICS, sessionId);
  return { png: Buffer.from(data, 'base64'), incomplete: why };
}
