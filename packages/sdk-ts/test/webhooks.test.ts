import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, test } from 'node:test';

import { Nibify, NibifyError, webhooks, type WebhookEvent } from '../src/index.ts';

const SECRET = 'whsec_' + '0123456789abcdef'.repeat(4);
const OTHER_SECRET = 'whsec_' + 'fedcba9876543210'.repeat(4);

const ANSWERED = JSON.stringify({
  id: '6f1c2a40-0d1e-4c1b-9a51-6f0d2b7c9e11',
  type: 'message.answered',
  createdAt: '2026-10-09T10:00:00.000Z',
  data: {
    requestId: 'req_01',
    status: 'answered',
    environment: 'test',
    response: {
      responseId: 'rsp_01',
      actionName: 'approve',
      sourceComponentId: 'root',
      context: { note: 'vai pure' },
      clientTimestamp: '2026-10-09T09:59:58.000Z',
      answeredAt: '2026-10-09T09:59:59.000Z',
    },
  },
});

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

/** The backend's `signCallback`, byte for byte. */
function sign(body: string, secret = SECRET, t = nowSeconds()): string {
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof NibifyError);
    assert.equal(error.status, null);
    return error.code;
  }
  assert.fail('verified');
}

describe('webhooks.verify()', () => {
  test('a callback signed as the backend signs it resolves with the typed event', async () => {
    const event: WebhookEvent = await webhooks.verify({
      body: ANSWERED,
      signature: sign(ANSWERED),
      secret: SECRET,
    });

    assert.equal(event.id, '6f1c2a40-0d1e-4c1b-9a51-6f0d2b7c9e11');
    assert.equal(event.type, 'message.answered');
    if (event.type !== 'message.answered') return;
    assert.equal(event.data.response.responseId, 'rsp_01');
    assert.equal(event.data.response.actionName, 'approve');
  });

  test('is the same function on the client', async () => {
    const nibify = new Nibify({ apiKey: 'sk_test_0123abcd0123456789abcdef0123456789ab' });
    assert.equal(nibify.webhooks.verify, webhooks.verify);
  });

  test('one byte of the body changed: mismatch', async () => {
    const altered = ANSWERED.replace('approve', 'approvf');
    assert.equal(
      await codeOf(webhooks.verify({ body: altered, signature: sign(ANSWERED), secret: SECRET })),
      'webhook_signature_mismatch',
    );
  });

  test('the body parsed and serialised again: mismatch', async () => {
    const reserialised = JSON.stringify(JSON.parse(ANSWERED), null, 2);
    assert.equal(
      await codeOf(
        webhooks.verify({ body: reserialised, signature: sign(ANSWERED), secret: SECRET }),
      ),
      'webhook_signature_mismatch',
    );
  });

  test('another secret: mismatch', async () => {
    assert.equal(
      await codeOf(
        webhooks.verify({ body: ANSWERED, signature: sign(ANSWERED), secret: OTHER_SECRET }),
      ),
      'webhook_signature_mismatch',
    );
  });

  test('t outside the tolerance, past or future: out of tolerance', async () => {
    for (const t of [nowSeconds() - 301, nowSeconds() + 301]) {
      assert.equal(
        await codeOf(
          webhooks.verify({ body: ANSWERED, signature: sign(ANSWERED, SECRET, t), secret: SECRET }),
        ),
        'webhook_timestamp_out_of_tolerance',
      );
    }
  });

  test('t inside the tolerance passes, and the tolerance is the caller’s to change', async () => {
    const old = sign(ANSWERED, SECRET, nowSeconds() - 290);
    await webhooks.verify({ body: ANSWERED, signature: old, secret: SECRET });
    assert.equal(
      await codeOf(
        webhooks.verify({ body: ANSWERED, signature: old, secret: SECRET, tolerance: 60 }),
      ),
      'webhook_timestamp_out_of_tolerance',
    );
  });

  test('a t changed in the header is a mismatch, not an expiry', async () => {
    const forged = sign(ANSWERED).replace(/^t=\d+/, `t=${nowSeconds() - 3600}`);
    assert.equal(
      await codeOf(webhooks.verify({ body: ANSWERED, signature: forged, secret: SECRET })),
      'webhook_signature_mismatch',
    );
  });

  test('v1 beside a v2 passes on the v1', async () => {
    const signature = `${sign(ANSWERED)},v2=${'9'.repeat(128)}`;
    await webhooks.verify({ body: ANSWERED, signature, secret: SECRET });
  });

  test('any one of several v1 signatures is enough', async () => {
    const t = nowSeconds();
    const wrong = sign(ANSWERED, OTHER_SECRET, t).split(',')[1];
    const right = sign(ANSWERED, SECRET, t).split(',')[1];
    await webhooks.verify({
      body: ANSWERED,
      signature: `t=${t},${wrong},${right}`,
      secret: SECRET,
    });
  });

  test('only a v2 is malformed: there is no v1 to check', async () => {
    const t = nowSeconds();
    assert.equal(
      await codeOf(
        webhooks.verify({
          body: ANSWERED,
          signature: `t=${t},v2=${'9'.repeat(128)}`,
          secret: SECRET,
        }),
      ),
      'webhook_signature_malformed',
    );
  });

  test('no header, no t, or a body that is not a string each say so', async () => {
    assert.equal(
      await codeOf(webhooks.verify({ body: ANSWERED, signature: null, secret: SECRET })),
      'webhook_signature_missing',
    );
    assert.equal(
      await codeOf(
        webhooks.verify({
          body: ANSWERED,
          signature: sign(ANSWERED).split(',')[1],
          secret: SECRET,
        }),
      ),
      'webhook_signature_malformed',
    );
    assert.equal(
      await codeOf(
        webhooks.verify({
          body: JSON.parse(ANSWERED) as string,
          signature: sign(ANSWERED),
          secret: SECRET,
        }),
      ),
      'webhook_body_not_raw',
    );
  });

  test('a genuine signature over something that is not an event is refused', async () => {
    assert.equal(
      await codeOf(webhooks.verify({ body: 'ok', signature: sign('ok'), secret: SECRET })),
      'webhook_payload_invalid',
    );
  });

  test('runs where only Web Crypto exists: no Node builtin, no Buffer, no process', async () => {
    const fixture = fileURLToPath(new URL('./fixtures/web-crypto-only.ts', import.meta.url));
    const { stdout } = await promisify(execFile)(process.execPath, [fixture]);
    assert.deepEqual(JSON.parse(stdout), {
      process: 'undefined',
      buffer: 'undefined',
      valid: 'ok evt_1',
      altered: 'webhook_signature_mismatch',
      expired: 'webhook_timestamp_out_of_tolerance',
    });
  });
});
