import type { components } from './generated/agent-api.ts';

export type ApiErrorDetail = NonNullable<
  components['schemas']['ApiErrorDto']['error']['details']
>[number];

export interface NibifyErrorInit {
  status: number | null;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  retryAfterSeconds?: number;
  cause?: unknown;
}

/**
 * What the API refused, or a call that never reached it. `status` is `null` when no
 * HTTP answer came back; `code` is the API's own whenever it sent one.
 */
export class NibifyError extends Error {
  override readonly name = 'NibifyError';
  readonly status: number | null;
  readonly code: string;
  readonly details: ApiErrorDetail[];
  readonly retryAfterSeconds: number | undefined;

  constructor(init: NibifyErrorInit) {
    super(init.message, { cause: init.cause });
    this.status = init.status;
    this.code = init.code;
    this.details = init.details ?? [];
    this.retryAfterSeconds = init.retryAfterSeconds;
  }
}
