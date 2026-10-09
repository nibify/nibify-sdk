/**
 * The Nibify node (PRD §4.7). Ask & Wait creates a Request whose `callbackUrl` is this
 * execution's resume URL, and waits without holding a worker (ADR-0014); Send Notification,
 * Cancel and Nudge are one call each.
 */
import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
  sleep,
  WAIT_INDEFINITELY,
  type IDataObject,
  type IExecuteFunctions,
  type INode,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
  type IWebhookDescription,
  type IWebhookFunctions,
  type IWebhookResponseData,
  type JsonObject,
} from 'n8n-workflow';

import { apiFailureOf, retryAfterOf } from './api-error.ts';
import { outcomeOf, readCallback, SIGNATURE_HEADER } from './callback.ts';
import {
  callOf,
  type CoveredOperation,
  type CreateNotificationBody,
  type CreateRequestBody,
  type QuickAction,
  type SuccessBody,
} from './operations.ts';
import {
  composeNotice,
  composeSimple,
  parseSurface,
  type Composed,
  type SimpleButton,
} from './surface.ts';
import { isRace, onPendingOfThread, type PendingPage } from './thread.ts';
import { callbackUrlOf, deadlineOf, type ExpiryUnit } from './waiting.ts';

type Operation = 'askAndWait' | 'sendNotification' | 'cancel' | 'nudge';

const SINGLE_OUTPUT: Operation[] = ['sendNotification', 'cancel', 'nudge'];

const OPERATION_NAMES: Record<Operation, string> = {
  askAndWait: 'Ask & Wait',
  sendNotification: 'Send Notification',
  cancel: 'Cancel',
  nudge: 'Nudge',
};

const COMPOSING: Operation[] = ['askAndWait', 'sendNotification'];

const SUBTITLE = `={{ ${JSON.stringify(OPERATION_NAMES)}[$parameter.operation ?? "askAndWait"] }}`;

interface NibifyCredentials {
  apiKey: string;
  signingSecret: string;
  baseUrl: string;
}

// A constant and not a literal in the description: the community lint reads a literal
// `webhooks` array as a trigger's, which would owe a remote register/delete lifecycle.
const RESUME_WEBHOOKS: IWebhookDescription[] = [
  {
    name: 'default',
    httpMethod: 'POST',
    responseMode: 'onReceived',
    path: '={{ $nodeId }}',
    restartWebhook: true,
    isFullPath: true,
  },
];

// Not Answered comes first: when n8n's own wait limit fires before any callback, it resumes
// the node as disabled and passes the input item out of output 0. That item must not read
// as an answer. n8n saves no parameter left at its default: an absent `operation` is Ask & Wait.
const OUTPUTS: INodeTypeDescription['outputs'] = `={{ ${JSON.stringify(SINGLE_OUTPUT)}.includes($parameter.operation) ? ["main"] : [{ type: "main", displayName: "Not Answered" }, { type: "main", displayName: "Answered" }] }}`;

// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool -- n8n-workflow types no `usableAsTool: false`, and an agent's tool call that pauses the execution is unverified.
export class Nibify implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Nibify',
    name: 'nibify',
    icon: { light: 'file:nibify.svg', dark: 'file:nibify.dark.svg' },
    group: ['transform'],
    version: 1,
    subtitle: SUBTITLE,
    description: 'Ask a person on their phone and wait for the answer, or just tell them',
    defaults: { name: 'Nibify' },
    inputs: [NodeConnectionTypes.Main],
    outputs: OUTPUTS,
    credentials: [{ name: 'nibifyApi', required: true }],
    webhooks: RESUME_WEBHOOKS,
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Ask & Wait',
            value: 'askAndWait',
            action: 'Ask a person and wait for the answer',
            description:
              'Send a request to the phone and pause the workflow until it is answered, dismissed, cancelled or expired',
          },
          {
            name: 'Cancel',
            value: 'cancel',
            action: 'Cancel a pending request',
            description:
              'Withdraw a request nobody has answered yet. A workflow waiting on it resumes as cancelled.',
          },
          {
            name: 'Nudge',
            value: 'nudge',
            action: 'Nudge a pending request',
            description: 'Send the push of a pending request again, without changing the request',
          },
          {
            name: 'Send Notification',
            value: 'sendNotification',
            action: 'Send a notification',
            description:
              'Tell the person something on their phone. Nothing is asked and nothing is awaited.',
          },
        ],
        default: 'askAndWait',
      },
      {
        displayName: 'By',
        name: 'by',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Request ID',
            value: 'requestId',
            description: 'One request, by the requestId Ask & Wait outputs',
          },
          {
            name: 'Thread Key',
            value: 'threadKey',
            description: 'Every pending request of a thread, by the thread key given to Ask & Wait',
          },
        ],
        default: 'requestId',
        displayOptions: { show: { operation: ['cancel', 'nudge'] } },
      },
      {
        displayName: 'Request ID',
        name: 'requestId',
        type: 'string',
        default: '',
        required: true,
        placeholder: 'msg_…',
        description: 'The requestId of a pending request, as Ask & Wait outputs it',
        displayOptions: { show: { operation: ['cancel', 'nudge'], by: ['requestId'] } },
      },
      {
        displayName: 'Thread Key',
        name: 'threadKey',
        type: 'string',
        default: '',
        required: true,
        placeholder: 'order-1042',
        description:
          'The thread key given to Ask & Wait. Every pending request of the thread is acted on; none pending is not an error.',
        displayOptions: { show: { operation: ['cancel', 'nudge'], by: ['threadKey'] } },
      },
      {
        displayName: 'Sender Name',
        name: 'senderName',
        type: 'string',
        default: 'n8n',
        required: true,
        description: 'Who is asking or telling, as the person sees it on the phone',
        displayOptions: { show: { operation: COMPOSING } },
      },
      {
        displayName: 'Composition',
        name: 'composition',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Simple',
            value: 'simple',
            description: 'A title, a text and buttons',
          },
          {
            name: 'JSON',
            value: 'json',
            description: 'A raw A2UI surface that conforms to the Nibify catalog',
          },
        ],
        default: 'simple',
        displayOptions: { show: { operation: COMPOSING } },
      },
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        required: true,
        description: 'The title of the card, also the title of the push notification',
        displayOptions: { show: { operation: COMPOSING, composition: ['simple'] } },
      },
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        description:
          'Details under the title, also the body of the push notification. Simple Markdown is rendered.',
        displayOptions: { show: { operation: COMPOSING, composition: ['simple'] } },
      },
      {
        displayName: 'Buttons',
        name: 'buttons',
        type: 'fixedCollection',
        typeOptions: { multipleValues: true },
        placeholder: 'Add Button',
        default: {
          button: [
            { label: 'Approve', action: 'approve', style: 'primary' },
            { label: 'Reject', action: 'reject', style: 'default' },
          ],
        },
        displayOptions: { show: { operation: ['askAndWait'], composition: ['simple'] } },
        options: [
          {
            name: 'button',
            displayName: 'Button',
            values: [
              {
                displayName: 'Label',
                name: 'label',
                type: 'string',
                default: '',
              },
              {
                displayName: 'Action Name',
                name: 'action',
                type: 'string',
                default: '',
                description:
                  'What the Answered output carries as `action` when this button is tapped',
              },
              {
                displayName: 'Style',
                name: 'style',
                type: 'options',
                options: [
                  { name: 'Primary', value: 'primary' },
                  { name: 'Default', value: 'default' },
                  { name: 'Borderless', value: 'borderless' },
                ],
                default: 'default',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Surface',
        name: 'surface',
        type: 'json',
        default: '{\n  "root": "root",\n  "dataModel": {},\n  "components": []\n}',
        required: true,
        description:
          'The A2UI surface: "root", "dataModel" and the flat list of "components" of the Nibify catalog. A notification\'s surface dispatches no action.',
        displayOptions: { show: { operation: COMPOSING, composition: ['json'] } },
      },
      {
        displayName: 'Notification Title',
        name: 'notificationTitle',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: COMPOSING, composition: ['json'] } },
      },
      {
        displayName: 'Notification Body',
        name: 'notificationBody',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: COMPOSING, composition: ['json'] } },
      },
      {
        displayName: 'Lock Screen Buttons',
        name: 'quickActions',
        type: 'fixedCollection',
        typeOptions: { multipleValues: true },
        placeholder: 'Add Lock Screen Button',
        default: {},
        description:
          'Buttons on the push notification. Each name must be an action the surface dispatches.',
        displayOptions: { show: { operation: ['askAndWait'], composition: ['json'] } },
        options: [
          {
            name: 'quickAction',
            displayName: 'Lock Screen Button',
            values: [
              { displayName: 'Label', name: 'label', type: 'string', default: '' },
              { displayName: 'Action Name', name: 'name', type: 'string', default: '' },
            ],
          },
        ],
      },
      {
        displayName: 'Expires After',
        name: 'expiresAfter',
        type: 'number',
        typeOptions: { minValue: 0 },
        default: 0,
        description:
          'How long the person has to answer. 0 means the request never expires and the workflow waits for as long as it takes.',
        displayOptions: { show: { operation: ['askAndWait'] } },
      },
      {
        displayName: 'Expires After Unit',
        name: 'expiresAfterUnit',
        type: 'options',
        options: [
          { name: 'Minutes', value: 'minutes' },
          { name: 'Hours', value: 'hours' },
          { name: 'Days', value: 'days' },
        ],
        default: 'hours',
        displayOptions: { show: { operation: ['askAndWait'] }, hide: { expiresAfter: [0] } },
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: { show: { operation: COMPOSING } },
        options: [
          {
            displayName: 'Lock Screen Buttons',
            name: 'lockScreenButtons',
            type: 'boolean',
            default: true,
            description:
              'Whether the buttons also appear on the push notification, answerable without opening the app (Simple composition only)',
            displayOptions: { show: { '/operation': ['askAndWait'] } },
          },
          {
            displayName: 'Priority',
            name: 'priority',
            type: 'options',
            options: [
              { name: 'Low', value: 'low' },
              { name: 'Normal', value: 'normal' },
              { name: 'High', value: 'high' },
            ],
            default: 'normal',
          },
          {
            displayName: 'Thread Key',
            name: 'threadKey',
            type: 'string',
            default: '',
            description: 'Requests with the same thread key are shown as one conversation',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const operation = this.getNodeParameter('operation', 0, 'askAndWait') as Operation;
    if (operation === 'askAndWait') return askAndWait(this);

    const items = this.getInputData();
    const out: INodeExecutionData[] = [];
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const pairedItem = { item: itemIndex };
      if (!this.continueOnFail()) {
        out.push({ json: await ONE_CALL[operation](this, itemIndex), pairedItem });
        continue;
      }
      try {
        out.push({ json: await ONE_CALL[operation](this, itemIndex), pairedItem });
      } catch (error) {
        out.push({ json: { error: (error as Error).message }, pairedItem });
      }
    }
    return [out];
  }

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const request = this.getRequestObject();
    if (!request.rawBody) await request.readRawBody();
    const header = this.getHeaderData()[SIGNATURE_HEADER];
    const { signingSecret } = await this.getCredentials<NibifyCredentials>('nibifyApi');

    const callback = readCallback(
      request.rawBody?.toString('utf8') ?? '',
      typeof header === 'string' ? header : undefined,
      signingSecret,
      new Date(),
    );
    if (!callback.ok) {
      this.getResponseObject().status(401).json({ error: callback.reason });
      return { noWebhookResponse: true };
    }

    const { answered, notAnswered } = outcomeOf(callback.event);
    const toItems = (rows: IDataObject[]): INodeExecutionData[] =>
      rows.map((json) => ({ json, pairedItem: { item: 0 } }));
    return { workflowData: [toItems(notAnswered), toItems(answered)] };
  }
}

