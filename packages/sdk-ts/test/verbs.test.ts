import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { Nibify, NibifyError } from '../src/index.ts';
import { fakeFetch, json, type Reply } from './fake-fetch.ts';

const KEY = 'sk_test_0123abcd0123456789abcdef0123456789ab';

function row(requestId: string, status: string): Record<string, unknown> {
  return {
    requestId,
    status,
    createdAt: '2026-10-09T10:00:00Z',
    expiresAt: null,
    environment: 'test',
    deliveredAt: null,
    readAt: null,
    contentDeletedAt: null,
    response: null,
  };
}

const state = (requestId: string, status: string): Reply => json(200, row(requestId, status));

function client(...replies: Reply[]): {
  nibify: Nibify;
  seen: ReturnType<typeof fakeFetch>['seen'];
} {
  const { fetch, seen } = fakeFetch(...replies);
  return { nibify: new Nibify({ apiKey: KEY, baseUrl: 'https://api.test', fetch }), seen };
}

const asked = (seen: ReturnType<typeof fakeFetch>['seen']): string[] =>
  seen.map(({ method, url }) => `${method} ${url.pathname}${url.search}`);

function message(sequence: number): Record<string, unknown> {
  return {
    messageId: `msg_${sequence}`,
    sequence,
    interactionType: 'conversation',
    status: null,
    sender: { name: 'Agent', icon: null },
    notification: { title: `turn ${sequence}`, body: '', quickActions: [] },
    minCatalogVersion: null,
    createdAt: '2026-10-09T10:00:00Z',
    expiresAt: null,
    deliveredAt: null,
    readAt: null,
    contentDeletedAt: null,
  };
}

describe('getRequest()', () => {
  test('reads the Request without waiting, and returns the handle with it', async () => {
    const { nibify, seen } = client(state('msg_1', 'pending'), state('msg_1', 'cancelled'));

    const read = await nibify.getRequest('msg_1');

    assert.equal(read.status, 'pending');
    assert.equal(read.request.id, 'msg_1');
    const withdrawn = await read.request.cancel();
    assert.equal(withdrawn.status, 'cancelled');
    assert.deepEqual(asked(seen), ['GET /v1/requests/msg_1', 'DELETE /v1/requests/msg_1']);
  });

  test('an unknown id is a NibifyError with the API code', async () => {
    const { nibify } = client(
      json(404, { error: { code: 'request_not_found', message: 'No such Request' } }),
    );
    await assert.rejects(nibify.getRequest('msg_x'), { status: 404, code: 'request_not_found' });
  });
});

describe('request.cancel() and request.nudge()', () => {
  test('nudge posts to /nudge and returns the Request unchanged', async () => {
    const { nibify, seen } = client(state('msg_1', 'pending'), state('msg_1', 'pending'));
    const { request } = await nibify.getRequest('msg_1');

    const nudged = await request.nudge();

    assert.equal(nudged.status, 'pending');
    assert.equal(nudged.request, request);
    assert.deepEqual(asked(seen).at(-1), 'POST /v1/requests/msg_1/nudge');
  });

  test('cancelling a Request the person already answered is a 409 naming that state', async () => {
    const { nibify } = client(
      state('msg_1', 'pending'),
      json(409, { error: { code: 'request_already_answered', message: 'answered first' } }),
    );
    const { request } = await nibify.getRequest('msg_1');
    await assert.rejects(request.cancel(), (error) => {
      assert.ok(error instanceof NibifyError);
      assert.equal(error.status, 409);
      assert.equal(error.code, 'request_already_answered');
      return true;
    });
  });

  for (const verb of ['cancel', 'nudge'] as const) {
    test(`${verb} is not retried on a 5xx`, async () => {
      const { nibify, seen } = client(
        state('msg_1', 'pending'),
        json(503, { error: { code: 'unavailable', message: 'x' } }),
      );
      const { request } = await nibify.getRequest('msg_1');
      await assert.rejects(request[verb](), { status: 503 });
      assert.equal(seen.length, 2);
    });
  }
});

describe('requests.list()', () => {
  test('walks every page by cursor, with the filters and the page size on each call', async () => {
    const { nibify, seen } = client(
      json(200, { items: [row('msg_3', 'pending'), row('msg_2', 'pending')], nextCursor: 'c1' }),
      json(200, { items: [row('msg_1', 'pending')], nextCursor: null }),
    );

    const ids: string[] = [];
    for await (const item of nibify.requests.list({ status: 'pending', pageSize: 2 })) {
      assert.equal(item.request.id, item.requestId);
      ids.push(item.requestId);
    }

    assert.deepEqual(ids, ['msg_3', 'msg_2', 'msg_1']);
    assert.deepEqual(asked(seen), [
      'GET /v1/requests?status=pending&limit=2',
      'GET /v1/requests?status=pending&limit=2&cursor=c1',
    ]);
  });

  test('stops fetching when the caller stops walking', async () => {
    const { nibify, seen } = client(
      json(200, { items: [row('msg_2', 'pending'), row('msg_1', 'pending')], nextCursor: 'c1' }),
    );
    for await (const item of nibify.requests.list()) {
      assert.equal(item.requestId, 'msg_2');
      break;
    }
    assert.deepEqual(asked(seen), ['GET /v1/requests']);
  });
});

describe('threads', () => {
  const thread = (key: string): Record<string, unknown> => ({
    threadId: `thr_${key}`,
    threadKey: key,
    environment: 'test',
    messageCount: 3,
    createdAt: '2026-10-09T10:00:00Z',
    lastMessage: message(3),
  });

  test('list walks every page by cursor', async () => {
    const { nibify, seen } = client(
      json(200, { items: [thread('a')], nextCursor: 'c1' }),
      json(200, { items: [thread('b')], nextCursor: null }),
    );
    const keys: (string | null)[] = [];
    for await (const item of nibify.threads.list({ pageSize: 1 })) keys.push(item.threadKey);
    assert.deepEqual(keys, ['a', 'b']);
    assert.deepEqual(asked(seen), ['GET /v1/threads?limit=1', 'GET /v1/threads?limit=1&cursor=c1']);
  });

  test('get reads the Thread by key, and its messages page forward with after', async () => {
    const { nibify, seen } = client(
      json(200, {
        ...thread('ordine/1183'),
        messages: { items: [message(1), message(2)], nextAfter: 2 },
      }),
      json(200, { ...thread('ordine/1183'), messages: { items: [message(3)], nextAfter: null } }),
    );

    const history = await nibify.threads.get('ordine/1183', { pageSize: 2 });
    assert.equal(history.threadKey, 'ordine/1183');
    assert.equal(seen.length, 1);

    const sequences: number[] = [];
    for await (const item of history.messages) sequences.push(item.sequence);

    assert.deepEqual(sequences, [1, 2, 3]);
    assert.deepEqual(asked(seen), [
      'GET /v1/threads/ordine%2F1183?limit=2',
      'GET /v1/threads/ordine%2F1183?after=2&limit=2',
    ]);
  });
});
