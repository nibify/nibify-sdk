/** A `fetch` that answers from a script and records what it was asked. */

export interface Seen {
  method: string;
  url: URL;
  headers: Headers;
  body: unknown;
}

export type Reply = (seen: Seen) => Response | Promise<Response>;

export function fakeFetch(...replies: Reply[]): { fetch: typeof fetch; seen: Seen[] } {
  const seen: Seen[] = [];
  const fake = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const call: Seen = {
      method: init?.method ?? 'GET',
      url: new URL(String(input)),
      headers: new Headers(init?.headers),
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    };
    seen.push(call);
    const reply = replies.shift();
    if (!reply) throw new Error(`unexpected ${call.method} ${call.url.pathname}`);
    const signal = init?.signal;
    if (!signal) return reply(call);
    if (signal.aborted) throw signal.reason;
    return Promise.race([
      reply(call),
      new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
    ]);
  }) as typeof globalThis.fetch;
  return { fetch: fake, seen };
}

export const json = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Reply => {
  return () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
};
