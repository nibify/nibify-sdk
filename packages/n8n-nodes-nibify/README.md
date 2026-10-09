# n8n-nodes-nibify

**Not published yet.** npm still holds the `0.0.2` placeholder; the node below lives in this repository and reaches npm once the Nibify API is deployed.

Nibify sends an interactive request to a person — a card with buttons and fields, on their phone — and hands the answer back to the workflow that asked.

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

## Credentials

- **API Key** — a key of your Nibify project. `sk_test_` keys reach the test environment, `sk_live_` keys the live one.
- **Signing Secret** — the project's webhook signing secret (`whsec_…`), shown in the Nibify dashboard.
- **Base URL** — `https://api.nibify.app`. Change it only for a local or self-hosted API.

The connection test lists one request with the API key.

n8n must be reachable from the Nibify API on its webhook URL (`WEBHOOK_URL`) for the request to resume the execution.

## Development

The node is an independent client of the Nibify REST API: it has no runtime dependencies and does not use `@nibify/sdk`. Its types are generated from `openapi/openapi.json` (`pnpm --filter n8n-nodes-nibify generate`), and its contract test (`pnpm test`) fails when they fall behind the spec or when an operation of the API's `agent` tag is neither called nor listed as not yet covered.

Code, catalog and SDK: <https://github.com/nibify/nibify-sdk> · MIT License.
