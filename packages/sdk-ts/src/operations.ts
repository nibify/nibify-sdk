import type { operations, paths } from './generated/agent-api.ts';

interface Route<P extends keyof paths> {
  method: 'get' | 'post' | 'delete';
  path: P;
}

/** The operations of the `agent` tag this facade calls. The contract test holds it to the spec. */
export const ROUTES = {
  RequestsController_create: { method: 'post', path: '/v1/requests' },
  RequestsController_awaitResponse: { method: 'get', path: '/v1/requests/{id}/response' },
  NotificationsController_create: { method: 'post', path: '/v1/notifications' },
} as const satisfies { [O in keyof operations]?: Route<keyof paths> };

export type CoveredOperation = keyof typeof ROUTES;

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
