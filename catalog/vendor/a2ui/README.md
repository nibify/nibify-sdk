# Vendored A2UI schemas

Copied verbatim from [`a2ui-project/a2ui`](https://github.com/a2ui-project/a2ui) (Apache License 2.0), `specification/v0_9_1/json/`, as of the repository state on 11 August 2026.

| File | Role |
|---|---|
| `v0_9_1/common_types.json` | Shared definitions: `ComponentCommon`, `DataBinding`, the `Dynamic*` types, `Action`. Our catalog references these. |
| `v0_9_1/server_to_client.json` | The agent → app messages (`createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`). References the catalog as `catalog.json`. |
| `v0_9_1/client_to_server.json` | The app → agent events (`action`, `error`). |

They are vendored so the tests are hermetic: validating a catalog should not depend on the network.

They are also read at runtime, not only by the tests: [`../../src/validator.mjs`](../../src/validator.mjs) compiles them, and the backend calls it to reject a surface the app could not draw. So they ship with the package rather than being fixtures. That is the point — the API and the renderer reject against the same bytes. Nothing reads them over the network.

## Licence

These files are **Apache License 2.0**, not the MIT of the rest of this package. [`LICENSE`](LICENSE) is the upstream text; the attribution above is the required notice. The MIT terms in [`../../LICENSE`](../../LICENSE) do not apply to this directory.

Only the Apache-2.0 portion of the upstream `LICENSE` is reproduced: the MIT section appended there covers `eval/bin/transcrypt`, a file we do not vendor.

## Refreshing

Re-download the three files from that path and re-run the tests. If a diff changes what our catalog means, it belongs in an ADR, not in a silent update.
