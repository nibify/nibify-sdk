import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { apiFailureOf } from '../nodes/Nibify/api-error.ts';
import { callOf } from '../nodes/Nibify/operations.ts';

describe('callOf', () => {
  test('fills the request ID into the path, escaped, under a base URL without its slash', () => {
    assert.deepEqual(callOf('http://localhost:3105/', 'RequestsController_renotify', ' msg_1/x '), {
      method: 'POST',
      url: 'http://localhost:3105/v1/requests/msg_1%2Fx/nudge',
    });
    assert.deepEqual(callOf('https://api.nibify.app', 'RequestsController_cancel', 'msg_1'), {
      method: 'DELETE',
      url: 'https://api.nibify.app/v1/requests/msg_1',
    });
  });

  test('a route without an ID takes none, and a route with one refuses a blank ID', () => {
    assert.equal(
      callOf('https://api.nibify.app', 'NotificationsController_create').url,
      'https://api.nibify.app/v1/notifications',
    );
    assert.throws(() => callOf('https://api.nibify.app', 'RequestsController_cancel', ' '), /ID/);
  });
});

describe('apiFailureOf', () => {
  const failure = {
    code: 'request_already_answered',
    message: 'This Request has already been answered.',
  };

  test("finds the API's error in a NodeApiError's context, or in the axios error it wraps", () => {
    assert.deepEqual(apiFailureOf({ context: { data: { error: failure } } }), failure);
    assert.deepEqual(apiFailureOf({ cause: { response: { data: { error: failure } } } }), failure);
  });

  test('is undefined when the body is not the API error shape', () => {
    assert.equal(apiFailureOf(new Error('ECONNREFUSED')), undefined);
    assert.equal(apiFailureOf({ context: { data: { message: 'Bad Gateway' } } }), undefined);
    assert.equal(apiFailureOf(null), undefined);
  });
});
