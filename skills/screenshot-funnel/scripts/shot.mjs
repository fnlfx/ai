#!/usr/bin/env node
// Screenshots of a saved funnel version, as a phone shows them, taken on this machine.
//   node shot.mjs <preview_url> <screen_id>...
// Starts the system Chrome headless (throwaway profile, no window), opens the screens' preview
// pages a few tabs at a time, waits until each settles and saves funnelfox/<funnel_id>/shots/<version>/<screen_id>.png
// under the project dir. Prints one line per screen, in the order given: the PNG path, flagged if it may be incomplete,
// or why the screen failed. No npm dependencies: DevTools protocol over a pipe (chrome.mjs).
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAFE_ID, funnelDir } from '../../../hooks/lib.mjs';
import { NO_CHROME, capture, fetchPreviewData, findChrome, launch, navigate, openTab, parsePreview, screenIds, screenUrl, sweepProfiles } from './chrome.mjs';

export { BLOCKED, DEVICE, findChrome, isBlocked, parsePreview, screenIds, screenUrl } from './chrome.mjs';

// A whole funnel fits in one run.
export const MAX_SCREENS = 40;
// Screens shot at once, each in its own window. Past about 6 the gain is small and memory grows.
const TABS = 6;
const SCREEN_CAP_MS = 15_000;

/** argv (after the script) → { preview, screens }; throws with a usage message. */
export function parseArgs(argv) {
  const [url, ...ids] = argv;
  if (!url || !ids.length) throw new Error('usage: node shot.mjs <preview_url> <screen_id>...');
  const screens = [...new Set(ids)];
  const bad = screens.find((s) => !SAFE_ID.test(s));
  if (bad) throw new Error(`not a screen id: ${bad}`);
  if (screens.length > MAX_SCREENS) throw new Error(`at most ${MAX_SCREENS} screens per run (got ${screens.length}); shoot the ones you changed`);
  return { preview: parsePreview(url), screens };
}

/** funnelfox/<funnel_id>/shots/<version>/ under the project dir, created if needed. */
export function shotsDir(preview, cwd = process.cwd()) {
  const dir = join(funnelDir({ cwd }, preview.funnelId), 'shots', preview.vid);
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function main(argv) {
  let args;
  try { args = parseArgs(argv); } catch (e) { console.error(e.message); return 2; }
  const exe = findChrome();
  if (!exe) { console.error(NO_CHROME); return 3; }

  let known;
  try { known = screenIds(await fetchPreviewData(args.preview)); } catch (e) { console.error(`screenshot failed: ${e.message}`); return 1; }
  sweepProfiles();
  const dir = shotsDir(args.preview, process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const chrome = launch(exe);

  let failed = 0;
  // One line per screen, printed in argument order as soon as it and the ones before it are done.
  const lines = args.screens.map(() => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; });
  const shoot = async (tab, id) => {
    try {
      if (known && !known.has(id)) throw new Error('no such screen in this version');
      const deadline = Date.now() + SCREEN_CAP_MS;
      await navigate(chrome, tab, screenUrl(args.preview, id));
      const shot = await capture(chrome, tab, deadline);
      const file = join(dir, `${id}.png`);
      writeFileSync(file, shot.png);
      return shot.incomplete ? `${file}  (may be incomplete: ${shot.incomplete})` : file;
    } catch (e) {
      failed++;
      return `${id}: failed (${e.message})`;
    }
  };
  try {
    const tabs = await Promise.all(Array.from({ length: Math.min(TABS, args.screens.length) }, () => openTab(chrome)));
    let next = 0;
    const work = tabs.map(async (tab) => {
      while (next < args.screens.length) {
        const i = next++;
        lines[i].resolve(await shoot(tab, args.screens[i]));
      }
    });
    for (const l of lines) console.log(await l.promise);
    await Promise.all(work);
  } catch (e) {
    console.error(`screenshot failed: ${e.message}`);
    return 1;
  } finally {
    await chrome.close();
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  process.exitCode = await main(process.argv.slice(2));
}
