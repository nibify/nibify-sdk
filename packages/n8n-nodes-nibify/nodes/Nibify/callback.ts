/**
 * The callback that resumes a waiting execution: its signature, its event, and the two
 * outputs it becomes. Signature scheme and events: ADR-0014.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { events } from './generated/agent-api.ts';

export const SIGNATURE_HEADER = 'nibify-signature';

export const SIGNATURE_TOLERANCE_SECONDS = 300;

/** What a Request's `callbackUrl` receives: the receipts go only to a `WebhookEndpoint`. */
export const CALLBACK_EVENTS = [
  'message.answered',
  'message.expired',
  'message.dismissed',
  'message.cancelled',
] as const satisfies readonly (keyof events)[];

export type CallbackEvent = events[(typeof CALLBACK_EVENTS)[number]];

export type TerminalStatus = CallbackEvent['data']['status'];

export type Callback = { ok: true; event: CallbackEvent } | { ok: false; reason: string };

/** `body` is the raw bytes as received: re-serialising parsed JSON changes the digest. */
export function readCallback(
  body: string,
  header: string | undefined,
  secret: string,
  now: Date,
): Callback {
  if (!header) return { ok: false, reason: 'missing Nibify-Signature' };

  const parts = new Map(
    header.split(',').map((part) => {
      const equals = part.indexOf('=');
      return [part.slice(0, equals).trim(), part.slice(equals + 1).trim()] as const;
    }),
  );
  const t = Number(parts.get('t'));
  const digest = parts.get('v1');
  if (!Number.isInteger(t) || !digest) return { ok: false, reason: 'malformed Nibify-Signature' };

  if (Math.abs(Math.floor(now.getTime() / 1000) - t) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'signature timestamp outside the tolerance' };
  }

  const expected = createHmac('sha256', secret).update(`${t}.${body}`).digest();
  const received = Buffer.from(digest, 'hex');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: 'signature does not match' };
  }

  let event: CallbackEvent;
  try {
    event = JSON.parse(body) as CallbackEvent;
  } catch {
    return { ok: false, reason: 'body is not JSON' };
  }
  if (!isTerminal(event?.data?.status) || typeof event.data.requestId !== 'string') {
    return { ok: false, reason: 'not a terminal Request event' };
  }
  return { ok: true, event };
}

function isTerminal(status: unknown): status is TerminalStatus {
  return (
    status === 'answered' ||
    status === 'expired' ||
    status === 'dismissed' ||
    status === 'cancelled'
  );
}

export type Answered = {
  requestId: string;
  status: 'answered';
  action: string;
  context: Record<string, unknown>;
  sourceComponentId: string;
  responseId: string;
  answeredAt: string;
  environment: 'test' | 'live';
};

export type NotAnswered = {
  requestId: string;
  status: Exclude<TerminalStatus, 'answered'>;
  environment: 'test' | 'live';
};

export interface Outcome {
  answered: Answered[];
  notAnswered: NotAnswered[];
}

export function outcomeOf(event: CallbackEvent): Outcome {
  const { requestId, status, environment, response } = event.data;
  if (status !== 'answered')
    return { answered: [], notAnswered: [{ requestId, status, environment }] };
  if (!response) throw new Error(`${requestId} is answered but carries no response`);
  return {
    answered: [
      {
        requestId,
        status,
        action: response.actionName,
        context: response.context ?? {},
        sourceComponentId: response.sourceComponentId,
        responseId: response.responseId,
        answeredAt: response.answeredAt,
        environment,
      },
    ],
    notAnswered: [],
  };
}