type OneCall = (ctx: IExecuteFunctions, itemIndex: number) => Promise<IDataObject>;

/** Not retried: the API takes no `Idempotency-Key` here, so a retry could ring twice. */
const ONE_CALL: Record<Exclude<Operation, 'askAndWait'>, OneCall> = {
  sendNotification: async (ctx, itemIndex) => {
    const node = ctx.getNode();
    let body: CreateNotificationBody;
    try {
      body = {
        sender: { name: ctx.getNodeParameter('senderName', itemIndex) as string },
        ...notificationOf(ctx, itemIndex),
        priority: ctx.getNodeParameter('options.priority', itemIndex, 'normal') as Priority,
      };
      const threadKey = ctx.getNodeParameter('options.threadKey', itemIndex, '') as string;
      if (threadKey) body.threadKey = threadKey;
    } catch (error) {
      throw new NodeOperationError(node, error as Error, { itemIndex });
    }
    return call(ctx, itemIndex, 'NotificationsController_create', { body });
  },
  cancel: async (ctx, itemIndex) => onTarget(ctx, itemIndex, 'RequestsController_cancel'),
  nudge: async (ctx, itemIndex) => onTarget(ctx, itemIndex, 'RequestsController_renotify'),
};

async function onTarget(
  ctx: IExecuteFunctions,
  itemIndex: number,
  operation: 'RequestsController_cancel' | 'RequestsController_renotify',
): Promise<IDataObject> {
  if (ctx.getNodeParameter('by', itemIndex, 'requestId') === 'requestId') {
    return call(ctx, itemIndex, operation, { id: requestIdOf(ctx, itemIndex) });
  }
  const threadKey = (ctx.getNodeParameter('threadKey', itemIndex) as string).trim();
  if (!threadKey) {
    throw new NodeOperationError(ctx.getNode(), 'A thread key is required.', { itemIndex });
  }
  const outcome = await onPendingOfThread(threadKey, {
    listPending: async (cursor) => {
      const sent = await sendPaced(ctx, itemIndex, 'RequestsController_list', {
        qs: { threadKey, status: 'pending', limit: 100, ...(cursor ? { cursor } : {}) },
      });
      if (sent.ok) return sent.body as PendingPage;
      throw readableError(ctx.getNode(), sent.error, itemIndex);
    },
    act: async (id) => {
      const sent = await sendPaced(ctx, itemIndex, operation, { id });
      if (sent.ok) return undefined;
      const failure = apiFailureOf(sent.error);
      if (failure && isRace(failure)) return failure;
      throw readableError(ctx.getNode(), sent.error, itemIndex);
    },
  });
  return { ...outcome };
}

