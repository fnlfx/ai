#!/usr/bin/env node
// PostToolUse on funnel_screenshot_get: download each screen's PNG to
// funnelfox/<funnel_id>/shots/<upload_id|version>/<screen_id>.png under the project dir and hand the
// model the paths to open with Read. Fails open: any problem → exit 0 with no output, and the model
// downloads the urls itself.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SAFE_ID, emit, findResult, funnelDir, readStdin } from './lib.mjs';

// Ids become file names: keep them to one safe path segment.
const segment = (v) => String(v ?? '').replace(/[^0-9A-Za-z_-]/g, '_').slice(0, 80) || '_';
// Signed https links; plain http only on loopback (tests).
const fetchable = (u) => /^https:\/\//.test(u) || /^http:\/\/127\.0\.0\.1[:/]/.test(u);

async function download(url, file) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

try {
  const input = await readStdin();
  const r = findResult(input.tool_response, (v) => Array.isArray(v.screens) && typeof v.funnel_id === 'string');
  if (!r || !SAFE_ID.test(r.funnel_id)) process.exit(0);

  const of = r.upload_id ?? r.version ?? 'latest';
  const dir = join(funnelDir(input, r.funnel_id), 'shots', segment(of));
  mkdirSync(dir, { recursive: true });

  const results = await Promise.all(r.screens.map(async (s) => {
    const label = `${s.screen_id}${s.title ? ` "${String(s.title).slice(0, 40)}"` : ''}`;
    if (typeof s.url !== 'string' || !fetchable(s.url)) return { label, error: 'no downloadable url' };
    const file = join(dir, `${segment(s.screen_id)}.png`);
    try {
      await download(s.url, file);
      return { label, file, size: s.width && s.height ? ` ${s.width}×${s.height}` : '' };
    } catch (e) {
      return { label, error: e.message };
    }
  }));
  const ok = results.filter((x) => x.file);
  if (!ok.length) process.exit(0);

  const lines = [
    `The FunnelFox plugin saved these screenshots (${r.upload_id ? 'upload ' : 'version '}${of}); open them with Read to look:`,
    ...ok.map((x) => `  ${x.label}${x.size}: ${x.file}`),
    ...results.filter((x) => x.error).map((x) => `  ${x.label}: not downloaded (${x.error}); curl its url from the result`),
  ];
  if (r.note) lines.push(`Note: ${r.note}`);
  emit({ hookEventName: 'PostToolUse', additionalContext: lines.join('\n') });
} catch {
  process.exit(0);
}
