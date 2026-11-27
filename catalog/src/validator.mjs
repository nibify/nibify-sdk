/**
 * Reference implementation of "does this surface conform to the catalog?": the
 * one Ajv wiring the A2UI custom-catalog mechanism accepts, so no consumer
 * rebuilds it. `test/catalog.test.mjs` is its specification; README § Using it.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const read = (relative) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8'));

const catalog = read('../catalog.json');
const commonTypes = read('../vendor/a2ui/v1_0/common_types.json');
const agentToRenderer = read('../vendor/a2ui/v1_0/agent_to_renderer.json');
const rendererToAgent = read('../vendor/a2ui/v1_0/renderer_to_agent.json');

/** The A2UI specification version the catalog targets (ADR-0046). */
export const A2UI_VERSION = '1.0';

/**
 * The URI the A2UI wire schemas reference the catalog under. Registering it
 * anywhere else leaves every component unchecked while still returning `true`.
 */
export const CATALOG_SCHEMA_URI = 'https://a2ui.org/specification/v1_0/catalog.json';

/** The catalog's own identity, which every `createSurface` message carries. */
export const catalogId = catalog.catalogId;

/**
 * Compiles the two directions of the wire, with the catalog plugged in.
 *
 * `strict: false`, draft 2020-12 and `ajv-formats` are what the A2UI reference
 * validator runs; strict mode rejects the specification's own schemas.
 * Compilation is not cheap — call this once and keep the result.
 *
 * @returns {{ agentToApp: import('./validator.mjs').CompiledSchema, appToAgent: import('./validator.mjs').CompiledSchema }}
 */
export function createValidator() {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema(commonTypes);
  // Under its own `$id` the catalog's relative `common_types.json` refs would
  // point at nibify.app, which is never fetched. A2UI's reference runner swaps
  // the `$id` the same way.
  ajv.addSchema({ ...catalog, $id: CATALOG_SCHEMA_URI });

  return {
    agentToApp: ajv.compile(agentToRenderer),
    appToAgent: ajv.compile(rendererToAgent),
  };
}

/**
 * Expands a persisted surface into the A2UI message sequence a renderer
 * consumes.
 *
 * @param {{ dataModel: object, components: object[] }} surface
 * @param {string} surfaceId
 * @returns {object[]}
 */
export function toA2uiMessages(surface, surfaceId) {
  return [
    { version: A2UI_VERSION, createSurface: { surfaceId, catalogId } },
    { version: A2UI_VERSION, updateDataModel: { surfaceId, value: surface.dataModel } },
    { version: A2UI_VERSION, updateComponents: { surfaceId, components: surface.components } },
  ];
}

/**
 * Whether every message a surface expands into is one the renderer would accept.
 *
 * @param {{ agentToApp: Function }} validator from `createValidator()`
 * @param {{ dataModel: object, components: object[] }} surface
 * @param {string} [surfaceId]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSurface(validator, surface, surfaceId = 'validation') {
  const errors = [];
  const issues = [];

  for (const message of toA2uiMessages(surface, surfaceId)) {
    if (!validator.agentToApp(message)) {
      // The wire schema is a `oneOf` over the message kinds, so one bad
      // component fails every branch and Ajv reports all of them: without the
      // message kind in front, the first error names a kind not even involved.
      const kind = messageKind(message);
      const raw = validator.agentToApp.errors ?? [];
      errors.push(
        ...raw.map((error) => describeError(kind, error, messageOf(message, kind, error))),
      );
      // Ajv's own fields, not a shape of this package's invention: an
      // interpretation here is one more thing that can disagree with the schema.
      // The one exception is the wording of `messageOf`.
      issues.push(
        ...raw.map((error) => ({
          kind,
          instancePath: error.instancePath ?? '',
          keyword: error.keyword ?? '',
          message: messageOf(message, kind, error),
          params: /** @type {Record<string, unknown>} */ (error.params ?? {}),
        })),
      );
    }
  }

  return { valid: errors.length === 0, errors, issues };
}

/**
 * Whether the catalog defines a component at all.
 *
 * @param {string} componentType
 * @returns {boolean}
 */
export function definesComponent(componentType) {
  return Boolean(catalog.components?.[componentType]);
}

/**
 * The properties the catalog requires on a component: what lets a consumer keep,
 * out of the `oneOf` noise, the one `required` failure that is true — a Button
 * missing its `child` also "requires" `url`, `options` and `max`.
 *
 * @param {string} componentType
 * @returns {string[]}
 */
export function requiredPropertiesOf(componentType) {
  const definition = catalog.components?.[componentType];
  if (!definition) return [];
  return [definition, ...(definition.allOf ?? [])].flatMap((entry) => entry?.required ?? []);
}

/**
 * The properties the catalog defines on a component: the other half of the
 * `oneOf` noise, where a misspelled name is `unevaluatedProperties` on every
 * branch.
 *
 * @param {string} componentType
 * @returns {string[]}
 */
export function propertiesOf(componentType) {
  const definition = catalog.components?.[componentType];
  if (!definition) return [];
  return [definition, ...(definition.allOf ?? [])].flatMap((entry) =>
    Object.keys(commonTypeOf(entry?.$ref)?.properties ?? entry?.properties ?? {}),
  );
}

/** A trait such as `Checkable`, which a component imports by a relative ref. */
function commonTypeOf(ref) {
  const prefix = 'common_types.json#/$defs/';
  return typeof ref === 'string' && ref.startsWith(prefix)
    ? commonTypes.$defs[ref.slice(prefix.length)]
    : undefined;
}

/** @param {object} message */
function messageKind(message) {
  return Object.keys(message).find((key) => key !== 'version') ?? 'message';
}

const COMPONENT_ID = /^\/\w+\/components\/(\d+)\/id$/;

/**
 * Ajv's message, except where Ajv would print a Unicode regex: a component id
 * that is not an identifier, which the renderer refuses for the whole surface.
 *
 * @param {Record<string, any>} message
 * @param {string} kind
 * @param {{ instancePath?: string, keyword?: string, message?: string }} error
 */
function messageOf(message, kind, error) {
  const match = error.keyword === 'pattern' ? COMPONENT_ID.exec(error.instancePath ?? '') : null;
  if (match) {
    const id = message[kind]?.components?.[Number(match[1])]?.id;
    return `Component id '${id}' must be a valid UAX #31 identifier, as A2UI 1.0 requires: letters, digits and '_', not starting with a digit.`;
  }
  return error.message ?? 'is invalid';
}

/**
 * @param {string} kind
 * @param {{ instancePath?: string }} error
 * @param {string} text
 */
function describeError(kind, error, text) {
  return `${kind}${error.instancePath || ''}: ${text}`;
}
