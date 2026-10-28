import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { Button, Nibify, NibifyError, Text, type Surface } from '../src/index.ts';
import { fakeFetch, json, type Reply } from './fake-fetch.ts';

const KEY = 'sk_test_0123abcd0123456789abcdef0123456789ab';

const SURFACE: Surface = {
  root: 'root',
  dataModel: { note: '' },
  components: [
    { id: 'root', component: 'Button', child: 'label', action: { event: { name: 'approve' } } },
    { id: 'label', component: 'Text', text: 'Approva' },
  ],
};

const ASK = {
  sender: { name: 'Outreach agent' },
  notification: { title: 'Approvazione richiesta', body: 'Tre email pronte.' },
};

const created = json(201, {
  requestId: 'msg_1',
  threadId: 'thr_1',
  sequence: 1,
  interactionType: 'action',
  status: 'pending',
  createdAt: '2026-10-09T10:00:00Z',
  expiresAt: null,
  environment: 'test',
  minCatalogVersion: 1,
  warnings: [],
});

function outcome(status: string, response: unknown = null): Reply {
  return json(200, {
    requestId: 'msg_1',
    status,
    createdAt: '2026-10-09T10:00:00Z',
    expiresAt: null,
    environment: 'test',
    deliveredAt: null,
    readAt: null,
    contentDeletedAt: null,
    response,
  });
}

const ANSWER = {
  responseId: 'res_1',
  actionName: 'approve',
  sourceComponentId: 'approve',
  context: { note: 'solo ai lead A' },
  clientTimestamp: '2026-10-09T10:01:00Z',
  answeredAt: '2026-10-09T10:01:01Z',
};

const hangUntilAborted: Reply = () => new Promise<Response>(() => undefined);

describe('configuration', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  test('the key decides the environment', () => {
    assert.equal(new Nibify({ apiKey: KEY }).environment, 'test');
    assert.equal(new Nibify({ apiKey: 'sk_live_00000000' }).environment, 'live');
  });

  test('a key with neither prefix is refused', () => {
    assert.throws(() => new Nibify({ apiKey: 'pk_test_1' }), { code: 'invalid_api_key' });
  });

  test('without options it reads NIBIFY_API_KEY and defaults to api.nibify.app', () => {
    process.env.NIBIFY_API_KEY = 'sk_live_00000000';
    delete process.env.NIBIFY_BASE_URL;
    const client = new Nibify();
    assert.equal(client.environment, 'live');
    assert.equal(client.baseUrl, 'https://api.nibify.app');
  });

  test('NIBIFY_BASE_URL is the fallback, and an option wins over it', () => {
    process.env.NIBIFY_BASE_URL = 'http://localhost:3000/';
    assert.equal(new Nibify({ apiKey: KEY }).baseUrl, 'http://localhost:3000');
    assert.equal(new Nibify({ apiKey: KEY, baseUrl: 'https://x.test' }).baseUrl, 'https://x.test');
  });

  test('no key at all is refused', () => {
    delete process.env.NIBIFY_API_KEY;
    assert.throws(() => new Nibify(), { code: 'missing_api_key' });
  });
});

