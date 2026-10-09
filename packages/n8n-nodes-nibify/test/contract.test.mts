/** The contract between this node and `openapi/openapi.json` (ADR-0005, ADR-0010). */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { CALLBACK_EVENTS, type CallbackEvent } from '../nodes/Nibify/callback.ts';
import { ROUTES } from '../nodes/Nibify/operations.ts';
import {
  agentOperations,
  agentWebhooks,
  generateTypes,
  readSpec,
  TYPES_PATH,
} from '../scripts/agent-types.mts';

/** Operations of the `agent` tag the node does not call: none of its four operations needs them. */
const NOT_YET_COVERED = [
  'RequestsController_read',
  'RequestsController_awaitResponse',
  'ThreadsController_list',
  'ThreadsController_read',
];

test('the committed types are what the spec generates', async () => {
  const committed = (await readFile(TYPES_PATH, 'utf8')).split('\n');
  const generated = (await generateTypes(await readSpec())).split('\n');
  const line = generated.findIndex((text, index) => text !== committed[index]);
  assert.ok(
    line === -1 && committed.length === generated.length,
    `nodes/Nibify/generated/agent-api.ts is behind openapi/openapi.json from line ${line + 1}: ` +
      `${JSON.stringify(committed[line])} should be ${JSON.stringify(generated[line])}. ` +
      'Run `pnpm --filter n8n-nodes-nibify generate`.',
  );
});

test('a field changed in the spec changes the generated types', async () => {
  const spec = await readSpec();
  const changed = structuredClone(spec);
  const create = changed.components?.schemas?.['CreateRequestDto'] as {
    properties: Record<string, { type: string }>;
  };
  create.properties['callbackUrl'] = { type: 'integer' };
  assert.notEqual(await generateTypes(changed), await generateTypes(spec));
});

/** Events of the `agent` tag a callback never carries: they go only to a `WebhookEndpoint`. */
const NOT_A_CALLBACK = ['message.delivered', 'message.read'];

test('a field renamed in an event changes the generated types', async () => {
  const spec = await readSpec();
  const changed = structuredClone(spec);
  const answered = changed.components?.schemas?.['MessageAnsweredEvent'] as {
    properties: Record<string, { properties: Record<string, unknown> }>;
  };
  const data = answered.properties['data']?.properties ?? {};
  data['requestID'] = data['requestId'];
  delete data['requestId'];
  assert.notEqual(await generateTypes(changed), await generateTypes(spec));
});

test('every event of the agent tag is a callback the node reads, or listed as not one', async () => {
  const inSpec = agentWebhooks(await readSpec()).map(({ event }) => event);
  const read: string[] = [...CALLBACK_EVENTS];

  assert.deepEqual(
    inSpec.filter((event) => !read.includes(event) && !NOT_A_CALLBACK.includes(event)),
    [],
    'not read and not listed',
  );
  assert.deepEqual(
    [...read, ...NOT_A_CALLBACK].filter((event) => !inSpec.includes(event)),
    [],
    'read or listed, but not an agent event in the spec',
  );
  assert.deepEqual(
    read.filter((event) => NOT_A_CALLBACK.includes(event)),
    [],
    'read, so it leaves NOT_A_CALLBACK',
  );
});

test('an event that does not answer carries no response', () => {
  const answer = {
    responseId: 'res_01',
    actionName: 'approve',
    sourceComponentId: 'button-1',
    context: null,
    clientTimestamp: '2026-10-09T12:00:00.000Z',
    answeredAt: '2026-10-09T12:00:00.000Z',
  };
  // @ts-expect-error an expired Request carries no Response
  const response: Extract<CallbackEvent, { type: 'message.expired' }>['data']['response'] = answer;
  assert.equal(response, answer);
});

test('every operation of the agent tag is covered by the node, or listed as not yet', async () => {
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

test('each route the node calls is the method and path the spec gives it', async () => {
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

test('the package has no runtime dependencies', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  assert.deepEqual(pkg.dependencies ?? {}, {});
});
