/**
 * The node's own types of the API's `agent` tag, operations and webhook events, generated from
 * `openapi/openapi.json` (ADR-0005, ADR-0010). `pnpm generate` writes them; the contract test
 * compares.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import openapiTS, { astToString, type OpenAPI3 } from 'openapi-typescript';
import prettier from 'prettier';

export const ADMITTED_TAGS: readonly string[] = ['agent'];

export const SPEC_PATH = fileURLToPath(new URL('../../../openapi/openapi.json', import.meta.url));
export const TYPES_PATH = fileURLToPath(
  new URL('../nodes/Nibify/generated/agent-api.ts', import.meta.url),
);

const BANNER =
  '// Generated from openapi/openapi.json by `pnpm generate`. Do not edit: the contract test compares.\n\n';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

type Method = (typeof METHODS)[number];

interface Operation {
  operationId?: string;
  tags?: string[];
  requestBody?: { content?: Record<string, { schema?: { $ref?: string } }> };
}

export interface AgentOperation {
  operationId: string;
  method: Method;
  path: string;
}

export interface AgentWebhook {
  event: string;
  operationId: string;
  schema: string;
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

/** `x-webhooks` is the 3.0 spelling of 3.1's `webhooks`: one Path Item per event, `post` only. */
function webhookItems(spec: OpenAPI3): Record<string, { post?: Operation }> {
  return (spec['x-webhooks'] ?? {}) as Record<string, { post?: Operation }>;
}

export function agentWebhooks(spec: OpenAPI3): AgentWebhook[] {
  const found: AgentWebhook[] = [];
  for (const [event, item] of Object.entries(webhookItems(spec))) {
    const operation = item.post;
    if (!operation?.tags?.some((tag) => ADMITTED_TAGS.includes(tag))) continue;
    if (!operation.operationId) throw new Error(`webhook ${event} has no operationId`);
    const ref = operation.requestBody?.content?.['application/json']?.schema?.$ref;
    const schema = ref && /^#\/components\/schemas\/(\w+)$/.exec(ref)?.[1];
    if (!schema) throw new Error(`webhook ${event} has no $ref to a schema as its body`);
    found.push({ event, operationId: operation.operationId, schema });
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
  const webhooks: Record<string, { post?: Operation }> = {};
  for (const { event } of agentWebhooks(spec)) webhooks[event] = webhookItems(spec)[event] ?? {};

  const components = (spec.components ?? {}) as Record<string, Record<string, unknown>>;
  const kept: Record<string, Record<string, unknown>> = {};
  const pending: unknown[] = [paths, webhooks];
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

  return {
    openapi: spec.openapi,
    info: spec.info,
    paths,
    webhooks,
    components: kept,
  } as OpenAPI3;
}

function eventMap(spec: OpenAPI3): string {
  const entries = agentWebhooks(spec).map(
    ({ event, schema }) =>
      `${JSON.stringify(event)}: components["schemas"][${JSON.stringify(schema)}];`,
  );
  return `export interface events {\n${entries.join('\n')}\n}\n`;
}

export async function generateTypes(spec: OpenAPI3): Promise<string> {
  const source =
    BANNER +
    astToString(await openapiTS(agentDocument(spec), { defaultNonNullable: false })) +
    eventMap(spec);
  const options = await prettier.resolveConfig(TYPES_PATH);
  return prettier.format(source, { ...options, filepath: TYPES_PATH });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(TYPES_PATH, await generateTypes(await readSpec()));
  console.log(`wrote ${TYPES_PATH}`);
}
