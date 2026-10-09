/** A Request the agent created: the long poll that waits for its outcome, and the verbs on it. PRD §4.2, §4.7. */
import type { SuccessBody } from './operations.ts';
import type { Transport } from './transport.ts';

/** The server holds one long poll for at most this long (`wait` ≤ 30). */
const MAX_WAIT_SECONDS = 30;

type Outcome = SuccessBody<'RequestsController_awaitResponse'>;

/** The Request as the API described it at that moment, and the handle to act on it. */
export type RequestState = SuccessBody<'RequestsController_read'> & { request: RequestHandle };

export type Withdrawn = SuccessBody<'RequestsController_cancel'> & { request: RequestHandle };

export type Answered = Outcome & {
  status: 'answered';
  response: NonNullable<Outcome['response']>;
  request: RequestHandle;
};

export type Unanswered = Outcome & {
  status: 'expired' | 'dismissed' | 'cancelled';
  request: RequestHandle;
};

/** The client stopped waiting; the Request is still pending on the server. */
export interface TimedOut {
  status: 'timeout';
  requestId: string;
  request: RequestHandle;
}

export type AskResult = Answered | Unanswered | TimedOut;

export class RequestHandle {
  readonly id: string;
  readonly #transport: Transport;

  constructor(id: string, transport: Transport) {
    this.id = id;
    this.#transport = transport;
  }

  /** Waits until the Request is terminal, by default for as long as that takes. */
  async wait(options: { timeout?: number; signal?: AbortSignal } = {}): Promise<AskResult> {
    const deadline = options.timeout === undefined ? Infinity : Date.now() + options.timeout;
    const timedOut: TimedOut = { status: 'timeout', requestId: this.id, request: this };

    for (;;) {
      const remaining = deadline - Date.now();
      if (remaining <= 0 || options.signal?.aborted) return timedOut;

      const signals = [
        ...(options.signal ? [options.signal] : []),
        ...(Number.isFinite(remaining) ? [AbortSignal.timeout(remaining)] : []),
      ];
      const signal = signals.length > 0 ? AbortSignal.any(signals) : undefined;

      let outcome: Outcome;
      try {
        outcome = await this.#transport.send({
          operation: 'RequestsController_awaitResponse',
          pathParams: { id: this.id },
          query: { wait: Math.min(MAX_WAIT_SECONDS, Math.ceil(remaining / 1000)) },
          retry: true,
          signal,
        });
      } catch (error) {
        if (signal?.aborted) return timedOut;
        throw error;
      }

      if (outcome.status !== 'pending') return { ...outcome, request: this } as AskResult;
    }
  }

  /**
   * Not retried: a retry after a lost `200` would find the Request already cancelled and
   * answer `409`. A Request that reached another state first is a `NibifyError` with
   * status `409` and a `request_already_…` code naming that state.
   */
  async cancel(): Promise<Withdrawn> {
    const withdrawn = await this.#transport.send({
      operation: 'RequestsController_cancel',
      pathParams: { id: this.id },
      retry: false,
    });
    return { ...withdrawn, request: this };
  }

  /** Not retried, like `notify()`: a retry could push twice. A terminal Request is a `409`. */
  async nudge(): Promise<RequestState> {
    const state = await this.#transport.send({
      operation: 'RequestsController_renotify',
      pathParams: { id: this.id },
      retry: false,
    });
    return { ...state, request: this };
  }
}
