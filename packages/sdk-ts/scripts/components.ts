/**
 * The component constructors and their types, generated from `catalog/catalog.json` (ADR-0001).
 * `pnpm generate` writes them; `test/components.test.ts` regenerates them and compares.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

export const CATALOG_PATH = fileURLToPath(import.meta.resolve('@nibify/catalog'));
export const COMMON_TYPES_PATH = fileURLToPath(
  import.meta.resolve('@nibify/catalog/a2ui/v0_9_1/common_types.json'),
);
export const COMPONENTS_PATH = fileURLToPath(
  new URL('../src/generated/components.ts', import.meta.url),
);

const BANNER =
  '// Generated from catalog/catalog.json by `pnpm generate`. Do not edit: the components test compares.\n\n';

type Schema = { [keyword: string]: unknown };

export interface CatalogSources {
  catalog: Schema;
  commonTypes: Schema;
}

/** Keywords that constrain a value without changing its TypeScript type. */
const IGNORED = new Set([
  '$schema',
  '$id',
  'title',
  'description',
  'default',
  'metadata',
  'discriminator',
  'format',
  'if',
  'then',
  'else',
]);

const SHAPING = new Set([
  'type',
  'enum',
  'const',
  '$ref',
  'oneOf',
  'anyOf',
  'allOf',
  'not',
  'properties',
  'required',
  'additionalProperties',
  'items',
]);

/** Keywords a component may use: it is a closed object, the merge of its `allOf`. */
const COMPONENT = new Set([
  'allOf',
  'type',
  'properties',
  'required',
  '$ref',
  'unevaluatedProperties',
]);

const NEVER = 'never';
const UNKNOWN = 'unknown';

export async function readCatalog(): Promise<CatalogSources> {
  const [catalog, commonTypes] = await Promise.all(
    [CATALOG_PATH, COMMON_TYPES_PATH].map(async (path) => JSON.parse(await readFile(path, 'utf8'))),
  );
  return { catalog, commonTypes };
}

class Generator {
  readonly #documents = new Map<string, Schema>();
  readonly #aliases = new Map<string, { ref: string; type: string | null }>();
  readonly #collapsed: ReadonlyMap<string, string>;

  constructor({ catalog, commonTypes }: CatalogSources, collapsed: ReadonlyMap<string, string>) {
    this.#collapsed = collapsed;
    this.#documents.set(String(catalog['$id']), catalog);
    this.#documents.set(String(commonTypes['$id']), commonTypes);
    // common_types.json reaches the catalog by a relative ref, which the validator registers the
    // catalog under too.
    this.#documents.set(new URL('catalog.json', String(commonTypes['$id'])).href, catalog);
  }

