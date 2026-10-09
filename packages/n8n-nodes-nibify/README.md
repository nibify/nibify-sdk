# n8n-nodes-nibify

**Not published yet.** npm still holds the `0.0.2` placeholder; the node below lives in this repository and reaches npm once the Nibify API is deployed.

Nibify sends an interactive request to a person — a card with buttons and fields, on their phone — and hands the answer back to the workflow that asked.

Four operations: **Ask & Wait**, **Send Notification**, **Cancel** and **Nudge**.

## Ask & Wait

The node creates a Nibify request and pauses the execution until the request is over. The execution does not hold a worker while it waits: Nibify calls the execution's resume URL when the request reaches a final state, and n8n resumes it.

Two ways to compose the request:

- **Simple** — a title, a text and a list of buttons. The node builds the A2UI surface, and the buttons also appear on the push notification unless you turn *Lock Screen Buttons* off.
- **JSON** — a raw A2UI surface that conforms to the Nibify catalog, with the notification title, body and optional lock-screen buttons.

Two outputs:

| Output | When | Item |
| --- | --- | --- |
| **Not Answered** | the request expired, the person dismissed it, or it was cancelled | `requestId`, `status` (`expired`, `dismissed` or `cancelled`), `environment` |
| **Answered** | the person answered | `requestId`, `status: "answered"`, `action` (the button's action name), `context` (the values the surface collected), `sourceComponentId`, `responseId`, `answeredAt`, `environment` |

Only the first input item is asked.

**Expires After** sets the request's deadline; `0` means it never expires and the workflow waits for as long as it takes. n8n's own wait limit is set an hour past the deadline, so an expiry arrives from Nibify as `expired`. If n8n's limit is reached first anyway — the callback never arrived — n8n passes the input item through the first output, *Not Answered*, without a `status`: it never reads as an answer.

The callback is verified before the execution resumes: it must carry a `Nibify-Signature` made with the credential's signing secret, at most five minutes old. Anything else is answered `401` and the execution keeps waiting.

## Send Notification

Tells the person something: the notification arrives on the phone and lands in the Inbox, and nothing is asked or awaited. It composes like Ask & Wait — **Simple** (a title and a text, no buttons) or **JSON** (a surface that only shows things, with the notification title and body). A surface with a button that dispatches an action is a request, and the API refuses it here.

The output is the created message: `messageId`, `threadId`, `sequence`, `environment`. Each input item sends one notification. A failed call is not retried, because the API cannot tell a retry from a second notification.

## Cancel and Nudge

Both act on pending requests, chosen **By**:

- **Request ID** — one request, the `requestId` Ask & Wait creates. The output is the request as it stands after the call. A request that is already answered, expired, dismissed or cancelled is an error that says which, such as *This Request has already been answered.*
- **Thread Key** — every pending request of a thread, the *Thread Key* given to Ask & Wait. The output is `threadKey`, `requestIds` (the requests acted on) and `skipped`. None pending is not an error: `requestIds` is empty. A request answered or closed between the node's lookup and its call is not an error either: it is listed in `skipped` with the API's `code` and `message`. A thread with more pending requests than the project may call in a second is paced: a call refused with `429` is made again after its `Retry-After`.

What each does:

- **Cancel** withdraws the request. A workflow waiting on it in Ask & Wait resumes from *Not Answered* with `status: "cancelled"`.
- **Nudge** sends its push notification again, with the same words, the same priority and the same quiet hours. The request itself does not change.

Each input item is one call, or one thread.

### Cancelling from another workflow

An execution waiting in Ask & Wait runs nothing else until it resumes, and Ask & Wait outputs the request ID only when the request is over. Cancel and Nudge therefore run in another workflow, and the thread key is what both workflows know:

1. In the workflow that asks, set Ask & Wait's *Options → Thread Key* to your own key for the matter, such as the order ID: `order-{{ $json.orderId }}`.
2. In another workflow — triggered when the order is paid, cancelled or handled elsewhere — add a Nibify node with **Cancel**, **By: Thread Key** and the same key.

The waiting execution resumes from *Not Answered* with `status: "cancelled"`. If the person answered first, the Cancel finds nothing pending and outputs `requestIds: []`.

## Credentials

- **API Key** — a key of your Nibify project. `sk_test_` keys reach the test environment, `sk_live_` keys the live one.
- **Signing Secret** — the project's webhook signing secret (`whsec_…`), shown in the Nibify dashboard.
- **Base URL** — `https://api.nibify.app`. Change it only for a local or self-hosted API.

The connection test lists one request with the API key.

n8n must be reachable from the Nibify API on its webhook URL (`WEBHOOK_URL`) for the request to resume the execution.

## Development

The node is an independent client of the Nibify REST API: it has no runtime dependencies and does not use `@nibify/sdk`. Its types are generated from `openapi/openapi.json` (`pnpm --filter n8n-nodes-nibify generate`), and its contract test (`pnpm test`) fails when they fall behind the spec or when an operation of the API's `agent` tag is neither called nor listed as not yet covered.

Code, catalog and SDK: <https://github.com/nibify/nibify-sdk> · MIT License.
