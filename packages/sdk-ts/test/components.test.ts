/** The component constructors against `catalog/catalog.json` and the PRD §6.1 surface. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { createValidator, validateSurface } from '@nibify/catalog/validator';

import { COMPONENTS_PATH, generateComponents, readCatalog } from '../scripts/components.ts';
import {
  Button,
  Card,
  Column,
  Divider,
  Nibify,
  Row,
  Text,
  TextField,
  type Component,
  type Surface,
} from '../src/index.ts';
import { fakeFetch, json } from './fake-fetch.ts';

const APPROVE_REJECT = fileURLToPath(
  import.meta.resolve('@nibify/catalog/examples/approve-reject.surface.json'),
);

const handWritten = async (): Promise<Surface> =>
  JSON.parse(await readFile(APPROVE_REJECT, 'utf8')) as Surface;

const built = {
  root: 'root',
  dataModel: { note: '' },
  components: [
    Card('root', { child: 'body' }),
    Column('body', { children: ['title', 'detail', 'note', 'actions'] }),
    Text('title', { text: 'Invio email di outreach', variant: 'h4' }),
    Text('detail', { text: "L'agente ha preparato **3 email**. Rivedi e approva." }),
    TextField('note', { label: 'Nota (opzionale)', value: { path: '/note' }, variant: 'longText' }),
    Row('actions', { justify: 'spaceBetween', children: ['reject', 'approve'] }),
    Button('reject', {
      variant: 'borderless',
      child: 'reject-lbl',
      action: { event: { name: 'reject', context: {} } },
    }),
    Text('reject-lbl', { text: 'Rifiuta' }),
    Button('approve', {
      variant: 'primary',
      child: 'approve-lbl',
      action: { event: { name: 'approve', context: { note: { path: '/note' } } } },
    }),
    Text('approve-lbl', { text: 'Approva' }),
  ],
} satisfies Surface;

test('the committed constructors are what the catalog generates', async () => {
  const committed = (await readFile(COMPONENTS_PATH, 'utf8')).split('\n');
  const generated = (await generateComponents(await readCatalog())).split('\n');
  const line = generated.findIndex((text, index) => text !== committed[index]);
  assert.ok(
    line === -1 && committed.length === generated.length,
    `src/generated/components.ts is behind catalog/catalog.json from line ${line + 1}: ` +
      `${JSON.stringify(committed[line])} should be ${JSON.stringify(generated[line])}. ` +
      'Run `pnpm generate`.',
  );
});

test('a component added to the catalog adds a constructor', async () => {
  const sources = await readCatalog();
  const changed = structuredClone(sources);
  const components = changed.catalog['components'] as Record<string, unknown>;
  components['Badge'] = {
    ...structuredClone(components['Divider'] as object),
    allOf: [
      { $ref: 'https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon' },
      {
        type: 'object',
        properties: { component: { const: 'Badge' }, count: { type: 'number' } },
        required: ['component', 'count'],
      },
    ],
  };
  const generated = await generateComponents(changed);
  assert.notEqual(generated, await generateComponents(sources));
  assert.match(generated, /export function Badge\(id: ComponentId, props: BadgeProps\)/);
  assert.match(generated, /count: number;/);
});

test('a catalog keyword with no TypeScript rendering stops the generator', async () => {
  const changed = structuredClone(await readCatalog());
  const text = (changed.catalog['components'] as Record<string, { allOf: object[] }>)['Text'];
  text?.allOf.push({ patternProperties: { '^x-': {} } });
  await assert.rejects(generateComponents(changed), /patternProperties/);
});

test('PRD §6.1 written with the constructors is the JSON written by hand', async () => {
  assert.equal(JSON.stringify(built), JSON.stringify(await handWritten()));
});

test('the catalog validator accepts the surface the constructors build', () => {
  const result = validateSurface(createValidator(), built);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test('a constructor returns a plain object, with nothing of its own', () => {
  const divider: Component = Divider('rule');
  assert.deepEqual(divider, { id: 'rule', component: 'Divider' });
  assert.equal(Object.getPrototypeOf(divider), Object.prototype);
});

test('ask() sends the same body for the surface built and the surface written', async () => {
  const bodies: unknown[] = [];
  for (const surface of [built, await handWritten()]) {
    const { fetch, seen } = fakeFetch(
      json(201, { requestId: 'msg_1' }),
      json(200, { requestId: 'msg_1', status: 'cancelled', response: null }),
    );
    const nibify = new Nibify({ apiKey: 'sk_test_0123', baseUrl: 'http://api.test', fetch });
    await nibify.ask(surface, {
      sender: { name: 'Outreach agent' },
      notification: { title: 'Approvazione richiesta', body: "L'agente vuole inviare 3 email." },
    });
    bodies.push(JSON.stringify(seen[0]?.body));
  }
  assert.equal(bodies[0], bodies[1]);
});

test('the types refuse what the catalog refuses', () => {
  // @ts-expect-error a Button dispatches an action
  Button('go', { child: 'go-lbl' });
  // @ts-expect-error h6 is not a variant of Text
  Text('t', { text: 'x', variant: 'h6' });
  // @ts-expect-error a Card has one child, not children
  Card('c', { children: ['a'] });
});
