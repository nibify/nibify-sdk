# n8n-nodes-nibify

**Not published yet.** npm still holds the `0.0.2` placeholder; the node below lives in this repository and reaches npm once the Nibify API is deployed.

The Nibify community node for n8n: ask a person on their phone and wait for the answer, or send them a notification. Four operations: **Ask & Wait**, **Send Notification**, **Cancel** and **Nudge**.

## Set up

1. Install the community node `n8n-nodes-nibify`.
2. Add a **Nibify API** credential: your project's **API Key** (`sk_test_…` or `sk_live_…`), its **Signing Secret** (`whsec_…`, shown in the Nibify dashboard), and the **Base URL** `https://api.nibify.app`.
3. Make sure the Nibify API can reach n8n on its webhook URL (`WEBHOOK_URL`): that is how a waiting workflow resumes.

## Ask & Wait

Add a Nibify node with **Ask & Wait** and **Composition: Simple**:

| Field | Value |
| --- | --- |
| Sender Name | `invoice-flow` |
| Title | `Studio Rossi invoice: €1,240, due Oct 30` |
| Text | `Read from the PDF. File it as consulting, or fix it first.` |
| Buttons | **File it** → `file` · **Fix it** → `fix` |

The workflow pauses without holding a worker. When the person presses **File it**, it resumes from the **Answered** output with `action: "file"`; an expired, dismissed or cancelled request resumes from **Not Answered** with its `status`.

- [Quickstart](https://nibify.app/docs/quickstart): the first request, in a few minutes.
- [n8n guide](https://nibify.app/docs/n8n-ask-and-wait): JSON surfaces, both outputs, expiry, Cancel and Nudge.

Code, catalog and SDK: <https://github.com/nibify/nibify-sdk> · MIT License.