  get aliases(): [string, string][] {
    return [...this.#aliases].map(([name, { type }]) => [name, type ?? UNKNOWN]);
  }

  /** The definitions that render as `never` or `unknown`, which a reference must inline. */
  get collapsed(): Map<string, string> {
    return new Map(this.aliases.filter(([, type]) => type === NEVER || type === UNKNOWN));
  }

  resolve(ref: string, base: string): { schema: Schema; base: string; name: string } {
    const url = new URL(ref, base);
    const pointer = url.hash.slice(1);
    url.hash = '';
    const document = this.#documents.get(url.href);
    if (!document) throw new Error(`${ref}: no document at ${url.href}`);
    let schema: unknown = document;
    for (const segment of pointer.split('/').slice(1)) {
      schema = (schema as Schema | undefined)?.[segment.replace(/~1/g, '/').replace(/~0/g, '~')];
    }
    if (schema === undefined) throw new Error(`${ref}: nothing at ${pointer} in ${url.href}`);
    return { schema: schema as Schema, base: url.href, name: pointer.split('/').pop() ?? '' };
  }

  typeOf(schema: Schema, base: string, at: string): string {
    for (const keyword of Object.keys(schema)) {
      if (!SHAPING.has(keyword) && !IGNORED.has(keyword)) {
        throw new Error(`${at}: the keyword "${keyword}" has no TypeScript rendering`);
      }
    }

    const parts: string[] = [];
    if (schema['$ref'] !== undefined) parts.push(this.#refType(String(schema['$ref']), base, at));
    if (schema['const'] !== undefined) {
      parts.push(literal(schema['const']));
    } else if (Array.isArray(schema['enum'])) {
      parts.push(union(schema['enum'].map(literal)));
    } else if (schema['type'] !== undefined) {
      parts.push(this.#typeKeyword(schema, base, at));
    } else if (schema['properties'] !== undefined) {
      parts.push(this.#objectType(schema, base, at));
    }
    for (const [keyword, combine] of [
      ['allOf', intersection],
      ['oneOf', union],
      ['anyOf', union],
    ] as const) {
      const members = schema[keyword];
      if (members === undefined) continue;
      if (!Array.isArray(members)) throw new Error(`${at}/${keyword}: not an array`);
      parts.push(
        combine(members.map((member, i) => this.typeOf(member, base, `${at}/${keyword}/${i}`))),
      );
    }
    if (schema['not'] !== undefined) {
      if (Object.keys(schema['not'] as Schema).length > 0) {
        throw new Error(`${at}/not: only "not: {}" has a TypeScript rendering`);
      }
      parts.push(NEVER);
    }
    return intersection(parts);
  }

  /** The properties of a schema whose `allOf` members are all objects, merged into one. */
  objectMembers(
    schema: Schema,
    base: string,
    at: string,
  ): { name: string; type: string; required: boolean; docs: string[] }[] {
    const merged = new Map<string, { type: string; required: boolean; docs: string[] }>();
    const visit = (node: Schema, nodeBase: string, nodeAt: string): void => {
      if (node['$ref'] !== undefined) {
        const target = this.resolve(String(node['$ref']), nodeBase);
        visit(target.schema, target.base, String(node['$ref']));
      }
      for (const keyword of Object.keys(node)) {
        if (!COMPONENT.has(keyword) && !IGNORED.has(keyword)) {
          throw new Error(`${nodeAt}: "${keyword}" on a component is not a set of properties`);
        }
      }
      if (node['type'] !== undefined && node['type'] !== 'object') {
        throw new Error(`${nodeAt}: a component is an object`);
      }
      for (const [i, member] of ((node['allOf'] as Schema[] | undefined) ?? []).entries()) {
        visit(member, nodeBase, `${nodeAt}/allOf/${i}`);
      }
      const required = (node['required'] as string[] | undefined) ?? [];
      for (const [name, property] of Object.entries(
        (node['properties'] as Record<string, Schema> | undefined) ?? {},
      )) {
        const type = this.typeOf(property, nodeBase, `${nodeAt}/properties/${name}`);
        const previous = merged.get(name);
        merged.set(name, {
          type: previous ? intersection([previous.type, type]) : type,
          required: (previous?.required ?? false) || required.includes(name),
          docs: docsOf(property),
        });
      }
      for (const name of required) {
        const previous = merged.get(name);
        if (previous) previous.required = true;
      }
    };
    visit(schema, base, at);
    return [...merged].map(([name, member]) => ({ name, ...member }));
  }

  #refType(ref: string, base: string, at: string): string {
    const target = this.resolve(ref, base);
    const href = new URL(ref, base).href;
    let entry = this.#aliases.get(target.name);
    if (entry && entry.ref !== href) {
      throw new Error(`${at}: two definitions are both called ${target.name}`);
    }
    if (!entry) {
      // Registered before it is rendered, so a definition that refers back to itself ends.
      entry = { ref: href, type: null };
      this.#aliases.set(target.name, entry);
      entry.type = this.typeOf(target.schema, target.base, ref);
    }
    const type = entry.type ?? this.#collapsed.get(target.name);
    return type === NEVER || type === UNKNOWN ? type : target.name;
  }

  #typeKeyword(schema: Schema, base: string, at: string): string {
    switch (schema['type']) {
      case 'string':
      case 'number':
      case 'boolean':
        return schema['type'];
      case 'integer':
        return 'number';
      case 'array': {
        const items = schema['items'] as Schema | undefined;
        return items ? `Array<${this.typeOf(items, base, `${at}/items`)}>` : 'unknown[]';
      }
      case 'object':
        return this.#objectType(schema, base, at);
      default:
        throw new Error(`${at}: the type ${JSON.stringify(schema['type'])} is not rendered`);
    }
  }

  #objectType(schema: Schema, base: string, at: string): string {
    const required = (schema['required'] as string[] | undefined) ?? [];
    const lines: string[] = [];
    for (const [name, property] of Object.entries(
      (schema['properties'] as Record<string, Schema> | undefined) ?? {},
    )) {
      const type = this.typeOf(property, base, `${at}/properties/${name}`);
      const isRequired = required.includes(name);
      if (type === NEVER && isRequired) return NEVER;
      if (type === NEVER) continue;
      lines.push(...jsDoc(docsOf(property)), `${key(name)}${isRequired ? '' : '?'}: ${type};`);
    }
    const additional = schema['additionalProperties'];
    if (additional === undefined && lines.length === 0) return '{ [key: string]: unknown }';
    if (additional !== undefined && additional !== false) {
      const type =
        additional === true
          ? UNKNOWN
          : this.typeOf(additional as Schema, base, `${at}/additionalProperties`);
      lines.push(`[key: string]: ${type};`);
    }
    return lines.length === 0 ? '{ [key: string]: never }' : `{\n${lines.join('\n')}\n}`;
  }
}

export async function generateComponents(sources: CatalogSources): Promise<string> {
  // A definition inside a cycle is referred to before it is rendered: render again, inlining
  // what the previous pass found to be `never`, until nothing more collapses.
  let collapsed = new Map<string, string>();
  for (;;) {
    const generator = new Generator(sources, collapsed);
    const source = render(generator, sources);
    if (sameEntries(generator.collapsed, collapsed)) {
      const options = await prettier.resolveConfig(COMPONENTS_PATH);
      return prettier.format(source, { ...options, filepath: COMPONENTS_PATH });
    }
    collapsed = generator.collapsed;
  }
}

function sameEntries(a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>): boolean {
  return a.size === b.size && [...a].every(([name, type]) => b.get(name) === type);
}

function render(generator: Generator, sources: CatalogSources): string {
  const base = String(sources.catalog['$id']);
  const components = Object.entries(sources.catalog['components'] as Record<string, Schema>);

  const blocks: string[] = [];
  for (const [name, schema] of components) {
    const at = `#/components/${name}`;
    const members = generator.objectMembers(schema, base, at);
    const id = members.find((member) => member.name === 'id');
    const discriminator = members.find((member) => member.name === 'component');
    if (!id?.required || !discriminator?.required || discriminator.type !== literal(name)) {
      throw new Error(`${at}: a component needs a required id and "component": "${name}"`);
    }
    if (schema['unevaluatedProperties'] !== false) {
      throw new Error(`${at}: a component without "unevaluatedProperties": false is open`);
    }
    const props = members.filter((member) => member !== id && member !== discriminator);
    const optional = props.every((member) => !member.required);
    const lines = props.flatMap((member) => [
      ...jsDoc(member.docs),
      `${key(member.name)}${member.required ? '' : '?'}: ${member.type};`,
    ]);
    blocks.push(
      `export type ${name}Props = {\n${lines.join('\n')}\n};`,
      `export type ${name}Component = { id: ${id.type}; component: ${discriminator.type} } & ${name}Props;`,
      `export function ${name}(id: ${id.type}, props: ${name}Props${optional ? ' = {}' : ''}): ${name}Component {\n` +
        `return { id, component: ${literal(name)}, ...props };\n}`,
    );
  }
  blocks.push(
    `export type Component = ${union(components.map(([name]) => `${name}Component`))};`,
    `export type ComponentType = Component['component'];`,
  );

  const aliases = generator.aliases
    .filter(([, type]) => type !== NEVER && type !== UNKNOWN)
    .map(([name, type]) => `export type ${name} = ${type};`);

  return BANNER + [...aliases, ...blocks].join('\n\n') + '\n';
}

function literal(value: unknown): string {
  return JSON.stringify(value);
}

function key(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : literal(name);
}

function union(types: string[]): string {
  const kept = [...new Set(types.filter((type) => type !== NEVER))];
  if (kept.includes(UNKNOWN)) return UNKNOWN;
  if (kept.length === 0) return NEVER;
  return kept.length === 1 ? (kept[0] as string) : kept.map(group).join(' | ');
}

function intersection(types: string[]): string {
  if (types.includes(NEVER)) return NEVER;
  const kept = [...new Set(types.filter((type) => type !== UNKNOWN))];
  if (kept.length === 0) return UNKNOWN;
  return kept.length === 1 ? (kept[0] as string) : kept.map(group).join(' & ');
}

function group(type: string): string {
  return /^[\w$<>[\]'"]+$/.test(type) || type.startsWith('{') ? type : `(${type})`;
}

function docsOf(schema: Schema): string[] {
  const docs: string[] = [];
  if (typeof schema['description'] === 'string') docs.push(schema['description']);
  if (schema['default'] !== undefined) docs.push(`@default ${literal(schema['default'])}`);
  return docs;
}

function jsDoc(docs: string[]): string[] {
  if (docs.length === 0) return [];
  return ['/**', ...docs.map((line) => ` * ${line.replace(/\*\//g, '*\\/')}`), ' */'];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(COMPONENTS_PATH, await generateComponents(await readCatalog()));
  console.log(`wrote ${COMPONENTS_PATH}`);
}