describe('ask()', () => {
  test('creates the Request, re-issues the long poll on pending, and returns the answer', async () => {
    const { fetch, seen } = fakeFetch(created, outcome('pending'), outcome('answered', ANSWER));
    const client = new Nibify({ apiKey: KEY, baseUrl: 'https://api.test', fetch });

    const result = await client.ask(SURFACE, ASK);

    assert.equal(result.status, 'answered');
    assert.ok(result.status === 'answered');
    assert.equal(result.response.actionName, 'approve');
    assert.deepEqual(result.response.context, { note: 'solo ai lead A' });
    assert.equal(result.request.id, 'msg_1');

    const [create, ...polls] = seen;
    assert.equal(create?.method, 'POST');
    assert.equal(create?.url.href, 'https://api.test/v1/requests');
    assert.equal(create?.headers.get('authorization'), `Bearer ${KEY}`);
    assert.match(create?.headers.get('idempotency-key') ?? '', /^[0-9a-f-]{36}$/);
    assert.deepEqual(create?.body, { ...ASK, surface: SURFACE });
    assert.deepEqual(
      polls.map(({ method, url }) => `${method} ${url.pathname}${url.search}`),
      ['GET /v1/requests/msg_1/response?wait=30', 'GET /v1/requests/msg_1/response?wait=30'],
    );
  });

  for (const status of ['expired', 'dismissed', 'cancelled'] as const) {
    test(`resolves with ${status}, it does not reject`, async () => {
      const { fetch } = fakeFetch(created, outcome(status));
      const result = await new Nibify({ apiKey: KEY, fetch }).ask(SURFACE, ASK);
      assert.equal(result.status, status);
    });
  }

  test('the end of its own wait is timeout, not expired, and the handle resumes it', async () => {
    const { fetch, seen } = fakeFetch(
      created,
      outcome('pending'),
      hangUntilAborted,
      outcome('answered', ANSWER),
    );
    const client = new Nibify({ apiKey: KEY, fetch });

    const result = await client.ask(SURFACE, { ...ASK, timeout: 1_200 });

    assert.equal(result.status, 'timeout');
    assert.equal(result.request.id, 'msg_1');
    assert.equal(seen[1]?.url.searchParams.get('wait'), '2');

    const resumed = await result.request.wait();
    assert.equal(resumed.status, 'answered');
  });

  test('an abort once the Request exists resolves with timeout', async () => {
    const controller = new AbortController();
    const { fetch } = fakeFetch(created, () => {
      setTimeout(() => controller.abort(), 10);
      return new Promise<Response>(() => undefined);
    });
    const result = await new Nibify({ apiKey: KEY, fetch }).ask(SURFACE, {
      ...ASK,
      signal: controller.signal,
    });
    assert.equal(result.status, 'timeout');
  });

  test('a 5xx on create is retried with the same Idempotency-Key', async () => {
    const { fetch, seen } = fakeFetch(
      json(502, { error: { code: 'bad_gateway', message: 'upstream' } }),
      created,
      outcome('answered', ANSWER),
    );
    const result = await new Nibify({ apiKey: KEY, fetch }).ask(SURFACE, ASK);

    assert.equal(result.status, 'answered');
    const keys = seen
      .filter((s) => s.method === 'POST')
      .map((s) => s.headers.get('idempotency-key'));
    assert.equal(keys.length, 2);
    assert.equal(keys[0], keys[1]);
  });

  test('a 429 is retried after Retry-After', async () => {
    const { fetch } = fakeFetch(
      json(429, { error: { code: 'rate_limited', message: 'slow down' } }, { 'retry-after': '1' }),
      created,
      outcome('answered', ANSWER),
    );
    const startedAt = Date.now();
    const result = await new Nibify({ apiKey: KEY, fetch }).ask(SURFACE, ASK);
    assert.equal(result.status, 'answered');
    assert.ok(Date.now() - startedAt >= 1_000);
  });

  test('a network failure is retried', async () => {
    const { fetch, seen } = fakeFetch(
      () => Promise.reject(new TypeError('fetch failed')),
      created,
      outcome('answered', ANSWER),
    );
    const result = await new Nibify({ apiKey: KEY, fetch }).ask(SURFACE, ASK);
    assert.equal(result.status, 'answered');
    assert.equal(seen.length, 3);
  });

  test('a 4xx raises NibifyError with the status and code of the body, without retrying', async () => {
    const { fetch, seen } = fakeFetch(
      json(422, {
        error: {
          code: 'surface_invalid',
          message: 'Button needs a child',
          details: [{ pointer: '/surface/components/0', message: 'missing child' }],
        },
      }),
    );
    await assert.rejects(new Nibify({ apiKey: KEY, fetch }).ask(SURFACE, ASK), (error) => {
      assert.ok(error instanceof NibifyError);
      assert.equal(error.status, 422);
      assert.equal(error.code, 'surface_invalid');
      assert.equal(error.details[0]?.pointer, '/surface/components/0');
      return true;
    });
    assert.equal(seen.length, 1);
  });

  test('retries run out into a NibifyError with no status for the network', async () => {
    const fail = (): Promise<Response> => Promise.reject(new TypeError('fetch failed'));
    const { fetch, seen } = fakeFetch(fail, fail);
    await assert.rejects(new Nibify({ apiKey: KEY, fetch, maxRetries: 1 }).ask(SURFACE, ASK), {
      name: 'NibifyError',
      status: null,
      code: 'network_error',
    });
    assert.equal(seen.length, 2);
  });
});

