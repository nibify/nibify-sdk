import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, test } from 'node:test';

import {
  outcomeOf,
  readCallback,
  type CallbackEvent,
  type TerminalStatus,
} from '../nodes/Nibify/callback.ts';

const SECRET = 'whsec_' + 'ab'.repeat(32);
const NOW = new Date('2026-10-09T12:00:00Z');
const T = Math.floor(NOW.getTime() / 1000);

function sign(body: string, t = T, secret = SECRET): string {
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
}

const EVENTS: { [Type in CallbackEvent['type']]: Extract<CallbackEvent, { type: Type }> } = {
  'message.answered': {
    id: 'evt_01',
    type: 'message.answered',
    createdAt: NOW.toISOString(),
    data: {
      requestId: 'msg_01',
      status: 'answered',
      environment: 'test',
      response: {
        responseId: 'res_01',
        actionName: 'approve',
        sourceComponentId: 'button-1',
        context: { note: 'only lead A' },
        clientTimestamp: NOW.toISOString(),
        answeredAt: NOW.toISOString(),
      },
    },
  },
  'message.expired': unanswered('expired'),
  'message.dismissed': unanswered('dismissed'),
  'message.cancelled': unanswered('cancelled'),
};

function unanswered<Status extends Exclude<TerminalStatus, 'answered'>>(status: Status) {
  return {
    id: 'evt_01',
    type: `message.${status}` as const,
    createdAt: NOW.toISOString(),
    data: { requestId: 'msg_01', status, environment: 'test' as const, response: null },
  };
}

function event(status: TerminalStatus): CallbackEvent {
  return EVENTS[`message.${status}`];
}

describe('readCallback', () => {
  const body = JSON.stringify(event('answered'));

  test('a callback signed with the secret, now, is read', () => {
    const callback = readCallback(body, sign(body), SECRET, NOW);
    assert.ok(callback.ok);
    assert.equal(callback.event.data.requestId, 'msg_01');
  });

  test('the bytes are what is signed, not the parsed object', () => {
    const respaced = JSON.stringify(event('answered'), null, 2);
    assert.equal(readCallback(respaced, sign(body), SECRET, NOW).ok, false);
  });

  test('an unsigned, forged, stale or future callback does not resume', () => {
    const refused = [
      readCallback(body, undefined, SECRET, NOW),
      readCallback(body, 't=abc,v1=00', SECRET, NOW),
      readCallback(body, sign(body, T, 'whsec_forged'), SECRET, NOW),
      readCallback(body, sign(body, T - 301), SECRET, NOW),
      readCallback(body, sign(body, T + 301), SECRET, NOW),
    ];
    assert.deepEqual(
      refused.map((callback) => (callback.ok ? 'resumed' : callback.reason)),
      [
        'missing Nibify-Signature',
        'malformed Nibify-Signature',
        'signature does not match',
        'signature timestamp outside the tolerance',
        'signature timestamp outside the tolerance',
      ],
    );
  });

  test('within the tolerance it is read', () => {
    assert.ok(readCallback(body, sign(body, T - 300), SECRET, NOW).ok);
  });

  test('a signed body that is not a terminal event is refused', () => {
    const other = JSON.stringify({ id: 'evt_02', type: 'message.read', data: { messageId: 'm' } });
    assert.equal(readCallback(other, sign(other), SECRET, NOW).ok, false);
  });
});

describe('outcomeOf', () => {
  test('answered is an answer, with the action and its context', () => {
    assert.deepEqual(outcomeOf(event('answered')), {
      answered: [
        {
          requestId: 'msg_01',
          status: 'answered',
          action: 'approve',
          context: { note: 'only lead A' },
          sourceComponentId: 'button-1',
          responseId: 'res_01',
          answeredAt: NOW.toISOString(),
          environment: 'test',
        },
      ],
      notAnswered: [],
    });
  });

  test('expired, dismissed and cancelled are not answers, and say which', () => {
    for (const status of ['expired', 'dismissed', 'cancelled'] as const) {
      assert.deepEqual(outcomeOf(event(status)), {
        answered: [],
        notAnswered: [{ requestId: 'msg_01', status, environment: 'test' }],
      });
    }
  });
});
