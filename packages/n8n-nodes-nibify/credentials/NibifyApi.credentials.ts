/** The Nibify credential: the API key that calls, and the signing secret that verifies callbacks. */
import type {
  IAuthenticateGeneric,
  Icon,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

import { ROUTES } from '../nodes/Nibify/operations.ts';

export class NibifyApi implements ICredentialType {
  name = 'nibifyApi';

  displayName = 'Nibify API';

  icon: Icon = { light: 'file:nibify.svg', dark: 'file:nibify.dark.svg' };

  documentationUrl =
    'https://github.com/nibify/nibify-sdk/tree/main/packages/n8n-nodes-nibify#credentials';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      placeholder: 'sk_live_…',
      description: 'A key of your Nibify project. sk_test_ keys reach the test environment.',
    },
    {
      displayName: 'Signing Secret',
      name: 'signingSecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      placeholder: 'whsec_…',
      description:
        "The project's webhook signing secret, shown in the Nibify dashboard. Ask & Wait resumes only on a callback signed with it.",
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.nibify.app',
      description: 'Change it only to reach a self-hosted or local Nibify API',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: { Authorization: '=Bearer {{$credentials.apiKey}}' },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
      url: ROUTES.RequestsController_list.path,
      method: 'GET',
      qs: { limit: 1 },
    },
  };
}
