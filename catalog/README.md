# Nibify Catalog

The components an agent may use in a Nibify surface, as an A2UI 1.0 catalog.

```
https://nibify.app/catalogs/nibify/v2/catalog.json
```

That URL is the catalog's identity and its documentation. It is **not** a runtime dependency: the catalog is compiled into the server and into the app, so an unreachable nibify.app has no effect on delivering or rendering a message.

The set is a restricted subset of the [A2UI Basic catalog](https://github.com/a2ui-project/a2ui/blob/main/catalogs/basic/v1/catalog.json): the names and the semantics are A2UI's, the selection is ours. The wire format is A2UI itself rather than a shape of our own, so a surface reaches the official Flutter renderer with no translation layer in between — ADR-0001. How the set is versioned is under [Versioning](#versioning) below, and why it is derived rather than declared is ADR-0002 and ADR-0007.

## The v2 set

Fourteen components, the same fourteen as v1:

| | |
|---|---|
| Display | `Text` `Image` `Icon` `Divider` |
| Layout | `Row` `Column` `List` |
| Container | `Card` |
| Input | `Button` `TextField` `CheckBox` `ChoicePicker` `Slider` `DateTimeInput` |

`Form` is not among them, and never will be: a form is a pattern — a `Column` or `Card` of inputs bound to the data model, plus a `Button` whose `action.event.context` collects their paths.

A heading is Markdown: `Text.variant` is `caption` or `body`, and a title is a `Text` whose `text` opens with `#` to `#####`.

The catalog carries no `theme`, so a surface can carry no branding: the look is the app's design system, identical for every agent. A2UI 1.0 removed the concept, and a `createSurface` with a `theme` fails validation.

### Two functions, for `@checks` on a `TextField`

The catalog defines `required` and `regex`, as the Basic catalog does, and nothing else. They exist because v1 promised client-side validation of a field under the name `validationRegexp`, which A2UI 1.0 replaced with `@checks` (ADR-0046). Only a `TextField` takes `@checks`; on the other inputs, where the Basic catalog also allows them, they are invalid. There is no `formatString`, so text cannot be concatenated or formatted at render time.

Two things validate that the catalog does not declare, and they are A2UI's rather than ours:

- **`@index`**, the iteration index inside a list template, is a system function of the protocol and valid in every catalog.
- **A function's position is not checked.** A2UI defers return types to the renderer, so `required` and `regex` validate wherever the protocol takes a function call — a `Text.text`, a `Button.action.functionCall` — and not only inside `@checks`. `instructions` tells the agent where they belong; the schema cannot.

### What changed from v1

The v1 catalog targeted A2UI v0.9.1 and stays published, unchanged, at `/v1`. v2 is a new major because 1.0 changes what a surface looks like:

- a binding is `{ "@path": "/note" }`, a function call `{ "@call": … }`, and `accessibility` is `@accessibility`;
- `Text.variant` loses `h1`…`h5`;
- `TextField.validationRegexp` gives way to `@checks`, and `TextField.value` becomes required;
- every message carries `"version": "1.0"`, and the MIME type is `application/a2ui+json`.

The 1.0 Basic catalog also adds `TextField.placeholder` and `Slider.steps`. v2 does not take them yet: each is a prop the app has to draw, and adding one later is additive — a `propsSince`, not a new major.

### `Button.variant` keeps `default`

`Button.variant` admits `default` beside `primary` and `borderless`. In v1 that was our extension, since the 0.9.1 Basic catalog admitted only the last two; the 1.0 Basic catalog admits `default` too, so in v2 it is plain A2UI. The reason it was worth keeping still holds: the value is redundant — omitting `variant` draws the same button — and an agent that spells out what it means and an agent that leaves the property off are writing the same surface. A catalog that accepts only one of the two is a trap in the shape of a default.

### The Dart catalog is the second copy, and it is checked rather than hoped

The renderer never reads this file. It builds its catalog in Dart, from one item per component, so every component is written down twice — here, where agents read it, and there, where the app decides what it draws and what it validates. A drift between the two fails silently on the server and visibly only to the person holding the phone: the server derives a `minCatalogVersion` from this file and tells a device it can render a message whose component that device types differently, or does not have.

The answer is a **conformance test in the app**, not generated Dart. For each component it compares the Dart schema against this file on the three things an agent can get wrong — which properties exist, which are required, and which values an enumerated property admits — and fails on a difference. Descriptions are not compared: they are prose written for a model, and are meant to differ. Generating the Dart would make drift impossible rather than merely visible, and remains the better answer if the catalog grows well past fourteen components.

## A2UI version

The catalog targets **A2UI v1.0**, which A2UI calls current and the official Flutter renderer serves. It says so in `"protocolVersion": "1.0"`, which a 1.0 catalog has to write out: omitted, it defaults to `0.9`. See ADR-0046 ("Il filo è A2UI 1.0 e il catalogo apre la v2").

## Versioning

`catalogVersion` is a monotonic integer, additive within a major and continuous across majors. Every component carries the version it was introduced in, so both the catalog's own version and a surface's `minCatalogVersion` are **derived, never declared**:

```json
"metadata": { "extensions": { "nibify": { "since": 2 } } }
```

Every v2 component says `since: 2`, so the integer does not restart: a device that registered `1` and receives a surface that needs `2` is an old app, and degrades the way ADR-0002 describes. `metadata.extensions` is the slot the 1.0 meta-schema leaves to catalog authors on a component definition.

Two optional siblings cover additions inside an existing component — `propsSince` for a prop added later, `enumSince` for an enum value added later. Neither appears yet.

[`src/min-catalog-version.mjs`](src/min-catalog-version.mjs) is the reference implementation of that derivation, and the tests are its specification. [`src/validator.mjs`](src/validator.mjs) is the same kind of thing for validation.

## Using it

The catalog is not a schema you validate against directly. It plugs into the generic A2UI wire schema, which references it as `<spec base>/catalog.json` — registering it under that URI *is* the custom-catalog mechanism. That wiring has exactly one correct form and several plausible wrong ones, so it ships here rather than being rebuilt by each consumer:

```js
import { createValidator, validateSurface } from '@nibify/catalog/validator';

const validator = createValidator(); // expensive; do it once
const { valid, errors } = validateSurface(validator, surface, surfaceId);
```

Underneath, Ajv runs with `strict: false`, draft 2020-12 and `ajv-formats` — the same combination the A2UI reference validator uses. Anything else silently changes what counts as valid: strict mode rejects the specification's own schemas, and registering the catalog under a different URI leaves every component unchecked while still returning `true`. The catalog's references to A2UI types are relative, as 1.0 requires, so it is registered with its `$id` replaced by that URI — what A2UI's own test runner does.

Two consequences worth knowing before you rely on the result:

- **The data model is not checked.** A2UI leaves `updateDataModel.value` untyped, because the message may target a path inside the model where a scalar is legal. A valid surface can still carry a nonsense data model; that check belongs to whatever validates the envelope.
- **The errors are raw Ajv.** The wire schema is a `oneOf` over the message kinds, so one bad component fails every branch and Ajv reports all of them. Each error names the message it came from, which is enough to read the list — not enough to show a developer.

`ajv` and `ajv-formats` are optional peer dependencies: importing the catalog itself pulls in nothing, and only `@nibify/catalog/validator` needs them.

The rules handed to the agent alongside the schema are the catalog's own `instructions`, in Markdown, where A2UI 1.0 puts them. The `json` example in them is validated by the tests.

## Layout

```
catalog.json    the catalog, its instructions included
src/            reference implementations: version derivation, and the validator
examples/       the PRD §6.1 approve/reject surface, its message sequence, its answer
test/           the executable definition of "this catalog works"
vendor/         the A2UI schemas, Apache-2.0 — see vendor/a2ui/README.md
```

```sh
pnpm install && pnpm --filter @nibify/catalog test
```

The npm major is the catalog major: `@nibify/catalog@2` is the v2 catalog.

**ADRs are cited by number and title, never by path.** The decision records live in the private repo — ADR-0005 is where that boundary is drawn — so a relative link to one would resolve for nobody who reads this package. `test/references.test.mjs` fails on a path that would not survive, because a rule this easy to forget does not survive as a sentence in a README.
