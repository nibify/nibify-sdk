/**
 * The Nibify node. Ask & Wait creates a Request whose `callbackUrl` is this execution's
 * resume URL, and waits without holding a worker (PRD §4.7, ADR-0014).
 */
import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
  WAIT_INDEFINITELY,
  type IDataObject,
  type IExecuteFunctions,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
  type IWebhookDescription,
  type IWebhookFunctions,
  type IWebhookResponseData,
  type JsonObject,
} from 'n8n-workflow';

import { outcomeOf, readCallback, SIGNATURE_HEADER } from './callback.ts';
import { ROUTES, type CreateRequestBody, type QuickAction } from './operations.ts';
import { composeSimple, parseSurface, type Composed, type SimpleButton } from './surface.ts';
import { callbackUrlOf, deadlineOf, type ExpiryUnit } from './waiting.ts';

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

// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool -- n8n-workflow types no `usableAsTool: false`, and an agent's tool call that pauses the execution is unverified.
export class Nibify implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Nibify',
    name: 'nibify',
    icon: { light: 'file:nibify.svg', dark: 'file:nibify.dark.svg' },
    group: ['transform'],
    version: 1,
    subtitle: '={{ $parameter["operation"] === "askAndWait" ? "Ask & Wait" : "" }}',
    description: 'Ask a person on their phone, and wait for the answer',
    defaults: { name: 'Nibify' },
    inputs: [NodeConnectionTypes.Main],
    // Not Answered comes first: when n8n's own wait limit fires before any callback, it
    // resumes the node as disabled and passes the input item out of output 0. That item
    // must not read as an answer.
    outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
    outputNames: ['Not Answered', 'Answered'],
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
        ],
        default: 'askAndWait',
      },
      {
        displayName: 'Sender Name',
        name: 'senderName',
        type: 'string',
        default: 'n8n',
        required: true,
        description: 'Who is asking, as the person sees it on the request',
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
      },
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        required: true,
        description: 'The question, also the title of the push notification',
        displayOptions: { show: { composition: ['simple'] } },
      },
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        description:
          'Details under the title, also the body of the push notification. Simple Markdown is rendered.',
        displayOptions: { show: { composition: ['simple'] } },
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
        displayOptions: { show: { composition: ['simple'] } },
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
          'The A2UI surface: "root", "dataModel" and the flat list of "components" of the Nibify catalog',
        displayOptions: { show: { composition: ['json'] } },
      },
      {
        displayName: 'Notification Title',
        name: 'notificationTitle',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { composition: ['json'] } },
      },
      {
        displayName: 'Notification Body',
        name: 'notificationBody',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { composition: ['json'] } },
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
        displayOptions: { show: { composition: ['json'] } },
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
        displayOptions: { hide: { expiresAfter: [0] } },
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Lock Screen Buttons',
            name: 'lockScreenButtons',
            type: 'boolean',
            default: true,
            description:
              'Whether the buttons also appear on the push notification, answerable without opening the app (Simple composition only)',
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
    const items = this.getInputData();
    const node = this.getNode();

    let composed: Composed;
    let notification: CreateRequestBody['notification'];
    try {
      if (this.getNodeParameter('composition', 0) === 'simple') {
        const title = this.getNodeParameter('title', 0) as string;
        const text = this.getNodeParameter('text', 0, '') as string;
        const buttons = this.getNodeParameter('buttons.button', 0, []) as SimpleButton[];
        composed = composeSimple({ title, text, buttons });
        notification = { title: title.trim(), body: text.trim() || title.trim() };
        if (this.getNodeParameter('options.lockScreenButtons', 0, true) as boolean) {
          notification.quickActions = composed.quickActions;
        }
      } else {
        const quickActions = this.getNodeParameter(
          'quickActions.quickAction',
          0,
          [],
        ) as QuickAction[];
        composed = { surface: parseSurface(this.getNodeParameter('surface', 0)), quickActions };
        notification = {
          title: this.getNodeParameter('notificationTitle', 0) as string,
          body: this.getNodeParameter('notificationBody', 0) as string,
          ...(quickActions.length > 0 ? { quickActions } : {}),
        };
      }
    } catch (error) {
      throw new NodeOperationError(node, error as Error);
    }

    let deadline: ReturnType<typeof deadlineOf>;
    try {
      deadline = deadlineOf(
        this.getNodeParameter('expiresAfter', 0, 0) as number,
        this.getNodeParameter('expiresAfterUnit', 0, 'hours') as ExpiryUnit,
        new Date(),
      );
    } catch (error) {
      throw new NodeOperationError(node, error as Error);
    }

    const priority = this.getNodeParameter('options.priority', 0, 'normal') as
      'low' | 'normal' | 'high';
    const threadKey = this.getNodeParameter('options.threadKey', 0, '') as string;
    const resumeUrl = this.evaluateExpression('{{ $execution.resumeUrl }}', 0) as string;

    const body: CreateRequestBody = {
      sender: { name: this.getNodeParameter('senderName', 0) as string },
      notification,
      priority,
      surface: composed.surface,
      callbackUrl: callbackUrlOf(resumeUrl, node.id),
      ...(threadKey ? { threadKey } : {}),
      ...(deadline ? { expiresAt: deadline.expiresAt.toISOString() } : {}),
    };

    const { baseUrl } = await this.getCredentials<NibifyCredentials>('nibifyApi');
    try {
      await this.helpers.httpRequestWithAuthentication.call(this, 'nibifyApi', {
        method: 'POST',
        url: baseUrl.replace(/\/+$/, '') + ROUTES.RequestsController_create.path,
        body,
        json: true,
      });
    } catch (error) {
      throw new NodeApiError(node, error as JsonObject);
    }

    // A callback can arrive before this execution is saved as waiting; n8n answers it
    // 409 and the API retries it (ADR-0014), so the order here cannot lose an outcome.
    await this.putExecutionToWait(deadline?.waitTill ?? WAIT_INDEFINITELY);
    return [[], items];
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
