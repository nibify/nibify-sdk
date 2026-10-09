/** The `Nibify` client: configuration, `ask()` and `notify()`. PRD §4.7. */
import { NibifyError } from './errors.ts';
import type { RequestBody, SuccessBody } from './operations.ts';
import { RequestHandle, type AskResult, type Waiter } from './request.ts';
import { Transport } from './transport.ts';

export const DEFAULT_BASE_URL = 'https://api.nibify.app';

const DEFAULT_MAX_RETRIES = 3;

export type Environment = 'test' | 'live';

export interface NibifyOptions {
  /** Falls back to `NIBIFY_API_KEY`. */
  apiKey?: string;
  /** Falls back to `NIBIFY_BASE_URL`, then to `https://api.nibify.app`. */
  baseUrl?: string;
  /** Retries on a network failure, a `429` or a `5xx`, where a call is retried at all. */
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

export type AskOptions = Omit<CreateRequestBody, 'surface'> & WaitOptions;

export type NotifyOptions = RequestBody<'NotificationsController_create'>;

export type NotificationCreated = SuccessBody<'NotificationsController_create'>;

export class Nibify {
  readonly environment: Environment;
  readonly baseUrl: string;
  readonly #transport: Transport;
  readonly #waiter: Waiter;

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
    this.#waiter = (requestId, wait) =>
      this.#transport.send({
        operation: 'RequestsController_awaitResponse',
        pathParams: { id: requestId },
        query: { wait: wait.seconds },
        retry: true,
        signal: wait.signal,
      });
  }

  /** Resolves with the outcome, never rejects on one: `expired` and `timeout` are values. */
  async ask(surface: Surface, options: AskOptions): Promise<AskResult> {
    const { timeout, signal, ...body } = options;
    const created = await this.#transport.send({
      operation: 'RequestsController_create',
      body: { ...body, surface },
      headers: { 'idempotency-key': globalThis.crypto.randomUUID() },
      retry: true,
      signal,
    });
    return new RequestHandle(created.requestId, this.#waiter).wait({
      ...(timeout !== undefined ? { timeout } : {}),
      ...(signal ? { signal } : {}),
    });
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
