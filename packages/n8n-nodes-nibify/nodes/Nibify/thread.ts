/** Cancel and Nudge by thread key: every pending Request of the thread, one call each. */
import type { ApiFailure } from './api-error.ts';

export interface PendingPage {
  items: { requestId: string }[];
  nextCursor: string | null;
}

export interface ThreadOutcome {
  threadKey: string;
  requestIds: string[];
  skipped: ({ requestId: string } & ApiFailure)[];
}

export interface ThreadCalls {
  listPending: (cursor: string | undefined) => Promise<PendingPage>;
  /** Resolves to the API's failure when the call lost a race (`isRace`); any other failure rejects. */
  act: (requestId: string) => Promise<ApiFailure | undefined>;
}

/** A Request that reached a final state between the list and the call: the `409` codes. */
export function isRace(failure: ApiFailure): boolean {
  return failure.code.startsWith('request_already_');
}

export async function onPendingOfThread(
  threadKey: string,
  { listPending, act }: ThreadCalls,
): Promise<ThreadOutcome> {
  const pending: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await listPending(cursor);
    pending.push(...page.items.map(({ requestId }) => requestId));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  const outcome: ThreadOutcome = { threadKey, requestIds: [], skipped: [] };
  for (const requestId of pending) {
    const race = await act(requestId);
    if (race) outcome.skipped.push({ requestId, code: race.code, message: race.message });
    else outcome.requestIds.push(requestId);
  }
  return outcome;
}