describe('ask() through a dropped wait', () => {
  const dropped: Reply = () => Promise.reject(new TypeError('fetch failed'));
  const unavailable = json(503, { error: { code: 'service_unavailable', message: 'redeploy' } });

  test('a connection dropped during the wait re-issues the long poll, whatever maxRetries says', async () => {
    const { fetch, seen } = fakeFetch(created, dropped, unavailable, outcome('answered', ANSWER));
    const result = await new Nibify({ apiKey: KEY, fetch, maxRetries: 0 }).ask(SURFACE, ASK);

    assert.equal(result.status, 'answered');
    assert.deepEqual(
      seen.slice(1).map(({ url }) => url.pathname),
      Array(3).fill('/v1/requests/msg_1/response'),
    );
  });

  test('the retries stay inside the timeout, which ends them with timeout', async () => {
    const { fetch } = fakeFetch(created, ...Array<Reply>(20).fill(dropped));
    const result = await new Nibify({ apiKey: KEY, fetch }).ask(SURFACE, { ...ASK, timeout: 300 });
    assert.equal(result.status, 'timeout');
  });

  test('past the cap of consecutive failures, the failure reaches the caller', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const { fetch, seen } = fakeFetch(created, ...Array<Reply>(11).fill(dropped));
    const raised = new Nibify({ apiKey: KEY, fetch, maxRetries: 0 }).ask(SURFACE, ASK).then(
      () => assert.fail('the wait should have raised'),
      (error: unknown) => error,
    );

    let settled = false;
    void raised.finally(() => (settled = true));
    while (!settled) {
      await new Promise((resolve) => setImmediate(resolve));
      t.mock.timers.tick(10_000);
    }

    assert.ok((await raised) instanceof NibifyError);
    assert.equal(seen.length, 12);
  });
});

describe('ask() without a surface', () => {
  const LOCK_SCREEN = {
    sender: { name: 'Deploy bot' },
    notification: {
      title: 'Deploy in produzione?',
      body: 'v2.4.1 è pronta.',
      quickActions: [
        { name: 'ship', label: 'Vai' },
        { name: 'hold', label: 'Aspetta' },
      ],
    },
  };

  test('sends no surface, and the answer from the lock screen comes back like any other', async () => {
    const fromNotification = {
      ...ANSWER,
      actionName: 'ship',
      sourceComponentId: 'notification',
      context: {},
    };
    const { fetch, seen } = fakeFetch(created, outcome('answered', fromNotification));

    const result = await new Nibify({ apiKey: KEY, fetch }).ask(LOCK_SCREEN);

    assert.ok(result.status === 'answered');
    assert.equal(result.response.actionName, 'ship');
    assert.equal(result.response.sourceComponentId, 'notification');
    assert.deepEqual(result.response.context, {});
    assert.deepEqual(seen[0]?.body, LOCK_SCREEN);
    assert.match(seen[0]?.headers.get('idempotency-key') ?? '', /^[0-9a-f-]{36}$/);
  });

  test('timeout and signal stay options, not part of the body', async () => {
    const { fetch, seen } = fakeFetch(created, hangUntilAborted);
    const result = await new Nibify({ apiKey: KEY, fetch }).ask({ ...LOCK_SCREEN, timeout: 20 });
    assert.equal(result.status, 'timeout');
    assert.deepEqual(seen[0]?.body, LOCK_SCREEN);
  });

  test('a 5xx on create is retried with the same Idempotency-Key', async () => {
    const { fetch, seen } = fakeFetch(
      json(503, { error: { code: 'unavailable', message: 'x' } }),
      created,
      outcome('cancelled'),
    );
    await new Nibify({ apiKey: KEY, fetch }).ask(LOCK_SCREEN);
    assert.equal(seen[0]?.headers.get('idempotency-key'), seen[1]?.headers.get('idempotency-key'));
  });
});

