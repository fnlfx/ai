#!/usr/bin/env node
// Validate a design with the kit (and check theme/themeId against design.orig.json next to it) and,
// only if both pass, PUT it to the upload URL.
//   node upload.mjs <design.json> <upload_url> [--allow-low-contrast]
// Also refuses text/background pairs of the theme below WCAG AA (contrast.mjs); pass
// --allow-low-contrast only when the user asked for exactly those colours.
// Prints the HTTP status (expect 200), or the validation errors / HTTP error; exits non-zero on failure.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deepEqual } from '../../../hooks/lib.mjs';
import { lowContrast } from './contrast.mjs';
import { KIT_DIR, kitMismatch } from './kit.mjs';

const args = process.argv.slice(2);
const allowLowContrast = args.includes('--allow-low-contrast');
const [file, url] = args.filter((a) => a !== '--allow-low-contrast');
if (!file || !/^https?:\/\//.test(url ?? '')) {
  console.error('usage: node upload.mjs <design.json> <upload_url>');
  process.exit(2);
}

let body, doc;
try {
  body = readFileSync(file);
  doc = JSON.parse(body);
} catch (e) {
  console.error(`not uploaded: cannot read ${file} as JSON: ${e.message}`);
  process.exit(1);
}

// The server refuses a changed theme snapshot or theme link against what funnel_design_get delivered;
// refuse it here first, with the same words. design.orig.json is that delivery (written by the hook or
// by the skill's manual steps); without it the server alone checks.
const themeErrors = [];
const origFile = join(dirname(file), 'design.orig.json');
if (existsSync(origFile)) {
  let orig = null;
  try { orig = JSON.parse(readFileSync(origFile, 'utf8')); } catch {}
  const fix = 'Put per-funnel look changes in localThemeOverrides; leave theme and themeId exactly as funnel_design_get delivered them (if the project theme changed since your read, re-read).';
  // Against design.orig.json only an edit can cause this (the server also catches a project theme
  // change since the read, and says so).
  if (orig && !deepEqual(orig.theme, doc?.theme)) themeErrors.push('theme: differs from what funnel_design_get delivered. Move those changes into localThemeOverrides and restore theme as delivered.');
  if (orig && (orig.themeId ?? null) !== (doc?.themeId ?? null)) themeErrors.push(`themeId: the theme link was changed. ${fix}`);
}
let refused = themeErrors.length > 0;
if (refused) console.error(themeErrors.join('\n'));

// Only pairs this edit made fail: a theme that already failed before is the user's, not this edit's.
const pair = (l) => l.replace(/ #\S+/g, '').replace(/ = .*/, '');
let origLow = [];
try { origLow = existsSync(origFile) ? lowContrast(JSON.parse(readFileSync(origFile, 'utf8'))).map(pair) : []; } catch {}
const low = lowContrast(doc).filter((l) => !origLow.includes(pair(l)));
if (low.length) {
  console.error(`low contrast (WCAG AA) on the rendered look:\n${low.map((l) => `  - ${l}`).join('\n')}\n` +
    'Pick a text colour that passes for each pair (often the dark text colour on a light or saturated fill), ' +
    'or a darker fill. Only if the user asked for exactly these colours, rerun with --allow-low-contrast and tell them.');
  if (!allowLowContrast) refused = true;
}

// validate.cjs is a CLI only (it reads argv and exits on load), so it runs as a child process and
// its report is relayed as-is: VALID on stdout with exit 0, or INVALID plus the errors on stderr.
const mismatch = kitMismatch(doc?.schemeVersion);
if (mismatch) {
  console.error(`local validation skipped: ${mismatch}; the server still validates on funnel_design_update`);
} else {
  const v = spawnSync(process.execPath, [`${KIT_DIR}validate.cjs`, file], { encoding: 'utf8', timeout: 30_000 });
  if (v.status !== 0) {
    process.stderr.write(v.stderr || v.error?.message || 'validator failed\n');
    refused = true;
  }
}
if (refused) {
  console.error('not uploaded: fix the errors above and run upload.mjs again');
  process.exit(1);
}

try {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(60_000),
  });
  console.log(res.status);
  if (!res.ok) {
    console.error((await res.text()).slice(0, 500));
    process.exit(1);
  }
} catch (e) {
  console.error(`upload failed: ${e.cause?.message ?? e.message}`);
  process.exit(1);
}
