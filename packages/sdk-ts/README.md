# @nibify/sdk

Ask a person on their phone from your agent, wait for the answer, and go on with it.

```sh
npm install @nibify/sdk
```

```ts
import { Nibify } from '@nibify/sdk';

const nibify = new Nibify(); // reads NIBIFY_API_KEY

const result = await nibify.ask({
  sender: { name: 'invoice-flow' },
  notification: {
    title: 'Studio Rossi invoice: €1,240, due Oct 30',
    body: 'Read from the PDF. File it as consulting, or fix it first.',
    quickActions: [
      { name: 'file', label: 'File it' },
      { name: 'fix', label: 'Fix it' },
    ],
  },
});

if (result.status === 'answered') result.response.actionName; // 'file'
```

`ask()` resolves when the request is answered, expired, dismissed or cancelled: an outcome, never an error.

ESM, Node ≥ 20.3, Bun, Deno and Workers: anything with `fetch` and Web Crypto. No runtime dependencies. Not for the browser: the client holds your API key.

## The client

```ts
new Nibify({ apiKey?, baseUrl?, maxRetries?, fetch? })
```

- `apiKey`: a `sk_test_…` or `sk_live_…` key; left out, `NIBIFY_API_KEY`. The prefix decides `nibify.environment`, `'test'` or `'live'`. No key, or a key with neither prefix, throws a `NibifyError` at once (`missing_api_key`, `invalid_api_key`).
- `baseUrl`: left out, `NIBIFY_BASE_URL`, then `https://api.nibify.app`.
- `maxRetries`: how often a retried call is sent again, `3` by default. See [Errors and retries](#errors-and-retries).

## ask()

```ts
nibify.ask(options): Promise<AskResult>
nibify.ask(surface, options): Promise<AskResult>
```

Creates a Request and waits for its outcome. Without a surface, the person answers from the notification's buttons on the lock screen. With one, they open the card and answer there. With a surface, each quickAction must name an action the surface dispatches. The types check this, and so does the API (`422 surface_invalid`).

Options are the body of `POST /v1/requests`, plus the wait's own `timeout` (in ms) and `signal`:

```ts
{
  sender: { name: string; icon?: string };
  notification: { title: string; body: string; quickActions?: { name: string; label: string }[] };
  priority?: 'low' | 'normal' | 'high';
  threadKey?: string;   // same key, same conversation
  expiresAt?: string;   // ISO 8601; left out, the Request never expires
  callbackUrl?: string; // signed outcome, see webhooks.verify()
  timeout?: number;
  signal?: AbortSignal;
}
```

The outcomes, by `status`:

- `answered`: `result.response` holds `actionName`, `sourceComponentId`, `context`, `answeredAt`, and the rest.
- `expired`, `dismissed`, `cancelled`: the Request ended without an answer, and `response` is `null`.
- `timeout`: this call stopped waiting, because `timeout` passed or `signal` aborted. The Request is still pending, and `result.request.wait()` waits again.

Left alone, `ask()` waits as long as the Request stays pending, days if need be, one 30-second long poll after another.

## The Request handle

Every outcome, every `getRequest()` and every row of `requests.list()` carries `request`:

- `request.wait({ timeout?, signal? })` waits again, the same way `ask()` does.
- `request.cancel()` withdraws a pending Request. If it had already ended, the call rejects with `409` and a code naming the state that won: `request_already_answered`, `request_already_expired`, and so on.
- `request.nudge()` sends the push again. On a Request that has ended, it rejects with `409`.

## notify()

```ts
nibify.notify({ sender, notification: { title, body }, priority?, threadKey?, surface? })
```

Tells the person something and asks nothing back. The surface may not dispatch an action, and `quickActions`, `expiresAt` and `callbackUrl` are refused.

## Reading

- `nibify.getRequest(id)`: the Request as it stands now, `pending` included, without waiting.
- `nibify.requests.list({ status?, threadKey?, createdAfter?, createdBefore?, pageSize? })`: newest first, an async iterator that walks every page.
- `nibify.threads.list({ pageSize? })`: the thread that last spoke comes first.
- `nibify.threads.get(threadKey, { after?, pageSize? })`: one thread, with its `messages` oldest first, as an async iterable.

## webhooks.verify()

```ts
import { webhooks } from '@nibify/sdk';

const event = await webhooks.verify({
  body: await request.text(), // the raw body, never a re-serialised JSON.parse
  signature: request.headers.get('nibify-signature'),
  secret: process.env.NIBIFY_WEBHOOK_SECRET!, // the project's whsec_…
});
if (event.type === 'message.answered') event.data.response.actionName;
```

A signature that does not hold rejects with a `NibifyError` whose `code` says why: `webhook_signature_mismatch`, `webhook_timestamp_out_of_tolerance` (default tolerance 300 s), and so on. Delivery is at least once, so skip an `event.id` you have already handled.

## Errors and retries

Every failure is a `NibifyError` with `status` (`null` when no HTTP answer came back: `network_error`), the API's `code`, `details` (one `pointer` and `message` per problem in what you sent) and `retryAfterSeconds`.

- Retried after a network failure, a `429` or a `5xx`, up to `maxRetries` times with backoff: the creation in `ask()`, under one `Idempotency-Key`, so there is always one Request; `getRequest()`; and the lists.
- The long poll of `ask()` and `wait()` keeps a longer budget of its own. A dropped connection says nothing about the Request, so the wait carries on through a restart of the API.
- Never retried: `notify()`, `cancel()` and `nudge()`. A retry could notify twice, answer `409`, or push twice.

## Surfaces

`Text`, `Image`, `Icon`, `Divider`, `Row`, `Column`, `List`, `Card`, `Button`, `TextField`, `CheckBox`, `ChoicePicker`, `Slider` and `DateTimeInput` build A2UI components typed from the catalog. Each takes an `id` and its props, and returns the plain JSON you could have written by hand. `Button` keeps its action name as a literal type, and that type is what holds `ask()`'s quickActions to the surface.

```ts
import { Button, Column, Text } from '@nibify/sdk';

const result = await nibify.ask(
  {
    root: 'root',
    dataModel: {},
    components: [
      Column('root', { children: ['title', 'ship'] }),
      Text('title', { text: 'Ship v2.4.1 to production?' }),
      Button('ship', { child: 'ship-label', action: { event: { name: 'ship' } } }),
      Text('ship-label', { text: 'Ship it' }),
    ],
  },
  {
    sender: { name: 'deploy-bot' },
    notification: {
      title: 'Ship v2.4.1?',
      body: 'Tests are green.',
      quickActions: [{ name: 'ship', label: 'Ship it' }],
    },
  },
);
```

The full guide, at [nibify.app/docs](https://nibify.app/docs/sdk), is not online yet. Code and catalog: <https://github.com/nibify/nibify-sdk> · MIT License.
