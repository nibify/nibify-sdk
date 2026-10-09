// Generated from openapi/openapi.json by `pnpm generate`. Do not edit: the contract test compares.

export interface paths {
  '/v1/requests': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List the Requests of this Project
     * @description Every Request this key can see, newest first — the answer to "what did I leave hanging" for an agent that was switched off and lost the ids it was holding. Narrow with `status` (`pending` is the one that question wants), with `threadKey`, and with `createdAfter`/`createdBefore`, both exclusive. Rows are the same `Request` `GET /v1/requests/{id}` returns, `response` included, so a settled page needs no second call. Notifications sent with no question attached are not Requests and are not here. The list is scoped to the half of the Project the key belongs to: an `sk_test_…` never sees a live Request, and no key ever sees another Project.
     */
    get: operations['RequestsController_list'];
    put?: never;
    /**
     * Create a Request
     * @description Creates a pending Request and validates its Surface against the catalog. Send `Idempotency-Key` only if you retry automatically: the returned `requestId` is already the identity of the Request. Send `callbackUrl` to be called once, with a signed `POST`, when the Request reaches a terminal state — that is what an n8n "Ask & wait" node resumes on, and the alternative to holding a long poll open.
     */
    post: operations['RequestsController_create'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/requests/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Read a Request
     * @description Returns the Request as it stands now, without waiting. The same body as `GET /v1/requests/{id}/response`: read `status` to tell a Response from an outcome without one, and `status: "pending"` — nobody has answered yet — from `expired`, where the Request timed out. `deliveredAt` and `readAt` are the two receipts: a `pending` Request with both null never reached a phone, which is a different problem from one nobody has answered. Use the long poll instead when you intend to wait for the answer.
     */
    get: operations['RequestsController_read'];
    put?: never;
    post?: never;
    /**
     * Withdraw a Request
     * @description Moves a pending Request to `cancelled`: the agent no longer needs the answer. Nothing is deleted — the Request stays readable, and `cancelled` is what tells the agent later that it withdrew rather than the person letting it lapse. A Request that reached any terminal state first is a `409` naming that state; `request_already_answered` means the person won the race and there is a Response to read.
     */
    delete: operations['RequestsController_cancel'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/requests/{id}/nudge': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Re-notify a pending Request
     * @description Fires the push for a Request that is still waiting, without creating a second Request and without touching its state — no `status`, no `sequence`, no timestamp changes. Distinct from withdrawing and re-sending, which produces a `cancelled` Request and a new one. It obeys the priority the Request was created with and the recipient's quiet hours exactly as the first push did, so a `normal` Request nudged at three in the morning does not ring. A Request that already reached a terminal state is a `409` naming that state, never a silent no-op.
     */
    post: operations['RequestsController_renotify'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/requests/{id}/response': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Await the outcome of a Request
     * @description Resolves as soon as the Request reaches a terminal state, or when `wait` seconds have passed. Always a `200`: read `status` to tell a Response from an outcome without one, and `status: "pending"` — the Wait window ran out, the Request is still waiting — from `expired`, where the Request itself timed out. Re-issue on `pending`. Waiting is free: this endpoint does not count against the project's rate limit, however long it is held open or however often it is re-issued.
     */
    get: operations['RequestsController_awaitResponse'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/notifications': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Send a notification
     * @description Creates an `informational` Message: it arrives on the phone, lands in the Inbox and is marked read when it is looked at, and asks for nothing back. There is no `pending` state, no expiry and no callback — what happens to it next reaches you as the `message.delivered` and `message.read` events of a webhook endpoint, if you subscribe to them. Send `surface` for a rich body; a surface that dispatches an action belongs to `POST /v1/requests` and is refused here. Send `threadKey` to say it inside a conversation you have already opened: the Message takes the next `sequence` of that Thread and stays `informational`, because it still asks for nothing.
     */
    post: operations['NotificationsController_create'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/threads': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List the Threads of this Project
     * @description Every conversation this key can see, the one that last spoke first. Metadata only: `lastMessage` is the notification block of the newest Message, never anything read out of a surface (ADR-0003). One-shot Requests are Threads of one and are listed too — their `threadKey` is null. The list is scoped to the half of the Project the key belongs to: a `sk_test_…` never sees a live conversation.
     */
    get: operations['ThreadsController_list'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/v1/threads/{key}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Read one Thread by its key
     * @description The conversation the agent named, and its history in order — oldest first, mixed: the notification of a plain Request and the metadata of an interactive card read the same way, told apart by `interactionType`. Page forward with `after`, which is the `sequence` of the last Message you hold; `nextAfter` is null when the page reached the end. A one-shot Thread has no key and is not reachable here — read its Request with `GET /v1/requests/{id}`.
     */
    get: operations['ThreadsController_read'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export interface webhooks {
  'message.delivered': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** A Device of the recipient confirmed the push arrived. */
    post: operations['messageDelivered'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  'message.read': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** The recipient opened the Message. */
    post: operations['messageRead'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  'message.answered': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** The person answered a Request. */
    post: operations['messageAnswered'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  'message.expired': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** A Request reached its expiry unanswered. */
    post: operations['messageExpired'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  'message.dismissed': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** The person declined a Request. */
    post: operations['messageDismissed'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  'message.cancelled': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** The agent cancelled a Request. */
    post: operations['messageCancelled'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export interface components {
  schemas: {
    MessageCancelledEvent: {
      id: string;
      /** @enum {string} */
      type: 'message.cancelled';
      /** Format: date-time */
      createdAt: string;
      data: {
        requestId: string;
        /** @enum {string} */
        status: 'cancelled';
        /** @enum {string} */
        environment: 'test' | 'live';
        /** @enum {string|null} */
        response: null;
      };
    };
    MessageDismissedEvent: {
      id: string;
      /** @enum {string} */
      type: 'message.dismissed';
      /** Format: date-time */
      createdAt: string;
      data: {
        requestId: string;
        /** @enum {string} */
        status: 'dismissed';
        /** @enum {string} */
        environment: 'test' | 'live';
        /** @enum {string|null} */
        response: null;
      };
    };
    MessageExpiredEvent: {
      id: string;
      /** @enum {string} */
      type: 'message.expired';
      /** Format: date-time */
      createdAt: string;
      data: {
        requestId: string;
        /** @enum {string} */
        status: 'expired';
        /** @enum {string} */
        environment: 'test' | 'live';
        /** @enum {string|null} */
        response: null;
      };
    };
    MessageAnsweredEvent: {
      id: string;
      /** @enum {string} */
      type: 'message.answered';
      /** Format: date-time */
      createdAt: string;
      data: {
        requestId: string;
        /** @enum {string} */
        status: 'answered';
        /** @enum {string} */
        environment: 'test' | 'live';
        response: components['schemas']['WebhookResponse'];
      };
    };
    WebhookResponse: {
      responseId: string;
      actionName: string;
      sourceComponentId: string;
      context: {
        [key: string]: unknown;
      } | null;
      /** Format: date-time */
      clientTimestamp: string;
      /** Format: date-time */
      answeredAt: string;
    };
    MessageReadEvent: {
      id: string;
      /** @enum {string} */
      type: 'message.read';
      /** Format: date-time */
      createdAt: string;
      data: {
        messageId: string;
        /** @enum {string} */
        environment: 'test' | 'live';
        /** @enum {string|null} */
        status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled' | null;
        /** Format: date-time */
        deliveredAt: string;
        /** Format: date-time */
        readAt: string;
      };
    };
    MessageDeliveredEvent: {
      id: string;
      /** @enum {string} */
      type: 'message.delivered';
      /** Format: date-time */
      createdAt: string;
      data: {
        messageId: string;
        /** @enum {string} */
        environment: 'test' | 'live';
        /** @enum {string|null} */
        status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled' | null;
        /** Format: date-time */
        deliveredAt: string;
        /** @enum {string|null} */
        readAt: null;
      };
    };
    ApiErrorDto: {
      error: {
        code: string;
        message: string;
        details?: {
          pointer: string;
          message: string;
          component?: string;
          property?: string;
        }[];
      };
    };
    ThreadHistory_Output: {
      threadId: string;
      threadKey: string | null;
      /** @enum {string} */
      environment: 'test' | 'live';
      messageCount: number;
      /** Format: date-time */
      createdAt: string;
      lastMessage: components['schemas']['ThreadMessage_Output'];
      messages: {
        items: components['schemas']['ThreadMessage_Output'][];
        nextAfter: number | null;
      };
    };
    ThreadMessage_Output: {
      messageId: string;
      sequence: number;
      /** @enum {string} */
      interactionType: 'informational' | 'action' | 'conversation';
      /** @enum {string|null} */
      status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled' | null;
      sender: {
        name: string;
        icon: string | null;
      };
      notification: {
        title: string;
        body: string;
        quickActions: {
          name: string;
          label: string;
        }[];
      };
      minCatalogVersion: number | null;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      expiresAt: string | null;
      /** Format: date-time */
      deliveredAt: string | null;
      /** Format: date-time */
      readAt: string | null;
      /** Format: date-time */
      contentDeletedAt: string | null;
    };
    ThreadPageDto_Output: {
      items: components['schemas']['Thread_Output'][];
      nextCursor: string | null;
    };
    Thread_Output: {
      threadId: string;
      threadKey: string | null;
      /** @enum {string} */
      environment: 'test' | 'live';
      messageCount: number;
      /** Format: date-time */
      createdAt: string;
      lastMessage: components['schemas']['ThreadMessage_Output'];
    };
    NotificationCreatedDto: {
      messageId: string;
      threadId: string;
      sequence: number;
      /** @enum {string} */
      interactionType: 'informational';
      /** Format: date-time */
      createdAt: string;
      /** @enum {string} */
      environment: 'test' | 'live';
      minCatalogVersion: number | null;
      warnings: {
        /** @enum {string} */
        code: 'catalog_version_too_low';
        message: string;
      }[];
    };
    CreateNotificationDto: {
      sender: {
        name: string;
        icon?: string;
      };
      notification: {
        title: string;
        body: string;
      };
      /**
       * @default normal
       * @enum {string}
       */
      priority?: 'low' | 'normal' | 'high';
      surface?: {
        root: string;
        dataModel: {
          [key: string]: unknown;
        };
        components: {
          [key: string]: unknown;
        }[];
      };
      threadKey?: string;
    };
    RequestOutcomeDto_Output: {
      requestId: string;
      /** @enum {string} */
      status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled';
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      expiresAt: string | null;
      /** @enum {string} */
      environment: 'test' | 'live';
      /** Format: date-time */
      deliveredAt: string | null;
      /** Format: date-time */
      readAt: string | null;
      /** Format: date-time */
      contentDeletedAt: string | null;
      response: {
        responseId: string;
        actionName: string;
        sourceComponentId: string;
        context: {
          [key: string]: unknown;
        } | null;
        /** Format: date-time */
        clientTimestamp: string;
        /** Format: date-time */
        answeredAt: string;
      } | null;
    };
    SettledRequestDto_Output: {
      requestId: string;
      /** @enum {string} */
      status: 'answered' | 'expired' | 'dismissed' | 'cancelled';
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      expiresAt: string | null;
      /** @enum {string} */
      environment: 'test' | 'live';
      /** Format: date-time */
      deliveredAt: string | null;
      /** Format: date-time */
      readAt: string | null;
      /** Format: date-time */
      contentDeletedAt: string | null;
      response: {
        responseId: string;
        actionName: string;
        sourceComponentId: string;
        context: {
          [key: string]: unknown;
        } | null;
        /** Format: date-time */
        clientTimestamp: string;
        /** Format: date-time */
        answeredAt: string;
      } | null;
    };
    RequestCreatedDto: {
      requestId: string;
      threadId: string;
      sequence: number;
      /** @enum {string} */
      interactionType: 'action' | 'conversation';
      /** @enum {string} */
      status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled';
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      expiresAt: string | null;
      /** @enum {string} */
      environment: 'test' | 'live';
      minCatalogVersion: number | null;
      warnings: {
        /** @enum {string} */
        code: 'catalog_version_too_low';
        message: string;
      }[];
    };
    CreateRequestDto: {
      sender: {
        name: string;
        icon?: string;
      };
      notification: {
        title: string;
        body: string;
        quickActions?: {
          name: string;
          label: string;
        }[];
      };
      /**
       * @default normal
       * @enum {string}
       */
      priority?: 'low' | 'normal' | 'high';
      threadKey?: string;
      surface?: {
        root: string;
        dataModel: {
          [key: string]: unknown;
        };
        components: {
          [key: string]: unknown;
        }[];
      };
      /** Format: date-time */
      expiresAt?: string;
      /** Format: uri */
      callbackUrl?: string;
    };
    RequestPageDto_Output: {
      items: components['schemas']['RequestOutcomeDto_Output'][];
      nextCursor: string | null;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  RequestsController_list: {
    parameters: {
      query?: {
        status?: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled';
        threadKey?: string;
        createdAfter?: string;
        createdBefore?: string;
        limit?: number;
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description One page, newest first, and the cursor for the next one. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['RequestPageDto_Output'];
        };
      };
      /** @description `unauthorized` for a missing or unusable key, `api_key_revoked` for a revoked one. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `invalid_request_body`. `limit` must be between 1 and 100; `cursor` must be a `nextCursor` this endpoint returned; `createdAfter` and `createdBefore` must be RFC 3339 timestamps. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `rate_limited`. This project is over its requests-per-second ceiling or its daily volume in the environment this key speaks for; the message says which of the two it was. The budget is the project’s and not the key’s, so another API key of the same project shares it — the `test` and `live` halves are counted apart. Nothing was created and nothing was counted: retrying after `Retry-After` is safe. */
      429: {
        headers: {
          /** @description How many seconds to wait before retrying. Always a whole number, never below 1. */
          'Retry-After'?: number;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
    };
  };
  RequestsController_create: {
    parameters: {
      query?: never;
      header?: {
        /** @description Send only if you retry automatically. The same key with the same request returns the Request already created, with `200`; with a different request it is a `422`. */
        'Idempotency-Key'?: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateRequestDto'];
      };
    };
    responses: {
      /** @description This `Idempotency-Key` had already created this exact Request. Nothing was created; the original Request is returned as it stands now. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['RequestCreatedDto'];
        };
      };
      /** @description The Request was created. */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['RequestCreatedDto'];
        };
      };
      /** @description `unauthorized` for a missing or unusable key, `api_key_revoked` for a revoked one. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `surface_invalid` names the component and property at fault, the `root` the renderer would not find, or the quick action whose `name` is not an action the surface dispatches; `idempotency_conflict` means this key was already used for a different request; `callback_url_invalid` means the `callbackUrl` is not a public `https` endpoint this API is willing to call; `invalid_request_body` is a malformed envelope. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `rate_limited`. This project is over its requests-per-second ceiling or its daily volume in the environment this key speaks for; the message says which of the two it was. The budget is the project’s and not the key’s, so another API key of the same project shares it — the `test` and `live` halves are counted apart. Nothing was created and nothing was counted: retrying after `Retry-After` is safe. */
      429: {
        headers: {
          /** @description How many seconds to wait before retrying. Always a whole number, never below 1. */
          'Retry-After'?: number;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
    };
  };
  RequestsController_read: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description The `requestId` returned when the Request was created. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The Request as it stands. `response` is present exactly when `status` is `answered`. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['RequestOutcomeDto_Output'];
        };
      };
      /** @description `unauthorized` for a missing or unusable key, `api_key_revoked` for a revoked one. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `request_not_found`. A Request belonging to another Project answers the same way as one that does not exist. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `rate_limited`. This project is over its requests-per-second ceiling or its daily volume in the environment this key speaks for; the message says which of the two it was. The budget is the project’s and not the key’s, so another API key of the same project shares it — the `test` and `live` halves are counted apart. Nothing was created and nothing was counted: retrying after `Retry-After` is safe. */
      429: {
        headers: {
          /** @description How many seconds to wait before retrying. Always a whole number, never below 1. */
          'Retry-After'?: number;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
    };
  };
  RequestsController_cancel: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description The `requestId` returned when the Request was created. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The Request was withdrawn. `response` is always null here. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['SettledRequestDto_Output'];
        };
      };
      /** @description `unauthorized` for a missing or unusable key, `api_key_revoked` for a revoked one. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `request_not_found`. A Request belonging to another Project answers the same way as one that does not exist. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description The Request was already terminal — the code names which state won: `request_already_answered`, `request_already_expired`, `request_already_dismissed` or `request_already_cancelled`. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `rate_limited`. This project is over its requests-per-second ceiling or its daily volume in the environment this key speaks for; the message says which of the two it was. The budget is the project’s and not the key’s, so another API key of the same project shares it — the `test` and `live` halves are counted apart. Nothing was created and nothing was counted: retrying after `Retry-After` is safe. */
      429: {
        headers: {
          /** @description How many seconds to wait before retrying. Always a whole number, never below 1. */
          'Retry-After'?: number;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
    };
  };
  RequestsController_renotify: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description The `requestId` returned when the Request was created. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The push was queued again. The Request is unchanged, and is returned as it stands. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['RequestOutcomeDto_Output'];
        };
      };
      /** @description `unauthorized` for a missing or unusable key, `api_key_revoked` for a revoked one. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `request_not_found`. A Request belonging to another Project answers the same way as one that does not exist. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description The Request is no longer pending, so there is nothing to re-notify — the code names which state it reached: `request_already_answered`, `request_already_expired`, `request_already_dismissed` or `request_already_cancelled`. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `rate_limited`. This project is over its requests-per-second ceiling or its daily volume in the environment this key speaks for; the message says which of the two it was. The budget is the project’s and not the key’s, so another API key of the same project shares it — the `test` and `live` halves are counted apart. Nothing was created and nothing was counted: retrying after `Retry-After` is safe. */
      429: {
        headers: {
          /** @description How many seconds to wait before retrying. Always a whole number, never below 1. */
          'Retry-After'?: number;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
    };
  };
  RequestsController_awaitResponse: {
    parameters: {
      query?: {
        wait?: number;
      };
      header?: never;
      path: {
        /** @description The `requestId` returned when the Request was created. */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description What awaiting the Request resolved to. `response` is present exactly when `status` is `answered`. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['RequestOutcomeDto_Output'];
        };
      };
      /** @description `unauthorized` for a missing or unusable key, `api_key_revoked` for a revoked one. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `request_not_found`. A Request belonging to another Project answers the same way as one that does not exist. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `invalid_request_body` — `wait` must be a whole number of seconds between 0 and 30. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
    };
  };
  NotificationsController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateNotificationDto'];
      };
    };
    responses: {
      /** @description The notification was created and is on its way. */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['NotificationCreatedDto'];
        };
      };
      /** @description `unauthorized` for a missing or unusable key, `api_key_revoked` for a revoked one. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `surface_invalid` names the component and property at fault, the `root` the renderer would not find, or a surface that dispatches an action — which is a Request and belongs to `POST /v1/requests`. `invalid_request_body` is a malformed envelope, and it is also what a field of a Request sent here gets: `quickActions`, `expiresAt` and `callbackUrl` are refused by name rather than ignored, because a notification that silently dropped a `callbackUrl` would leave an agent waiting for a call that is never made. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `rate_limited`. This project is over its requests-per-second ceiling or its daily volume in the environment this key speaks for; the message says which of the two it was. The budget is the project’s and not the key’s, so another API key of the same project shares it — the `test` and `live` halves are counted apart. Nothing was created and nothing was counted: retrying after `Retry-After` is safe. */
      429: {
        headers: {
          /** @description How many seconds to wait before retrying. Always a whole number, never below 1. */
          'Retry-After'?: number;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
    };
  };
  ThreadsController_list: {
    parameters: {
      query?: {
        limit?: number;
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description One page, newest activity first, and the cursor for the next one. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ThreadPageDto_Output'];
        };
      };
      /** @description `unauthorized` for a missing or unusable key, `api_key_revoked` for a revoked one. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `invalid_request_body`. `limit` must be between 1 and 100; `cursor` must be a `nextCursor` this endpoint returned. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `rate_limited`. This project is over its requests-per-second ceiling or its daily volume in the environment this key speaks for; the message says which of the two it was. The budget is the project’s and not the key’s, so another API key of the same project shares it — the `test` and `live` halves are counted apart. Nothing was created and nothing was counted: retrying after `Retry-After` is safe. */
      429: {
        headers: {
          /** @description How many seconds to wait before retrying. Always a whole number, never below 1. */
          'Retry-After'?: number;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
    };
  };
  ThreadsController_read: {
    parameters: {
      query?: {
        after?: number;
        limit?: number;
      };
      header?: never;
      path: {
        /** @description The `threadKey` sent with the Requests of this conversation. URL-encode it: it is the agent’s own string and this API never parses it. */
        key: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The Thread and one page of its Messages. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ThreadHistory_Output'];
        };
      };
      /** @description `unauthorized` for a missing or unusable key, `api_key_revoked` for a revoked one. */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `thread_not_found`. A Thread of another Project — or of the other half of this one — answers the same way as a key nobody has used. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `invalid_request_body`. `after` must be a whole number; `limit` 1 to 100. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
      /** @description `rate_limited`. This project is over its requests-per-second ceiling or its daily volume in the environment this key speaks for; the message says which of the two it was. The budget is the project’s and not the key’s, so another API key of the same project shares it — the `test` and `live` halves are counted apart. Nothing was created and nothing was counted: retrying after `Retry-After` is safe. */
      429: {
        headers: {
          /** @description How many seconds to wait before retrying. Always a whole number, never below 1. */
          'Retry-After'?: number;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ApiErrorDto'];
        };
      };
    };
  };
  messageDelivered: {
    parameters: {
      query?: never;
      header: {
        /** @description `t=<unix seconds>,v1=<hex>`: HMAC-SHA256 of `<t>.<raw body>`, keyed with the Project’s signing secret. */
        'nibify-signature': string;
        /** @description The event’s `id`, the same on every retry of it. */
        'nibify-event-id': string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['MessageDeliveredEvent'];
      };
    };
    responses: {
      /** @description Received. Any other answer is retried. */
      '2XX': {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  messageRead: {
    parameters: {
      query?: never;
      header: {
        /** @description `t=<unix seconds>,v1=<hex>`: HMAC-SHA256 of `<t>.<raw body>`, keyed with the Project’s signing secret. */
        'nibify-signature': string;
        /** @description The event’s `id`, the same on every retry of it. */
        'nibify-event-id': string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['MessageReadEvent'];
      };
    };
    responses: {
      /** @description Received. Any other answer is retried. */
      '2XX': {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  messageAnswered: {
    parameters: {
      query?: never;
      header: {
        /** @description `t=<unix seconds>,v1=<hex>`: HMAC-SHA256 of `<t>.<raw body>`, keyed with the Project’s signing secret. */
        'nibify-signature': string;
        /** @description The event’s `id`, the same on every retry of it. */
        'nibify-event-id': string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['MessageAnsweredEvent'];
      };
    };
    responses: {
      /** @description Received. Any other answer is retried. */
      '2XX': {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  messageExpired: {
    parameters: {
      query?: never;
      header: {
        /** @description `t=<unix seconds>,v1=<hex>`: HMAC-SHA256 of `<t>.<raw body>`, keyed with the Project’s signing secret. */
        'nibify-signature': string;
        /** @description The event’s `id`, the same on every retry of it. */
        'nibify-event-id': string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['MessageExpiredEvent'];
      };
    };
    responses: {
      /** @description Received. Any other answer is retried. */
      '2XX': {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  messageDismissed: {
    parameters: {
      query?: never;
      header: {
        /** @description `t=<unix seconds>,v1=<hex>`: HMAC-SHA256 of `<t>.<raw body>`, keyed with the Project’s signing secret. */
        'nibify-signature': string;
        /** @description The event’s `id`, the same on every retry of it. */
        'nibify-event-id': string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['MessageDismissedEvent'];
      };
    };
    responses: {
      /** @description Received. Any other answer is retried. */
      '2XX': {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  messageCancelled: {
    parameters: {
      query?: never;
      header: {
        /** @description `t=<unix seconds>,v1=<hex>`: HMAC-SHA256 of `<t>.<raw body>`, keyed with the Project’s signing secret. */
        'nibify-signature': string;
        /** @description The event’s `id`, the same on every retry of it. */
        'nibify-event-id': string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['MessageCancelledEvent'];
      };
    };
    responses: {
      /** @description Received. Any other answer is retried. */
      '2XX': {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
}
export interface events {
  'message.delivered': components['schemas']['MessageDeliveredEvent'];
  'message.read': components['schemas']['MessageReadEvent'];
  'message.answered': components['schemas']['MessageAnsweredEvent'];
  'message.expired': components['schemas']['MessageExpiredEvent'];
  'message.dismissed': components['schemas']['MessageDismissedEvent'];
  'message.cancelled': components['schemas']['MessageCancelledEvent'];
}
