/** `requests.list()`, `threads.list()` and `threads.get()`: the API's pages, walked as async iterators. */
import type { components } from './generated/agent-api.ts';
import type { Query } from './operations.ts';
import { RequestHandle, type RequestState } from './request.ts';
import type { Transport } from './transport.ts';

type Schemas = components['schemas'];

export type Thread = Schemas['Thread_Output'];

export type ThreadMessage = Schemas['ThreadMessage_Output'];

export interface ThreadHistory extends Omit<Schemas['ThreadHistory_Output'], 'messages'> {
  /** Oldest first, from `after` when it was given; the later pages are fetched as it is walked. */
  messages: AsyncIterable<ThreadMessage>;
}

interface Paging {
  /** How many rows each call fetches (1–100). The iterator still walks every page. */
  pageSize?: number;
}

export type RequestListOptions = Omit<Query<'RequestsController_list'>, 'limit' | 'cursor'> &
  Paging;

export type ThreadListOptions = Paging;

export type ThreadGetOptions = Paging & {
  /** The `sequence` of the last Message already held. */
  after?: number;
};

async function* byCursor<T>(
  fetchPage: (cursor: string | undefined) => Promise<{ items: T[]; nextCursor: string | null }>,
): AsyncGenerator<T, void, undefined> {
  let cursor: string | undefined;
  do {
    const page = await fetchPage(cursor);
    yield* page.items;
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
}

export class Requests {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  /** Newest first, every page. Each row carries its handle, so a pending one can be cancelled. */
  async *list(options: RequestListOptions = {}): AsyncGenerator<RequestState, void, undefined> {
    const { pageSize, ...filters } = options;
    const rows = byCursor((cursor) =>
      this.#transport.send({
        operation: 'RequestsController_list',
        query: { ...filters, limit: pageSize, cursor },
        retry: true,
      }),
    );
    for await (const row of rows) {
      yield { ...row, request: new RequestHandle(row.requestId, this.#transport) };
    }
  }
}

export class Threads {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  /** The one that last spoke first, every page. */
  list(options: ThreadListOptions = {}): AsyncGenerator<Thread, void, undefined> {
    return byCursor((cursor) =>
      this.#transport.send({
        operation: 'ThreadsController_list',
        query: { limit: options.pageSize, cursor },
        retry: true,
      }),
    );
  }

  /** A Thread by the `threadKey` the agent gave it. A one-shot Request has none: use `getRequest()`. */
  async get(key: string, options: ThreadGetOptions = {}): Promise<ThreadHistory> {
    const read = (after: number | undefined): Promise<Schemas['ThreadHistory_Output']> =>
      this.#transport.send({
        operation: 'ThreadsController_read',
        pathParams: { key },
        query: { after, limit: options.pageSize },
        retry: true,
      });
    const { messages: first, ...thread } = await read(options.after);
    return {
      ...thread,
      messages: {
        async *[Symbol.asyncIterator]() {
          let page = first;
          for (;;) {
            yield* page.items;
            if (page.nextAfter === null) return;
            page = (await read(page.nextAfter)).messages;
          }
        },
      },
    };
  }
}
