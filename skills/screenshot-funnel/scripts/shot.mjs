#!/usr/bin/env node
// Screenshots of a saved funnel version, as a phone shows them, taken on this machine.
//   node shot.mjs <preview_url> <screen_id>...
// Starts the system Chrome headless (throwaway profile, no window), opens each screen's preview
// page in turn, waits until it settles and saves funnelfox/<funnel_id>/shots/<version>/<screen_id>.png
// under the project dir. Prints one line per screen: the PNG path, flagged if it may be incomplete,
// or why the screen failed. No npm dependencies: DevTools protocol over a pipe (chrome.mjs).
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAFE_ID, funnelDir } from '../../../hooks/lib.mjs';
import { NO_CHROME, capture, fetchPreviewData, findChrome, launch, navigate, openTab, parsePreview, screenIds, screenUrl, sweepProfiles } from './chrome.mjs';

export { BLOCKED, DEVICE, findChrome, isBlocked, parsePreview, screenIds, screenUrl } from './chrome.mjs';

export const MAX_SCREENS = 8;
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
  try {
    const tab = await openTab(chrome);
    for (const id of args.screens) {
      try {
        if (known && !known.has(id)) throw new Error('no such screen in this version');
        const deadline = Date.now() + SCREEN_CAP_MS;
        await navigate(chrome, tab, screenUrl(args.preview, id));
        const shot = await capture(chrome, tab, deadline);
        const file = join(dir, `${id}.png`);
        writeFileSync(file, shot.png);
        console.log(shot.incomplete ? `${file}  (may be incomplete: ${shot.incomplete})` : file);
      } catch (e) {
        failed++;
        console.log(`${id}: failed (${e.message})`);
      }
    }
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
