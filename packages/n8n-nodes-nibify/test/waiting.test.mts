import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { callbackUrlOf, deadlineOf, WAIT_MARGIN_MS } from '../nodes/Nibify/waiting.ts';

const NOW = new Date('2026-10-09T12:00:00Z');

describe('deadlineOf', () => {
  test('no expiry means no deadline: the Request never expires', () => {
    assert.equal(deadlineOf(0, 'hours', NOW), null);
  });

  test("n8n's limit falls a margin after expiresAt, so the expiry arrives as a callback", () => {
    const deadline = deadlineOf(2, 'hours', NOW);
    assert.equal(deadline?.expiresAt.toISOString(), '2026-10-09T14:00:00.000Z');
    assert.equal(deadline.waitTill.getTime() - deadline.expiresAt.getTime(), WAIT_MARGIN_MS);
    assert.ok(WAIT_MARGIN_MS >= 31 * 60_000, 'longer than the sweep and the callback retries');
  });

  test('a negative amount is refused', () => {
    assert.throws(() => deadlineOf(-1, 'minutes', NOW), /positive/);
  });
});

describe('callbackUrlOf', () => {
  test("the node's id goes in the path, the token stays in the query", () => {
    assert.equal(
      callbackUrlOf('http://localhost:5678/webhook-waiting/42?signature=tok', 'node-1'),
      'http://localhost:5678/webhook-waiting/42/node-1?signature=tok',
    );
  });
});
