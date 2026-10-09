/** How long the execution waits, and the address that resumes it. */

export type ExpiryUnit = 'minutes' | 'hours' | 'days';

const UNIT_MS: Record<ExpiryUnit, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

/**
 * How far past `expiresAt` n8n's own limit falls: the expiry sweep runs once a minute
 * (ADR-0022) and a failing callback is retried for about half an hour (ADR-0014). On its
 * own limit n8n resumes the node as if disabled, with no outcome, so it must not come first.
 */
export const WAIT_MARGIN_MS = 60 * 60_000;

export interface Deadline {
  expiresAt: Date;
  waitTill: Date;
}

/** `null` when the Request never expires, which is the API's default (PRD §4.2). */
export function deadlineOf(amount: number, unit: ExpiryUnit, now: Date): Deadline | null {
  if (!amount) return null;
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError('"Expires After" must be a positive number.');
  }
  const expiresAt = new Date(now.getTime() + amount * UNIT_MS[unit]);
  return { expiresAt, waitTill: new Date(expiresAt.getTime() + WAIT_MARGIN_MS) };
}

/**
 * `$execution.resumeUrl` names the execution and carries its token as a query parameter;
 * the node's id goes in the path, where n8n matches it against the webhook's `path`.
 */
export function callbackUrlOf(resumeUrl: string, nodeId: string): string {
  const url = new URL(resumeUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/${encodeURIComponent(nodeId)}`;
  return url.toString();
}
