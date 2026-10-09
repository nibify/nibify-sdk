/**
 * Runs `webhooks.verify()` where no Node builtin resolves and neither `Buffer` nor `process`
 * exists: Web Crypto and the language, as on Workers or Deno. Prints one JSON line.
 */
import { register } from 'node:module';

const REFUSE_BUILTINS = `
  import { isBuiltin } from 'node:module';
  export async function resolve(specifier, context, nextResolve) {
    if (isBuiltin(specifier)) throw new Error('a Node builtin was imported: ' + specifier);
    return nextResolve(specifier, context);
  }
`;

register(`data:text/javascript,${encodeURIComponent(REFUSE_BUILTINS)}`);

const globals = globalThis as { Buffer?: unknown; process?: unknown };
delete globals.Buffer;
delete globals.process;

const { webhooks } = await import('../../src/index.ts');

const SECRET = 'whsec_' + 'ab'.repeat(32);
const encoder = new TextEncoder();

async function sign(body: string, secret: string, t: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${t}.${body}`)),
  );
  return `t=${t},v1=${Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function outcome(run: () => Promise<{ id: string }>): Promise<string> {
  try {
    return `ok ${(await run()).id}`;
  } catch (error) {
    return (error as { code: string }).code;
  }
}

const now = Math.floor(Date.now() / 1000);
const body = JSON.stringify({
  id: 'evt_1',
  type: 'message.expired',
  createdAt: new Date().toISOString(),
  data: { requestId: 'req_1', status: 'expired', environment: 'test', response: null },
});

console.log(
  JSON.stringify({
    process: typeof globalThis.process,
    buffer: typeof (globalThis as { Buffer?: unknown }).Buffer,
    valid: await outcome(async () =>
      webhooks.verify({ body, signature: await sign(body, SECRET, now), secret: SECRET }),
    ),
    altered: await outcome(async () =>
      webhooks.verify({
        body: body.replace('evt_1', 'evt_2'),
        signature: await sign(body, SECRET, now),
        secret: SECRET,
      }),
    ),
    expired: await outcome(async () =>
      webhooks.verify({ body, signature: await sign(body, SECRET, now - 301), secret: SECRET }),
    ),
  }),
);
