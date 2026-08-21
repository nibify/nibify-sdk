# nibify-sdk

The open half of [Nibify](https://github.com/nibify): the component catalog, the A2UI envelope spec, the TypeScript SDK, and the n8n community node — everything a builder reads before deciding to trust the thing. MIT.

The other half — backend, Flutter app, dashboard, marketing site — is closed and not self-hostable. That is a product decision, not an oversight: the backend is the only thing that can ever be charged for, and self-hosting it would cost Docker, configuration, documented migrations and support before there is a single user.

> **Early.** Both packages here are published placeholders that do nothing yet. The API they will talk to does not exist in public form.

## The workspace

pnpm workspaces, Node LTS (24). No Turborepo: there is no build graph to schedule — the packages are independent by construction, and `pnpm -r` is the whole story.

```
catalog/                     `@nibify/catalog` — not here yet, see below
packages/sdk-ts/             `@nibify/sdk`
packages/n8n-nodes-nibify/   `n8n-nodes-nibify` — unscoped, as n8n requires
```

The n8n node does **not** depend on `@nibify/sdk`. n8n's verification guidelines forbid external dependencies, so the two are independent clients of the same REST API, kept in step by an OpenAPI document generated from the backend's Zod schemas and a contract test. The layout says so out loud: two sibling packages, neither above the other, and `n8n-nodes-nibify` keeps an empty `dependencies` field. There is no lint rule underneath — the empty field *is* the mechanism, and the first convenient import is the moment verification is lost.

**The catalog is written in the private repo and moves here later.** It sits there at `catalog/`, already named `@nibify/catalog`, so the move is a straight copy rather than a migration. The line for it is already in `pnpm-workspace.yaml`.

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check
```

## The configs are copies, and that is deliberate

`tsconfig.base.json`, `eslint.config.mjs`, `eslint.adherence.mjs` and `.prettierrc.json` are **byte-for-byte copies** of the files at the root of the private repo. A published `@nibify/eslint-config` would drop drift to zero, but it would put the closed repo behind a release of the open one for every tweak to a rule; with two consumers the trade does not pay.

The copy has a visible cost and it is not hidden: `eslint.config.mjs` carries blocks that match nothing here — the design-system adherence selectors, the NestJS import boundaries — and `tsconfig.base.json` carries decorator options no package here uses. They stay, because a file that differs is a file whose drift nobody can see.

`eslint.adherence.mjs` is the newest of the four and the one to be careful with: `eslint.config.mjs` imports it, so it is not optional here — without it the lint fails to load at all. On the other side it is generated from the `.d.ts` of the private design-system components and regenerating it has to produce an empty diff; here there is no generator and nothing to generate from, so it is copied like the rest and edited on neither side. `diff` against the private repo is the check, and CI running the same four commands on both sides is what makes it worth having.

## Publishing

Packages are published by [a GitHub Action with a provenance statement](.github/workflows/publish.yml), never from a laptop: from 1 May 2026 n8n's verification guidelines require it for verified nodes. Auth is npm trusted publishing (OIDC), so there is no token anywhere. The workflow file's comments hold the three things that are easy to get wrong.

## Issues

Issues about the catalog, the SDK, or the n8n node belong **here** — external contributors cannot open issues on a private repo. Everything else (backend, app, dashboard, site) lives in the private repo and is tracked there.
