/**
 * Every reference this package carries has to survive the move to
 * `nibify/nibify-sdk` (ADR-0005, "Confine aperto/chiuso e struttura dei repo"):
 * an ADR is cited by number and title, never by path, and no markdown link
 * climbs out of this folder. `vendor/` is upstream A2UI and exempt; this file
 * exempts itself because it names the patterns it forbids.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const self = fileURLToPath(import.meta.url);

const skipped = new Set(['node_modules', 'vendor']);

function* filesUnder(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      if (!skipped.has(entry)) yield* filesUnder(path);
    } else if (path !== self) {
      yield path;
    }
  }
}

const forbidden = [
  {
    pattern: /docs\/adr\//,
    remedy: 'cite the ADR by number and title — the file lives in the private repo',
  },
  {
    pattern: /\]\(\.\.\//,
    remedy: 'a markdown link one directory up lands in another repository after the move',
  },
];

test('no reference points outside the published package', () => {
  const offences = [];

  for (const path of filesUnder(packageRoot)) {
    const lines = readFileSync(path, 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      for (const { pattern, remedy } of forbidden) {
        if (pattern.test(line)) {
          offences.push(
            `${relative(packageRoot, path)}:${index + 1} — ${remedy}\n    ${line.trim()}`,
          );
        }
      }
    }
  }

  assert.deepEqual(offences, [], `\n\n${offences.join('\n\n')}\n`);
});
