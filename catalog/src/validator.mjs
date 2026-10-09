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
const commonTypes = read('../vendor/a2ui/v0_9_1/common_types.json');
const serverToClient = read('../vendor/a2ui/v0_9_1/server_to_client.json');
const clientToServer = read('../vendor/a2ui/v0_9_1/client_to_server.json');

/** The A2UI specification version the catalog targets (ADR-0007). */
export const A2UI_VERSION = 'v0.9';

/**
 * The URI the A2UI wire schemas reference the catalog under. Registering it
 * anywhere else leaves every component unchecked while still returning `true`.
 */
export const CATALOG_SCHEMA_URI = 'https://a2ui.org/specification/v0_9/catalog.json';

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
  ajv.addSchema(catalog, CATALOG_SCHEMA_URI);

  return {
    agentToApp: ajv.compile(serverToClient),
    appToAgent: ajv.compile(clientToServer),
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
      // The wire schema is a `oneOf` over the four message kinds, so one bad
      // component fails every branch and Ajv reports all of them: without the
      // message kind in front, the first error names a kind not even involved.
      const kind = messageKind(message);
      const raw = validator.agentToApp.errors ?? [];
      errors.push(...raw.map((error) => describeError(kind, error)));
      // Ajv's own fields, not a shape of this package's invention: an
      // interpretation here is one more thing that can disagree with the schema.
      issues.push(
        ...raw.map((error) => ({
          kind,
          instancePath: error.instancePath ?? '',
          keyword: error.keyword ?? '',
          message: error.message ?? 'is invalid',
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
    Object.keys(entry?.properties ?? {}),
  );
}

/** @param {object} message */
function messageKind(message) {
  return Object.keys(message).find((key) => key !== 'version') ?? 'message';
}

/**
 * @param {string} kind
 * @param {{ instancePath?: string, message?: string }} error
 */
function describeError(kind, error) {
  return `${kind}${error.instancePath || ''}: ${error.message ?? 'is invalid'}`;
}
