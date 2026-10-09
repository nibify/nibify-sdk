/** A Request the agent created, and the long poll that waits for its outcome. PRD §4.2. */
import type { SuccessBody } from './operations.ts';

/** The server holds one long poll for at most this long (`wait` ≤ 30). */
const MAX_WAIT_SECONDS = 30;

type Outcome = SuccessBody<'RequestsController_awaitResponse'>;

export type Waiter = (
  requestId: string,
  wait: { seconds: number; signal: AbortSignal | undefined },
) => Promise<Outcome>;

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
  readonly #waiter: Waiter;

  constructor(id: string, waiter: Waiter) {
    this.id = id;
    this.#waiter = waiter;
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
        outcome = await this.#waiter(this.id, {
          seconds: Math.min(MAX_WAIT_SECONDS, Math.ceil(remaining / 1000)),
          signal,
        });
      } catch (error) {
        if (signal?.aborted) return timedOut;
        throw error;
      }

      if (outcome.status !== 'pending') return { ...outcome, request: this } as AskResult;
    }
  }
}
