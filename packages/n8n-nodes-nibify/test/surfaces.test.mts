/** The surfaces of PRD §3 as the node sends them from its parameters, against `@nibify/catalog`. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as nodeModule from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, test } from 'node:test';

import { createValidator, validateSurface } from '@nibify/catalog/validator';
import type { IExecuteFunctions } from 'n8n-workflow';

type Resolved = { url: string; format?: string; shortCircuit?: boolean };
type Next = (specifier: string, context: object) => Resolved;
type Resolve = (specifier: string, context: object, next: Next) => Resolved;

// `registerHooks` is Node 24's, which runs the tests; @types/node stays at the 20 the node ships for.
const { createRequire, registerHooks } = nodeModule as typeof nodeModule & {
  registerHooks(hooks: { resolve: Resolve }): void;
};

// n8n-workflow's ESM build imports without file extensions, which Node cannot resolve; n8n
// itself loads the CommonJS build, and so does the node under test.
const N8N_WORKFLOW = pathToFileURL(createRequire(import.meta.url).resolve('n8n-workflow')).href;
registerHooks({
  resolve: (specifier, context, next) =>
    specifier === 'n8n-workflow'
      ? { url: N8N_WORKFLOW, format: 'commonjs', shortCircuit: true }
      : next(specifier, context),
});
const { Nibify } = await import('../nodes/Nibify/Nibify.node.ts');

const validator = createValidator();

const APPROVE_REJECT = fileURLToPath(
  import.meta.resolve('@nibify/catalog/examples/approve-reject.surface.json'),
);

/** PRD §3, US3. */
const CHOICE = {
  root: 'root',
  dataModel: { category: ['consulting'] },
  components: [
    { id: 'root', component: 'Card', child: 'body' },
    { id: 'body', component: 'Column', children: ['title', 'category', 'file'] },
    { id: 'title', component: 'Text', text: '#### Kiwi Studio: $1,240' },
    {
      id: 'category',
      component: 'ChoicePicker',
      label: 'Category',
      variant: 'mutuallyExclusive',
      options: [
        { label: 'Software', value: 'software' },
        { label: 'Consulting', value: 'consulting' },
      ],
      value: { '@path': '/category' },
    },
    {
      id: 'file',
      component: 'Button',
      variant: 'primary',
      child: 'file-label',
      action: { event: { name: 'file', context: { category: { '@path': '/category' } } } },
    },
    { id: 'file-label', component: 'Text', text: 'File it' },
  ],
};

/** PRD §3, US4, and §6.2. */
const FORM = {
  root: 'root',
  dataModel: { amount: '1240', due: '2026-10-30', category: ['consulting'], recurring: false },
  components: [
    { id: 'root', component: 'Card', child: 'body' },
    {
      id: 'body',
      component: 'Column',
      children: ['title', 'amount', 'due', 'category', 'recurring', 'file'],
    },
    { id: 'title', component: 'Text', text: '#### Kiwi Studio invoice' },
    {
      id: 'amount',
      component: 'TextField',
      label: 'Amount',
      variant: 'number',
      value: { '@path': '/amount' },
      '@checks': [
        {
          condition: { '@call': 'required', args: { value: { '@path': '/amount' } } },
          message: 'The amount is required.',
        },
        {
          condition: {
            '@call': 'regex',
            args: { value: { '@path': '/amount' }, pattern: '^[0-9]+(\\.[0-9]{1,2})?$' },
          },
          message: 'An amount, like 1240 or 84.50.',
        },
      ],
    },
    {
      id: 'due',
      component: 'DateTimeInput',
      label: 'Due',
      enableDate: true,
      value: { '@path': '/due' },
    },
    {
      id: 'category',
      component: 'ChoicePicker',
      label: 'Category',
      options: [
        { label: 'Software', value: 'software' },
        { label: 'Consulting', value: 'consulting' },
      ],
      value: { '@path': '/category' },
    },
    {
      id: 'recurring',
      component: 'CheckBox',
      label: 'Recurring',
      value: { '@path': '/recurring' },
    },
    {
      id: 'file',
      component: 'Button',
      variant: 'primary',
      child: 'file-label',
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
    },
    { id: 'file-label', component: 'Text', text: 'File it' },
  ],
};

interface Sent {
  method: string;
  url: string;
  body: { surface?: unknown; notification?: { quickActions?: unknown } };
}

async function run(parameters: Record<string, unknown>): Promise<Sent[]> {
  const sent: Sent[] = [];
  const ctx = {
    getInputData: () => [{ json: {} }],
    getNode: () => ({ id: 'node-1', name: 'Nibify', parameters: {} }),
    getNodeParameter: (name: string, _item: number, fallback?: unknown) =>
      name in parameters ? parameters[name] : fallback,
    evaluateExpression: () => 'https://n8n.test/webhook-waiting/1',
    getCredentials: async () => ({ baseUrl: 'https://api.test' }),
    helpers: {
      httpRequestWithAuthentication: async (_credential: string, options: Sent) => {
        sent.push(options);
        return { requestId: 'msg_1' };
      },
    },
    putExecutionToWait: async () => undefined,
    continueOnFail: () => false,
  };
  await new Nibify().execute.call(ctx as unknown as IExecuteFunctions);
  return sent;
}

function assertValid(surface: unknown): void {
  const result = validateSurface(validator, surface as Parameters<typeof validateSurface>[1]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
}

const JSON_MODE = {
  composition: 'json',
  senderName: 'invoice-flow',
  notificationTitle: 'Kiwi Studio invoice',
  notificationBody: 'Check it before I file it.',
};

describe('Ask & Wait sends a surface the catalog accepts', () => {
  test('the approval, composed in Simple mode', async () => {
    const [request] = await run({
      composition: 'simple',
      senderName: 'invoice-flow',
      title: 'Kiwi Studio invoice: $1,240, due Oct 30',
      text: 'Read from the PDF. File it as consulting, or fix it first.',
      'buttons.button': [
        { label: 'File it', action: 'file', style: 'primary' },
        { label: 'Fix it', action: 'fix', style: 'default' },
      ],
    });
    assert.equal(request?.url, 'https://api.test/v1/requests');
    assertValid(request?.body.surface);
  });

  for (const [name, surface] of [
    ['the PRD §6.1 approval', async () => JSON.parse(await readFile(APPROVE_REJECT, 'utf8'))],
    ['the choice', async () => CHOICE],
    ['the form', async () => FORM],
  ] as const) {
    test(`${name}, pasted in JSON mode, unchanged`, async () => {
      const written = await surface();
      const [request] = await run({ ...JSON_MODE, surface: JSON.stringify(written, null, 2) });
      assert.deepEqual(request?.body.surface, written);
      assertValid(request?.body.surface);
    });
  }
});

describe('Send Notification sends a surface the catalog accepts', () => {
  test('the notice, composed in Simple mode', async () => {
    const [notification] = await run({
      operation: 'sendNotification',
      composition: 'simple',
      senderName: 'invoice-flow',
      title: 'Kiwi Studio invoice filed',
      text: '$1,420, consulting, due Oct 30.',
    });
    assert.equal(notification?.url, 'https://api.test/v1/notifications');
    assertValid(notification?.body.surface);
  });
});
