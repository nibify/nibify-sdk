# nibify-sdk

The open half of Nibify: `@nibify/sdk` in `packages/sdk-ts`, `n8n-nodes-nibify` in
`packages/n8n-nodes-nibify`, and the OpenAPI document both are held to, `openapi/openapi.json`.

## Two trackers

Issues about the catalog, the SDK and the n8n node live here, in `nibify/nibify-sdk`, because
external contributors cannot open issues on a private repo. Backend, app, dashboard and site
live in the private `nibify/nibify`. Use the `gh` CLI; `--repo nibify/nibify-sdk` when in doubt.

## Comments in code

The code says what it does; the documents say why. A comment survives only if it is one of:

- **a trap** the code cannot state — an ordering that matters, a library behaviour that surprises;
- **a pointer** to the document that decides (`ADR-0005`, `PRD §4.7`), and nothing else;
- **a header** of one to three lines saying what lives in a file.

No history, no paraphrase of a document, no restating of a signature. English only.

## The spec is the hinge

`openapi/openapi.json` is copied here from the backend by a pull request; never edit it by hand.
Types are generated from it, the clients are written by hand:

- `pnpm --filter @nibify/sdk generate` regenerates `packages/sdk-ts/src/generated/`, filtered by
  an allow-list on the `agent` tag. Never edit the generated file.
- The contract test (`pnpm test`) fails when the committed types are behind the spec, and when
  an `agent` operation is neither called by the facade nor listed as not yet covered.

## The n8n node depends on nothing

`n8n-nodes-nibify` keeps `dependencies` empty and never imports `@nibify/sdk`: n8n verification
forbids external dependencies. The two packages are independent clients of the same API, and
each has its own contract test.

## The configs are copies

`tsconfig.base.json`, `eslint.config.mjs`, `eslint.adherence.mjs` and `.prettierrc.json` are
byte-for-byte copies of the private repo's. Do not edit them here; a package that needs more
extends them in its own `tsconfig.json`.

## Before a pull request

`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` — the same four CI runs.
Publishing is a GitHub Action run by a maintainer, never a laptop.
