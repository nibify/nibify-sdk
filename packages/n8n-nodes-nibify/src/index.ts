// Placeholder. The three operations — Ask & wait, Send notification, Cancel —
// arrive with issue #5.
//
// Nothing here may import `@nibify/sdk`, now or later: n8n verification forbids
// external dependencies, so this package is an independent client of the same
// REST API (ADR-0005). The `dependencies` field of package.json stays empty, and
// that is the whole mechanism — there is no lint rule to lean on.
export {};
