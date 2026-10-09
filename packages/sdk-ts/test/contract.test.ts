/** The contract between this facade and `openapi/openapi.json` (ADR-0005, ADR-0010). */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { agentOperations, generateTypes, readSpec, TYPES_PATH } from '../scripts/agent-types.ts';
import { ROUTES } from '../src/operations.ts';

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
