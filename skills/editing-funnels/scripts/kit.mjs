// The validator kit's scheme, read from kit/VERSION (the one source, regenerated with the kit).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const KIT_DIR = fileURLToPath(new URL('../kit/', import.meta.url));

/** The scheme line of a VERSION file's text ("scheme v53" → "v53"), or null. */
export const parseKitScheme = (versionText) => /^scheme (\S+)/m.exec(versionText)?.[1] ?? null;

/** The kit's scheme ("v53"), or null when the kit is not installed. */
export function kitScheme() {
  try {
    return parseKitScheme(readFileSync(`${KIT_DIR}VERSION`, 'utf8'));
  } catch {
    return null;
  }
}

/** "v53" → 53; anything else → null. */
export function schemeNumber(v) {
  const m = /^v(\d+)$/.exec(String(v ?? ''));
  return m ? Number(m[1]) : null;
}

/**
 * null when the kit can judge a design at this scheme; otherwise why not. A kit on another scheme
 * than the design, older or newer, would report false errors, so local validation is skipped then.
 */
export function kitMismatch(docScheme) {
  const kit = kitScheme();
  if (kit == null) return 'the validator kit is not installed';
  const kitN = schemeNumber(kit);
  const docN = schemeNumber(docScheme);
  if (kitN == null || docN == null || kitN === docN) return null;
  const hint = docN > kitN ? 'update the funnelfox plugin' : 'the plugin is ahead of the server';
  return `the plugin's validator kit is for scheme ${kit} but this design is ${docScheme} (${hint})`;
}
