/** Types for `min-catalog-version.mjs`. Structural, like `validator.d.mts`. */

/** The parsed `catalog.json`, described by what the derivation actually touches. */
export interface CatalogDocument {
  components?: Record<string, unknown>;
}

/** A component as it appears in a surface: a `component` name plus its props. */
export interface ComponentInstance {
  component: string;
  [prop: string]: unknown;
}

export declare class UnknownComponentError extends Error {
  constructor(componentType: string);
  readonly componentType: string;
}

/** Throws `UnknownComponentError`: call it on a surface already validated. */
export declare function deriveMinCatalogVersion(
  components: ComponentInstance[],
  catalog: CatalogDocument,
): number;

export declare function catalogVersion(catalog: CatalogDocument): number;
