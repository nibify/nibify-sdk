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
     * @description Every conversation this key can see, the one that last spoke first. Metadata only: `lastMessage` is the notification block of the newest Message, never anything read out of a surface. One-shot Requests are Threads of one and are listed too — their `threadKey` is null. The list is scoped to the half of the Project the key belongs to: a `sk_test_…` never sees a live conversation.
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
      /** @description The event’s id, the same on every retry of it: deduplicate on it. */
      id: string;
      /**
       * @description Which of the six events this is.
       * @enum {string}
       */
      type: 'message.cancelled';
      /**
       * Format: date-time
       * @description When the event happened.
       */
      createdAt: string;
      /** @description The Request, as it ended. */
      data: {
        /** @description The Request this event is about. */
        requestId: string;
        /**
         * @description The terminal state the Request reached.
         * @enum {string}
         */
        status: 'cancelled';
        /**
         * @description The Environment the Message was sent into.
         * @enum {string}
         */
        environment: 'test' | 'live';
        /**
         * @description Only an answered Request has a Response.
         * @enum {string|null}
         */
        response: null;
      };
    };
    MessageDismissedEvent: {
      /** @description The event’s id, the same on every retry of it: deduplicate on it. */
      id: string;
      /**
       * @description Which of the six events this is.
       * @enum {string}
       */
      type: 'message.dismissed';
      /**
       * Format: date-time
       * @description When the event happened.
       */
      createdAt: string;
      /** @description The Request, as it ended. */
      data: {
        /** @description The Request this event is about. */
        requestId: string;
        /**
         * @description The terminal state the Request reached.
         * @enum {string}
         */
        status: 'dismissed';
        /**
         * @description The Environment the Message was sent into.
         * @enum {string}
         */
        environment: 'test' | 'live';
        /**
         * @description Only an answered Request has a Response.
         * @enum {string|null}
         */
        response: null;
      };
    };
    MessageExpiredEvent: {
      /** @description The event’s id, the same on every retry of it: deduplicate on it. */
      id: string;
      /**
       * @description Which of the six events this is.
       * @enum {string}
       */
      type: 'message.expired';
      /**
       * Format: date-time
       * @description When the event happened.
       */
      createdAt: string;
      /** @description The Request, as it ended. */
      data: {
        /** @description The Request this event is about. */
        requestId: string;
        /**
         * @description The terminal state the Request reached.
         * @enum {string}
         */
        status: 'expired';
        /**
         * @description The Environment the Message was sent into.
         * @enum {string}
         */
        environment: 'test' | 'live';
        /**
         * @description Only an answered Request has a Response.
         * @enum {string|null}
         */
        response: null;
      };
    };
    MessageAnsweredEvent: {
      /** @description The event’s id, the same on every retry of it: deduplicate on it. */
      id: string;
      /**
       * @description Which of the six events this is.
       * @enum {string}
       */
      type: 'message.answered';
      /**
       * Format: date-time
       * @description When the event happened.
       */
      createdAt: string;
      /** @description The Request, as it ended. */
      data: {
        /** @description The Request this event is about. */
        requestId: string;
        /**
         * @description The terminal state the Request reached.
         * @enum {string}
         */
        status: 'answered';
        /**
         * @description The Environment the Message was sent into.
         * @enum {string}
         */
        environment: 'test' | 'live';
        response: components['schemas']['WebhookResponse'];
      };
    };
    /** @description The person’s answer. */
    WebhookResponse: {
      /** @description The Response’s id. */
      responseId: string;
      /** @description The action the person chose. */
      actionName: string;
      /** @description The `id` of the component the person answered with, or `notification` for a quick action on the push. */
      sourceComponentId: string;
      /** @description The values the action sent back, or null when it sent none. */
      context: {
        [key: string]: unknown;
      } | null;
      /**
       * Format: date-time
       * @description When the person answered, by the phone’s clock.
       */
      clientTimestamp: string;
      /**
       * Format: date-time
       * @description When the answer reached Nibify.
       */
      answeredAt: string;
    };
    MessageReadEvent: {
      /** @description The event’s id, the same on every retry of it: deduplicate on it. */
      id: string;
      /**
       * @description Which of the six events this is.
       * @enum {string}
       */
      type: 'message.read';
      /**
       * Format: date-time
       * @description When the event happened.
       */
      createdAt: string;
      /** @description The Message, and its two receipts. */
      data: {
        /** @description The Message this event is about. For a Request, the same as its `requestId`. */
        messageId: string;
        /**
         * @description The Environment the Message was sent into.
         * @enum {string}
         */
        environment: 'test' | 'live';
        /**
         * @description The Request’s status as it stands, or null for a Notification, which has none.
         * @enum {string|null}
         */
        status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled' | null;
        /**
         * Format: date-time
         * @description When a phone of the recipient first confirmed the push arrived.
         */
        deliveredAt: string;
        /**
         * Format: date-time
         * @description When the person first opened the Message.
         */
        readAt: string;
      };
    };
    MessageDeliveredEvent: {
      /** @description The event’s id, the same on every retry of it: deduplicate on it. */
      id: string;
      /**
       * @description Which of the six events this is.
       * @enum {string}
       */
      type: 'message.delivered';
      /**
       * Format: date-time
       * @description When the event happened.
       */
      createdAt: string;
      /** @description The Message, and its two receipts. */
      data: {
        /** @description The Message this event is about. For a Request, the same as its `requestId`. */
        messageId: string;
        /**
         * @description The Environment the Message was sent into.
         * @enum {string}
         */
        environment: 'test' | 'live';
        /**
         * @description The Request’s status as it stands, or null for a Notification, which has none.
         * @enum {string|null}
         */
        status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled' | null;
        /**
         * Format: date-time
         * @description When a phone of the recipient first confirmed the push arrived.
         */
        deliveredAt: string;
        /**
         * @description Not read yet: `message.read` says when it is.
         * @enum {string|null}
         */
        readAt: null;
      };
    };
    ApiErrorDto: {
      /** @description What went wrong. */
      error: {
        /**
         * @description What went wrong, for a program to branch on.
         * @enum {string}
         */
        code:
          | 'malformed_request'
          | 'invalid_reset_token'
          | 'unauthorized'
          | 'api_key_revoked'
          | 'session_revoked'
          | 'session_not_a_device'
          | 'invalid_credentials'
          | 'origin_not_allowed'
          | 'submission_rejected'
          | 'not_found'
          | 'request_not_found'
          | 'message_not_found'
          | 'thread_not_found'
          | 'project_not_found'
          | 'api_key_not_found'
          | 'device_not_found'
          | 'webhook_endpoint_not_found'
          | 'method_not_allowed'
          | 'email_taken'
          | 'project_limit_reached'
          | 'last_project'
          | 'webhook_endpoint_duplicate'
          | 'request_already_answered'
          | 'request_already_expired'
          | 'request_already_dismissed'
          | 'request_already_cancelled'
          | 'payload_too_large'
          | 'unsupported_media_type'
          | 'invalid_request_body'
          | 'idempotency_conflict'
          | 'callback_url_invalid'
          | 'surface_invalid'
          | 'webhook_url_invalid'
          | 'rate_limited'
          | 'request_rejected'
          | 'internal_error';
        /** @description What went wrong, in a sentence for a person reading a log. */
        message: string;
        /** @description One entry for each problem found in what you sent, when the error can point at it. */
        details?: {
          /** @description Where the problem is, as a dotted path into what you sent: `notification.title`. */
          pointer: string;
          /** @description What is wrong there. */
          message: string;
          /** @description The `id` of the Surface component at fault, when the problem is inside a Surface. */
          component?: string;
          /** @description The property of that component at fault, when there is one. */
          property?: string;
        }[];
      };
    };
    /** @description A Thread, and one page of its Messages. */
    ThreadHistory_Output: {
      /** @description The Thread’s id. */
      threadId: string;
      /** @description The key the Thread was named with, or null for a one-shot Request’s own. */
      threadKey: string | null;
      /**
       * @description The Environment the Thread belongs to.
       * @enum {string}
       */
      environment: 'test' | 'live';
      /** @description How many Messages the Thread holds. */
      messageCount: number;
      /**
       * Format: date-time
       * @description When the Thread was created, by its first Message.
       */
      createdAt: string;
      lastMessage: components['schemas']['ThreadMessage_Output'];
      /** @description One page of the Thread’s Messages, oldest first. */
      messages: {
        /** @description The Messages of this page, oldest first. */
        items: components['schemas']['ThreadMessage_Output'][];
        /** @description The `after` of the next page, or null when this page reached the end of the Thread. */
        nextAfter: number | null;
      };
    };
    /** @description A Message of a Thread: what the push said and its receipts, never its Surface. */
    ThreadMessage_Output: {
      /** @description The Message’s id. For a Request, the same as its `requestId`. */
      messageId: string;
      /** @description The Message’s position in its Thread, starting at 1. */
      sequence: number;
      /**
       * @description What the Message asks for: `informational` nothing, `action` an answer, `conversation` the next turn of the exchange.
       * @enum {string}
       */
      interactionType: 'informational' | 'action' | 'conversation';
      /**
       * @description The Request’s status, or null for a Notification, which has none.
       * @enum {string|null}
       */
      status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled' | null;
      /** @description Who the Message was sent as. */
      sender: {
        /** @description The name the person sees. */
        name: string;
        /** @description The icon it was sent with, or null. */
        icon: string | null;
      };
      /** @description What the push said. Empty once the person has deleted the content. */
      notification: {
        /** @description The title of the push and of its Inbox row. */
        title: string;
        /** @description The text of the push and of its Inbox row. */
        body: string;
        /** @description The buttons on the push, empty when it had none. */
        quickActions: {
          /** @description The action the button dispatches. */
          name: string;
          /** @description The button’s text on the notification. */
          label: string;
        }[];
      };
      /** @description The lowest catalog version that can draw its Surface. Null when it has none, or once the content is deleted. */
      minCatalogVersion: number | null;
      /**
       * Format: date-time
       * @description When the Message was sent.
       */
      createdAt: string;
      /**
       * Format: date-time
       * @description When the Request expires, or null if it never does.
       */
      expiresAt: string | null;
      /**
       * Format: date-time
       * @description When a phone of the recipient first confirmed the push arrived. Null means not confirmed yet, not that it was not sent.
       */
      deliveredAt: string | null;
      /**
       * Format: date-time
       * @description When the person first opened it, or null. Never set while `deliveredAt` is not.
       */
      readAt: string | null;
      /**
       * Format: date-time
       * @description When the person deleted what was said in this Message, or null. The Message stays in the Thread, emptied.
       */
      contentDeletedAt: string | null;
    };
    ThreadPageDto_Output: {
      /** @description The Threads of this page, the one that last spoke first. */
      items: components['schemas']['Thread_Output'][];
      /** @description The `cursor` of the next page, or null on the last one. */
      nextCursor: string | null;
    };
    /** @description A conversation, and the newest Message in it. */
    Thread_Output: {
      /** @description The Thread’s id. */
      threadId: string;
      /** @description The key the Thread was named with, or null for a one-shot Request’s own. */
      threadKey: string | null;
      /**
       * @description The Environment the Thread belongs to.
       * @enum {string}
       */
      environment: 'test' | 'live';
      /** @description How many Messages the Thread holds. */
      messageCount: number;
      /**
       * Format: date-time
       * @description When the Thread was created, by its first Message.
       */
      createdAt: string;
      lastMessage: components['schemas']['ThreadMessage_Output'];
    };
    NotificationCreatedDto: {
      /** @description The Notification’s id, as the `message.delivered` and `message.read` events name it. */
      messageId: string;
      /** @description The Thread the Notification joined. */
      threadId: string;
      /** @description The Notification’s position in its Thread, starting at 1. */
      sequence: number;
      /**
       * @description A Notification asks for nothing, in a Thread or out of one.
       * @enum {string}
       */
      interactionType: 'informational';
      /**
       * Format: date-time
       * @description When the Notification was created.
       */
      createdAt: string;
      /**
       * @description The Environment of the API key that created it.
       * @enum {string}
       */
      environment: 'test' | 'live';
      /** @description The lowest catalog version that can draw the Surface, worked out by the server. Null when there is no Surface. */
      minCatalogVersion: number | null;
      /** @description What did not stop the Message but changes how it is shown: `catalog_version_too_low` when no installed app can draw the Surface. */
      warnings: {
        /**
         * @description What the warning is about, for a program to branch on.
         * @enum {string}
         */
        code: 'catalog_version_too_low';
        /** @description The same warning, in a sentence for a person. */
        message: string;
      }[];
    };
    CreateNotificationDto: {
      /** @description Who the person sees the Notification as coming from. */
      sender: {
        /** @description The name the person sees, free text. */
        name: string;
        /** @description An icon for the sender, free text, kept and returned as sent. */
        icon?: string;
      };
      /** @description What the push says. */
      notification: {
        /** @description The title of the push and of its Inbox row. */
        title: string;
        /** @description The text of the push and of its Inbox row. */
        body: string;
      };
      /**
       * @description How loudly the Notification announces itself: `low` only in the Inbox, `normal` with a push, `high` with a push that may break through the person’s quiet hours.
       * @default normal
       * @enum {string}
       */
      priority?: 'low' | 'normal' | 'high';
      /** @description UI shown when the person opens the Notification, checked against the catalog. It may not dispatch an action: a Surface that asks for an answer is a Request. */
      surface?: {
        /** @description The `id` of the component the Surface is drawn from: always `root`, and one of `components` must carry it. */
        root: string;
        /** @description The flat JSON state the components bind to by JSON Pointer, and the source of the values an action sends back. */
        dataModel: {
          [key: string]: unknown;
        };
        /** @description The components, as a flat list, each one checked against the catalog. */
        components: {
          [key: string]: unknown;
        }[];
      };
      /** @description Your name for a conversation: the Notification joins the Thread with this key, and asks for nothing there either. Without it, the Notification is a Thread of its own. */
      threadKey?: string;
    };
    /** @description A Request as it stands now, with the Response once it has one. */
    RequestOutcomeDto_Output: {
      /** @description The Request’s id. */
      requestId: string;
      /**
       * @description Where the Request is: `pending` until it reaches one of the four terminal states.
       * @enum {string}
       */
      status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled';
      /**
       * Format: date-time
       * @description When the Request was created.
       */
      createdAt: string;
      /**
       * Format: date-time
       * @description When the Request expires, or null if it never does.
       */
      expiresAt: string | null;
      /**
       * @description The Environment of the API key that created it.
       * @enum {string}
       */
      environment: 'test' | 'live';
      /**
       * Format: date-time
       * @description When a phone of the recipient first confirmed the push arrived. Null means not confirmed yet, not that it was not sent.
       */
      deliveredAt: string | null;
      /**
       * Format: date-time
       * @description When the person first opened it, or null. Never set while `deliveredAt` is not.
       */
      readAt: string | null;
      /**
       * Format: date-time
       * @description When the person deleted what was said in this Request, or null. From then on `response.context` is null.
       */
      contentDeletedAt: string | null;
      /** @description The person’s answer: present exactly when `status` is `answered`. */
      response: {
        /** @description The Response’s id. */
        responseId: string;
        /** @description The action the person chose. */
        actionName: string;
        /** @description The `id` of the component the person answered with, or `notification` for a quick action on the push. */
        sourceComponentId: string;
        /** @description The values the action sent back, or null when it sent none or the person has since deleted the content. */
        context: {
          [key: string]: unknown;
        } | null;
        /**
         * Format: date-time
         * @description When the person answered, by the phone’s clock.
         */
        clientTimestamp: string;
        /**
         * Format: date-time
         * @description When the answer reached Nibify.
         */
        answeredAt: string;
      } | null;
    };
    SettledRequestDto_Output: {
      /** @description The Request’s id. */
      requestId: string;
      /**
       * @description The terminal state the Request is in.
       * @enum {string}
       */
      status: 'answered' | 'expired' | 'dismissed' | 'cancelled';
      /**
       * Format: date-time
       * @description When the Request was created.
       */
      createdAt: string;
      /**
       * Format: date-time
       * @description When the Request expires, or null if it never does.
       */
      expiresAt: string | null;
      /**
       * @description The Environment of the API key that created it.
       * @enum {string}
       */
      environment: 'test' | 'live';
      /**
       * Format: date-time
       * @description When a phone of the recipient first confirmed the push arrived. Null means not confirmed yet, not that it was not sent.
       */
      deliveredAt: string | null;
      /**
       * Format: date-time
       * @description When the person first opened it, or null. Never set while `deliveredAt` is not.
       */
      readAt: string | null;
      /**
       * Format: date-time
       * @description When the person deleted what was said in this Request, or null. From then on `response.context` is null.
       */
      contentDeletedAt: string | null;
      /** @description The person’s answer: present exactly when `status` is `answered`. */
      response: {
        /** @description The Response’s id. */
        responseId: string;
        /** @description The action the person chose. */
        actionName: string;
        /** @description The `id` of the component the person answered with, or `notification` for a quick action on the push. */
        sourceComponentId: string;
        /** @description The values the action sent back, or null when it sent none or the person has since deleted the content. */
        context: {
          [key: string]: unknown;
        } | null;
        /**
         * Format: date-time
         * @description When the person answered, by the phone’s clock.
         */
        clientTimestamp: string;
        /**
         * Format: date-time
         * @description When the answer reached Nibify.
         */
        answeredAt: string;
      } | null;
    };
    RequestCreatedDto: {
      /** @description The Request’s id: read it, wait for it, withdraw it or nudge it by this. */
      requestId: string;
      /** @description The Thread the Request joined. */
      threadId: string;
      /** @description The Request’s position in its Thread, starting at 1. */
      sequence: number;
      /**
       * @description Inferred, never sent: `conversation` when the Request joined a Thread that already had Messages, `action` otherwise.
       * @enum {string}
       */
      interactionType: 'action' | 'conversation';
      /**
       * @description The status the Request has now. On an idempotent replay, whatever the original has become since.
       * @enum {string}
       */
      status: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled';
      /**
       * Format: date-time
       * @description When the Request was created.
       */
      createdAt: string;
      /**
       * Format: date-time
       * @description When the Request expires, or null if it never does.
       */
      expiresAt: string | null;
      /**
       * @description The Environment of the API key that created it.
       * @enum {string}
       */
      environment: 'test' | 'live';
      /** @description The lowest catalog version that can draw the Surface, worked out by the server. Null when there is no Surface. */
      minCatalogVersion: number | null;
      /** @description What did not stop the Message but changes how it is shown: `catalog_version_too_low` when no installed app can draw the Surface. */
      warnings: {
        /**
         * @description What the warning is about, for a program to branch on.
         * @enum {string}
         */
        code: 'catalog_version_too_low';
        /** @description The same warning, in a sentence for a person. */
        message: string;
      }[];
    };
    CreateRequestDto: {
      /** @description Who the person sees the Request as coming from. */
      sender: {
        /** @description The name the person sees, free text. */
        name: string;
        /** @description An icon for the sender, free text, kept and returned as sent. */
        icon?: string;
      };
      /** @description What the push says, and the buttons it offers. */
      notification: {
        /** @description The title of the push and of its Inbox row. */
        title: string;
        /** @description The text of the push and of its Inbox row. */
        body: string;
        /** @description Buttons on the push itself, answerable from the lock screen. */
        quickActions?: {
          /** @description The action the button dispatches, and the `actionName` of the Response it produces. With a `surface`, it must be an action the Surface dispatches. */
          name: string;
          /** @description The button’s text on the notification. */
          label: string;
        }[];
      };
      /**
       * @description How loudly the Request announces itself: `low` only in the Inbox, `normal` with a push, `high` with a push that may break through the person’s quiet hours.
       * @default normal
       * @enum {string}
       */
      priority?: 'low' | 'normal' | 'high';
      /** @description Your name for a conversation: Requests sent with the same key join one Thread. Without it, the Request is a Thread of its own. */
      threadKey?: string;
      /** @description The interactive UI the person answers in, checked against the catalog. Without it, the push and its `quickActions` are the whole Request. */
      surface?: {
        /** @description The `id` of the component the Surface is drawn from: always `root`, and one of `components` must carry it. */
        root: string;
        /** @description The flat JSON state the components bind to by JSON Pointer, and the source of the values an action sends back. */
        dataModel: {
          [key: string]: unknown;
        };
        /** @description The components, as a flat list, each one checked against the catalog. */
        components: {
          [key: string]: unknown;
        }[];
      };
      /**
       * Format: date-time
       * @description When the Request expires if nobody has answered it, in the future. Without it, the Request waits indefinitely.
       */
      expiresAt?: string;
      /**
       * Format: uri
       * @description A public `https` URL called once, with a signed `POST`, when the Request reaches a terminal state.
       */
      callbackUrl?: string;
    };
    RequestPageDto_Output: {
      /** @description The Requests of this page, newest first. */
      items: components['schemas']['RequestOutcomeDto_Output'][];
      /** @description The `cursor` of the next page, or null on the last one. */
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
        /** @description Only the Requests in this status. */
        status?: 'pending' | 'answered' | 'expired' | 'dismissed' | 'cancelled';
        /** @description Only the Requests of the Thread with this key. */
        threadKey?: string;
        /** @description Only the Requests created after this instant, not at it. */
        createdAfter?: string;
        /** @description Only the Requests created before this instant, not at it. */
        createdBefore?: string;
        /** @description How many Requests a page holds. */
        limit?: number;
        /** @description The `nextCursor` of the previous page. Omit it for the first page. */
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
        /** @description How many seconds to hold the connection open for a terminal state. `0` answers at once. */
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
        /** @description How many Threads a page holds. */
        limit?: number;
        /** @description The `nextCursor` of the previous page. Omit it for the first page. */
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
        /** @description The `sequence` of the last Message you hold: the page starts after it. `0` reads from the beginning. */
        after?: number;
        /** @description How many Messages a page holds. */
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
