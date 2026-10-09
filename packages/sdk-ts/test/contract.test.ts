/** The contract between this facade and `openapi/openapi.json` (ADR-0005, ADR-0010). */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  agentOperations,
  agentWebhooks,
  generateTypes,
  readSpec,
  TYPES_PATH,
} from '../scripts/agent-types.ts';
import type { events } from '../src/generated/agent-api.ts';
import { ROUTES } from '../src/operations.ts';
import { webhooks, type MessageReceipt, type MessageUnanswered } from '../src/webhooks.ts';

/** Operations of the `agent` tag the facade does not call yet. */
const NOT_YET_COVERED: string[] = [];

test('the committed types are what the spec generates', async () => {
  const committed = (await readFile(TYPES_PATH, 'utf8')).split('\n');
  const generated = (await generateTypes(await readSpec())).split('\n');
  const line = generated.findIndex((text, index) => text !== committed[index]);
  assert.ok(
    line === -1 && committed.length === generated.length,
    `src/generated/agent-api.ts is behind openapi/openapi.json from line ${line + 1}: ` +
      `${JSON.stringify(committed[line])} should be ${JSON.stringify(generated[line])}. ` +
      'Run `pnpm generate`.',
  );
});

test('a field changed in the spec changes the generated types', async () => {
  const spec = await readSpec();
  const changed = structuredClone(spec);
  const created = changed.components?.schemas?.['RequestCreatedDto'] as {
    properties: Record<string, { type: string }>;
  };
  created.properties['requestId'] = { type: 'integer' };
  assert.notEqual(await generateTypes(changed), await generateTypes(spec));
});

test('a field renamed in an event changes the generated types', async () => {
  const spec = await readSpec();
  const changed = structuredClone(spec);
  const delivered = changed.components?.schemas?.['MessageDeliveredEvent'] as {
    properties: Record<string, { properties: Record<string, unknown> }>;
  };
  const data = delivered.properties['data']?.properties ?? {};
  data['messageID'] = data['messageId'];
  delete data['messageId'];
  assert.notEqual(await generateTypes(changed), await generateTypes(spec));
});

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const VERIFY_RESOLVES_EVERY_EVENT: Equal<
  Awaited<ReturnType<typeof webhooks.verify>>,
  events[keyof events]
> = true;

/** One payload per event `verify()` resolves with: typed by the generated map, so none is missing. */
const SAMPLES: { [Type in keyof events]: events[Type] } = {
  'message.delivered': {
    id: 'evt_delivered',
    type: 'message.delivered',
    createdAt: '2026-10-09T10:00:00.000Z',
    data: {
      messageId: 'msg_01',
      environment: 'test',
      status: null,
      deliveredAt: '2026-10-09T10:00:00.000Z',
      readAt: null,
    },
  },
  'message.read': {
    id: 'evt_read',
    type: 'message.read',
    createdAt: '2026-10-09T10:01:00.000Z',
    data: {
      messageId: 'msg_01',
      environment: 'test',
      status: 'pending',
      deliveredAt: '2026-10-09T10:00:00.000Z',
      readAt: '2026-10-09T10:01:00.000Z',
    },
  },
  'message.answered': {
    id: 'evt_answered',
    type: 'message.answered',
    createdAt: '2026-10-09T10:02:00.000Z',
    data: {
      requestId: 'req_01',
      status: 'answered',
      environment: 'test',
      response: {
        responseId: 'rsp_01',
        actionName: 'approve',
        sourceComponentId: 'root',
        context: null,
        clientTimestamp: '2026-10-09T10:01:59.000Z',
        answeredAt: '2026-10-09T10:02:00.000Z',
      },
    },
  },
  'message.expired': {
    id: 'evt_expired',
    type: 'message.expired',
    createdAt: '2026-10-09T10:02:00.000Z',
    data: { requestId: 'req_02', status: 'expired', environment: 'live', response: null },
  },
  'message.dismissed': {
    id: 'evt_dismissed',
    type: 'message.dismissed',
    createdAt: '2026-10-09T10:02:00.000Z',
    data: { requestId: 'req_03', status: 'dismissed', environment: 'live', response: null },
  },
  'message.cancelled': {
    id: 'evt_cancelled',
    type: 'message.cancelled',
    createdAt: '2026-10-09T10:02:00.000Z',
    data: { requestId: 'req_04', status: 'cancelled', environment: 'live', response: null },
  },
};

test('every event of the agent tag is one verify() resolves with', async () => {
  assert.ok(VERIFY_RESOLVES_EVERY_EVENT);
  assert.deepEqual(
    Object.keys(SAMPLES).sort(),
    agentWebhooks(await readSpec())
      .map(({ event }) => event)
      .sort(),
  );

  const secret = 'whsec_' + 'ab'.repeat(32);
  for (const [type, sample] of Object.entries(SAMPLES)) {
    const body = JSON.stringify(sample);
    const t = Math.floor(Date.now() / 1000);
    const signature = `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
    assert.deepEqual(await webhooks.verify({ body, signature, secret }), sample, type);
  }
});

test('the events are as narrow as the wire', () => {
  type Delivered = Extract<MessageReceipt, { type: 'message.delivered' }>;
  type Expired = Extract<MessageUnanswered, { type: 'message.expired' }>;
  const read = '2026-10-09T10:01:00.000Z';
  const answer = SAMPLES['message.answered'].data.response;

  // @ts-expect-error a delivered receipt has not been read
  const readAt: Delivered['data']['readAt'] = read;
  // @ts-expect-error an expired Request carries no Response
  const response: Expired['data']['response'] = answer;
  assert.deepEqual([readAt, response], [read, answer]);
});

test('every operation of the agent tag is covered by the facade, or listed as not yet', async () => {
  const inSpec = agentOperations(await readSpec()).map(({ operationId }) => operationId);
  const covered = Object.keys(ROUTES);

  assert.deepEqual(
    inSpec.filter((id) => !covered.includes(id) && !NOT_YET_COVERED.includes(id)),
    [],
    'not covered and not listed',
  );
  assert.deepEqual(
    [...covered, ...NOT_YET_COVERED].filter((id) => !inSpec.includes(id)),
    [],
    'covered or listed, but not an agent operation in the spec',
  );
  assert.deepEqual(
    covered.filter((id) => NOT_YET_COVERED.includes(id)),
    [],
    'covered, so it leaves NOT_YET_COVERED',
  );
});

test('each route the facade calls is the method and path the spec gives it', async () => {
  const byId = new Map(agentOperations(await readSpec()).map((op) => [op.operationId, op]));
  for (const [operationId, route] of Object.entries(ROUTES)) {
    const inSpec = byId.get(operationId);
    assert.deepEqual(
      { method: route.method, path: route.path },
      inSpec && { method: inSpec.method, path: inSpec.path },
      operationId,
    );
  }
});
