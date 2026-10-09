/** One HTTP call to the API: the URL, the key, the error body, and the retries. */
import { NibifyError, type ApiErrorDetail } from './errors.ts';
import { ROUTES, type CoveredOperation, type SuccessBody } from './operations.ts';

export interface Call<O extends CoveredOperation> {
  operation: O;
  pathParams?: Record<string, string>;
  query?: Record<string, string | number>;
  body?: unknown;
  headers?: Record<string, string>;
  retry: boolean;
  signal?: AbortSignal | undefined;
}

export interface TransportOptions {
  apiKey: string;
  baseUrl: string;
  fetch: typeof fetch;
  maxRetries: number;
}

const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 8_000;

export class Transport {
  readonly #options: TransportOptions;

  constructor(options: TransportOptions) {
    this.#options = options;
  }

  async send<O extends CoveredOperation>(call: Call<O>): Promise<SuccessBody<O>> {
    const { method, path } = ROUTES[call.operation];
    const url = new URL(
      this.#options.baseUrl +
        path.replace(/\{(\w+)\}/g, (_, name: string) =>
          encodeURIComponent(call.pathParams?.[name] ?? ''),
        ),
    );
    for (const [name, value] of Object.entries(call.query ?? {})) {
      url.searchParams.set(name, String(value));
    }
    const init: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        authorization: `Bearer ${this.#options.apiKey}`,
        accept: 'application/json',
        ...(call.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...call.headers,
      },
      ...(call.body === undefined ? {} : { body: JSON.stringify(call.body) }),
      ...(call.signal ? { signal: call.signal } : {}),
    };

    for (let attempt = 0; ; attempt++) {
      const retriesLeft = call.retry && attempt < this.#options.maxRetries;
      let response: Response;
      try {
        response = await this.#options.fetch(url, init);
      } catch (cause) {
        if (call.signal?.aborted) throw call.signal.reason;
        const failure = new NibifyError({
          status: null,
          code: 'network_error',
          message: `${init.method} ${url.pathname} did not reach the API`,
          cause,
        });
        if (!retriesLeft) throw failure;
        await sleep(backoff(attempt), call.signal);
        continue;
      }

      if (response.ok) return (await response.json()) as SuccessBody<O>;

      const failure = await errorOf(response);
      if (!retriesLeft || !(response.status === 429 || response.status >= 500)) throw failure;
      await sleep(
        failure.retryAfterSeconds !== undefined
          ? failure.retryAfterSeconds * 1000
          : backoff(attempt),
        call.signal,
      );
    }
  }
}

async function errorOf(response: Response): Promise<NibifyError> {
  const retryAfter = Number(response.headers.get('retry-after'));
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
  const text = await response.text().catch(() => '');
  let error: { code?: unknown; message?: unknown; details?: unknown } | undefined;
  try {
    error = (JSON.parse(text) as { error?: typeof error }).error;
  } catch {
    error = undefined;
  }
  return new NibifyError({
    status: response.status,
    code: typeof error?.code === 'string' ? error.code : `http_${response.status}`,
    message:
      typeof error?.message === 'string'
        ? error.message
        : `The API answered ${response.status} ${response.statusText}`.trim(),
    ...(Array.isArray(error?.details) ? { details: error.details as ApiErrorDetail[] } : {}),
    ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
  });
}

function backoff(attempt: number): number {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt);
  return ceiling / 2 + Math.random() * (ceiling / 2);
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
