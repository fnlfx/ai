#!/usr/bin/env node
// PreToolUse on Bash: lets the screenshot-funnel and walk-funnel scripts run without a permission
// prompt, in the main conversation and in the designer subagent. Approves exactly
// `node <this plugin's shot.mjs or walk.mjs> <args>` where every argument is a plain word or a
// quoted string with nothing the shell would expand;
// anything else (a second command, a pipe, a redirect, $(…)) gets no answer and the normal
// permission rules apply.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { emit, readStdin } from './lib.mjs';

const SCRIPTS = ['skills/screenshot-funnel/scripts/shot.mjs', 'skills/walk-funnel/scripts/walk.mjs'];

/** The spellings of this plugin's script paths the agent may use. */
export function scriptPaths(env = process.env) {
  const paths = new Set();
  for (const script of SCRIPTS) {
    const own = fileURLToPath(new URL(`../${script}`, import.meta.url));
    paths.add(own);
    try { paths.add(realpathSync(own)); } catch {}
    if (env.CLAUDE_PLUGIN_ROOT) paths.add(`${env.CLAUDE_PLUGIN_ROOT.replace(/\/+$/, '')}/${script}`);
  }
  return paths;
}

// A shell word that stays literal: pieces of plain characters, '…' with no quote inside, or "…"
// without $ ` \ " ! (quoted pieces may hold spaces: --answer "goal=Career and work").
const WORD = /^(?:[A-Za-z0-9_\-./:%=+,@]|'[^'\n]*'|"[^"$`\\!\n]*")+$/;
// Splits on spaces and tabs outside quotes; anything left over (a newline, an unclosed quote) fails.
const TOKEN = /(?:[^\s'"]|'[^']*'|"[^"]*")+/g;
const unquote = (w) => (/^(['"]).*\1$/s.test(w) ? w.slice(1, -1) : w);

/** True when `command` is exactly `node <shot.mjs|walk.mjs> <arg>...` with literal arguments. */
export function approves(command, paths) {
  const line = String(command ?? '').trim();
  if (!/^[ \t]*$/.test(line.replace(TOKEN, ''))) return false;
  const words = line.match(TOKEN) ?? [];
  if (words.length < 3 || words[0] !== 'node') return false;
  if (!words.slice(1).every((w) => WORD.test(w))) return false;
  return paths.has(unquote(words[1]));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  try {
    const input = await readStdin();
    if (input.tool_name === 'Bash' && approves(input.tool_input?.command, scriptPaths())) {
      emit({ hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: 'FunnelFox screenshot or walk script' });
    }
  } catch {}
}
