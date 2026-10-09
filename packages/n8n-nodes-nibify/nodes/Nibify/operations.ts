import type { operations, paths } from './generated/agent-api.ts';

interface Route<P extends keyof paths> {
  method: 'get' | 'post' | 'delete';
  path: P;
}

/** The operations of the `agent` tag this node calls. The contract test holds it to the spec. */
export const ROUTES = {
  RequestsController_create: { method: 'post', path: '/v1/requests' },
  RequestsController_list: { method: 'get', path: '/v1/requests' },
  RequestsController_cancel: { method: 'delete', path: '/v1/requests/{id}' },
  RequestsController_renotify: { method: 'post', path: '/v1/requests/{id}/nudge' },
  NotificationsController_create: { method: 'post', path: '/v1/notifications' },
} as const satisfies { [O in keyof operations]?: Route<keyof paths> };

export type CoveredOperation = keyof typeof ROUTES;

export interface Call {
  method: 'GET' | 'POST' | 'DELETE';
  url: string;
}

/** The method and absolute URL of a route, its `{id}` filled and escaped. */
export function callOf(baseUrl: string, operation: CoveredOperation, id?: string): Call {
  const { method, path } = ROUTES[operation];
  const filled = (path as string).replace('{id}', () => {
    const trimmed = id?.trim();
    if (!trimmed) throw new Error('A request ID is required.');
    return encodeURIComponent(trimmed);
  });
  return {
    method: method.toUpperCase() as Call['method'],
    url: baseUrl.replace(/\/+$/, '') + filled,
  };
}

type JsonOf<R> = R extends { content: { 'application/json': infer T } } ? T : never;

type Responses<O extends CoveredOperation> = operations[O]['responses'];

export type SuccessBody<O extends CoveredOperation> = JsonOf<
  Responses<O>[Extract<keyof Responses<O>, 200 | 201>]
>;

export type RequestBody<O extends CoveredOperation> = operations[O] extends {
  requestBody: infer B;
}
  ? JsonOf<B>
  : never;

export type CreateRequestBody = RequestBody<'RequestsController_create'>;

export type CreateNotificationBody = RequestBody<'NotificationsController_create'>;

export type Surface = NonNullable<CreateRequestBody['surface']>;

export type QuickAction = NonNullable<CreateRequestBody['notification']['quickActions']>[number];
