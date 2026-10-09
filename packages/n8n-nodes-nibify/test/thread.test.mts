import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { isRace, onPendingOfThread, type PendingPage } from '../nodes/Nibify/thread.ts';

function pages(...ids: string[][]): (cursor: string | undefined) => Promise<PendingPage> {
  return async (cursor) => {
    const index = cursor === undefined ? 0 : Number(cursor);
    return {
      items: (ids[index] ?? []).map((requestId) => ({ requestId })),
      nextCursor: index + 1 < ids.length ? String(index + 1) : null,
    };
  };
}

describe('onPendingOfThread', () => {
  test('acts on every pending request of every page, in the order listed', async () => {
    const acted: string[] = [];
    const outcome = await onPendingOfThread('order-1042', {
      listPending: pages(['msg_3', 'msg_2'], ['msg_1']),
      act: async (id) => {
        acted.push(id);
        return undefined;
      },
    });
    assert.deepEqual(acted, ['msg_3', 'msg_2', 'msg_1']);
    assert.deepEqual(outcome, {
      threadKey: 'order-1042',
      requestIds: ['msg_3', 'msg_2', 'msg_1'],
      skipped: [],
    });
  });

  test('lists the whole thread before acting on any of it', async () => {
    const calls: string[] = [];
    const list = pages(['msg_2'], ['msg_1']);
    await onPendingOfThread('t', {
      listPending: async (cursor) => {
        calls.push(`list ${cursor ?? 'first'}`);
        return list(cursor);
      },
      act: async (id) => {
        calls.push(`act ${id}`);
        return undefined;
      },
    });
    assert.deepEqual(calls, ['list first', 'list 1', 'act msg_2', 'act msg_1']);
  });

  test('no pending request is not an error: nothing is acted on', async () => {
    const outcome = await onPendingOfThread('t', {
      listPending: pages([]),
      act: async () => assert.fail('nothing to act on'),
    });
    assert.deepEqual(outcome, { threadKey: 't', requestIds: [], skipped: [] });
  });

  test('a request that closed between the list and the call is skipped and reported', async () => {
    const outcome = await onPendingOfThread('t', {
      listPending: pages(['msg_2', 'msg_1']),
      act: async (id) =>
        id === 'msg_2'
          ? { code: 'request_already_answered', message: 'This Request has already been answered.' }
          : undefined,
    });
    assert.deepEqual(outcome, {
      threadKey: 't',
      requestIds: ['msg_1'],
      skipped: [
        {
          requestId: 'msg_2',
          code: 'request_already_answered',
          message: 'This Request has already been answered.',
        },
      ],
    });
  });

  test('any other failure stops the operation', async () => {
    const unauthorized = new Error('No such API key.');
    await assert.rejects(
      onPendingOfThread('t', {
        listPending: pages(['msg_1']),
        act: async () => {
          throw unauthorized;
        },
      }),
      unauthorized,
    );
    const offline = new Error('ECONNREFUSED');
    await assert.rejects(
      onPendingOfThread('t', {
        listPending: async () => {
          throw offline;
        },
        act: async () => undefined,
      }),
      offline,
    );
  });
});

describe('isRace', () => {
  test('the request_already_* codes of a 409, and nothing else', () => {
    for (const state of ['answered', 'expired', 'dismissed', 'cancelled']) {
      assert.ok(isRace({ code: `request_already_${state}`, message: '' }), state);
    }
    assert.equal(isRace({ code: 'request_not_found', message: '' }), false);
    assert.equal(isRace({ code: 'rate_limited', message: '' }), false);
  });
});
