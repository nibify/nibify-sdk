/** `webhooks.verify()`: the `Nibify-Signature` of a callback, checked with Web Crypto. ADR-0014 §2. */
import type { Environment } from './client.ts';
import { NibifyError } from './errors.ts';

/** The backend's own window (`SIGNATURE_TOLERANCE_SECONDS`); each delivery attempt is signed afresh. */
export const DEFAULT_TOLERANCE_SECONDS = 300;

/** Hand-written: the spec carries no webhook payloads yet. */
export interface WebhookResponse {
  responseId: string;
  actionName: string;
  sourceComponentId: string;
  context: Record<string, unknown> | null;
  clientTimestamp: string;
  answeredAt: string;
}

interface Event<Type extends string, Data> {
  /** Minted once per event and repeated on every retry: delivery is at-least-once. */
  id: string;
  type: Type;
  createdAt: string;
  data: Data;
}

export type MessageAnswered = Event<
  'message.answered',
  {
    requestId: string;
    status: 'answered';
    environment: Environment;
    response: WebhookResponse;
  }
>;

export type MessageUnanswered = Event<
  'message.expired' | 'message.dismissed' | 'message.cancelled',
  {
    requestId: string;
    status: 'expired' | 'dismissed' | 'cancelled';
    environment: Environment;
    response: null;
  }
>;

/** Sent only to a `WebhookEndpoint`, never to a Request's `callbackUrl`. */
export type MessageReceipt = Event<
  'message.delivered' | 'message.read',
  {
    messageId: string;
    environment: Environment;
    /** `null` when the Message is a notification rather than a Request. */
    status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled' | null;
    deliveredAt: string | null;
    readAt: string | null;
  }
>;

export type WebhookEvent = MessageAnswered | MessageUnanswered | MessageReceipt;

export type WebhookEventType = WebhookEvent['type'];

export interface VerifyOptions {
  /** The request body exactly as received, before any `JSON.parse`. */
  body: string;
  /** The `Nibify-Signature` header. */
  signature: string | null | undefined;
  /** The Project's `whsec_…` signing secret. */
  secret: string;
  /** Seconds `t` may differ from now, either way. Defaults to 300. */
  tolerance?: number;
}

const SCHEME = 'v1';

const encoder = new TextEncoder();

/**
 * Resolves with the event when a `v1` signature holds; rejects with a `NibifyError` whose `code`
 * says why not. `body` is the raw text: verifying a re-serialised `JSON.parse` never matches.
 */
async function verify(options: VerifyOptions): Promise<WebhookEvent> {
  const { body, signature, secret, tolerance = DEFAULT_TOLERANCE_SECONDS } = options;

  if (typeof body !== 'string') {
    throw failure(
      'webhook_body_not_raw',
      'Pass the raw request body as a string: a parsed and re-serialised body is not the bytes that were signed.',
    );
  }
  if (!secret) {
    throw failure(
      'webhook_secret_missing',
      'No signing secret: pass the Project’s whsec_… secret.',
    );
  }
  if (!signature) {
    throw failure('webhook_signature_missing', 'The Nibify-Signature header is missing.');
  }

  const { timestamp, digests } = parse(signature);
  if (timestamp === undefined || digests.length === 0) {
    throw failure(
      'webhook_signature_malformed',
      `The Nibify-Signature header has no t=<epoch> or no ${SCHEME}=<hex>.`,
    );
  }

  // Signature before `t`: an expiry then names a genuine callback, and a forged `t` is a mismatch.
  const expected = await hmac(secret, `${timestamp}.${body}`);
  if (!digests.some((digest) => equalInConstantTime(expected, digest))) {
    throw failure(
      'webhook_signature_mismatch',
      'No v1 signature matches: either the body is not the bytes that were sent, or the secret is not this Project’s.',
    );
  }

  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (Math.abs(age) > tolerance) {
    throw failure(
      'webhook_timestamp_out_of_tolerance',
      `The signature is genuine but its t is ${Math.abs(age)}s ${age >= 0 ? 'old' : 'in the future'}, over the ${tolerance}s tolerance: a replay, or a clock that is off.`,
    );
  }

  let event: unknown;
  try {
    event = JSON.parse(body);
  } catch (cause) {
    throw failure('webhook_payload_invalid', 'The signed body is not JSON.', cause);
  }
  if (!isEvent(event)) {
    throw failure('webhook_payload_invalid', 'The signed body is not a Nibify event.');
  }
  return event;
}

export const webhooks = { verify } as const;

function parse(header: string): { timestamp: number | undefined; digests: Uint8Array[] } {
  let timestamp: number | undefined;
  const digests: Uint8Array[] = [];
  for (const part of header.split(',')) {
    const equals = part.indexOf('=');
    if (equals === -1) continue;
    const key = part.slice(0, equals).trim();
    const value = part.slice(equals + 1).trim();
    if (key === 't' && /^\d+$/.test(value)) timestamp = Number(value);
    if (key === SCHEME && /^[0-9a-f]{64}$/i.test(value)) digests.push(fromHex(value));
  }
  return { timestamp, digests };
}

async function hmac(secret: string, payload: string): Promise<Uint8Array> {
  // The key is the secret's text, `whsec_` included, as the backend's `createHmac` takes it.
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function equalInConstantTime(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0;
}

function isEvent(value: unknown): value is WebhookEvent {
  if (value === null || typeof value !== 'object') return false;
  const { id, type, data } = value as Record<string, unknown>;
  return (
    typeof id === 'string' && typeof type === 'string' && data !== null && typeof data === 'object'
  );
}

function failure(code: string, message: string, cause?: unknown): NibifyError {
  return new NibifyError({ status: null, code, message, ...(cause ? { cause } : {}) });
}
