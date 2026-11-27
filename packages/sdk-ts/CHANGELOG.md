# Changelog

## 0.2.0

**Breaking: surfaces are written for the Nibify catalog v2, which is A2UI 1.0.** Before, `{ path: '/note' }`, `variant: 'h4'` and `validationRegexp: '^.+$'`; now `{ '@path': '/note' }`, `text: '#### Title'` and `'@checks': [{ condition: { '@call': 'regex', args: { value: { '@path': '/note' }, pattern: '^.+$' } }, message: '…' }]`. A server on catalog v2 refuses a surface in the old form with `422 surface_invalid`.

- The component constructors are generated from `@nibify/catalog@2`.
- A binding is `{ '@path': … }`. Props take `StringOrPath`, `NumberOrPath`, `BooleanOrPath` or `StringListOrPath`: a literal or a binding, never a function call. An action's `context` takes `ContextValue`. `DynamicValue` and `DynamicStringList` are gone; `DynamicString`, `DynamicNumber` and `DynamicBoolean` are now A2UI's own and also admit a function call, which only `@checks` takes.
- `Text.variant` is `caption` or `body`. A heading is Markdown, `#` to `#####`.
- `TextField` takes `@checks`, a list of `CheckRule` whose `condition` calls `required` or `regex` (`RequiredFunction`, `RegexFunction`); `validationRegexp` is gone, and `value` is required.
- The envelope's keys carry `@`: `@accessibility` (was `accessibility`), `@catalogId`, `@metadata`.
- An action is an `event` and nothing else.

## 0.1.0

The first release: `ask()`, `notify()`, the Request handle, the lists, `webhooks.verify()` and the component constructors of the catalog v1, A2UI 0.9.1.
