/** The API's own words for a failed call, found where n8n's request helper leaves them. */
import type { components } from './generated/agent-api.ts';

export type ApiFailure = components['schemas']['ApiErrorDto']['error'];

/**
 * `httpRequestWithAuthentication` throws a `NodeApiError` that keeps the response body in
 * `context.data`, and the axios error it wraps in `cause`. Neither is typed by n8n-workflow.
 */
export function apiFailureOf(error: unknown): ApiFailure | undefined {
  const candidates = [
    at(error, 'context', 'data'),
    at(error, 'cause', 'response', 'data'),
    at(error, 'response', 'body'),
  ];
  for (const body of candidates) {
    const failure = at(body, 'error');
    if (typeof at(failure, 'code') === 'string' && typeof at(failure, 'message') === 'string') {
      return failure as ApiFailure;
    }
  }
  return undefined;
}

function at(value: unknown, ...keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
