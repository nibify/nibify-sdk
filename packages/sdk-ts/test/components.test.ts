/** The component constructors against `catalog/catalog.json` and the three surfaces of PRD §3. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { createValidator, validateSurface } from '@nibify/catalog/validator';

import { COMPONENTS_PATH, generateComponents, readCatalog } from '../scripts/components.ts';
import {
  Button,
  Card,
  CheckBox,
  ChoicePicker,
  Column,
  DateTimeInput,
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
    Text('title', { text: '#### Invio email di outreach' }),
    Text('detail', { text: "L'agente ha preparato **3 email**. Rivedi e approva." }),
    TextField('note', {
      label: 'Nota (opzionale)',
      value: { '@path': '/note' },
      variant: 'longText',
    }),
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
      action: { event: { name: 'approve', context: { note: { '@path': '/note' } } } },
    }),
    Text('approve-lbl', { text: 'Approva' }),
  ],
} satisfies Surface;

/** PRD §3, US3. */
const choice = {
  root: 'root',
  dataModel: { category: ['consulting'] },
  components: [
    Card('root', { child: 'body' }),
    Column('body', { children: ['title', 'category', 'file'] }),
    Text('title', { text: '#### Kiwi Studio: $1,240' }),
    ChoicePicker('category', {
      label: 'Categoria',
      variant: 'mutuallyExclusive',
      options: [
        { label: 'Software', value: 'software' },
        { label: 'Consulenza', value: 'consulting' },
      ],
      value: { '@path': '/category' },
    }),
    Button('file', {
      variant: 'primary',
      child: 'file-lbl',
      action: { event: { name: 'file', context: { category: { '@path': '/category' } } } },
    }),
    Text('file-lbl', { text: 'Archivia' }),
  ],
} satisfies Surface;

/** PRD §3, US4, and §6.2. */
const form = {
  root: 'root',
  dataModel: { amount: '1240', due: '2026-10-30', category: ['consulting'], recurring: false },
  components: [
    Card('root', { child: 'body' }),
    Column('body', { children: ['title', 'amount', 'due', 'category', 'recurring', 'file'] }),
    Text('title', { text: '#### Fattura Kiwi Studio' }),
    TextField('amount', {
      label: 'Importo',
      variant: 'number',
      value: { '@path': '/amount' },
      '@checks': [
        {
          condition: { '@call': 'required', args: { value: { '@path': '/amount' } } },
          message: "Serve l'importo.",
        },
        {
          condition: {
            '@call': 'regex',
            args: { value: { '@path': '/amount' }, pattern: '^[0-9]+(\\.[0-9]{1,2})?$' },
          },
          message: 'Un importo, come 1240 o 84.50.',
        },
      ],
    }),
    DateTimeInput('due', { label: 'Scadenza', enableDate: true, value: { '@path': '/due' } }),
    ChoicePicker('category', {
      label: 'Categoria',
      options: [
        { label: 'Software', value: 'software' },
        { label: 'Consulenza', value: 'consulting' },
      ],
      value: { '@path': '/category' },
    }),
    CheckBox('recurring', { label: 'Ricorrente', value: { '@path': '/recurring' } }),
    Button('file', {
      variant: 'primary',
      child: 'file-lbl',
      action: {
        event: {
          name: 'file',
          context: {
            amount: { '@path': '/amount' },
            due: { '@path': '/due' },
            category: { '@path': '/category' },
            recurring: { '@path': '/recurring' },
          },
        },
      },
    }),
    Text('file-lbl', { text: 'Archivia' }),
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
    properties: { component: { const: 'Badge' }, count: { type: 'number' } },
    required: ['component', 'count'],
  };
  const generated = await generateComponents(changed);
  assert.notEqual(generated, await generateComponents(sources));
  assert.match(generated, /export function Badge\(id: ComponentId, props: BadgeProps\)/);
  assert.match(generated, /count: number;/);
});

test('a catalog keyword with no TypeScript rendering stops the generator', async () => {
  const changed = structuredClone(await readCatalog());
  const components = changed.catalog['components'] as Record<string, Record<string, unknown>>;
  (components['Text'] as Record<string, unknown>)['patternProperties'] = { '^x-': {} };
  await assert.rejects(generateComponents(changed), /patternProperties/);
});

test('PRD §6.1 written with the constructors is the JSON written by hand', async () => {
  assert.equal(JSON.stringify(built), JSON.stringify(await handWritten()));
});

test('every type the generator exports has a PascalCase name', async () => {
  const generated = await generateComponents(await readCatalog());
  const names = [...generated.matchAll(/^export type (\w+)/gm)].map(([, name]) => name);
  assert.ok(names.length > 0);
  assert.deepEqual(
    names.filter((name) => !/^[A-Z]/.test(name ?? '')),
    [],
  );
});

test('the catalog validator accepts the approval, the choice and the form', () => {
  const validator = createValidator();
  for (const [name, surface] of Object.entries({ approval: built, choice, form })) {
    const result = validateSurface(validator, surface);
    assert.deepEqual(result.errors, [], name);
    assert.equal(result.valid, true, name);
  }
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
  // @ts-expect-error a Card has one child, not children
  Card('c', { children: ['a'] });
  // @ts-expect-error a heading is Markdown: h4 is not a variant of Text
  Text('t', { text: 'x', variant: 'h4' });
  // @ts-expect-error a binding is { '@path' }, not the { path } of A2UI 0.9
  TextField('n', { label: 'Nota', value: { path: '/note' } });
  // @ts-expect-error validationRegexp gave way to @checks
  TextField('n', { label: 'Nota', value: '', validationRegexp: '^.+$' });
  // @ts-expect-error only a TextField takes @checks
  CheckBox('c', { label: 'Ok', value: false, '@checks': [] });
  TextField('n', {
    label: 'Nota',
    value: '',
    // @ts-expect-error required and regex are the only functions
    '@checks': [{ condition: { '@call': 'formatString', args: { value: 'x' } } }],
  });
  // @ts-expect-error a function call belongs in @checks, not in a value
  Text('t', { text: { '@call': 'required', args: { value: 'x' } } });
  Text('t', {
    text: 'x',
    // @ts-expect-error nor in @accessibility, which the catalog narrows
    '@accessibility': { label: { '@call': 'required', args: { value: 1 } } },
  });
});
