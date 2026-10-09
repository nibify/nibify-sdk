/** Types for `validator.mjs`. Structural: no type dependency on Ajv, for the
 * consumer either. */

/** The persisted form of a Nibify surface: a flat component list plus its data model. */
export interface Surface {
  root: string;
  dataModel: Record<string, unknown>;
  components: Array<Record<string, unknown>>;
}

/** An Ajv `ValidateFunction`, described by what callers here actually use. */
export interface CompiledSchema {
  (data: unknown): boolean;
  errors?: Array<{ instancePath?: string; keyword?: string; message?: string }> | null;
}

export interface CatalogValidator {
  /** Agent → app: `createSurface`, `updateDataModel`, `updateComponents`, `deleteSurface`. */
  agentToApp: CompiledSchema;
  /** App → agent: `action` and `error`. */
  appToAgent: CompiledSchema;
}

/**
 * One Ajv failure, unsummarised. `instancePath` is a JSON Pointer into the A2UI
 * message: `/updateComponents/components/6/variant`.
 */
export interface SurfaceIssue {
  /** Which of the three messages the surface expands into was rejected. */
  kind: string;
  instancePath: string;
  keyword: string;
  message: string;
  /** Ajv's own `params`, verbatim — `missingProperty`, `allowedValues`, and so on. */
  params: Record<string, unknown>;
}

export interface SurfaceValidation {
  valid: boolean;
  errors: string[];
  issues: SurfaceIssue[];
}

export declare const A2UI_VERSION: 'v0.9';
export declare const CATALOG_SCHEMA_URI: string;
export declare const catalogId: string;

export declare function createValidator(): CatalogValidator;

export declare function toA2uiMessages(surface: Surface, surfaceId: string): unknown[];

export declare function validateSurface(
  validator: CatalogValidator,
  surface: Surface,
  surfaceId?: string,
): SurfaceValidation;

export declare function definesComponent(componentType: string): boolean;

export declare function requiredPropertiesOf(componentType: string): string[];

export declare function propertiesOf(componentType: string): string[];
