/** The `Nibify` client: configuration and the verbs of PRD §4.7. */
import { NibifyError } from './errors.ts';
import { Requests, Threads } from './lists.ts';
import type { RequestBody, SuccessBody } from './operations.ts';
import { RequestHandle, type AskResult, type RequestState } from './request.ts';
import { Transport } from './transport.ts';
import { webhooks } from './webhooks.ts';

export const DEFAULT_BASE_URL = 'https://api.nibify.app';

const DEFAULT_MAX_RETRIES = 3;

export type Environment = 'test' | 'live';

export interface NibifyOptions {
  /** Falls back to `NIBIFY_API_KEY`. */
  apiKey?: string;
  /** Falls back to `NIBIFY_BASE_URL`, then to `https://api.nibify.app`. */
  baseUrl?: string;
  /**
   * Retries on a network failure, a `429` or a `5xx`, where a call is retried at all. The
   * long poll of a wait keeps its own, longer budget.
   */
  maxRetries?: number;
  fetch?: typeof fetch;
}

type CreateRequestBody = RequestBody<'RequestsController_create'>;

export type Surface = NonNullable<CreateRequestBody['surface']>;

export interface WaitOptions {
  /** Milliseconds to wait for an outcome before resolving with `timeout`. */
  timeout?: number;
  /** Aborting it once the Request exists resolves with `timeout`. */
  signal?: AbortSignal;
}

type Notification = CreateRequestBody['notification'];

/**
 * The action names a surface dispatches, or `string` when its type does not say — a surface
 * typed `Surface`, or JSON whose names widened. A surface that dispatches none gives `never`.
 */
export type ActionNameOf<S extends Surface> = S['components'][number] extends infer C
  ? C extends unknown
    ? string extends keyof C
      ? string
      : C extends { action: { event: { name: infer Name extends string } } }
        ? Name
        : never
    : never
  : never;

/**
 * The Request without its surface. Given a surface, each quickAction names an action that
 * surface dispatches, as `POST /v1/requests` demands; without one, any name goes (CONTEXT.md,
 * quickAction).
 */
export type AskOptions<S extends Surface | undefined = undefined> = Omit<
  CreateRequestBody,
  'surface' | 'notification'
> & {
  notification: Omit<Notification, 'quickActions'> & {
    quickActions?: {
      name: S extends Surface ? ActionNameOf<S> : string;
      label: string;
    }[];
  };
} & WaitOptions;

export type NotifyOptions = RequestBody<'NotificationsController_create'>;

export type NotificationCreated = SuccessBody<'NotificationsController_create'>;

export class Nibify {
  readonly environment: Environment;
  readonly baseUrl: string;
  readonly requests: Requests;
  readonly threads: Threads;
  readonly webhooks = webhooks;
  readonly #transport: Transport;

  constructor(options: NibifyOptions = {}) {
    const env = globalThis.process?.env ?? {};
    const apiKey = options.apiKey ?? env.NIBIFY_API_KEY;
    if (!apiKey) {
      throw new NibifyError({
        status: null,
        code: 'missing_api_key',
        message: 'No API key: pass `apiKey` or set NIBIFY_API_KEY.',
      });
    }
    this.environment = environmentOf(apiKey);
    this.baseUrl = (options.baseUrl ?? env.NIBIFY_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.#transport = new Transport({
      apiKey,
      baseUrl: this.baseUrl,
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    });
    this.requests = new Requests(this.#transport);
    this.threads = new Threads(this.#transport);
  }

  /**
   * Resolves with the outcome, never rejects on one: `expired` and `timeout` are values.
   * Without a surface the person answers from the notification's quickActions alone.
   */
  ask(options: AskOptions): Promise<AskResult>;
  ask<const S extends Surface>(surface: S, options: AskOptions<S>): Promise<AskResult>;
  async ask(first: Surface | AskOptions, second?: AskOptions<Surface>): Promise<AskResult> {
    const [surface, options] =
      second === undefined ? [undefined, first as AskOptions] : [first as Surface, second];
    const { timeout, signal, ...body } = options;
    const created = await this.#transport.send({
      operation: 'RequestsController_create',
      body: surface === undefined ? body : { ...body, surface },
      headers: { 'idempotency-key': globalThis.crypto.randomUUID() },
      retry: true,
      signal,
    });
    return new RequestHandle(created.requestId, this.#transport).wait({
      ...(timeout !== undefined ? { timeout } : {}),
      ...(signal ? { signal } : {}),
    });
  }

  /** The Request as it stands now, without waiting, with the handle that `ask()` returns too. */
  async getRequest(id: string): Promise<RequestState> {
    const state = await this.#transport.send({
      operation: 'RequestsController_read',
      pathParams: { id },
      retry: true,
    });
    return { ...state, request: new RequestHandle(id, this.#transport) };
  }

  /** Not retried: `POST /v1/notifications` takes no `Idempotency-Key`, so a retry could deliver twice. */
  notify(options: NotifyOptions): Promise<NotificationCreated> {
    return this.#transport.send({
      operation: 'NotificationsController_create',
      body: options,
      retry: false,
    });
  }
}

function environmentOf(apiKey: string): Environment {
  if (apiKey.startsWith('sk_test_')) return 'test';
  if (apiKey.startsWith('sk_live_')) return 'live';
  throw new NibifyError({
    status: null,
    code: 'invalid_api_key',
    message: 'An API key starts with sk_test_ or sk_live_.',
  });
}