const RATE_LIMITED_ATTEMPTS = 5;

/**
 * A thread can hold more pending requests than the project may call per second: a `429`
 * did nothing, so the call is made again after its `Retry-After`.
 */
async function sendPaced<O extends CoveredOperation>(
  ctx: IExecuteFunctions,
  itemIndex: number,
  operation: O,
  input: CallInput,
): Promise<{ ok: true; body: SuccessBody<O> } | { ok: false; error: unknown }> {
  for (let attempt = 1; ; attempt++) {
    try {
      return { ok: true, body: await send(ctx, itemIndex, operation, input) };
    } catch (error) {
      if (apiFailureOf(error)?.code !== 'rate_limited' || attempt === RATE_LIMITED_ATTEMPTS) {
        return { ok: false, error };
      }
      await sleep((retryAfterOf(error) ?? 1) * 1000);
    }
  }
}

type Priority = 'low' | 'normal' | 'high';

function notificationOf(
  ctx: IExecuteFunctions,
  itemIndex: number,
): Pick<CreateNotificationBody, 'notification' | 'surface'> {
  if (ctx.getNodeParameter('composition', itemIndex) === 'simple') {
    const title = ctx.getNodeParameter('title', itemIndex) as string;
    const text = ctx.getNodeParameter('text', itemIndex, '') as string;
    return {
      notification: { title: title.trim(), body: text.trim() || title.trim() },
      surface: composeNotice({ title, text }),
    };
  }
  return {
    notification: {
      title: ctx.getNodeParameter('notificationTitle', itemIndex) as string,
      body: ctx.getNodeParameter('notificationBody', itemIndex) as string,
    },
    surface: parseSurface(ctx.getNodeParameter('surface', itemIndex)),
  };
}

function requestIdOf(ctx: IExecuteFunctions, itemIndex: number): string {
  const id = (ctx.getNodeParameter('requestId', itemIndex) as string).trim();
  if (!id) throw new NodeOperationError(ctx.getNode(), 'A request ID is required.', { itemIndex });
  return id;
}