test('the types hold quickActions to the surface when there is one, as the API does', () => {
  const nibify = new Nibify({ apiKey: KEY, fetch: fakeFetch().fetch });
  const ask = (quickActions: { name: string; label: string }[]) => ({
    sender: { name: 'a' },
    notification: { title: 't', body: 'b', quickActions },
  });
  const built = {
    root: 'root',
    dataModel: {},
    components: [Button('root', { child: 'l', action: { event: { name: 'approve' } } })],
  };
  const typed = <const Name extends string>(name: Name) => ({
    sender: { name: 'a' },
    notification: { title: 't', body: 'b', quickActions: [{ name, label: 'x' }] },
  });

  const unsent = (): void => {
    void nibify.ask(ask([{ name: 'anything', label: 'x' }]));
    void nibify.ask(SURFACE, ask([{ name: 'anything', label: 'x' }]));
    void nibify.ask(built, typed('approve'));
    // @ts-expect-error the built surface dispatches only approve
    void nibify.ask(built, typed('reject'));
    void nibify.ask(
      {
        root: 'root',
        dataModel: {},
        components: [
          { id: 'root', component: 'Button', child: 'l', action: { event: { name: 'ship' } } },
        ],
      },
      // @ts-expect-error the JSON surface dispatches only ship
      typed('other'),
    );
    void nibify.ask(
      {
        root: 'root',
        dataModel: {},
        components: [{ id: 'root', action: { event: { name: 'ship' } } }],
      },
      typed('ship'),
    );
    void nibify.ask(
      { root: 'root', dataModel: {}, components: [Text('root', { text: 'Fatto.' })] },
      // @ts-expect-error a surface that dispatches nothing takes no quickAction
      typed('approve'),
    );
    // @ts-expect-error the surface is the first argument, not an option
    void nibify.ask({ ...ask([]), surface: SURFACE });
  };
  assert.equal(typeof unsent, 'function');
});

describe('notify()', () => {
  const NOTIFY = {
    sender: { name: 'Outreach agent' },
    notification: { title: 'Fatto', body: 'Tre email inviate.' },
  };

  test('posts the notification without an Idempotency-Key', async () => {
    const { fetch, seen } = fakeFetch(
      json(201, {
        messageId: 'msg_2',
        threadId: 'thr_2',
        sequence: 1,
        interactionType: 'informational',
        createdAt: '2026-10-09T10:00:00Z',
        environment: 'test',
        minCatalogVersion: null,
        warnings: [],
      }),
    );
    const sent = await new Nibify({ apiKey: KEY, fetch }).notify(NOTIFY);
    assert.equal(sent.messageId, 'msg_2');
    assert.equal(seen[0]?.url.pathname, '/v1/notifications');
    assert.equal(seen[0]?.headers.get('idempotency-key'), null);
    assert.deepEqual(seen[0]?.body, NOTIFY);
  });

  test('a 5xx is not retried', async () => {
    const { fetch, seen } = fakeFetch(json(503, { error: { code: 'unavailable', message: 'x' } }));
    await assert.rejects(new Nibify({ apiKey: KEY, fetch }).notify(NOTIFY), {
      status: 503,
      code: 'unavailable',
    });
    assert.equal(seen.length, 1);
  });
});
