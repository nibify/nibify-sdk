/**
 * Reference implementation of the catalog version derivation — `since`,
 * `propsSince`, `enumSince` under `metadata.extensions.nibify` — and the only
 * one: the server imports it rather than deriving again. ADR-0002
 * ("Versionamento del catalogo e degradazione non bloccante"), ADR-0007
 * ("Versione A2UI target e versionamento derivato del catalogo"), README
 * § Versioning.
 */

/** Thrown when a surface uses a component the catalog does not define. */
export class UnknownComponentError extends Error {
  constructor(componentType) {
    super(`Component "${componentType}" is not in the catalog`);
    this.name = 'UnknownComponentError';
    this.componentType = componentType;
  }
}

function nibifyMetadata(definition) {
  return definition?.metadata?.extensions?.nibify ?? {};
}

function versionOfInstance(instance, definition) {
  const { since = 1, propsSince = {}, enumSince = {} } = nibifyMetadata(definition);
  let version = since;

  for (const [prop, propVersion] of Object.entries(propsSince)) {
    if (prop in instance) version = Math.max(version, propVersion);
  }

  for (const [prop, valueVersions] of Object.entries(enumSince)) {
    const value = instance[prop];
    if (typeof value === 'string' && value in valueVersions) {
      version = Math.max(version, valueVersions[value]);
    }
  }

  return version;
}

/**
 * The lowest catalogVersion that can render this surface. Expects a surface
 * already validated: an unknown component is a developer error, not a version
 * mismatch, so it throws rather than degrading.
 *
 * @param {Array<{component: string}>} components the surface's flat component list
 * @param {object} catalog the parsed catalog.json
 * @returns {number}
 */
export function deriveMinCatalogVersion(components, catalog) {
  let minVersion = 1;

  for (const instance of components) {
    const definition = catalog.components?.[instance.component];
    if (!definition) throw new UnknownComponentError(instance.component);
    minVersion = Math.max(minVersion, versionOfInstance(instance, definition));
  }

  return minVersion;
}

/**
 * The version of the catalog itself: the highest version any of its elements was
 * introduced in.
 *
 * @param {object} catalog the parsed catalog.json
 * @returns {number}
 */
export function catalogVersion(catalog) {
  const versions = Object.values(catalog.components ?? {}).flatMap((definition) => {
    const { since = 1, propsSince = {}, enumSince = {} } = nibifyMetadata(definition);
    return [
      since,
      ...Object.values(propsSince),
      ...Object.values(enumSince).flatMap((valueVersions) => Object.values(valueVersions)),
    ];
  });

  return Math.max(1, ...versions);
}