async function askAndWait(ctx: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = ctx.getInputData();
  const node = ctx.getNode();

  let composed: Composed;
  let notification: CreateRequestBody['notification'];
  try {
    if (ctx.getNodeParameter('composition', 0) === 'simple') {
      const title = ctx.getNodeParameter('title', 0) as string;
      const text = ctx.getNodeParameter('text', 0, '') as string;
      const buttons = ctx.getNodeParameter('buttons.button', 0, []) as SimpleButton[];
      composed = composeSimple({ title, text, buttons });
      notification = { title: title.trim(), body: text.trim() || title.trim() };
      if (ctx.getNodeParameter('options.lockScreenButtons', 0, true) as boolean) {
        notification.quickActions = composed.quickActions;
      }
    } else {
      const quickActions = ctx.getNodeParameter('quickActions.quickAction', 0, []) as QuickAction[];
      composed = { surface: parseSurface(ctx.getNodeParameter('surface', 0)), quickActions };
      notification = {
        title: ctx.getNodeParameter('notificationTitle', 0) as string,
        body: ctx.getNodeParameter('notificationBody', 0) as string,
        ...(quickActions.length > 0 ? { quickActions } : {}),
      };
    }
  } catch (error) {
    throw new NodeOperationError(node, error as Error);
  }

  let deadline: ReturnType<typeof deadlineOf>;
  try {
    deadline = deadlineOf(
      ctx.getNodeParameter('expiresAfter', 0, 0) as number,
      ctx.getNodeParameter('expiresAfterUnit', 0, 'hours') as ExpiryUnit,
      new Date(),
    );
  } catch (error) {
    throw new NodeOperationError(node, error as Error);
  }

  const priority = ctx.getNodeParameter('options.priority', 0, 'normal') as Priority;
  const threadKey = ctx.getNodeParameter('options.threadKey', 0, '') as string;
  const resumeUrl = ctx.evaluateExpression('{{ $execution.resumeUrl }}', 0) as string;

  const body: CreateRequestBody = {
    sender: { name: ctx.getNodeParameter('senderName', 0) as string },
    notification,
    priority,
    surface: composed.surface,
    callbackUrl: callbackUrlOf(resumeUrl, node.id),
    ...(threadKey ? { threadKey } : {}),
    ...(deadline ? { expiresAt: deadline.expiresAt.toISOString() } : {}),
  };

  await call(ctx, 0, 'RequestsController_create', { body });

  // A callback can arrive before this execution is saved as waiting; n8n answers it
  // 409 and the API retries it (ADR-0014), so the order here cannot lose an outcome.
  await ctx.putExecutionToWait(deadline?.waitTill ?? WAIT_INDEFINITELY);
  return [[], items];
}

interface CallInput {
  id?: string;
  body?: object;
  qs?: IDataObject;
}

async function call<O extends CoveredOperation>(
  ctx: IExecuteFunctions,
  itemIndex: number,
  operation: O,
  input: CallInput,
): Promise<SuccessBody<O> & IDataObject> {
  try {
    return await send(ctx, itemIndex, operation, input);
  } catch (error) {
    throw readableError(ctx.getNode(), error, itemIndex);
  }
}

/** The call as n8n's helper makes it: a failure is the helper's error, not yet readable. */
async function send<O extends CoveredOperation>(
  ctx: IExecuteFunctions,
  itemIndex: number,
  operation: O,
  { id, body, qs }: CallInput,
): Promise<SuccessBody<O> & IDataObject> {
  const { baseUrl } = await ctx.getCredentials<NibifyCredentials>('nibifyApi', itemIndex);
  const { method, url } = callOf(baseUrl, operation, id);
  return (await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'nibifyApi', {
    method,
    url,
    ...(body ? { body: body as IDataObject } : {}),
    ...(qs ? { qs } : {}),
    json: true,
  })) as SuccessBody<O> & IDataObject;
}

function readableError(node: INode, error: unknown, itemIndex: number): Error {
  const failure = apiFailureOf(error);
  if (!failure) return new NodeApiError(node, error as JsonObject, { itemIndex });
  // A fresh error and not a re-wrap: `NodeApiError` hands back one it is given unchanged,
  // and that one carries n8n's generic sentence for the status instead of the API's.
  const { httpCode } = error as { httpCode?: string | null };
  return new NodeApiError(node, { error: failure } as JsonObject, {
    message: failure.message,
    description: `Nibify error code: ${failure.code}`,
    ...(httpCode ? { httpCode } : {}),
    itemIndex,
  });
}
