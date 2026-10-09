/**
 * The types of the API's `agent` tag, generated from `openapi/openapi.json` (ADR-0010).
 * `pnpm generate` writes them; `test/contract.test.ts` regenerates them and compares.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import openapiTS, { astToString, type OpenAPI3 } from 'openapi-typescript';
import prettier from 'prettier';

export const ADMITTED_TAGS: readonly string[] = ['agent'];

export const SPEC_PATH = fileURLToPath(new URL('../../../openapi/openapi.json', import.meta.url));
export const TYPES_PATH = fileURLToPath(new URL('../src/generated/agent-api.ts', import.meta.url));

const BANNER =
  '// Generated from openapi/openapi.json by `pnpm generate`. Do not edit: the contract test compares.\n\n';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

type Method = (typeof METHODS)[number];

interface Operation {
  operationId?: string;
  tags?: string[];
}

export interface AgentOperation {
  operationId: string;
  method: Method;
  path: string;
}

export async function readSpec(): Promise<OpenAPI3> {
  return JSON.parse(await readFile(SPEC_PATH, 'utf8')) as OpenAPI3;
}

export function agentOperations(spec: OpenAPI3): AgentOperation[] {
  const found: AgentOperation[] = [];
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const method of METHODS) {
      const operation = (item as Record<string, Operation | undefined>)[method];
      if (!operation?.tags?.some((tag) => ADMITTED_TAGS.includes(tag))) continue;
      if (!operation.operationId)
        throw new Error(`${method.toUpperCase()} ${path} has no operationId`);
      found.push({ operationId: operation.operationId, method, path });
    }
  }
  return found;
}

export function agentDocument(spec: OpenAPI3): OpenAPI3 {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const { method, path } of agentOperations(spec)) {
    const item = spec.paths?.[path] as Record<string, unknown>;
    paths[path] ??= {};
    paths[path][method] = item[method];
  }

  const components = (spec.components ?? {}) as Record<string, Record<string, unknown>>;
  const kept: Record<string, Record<string, unknown>> = {};
  const pending: unknown[] = [paths];
  while (pending.length > 0) {
    const node = pending.pop();
    if (Array.isArray(node)) {
      pending.push(...node);
    } else if (node !== null && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        const match =
          key === '$ref' && typeof value === 'string' && /^#\/components\/(\w+)\/(.+)$/.exec(value);
        if (match) {
          const [, kind = '', name = ''] = match;
          if (kept[kind]?.[name] !== undefined) continue;
          const target = components[kind]?.[name];
          if (target === undefined) throw new Error(`Unresolved ${value}`);
          (kept[kind] ??= {})[name] = target;
          pending.push(target);
        } else {
          pending.push(value);
        }
      }
    }
  }

  return { openapi: spec.openapi, info: spec.info, paths, components: kept } as OpenAPI3;
}

export async function generateTypes(spec: OpenAPI3): Promise<string> {
  const source =
    BANNER + astToString(await openapiTS(agentDocument(spec), { defaultNonNullable: false }));
  const options = await prettier.resolveConfig(TYPES_PATH);
  return prettier.format(source, { ...options, filepath: TYPES_PATH });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(TYPES_PATH, await generateTypes(await readSpec()));
  console.log(`wrote ${TYPES_PATH}`);
}
