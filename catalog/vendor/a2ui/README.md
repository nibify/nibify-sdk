# Vendored A2UI schemas

Copied verbatim from [`a2ui-project/a2ui`](https://github.com/a2ui-project/a2ui) (Apache License 2.0).

## `v1_0/` — what the catalog validates against

From `specification/v1_0/json/`, at upstream commit `36725eee042da90c526f469f94246f96e16fdc35` (26 November 2026).

| File | Role |
|---|---|
| `v1_0/common_types.json` | Shared definitions: `ComponentCommon`, `DataBinding`, the `Dynamic*` types, `FunctionCall`, `Checkable`, `Action`. The catalog references these by the relative `common_types.json#/$defs/…`. |
| `v1_0/agent_to_renderer.json` | The agent → app messages (`createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`, and the two function messages). References the catalog as `catalog.json`. |
| `v1_0/renderer_to_agent.json` | The app → agent messages (`action`, `error`, and the two function messages). |
| `v1_0/catalog_definition.json` | The meta-schema of a catalog. Only the tests read it: it is what says `catalog.json` is a 1.0 catalog at all. |

The other files of that folder — the list wrappers, the capabilities, the renderer data model — describe transports, not surfaces, and are not copied.

## Why they are here

They are vendored so the tests are hermetic: validating a catalog should not depend on the network.

They are also read at runtime, not only by the tests: [`../../src/validator.mjs`](../../src/validator.mjs) compiles them, and the backend calls it to reject a surface the app could not draw. So they ship with the package rather than being fixtures. That is the point — the API and the renderer reject against the same bytes. Nothing reads them over the network, which A2UI 1.0 forbids for a catalog's `$ref` in any case.

## Licence

These files are **Apache License 2.0**, not the MIT of the rest of this package. [`LICENSE`](LICENSE) is the upstream text; the attribution above is the required notice. The MIT terms in [`../../LICENSE`](../../LICENSE) do not apply to this directory.

Only the Apache-2.0 portion of the upstream `LICENSE` is reproduced: the MIT section appended there covers `eval/bin/transcrypt`, a file we do not vendor. At `36725eee` that portion is unchanged from the copy taken in August.

## Refreshing

Re-download the files from that path, record the commit here, and re-run the tests. If a diff changes what our catalog means, it belongs in an ADR, not in a silent update.
