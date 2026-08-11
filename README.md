# nibify-sdk

The open half of [Nibify](https://github.com/nibify): the component catalog, the A2UI envelope spec, the TypeScript SDK, and the n8n community node — everything a builder reads before deciding to trust the thing. MIT.

The other half — backend, Flutter app, dashboard, marketing site — is closed and not self-hostable.

> **Early.** Both packages here are published placeholders that do nothing yet. The API they will talk to does not exist in public form.

| Path                        | Package             |
| --------------------------- | ------------------- |
| `catalog/`                  | `@nibify/catalog`   |
| `packages/sdk-ts/`          | `@nibify/sdk`       |
| `packages/n8n-nodes-nibify/` | `n8n-nodes-nibify` — unscoped, as n8n requires |

The n8n node does **not** depend on `@nibify/sdk`: n8n verification forbids external dependencies, so the two are independent clients of the same REST API, kept in step by a generated OpenAPI spec and a contract test.

Issues about the catalog, the SDK, or the n8n node belong here. Everything else lives in the private repo.
