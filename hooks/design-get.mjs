#!/usr/bin/env node
// PostToolUse on funnel_design_get: download the design to funnelfox/<funnel_id>/design.json under the
// project dir, keep a pristine design.orig.json, write the full structure index to index.txt (the main
// agent reads it for funnel context without touching the design), and hand the model the path plus the index.
// Fails open: any problem → exit 0 with no output, and the model downloads it itself as the skill says.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { INDEX, SAFE_ID, changes, deepEqual, emit, findResult, funnelDir, kitProblem, loadIndex, readStdin } from './lib.mjs';

const parse = (t) => { try { return JSON.parse(t); } catch { return null; } };
const readOrNull = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : null);

/** A free name for a set of unsaved edits: never overwrite an earlier one. */
function asideName(dir) {
  if (!existsSync(join(dir, 'design.edited.json'))) return 'design.edited.json';
  return `design.edited-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

/**
 * Bring design.json / design.orig.json in line with the downloaded text. Returns notes for the model
 * and whether design.json kept unsaved edits (then it, not the download, is what the model works on).
 */
function syncLocalCopy(dir, text, doc) {
  const file = join(dir, 'design.json');
  const orig = join(dir, 'design.orig.json');
  const cur = readOrNull(file);
  const origText = readOrNull(orig);
  // design.json with no design.orig.json next to it counts as edited: nothing proves it is pristine.
  const edited = cur != null && cur !== origText;

  if (edited && origText === text) {
    return {
      keptEdits: true,
      notes: ['design.json already holds your unsaved edits on this same version; kept it. Use the new upload_url/upload_id from this result.'],
    };
  }

  const notes = [];
  // After a successful save the fresh download equals design.json: nothing to re-apply.
  if (edited && !deepEqual(parse(cur), doc)) {
    const summary = origText ? changes(parse(origText), parse(cur)) : 'no design.orig.json to compare against';
    const aside = asideName(dir);
    renameSync(file, join(dir, aside));
    notes.push(`The funnel changed since your last read. Your unsaved edits moved to ${aside}; design.json is now the fresh version. Re-apply your edits to design.json:\n${summary}`);
  }
  writeFileSync(file, text);
  writeFileSync(orig, text);
  return { keptEdits: false, notes };
}

function uploadNote(d) {
  return d.upload_url
    ? 'upload available: upload_url + upload_id are in the result above, valid 15 minutes'
    : 'read-only: this sign-in cannot save designs (no funnel:edit)';
}

try {
  const input = await readStdin();
  const d = findResult(input.tool_response, (v) => typeof v.download_url === 'string' && typeof v.funnel_id === 'string');
  if (!d || !SAFE_ID.test(d.funnel_id)) process.exit(0);
  // Only signed https links; anything else is left to the model, which sees the tool result anyway.
  if (!/^https:\/\//.test(d.download_url)) process.exit(0);

  const res = await fetch(d.download_url, { signal: AbortSignal.timeout(50_000) });
  if (!res.ok) process.exit(0);
  const text = await res.text();
  const doc = JSON.parse(text);

  const dir = funnelDir(input, d.funnel_id);
  const file = join(dir, 'design.json');

  const { keptEdits, notes } = syncLocalCopy(dir, text, doc);
  // What design.json holds now: the download, or the unsaved edits kept on top of the same version.
  const localText = keptEdits ? readFileSync(file, 'utf8') : text;
  const local = keptEdits ? parse(localText) : doc;

  const scheme = keptEdits ? local?.schemeVersion : (d.scheme_version ?? doc.schemeVersion);
  const sizeKB = Math.round(localText.length / 1024);
  const lines = [
    'The FunnelFox plugin downloaded this design; do not download it again.',
    `file: ${file}  (edit this one; design.orig.json next to it is the untouched copy for diffs)`,
    `version ${d.version} · ${scheme} · ${sizeKB} KB${keptEdits ? ' (with your unsaved edits)' : ''} · ${uploadNote(d)}`,
    ...notes,
  ];

  if (!local) {
    lines.push('design.json is not valid JSON: fix it, or delete it and call funnel_design_get again.');
  } else {
    const kit = kitProblem(local);
    if (kit) lines.push(`Local validation off: ${kit}.`);
    const index = await loadIndex();
    if (index) {
      const txt = join(dir, 'index.txt');
      const firstIndex = !existsSync(txt);
      writeFileSync(txt, `${index.indexText(local)}\n`);
      if (firstIndex) lines.push('index.txt is new for this funnel: if you are a subagent, add a compact funnel map (at most ~40 lines) to your report.');
      const what = keptEdits ? 'of design.json with your unsaved edits' : 'current';
      const capped = index.indexText(local, { max: 60, more: `the full list is in ${txt}` });
      lines.push(
        '',
        `Structure index (${what}; do not re-run the overview; full copy in ${txt}):`,
        capped,
        '',
        `One screen's elements: node "${INDEX}" "${file}" --screen <screen id or #n>`,
      );
    }
  }
  emit({ hookEventName: 'PostToolUse', additionalContext: lines.join('\n') });
} catch {
  process.exit(0);
}
