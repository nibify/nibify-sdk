import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { composeSimple, parseSurface } from '../nodes/Nibify/surface.ts';

const BUTTONS = [
  { label: 'Reject', action: 'reject', style: 'default' as const },
  { label: 'Approve', action: 'approve', style: 'primary' as const },
];

type Component = { id: string; component: string; [key: string]: unknown };

describe('composeSimple', () => {
  test('a title, a text and buttons become a Card with one Button per action', () => {
    const { surface, quickActions } = composeSimple({
      title: 'Send 3 outreach emails?',
      text: 'The agent drafted **3 emails**.',
      buttons: BUTTONS,
    });
    const components = surface.components as Component[];
    const byId = new Map(components.map((c) => [c.id, c]));

    assert.equal(surface.root, 'root');
    assert.equal(byId.get('root')?.component, 'Card');
    assert.equal(new Set(components.map((c) => c.id)).size, components.length, 'unique ids');
    for (const c of components) {
      for (const ref of [c['child'], ...((c['children'] as string[] | undefined) ?? [])]) {
        if (ref !== undefined) assert.ok(byId.has(ref as string), `${c.id} → ${String(ref)}`);
      }
    }

    const buttons = components.filter((c) => c.component === 'Button');
    assert.deepEqual(
      buttons.map((b) => [b['variant'], (b['action'] as { event: { name: string } }).event.name]),
      [
        ['default', 'reject'],
        ['primary', 'approve'],
      ],
    );
    assert.deepEqual(
      buttons.map((b) => byId.get(b['child'] as string)?.['text']),
      ['Reject', 'Approve'],
    );
    assert.deepEqual(quickActions, [
      { name: 'reject', label: 'Reject' },
      { name: 'approve', label: 'Approve' },
    ]);
  });

  test('an empty text leaves no empty Text behind', () => {
    const { surface } = composeSimple({ title: 'Go?', text: '  ', buttons: BUTTONS });
    assert.ok(!(surface.components as Component[]).some((c) => c.id === 'text'));
  });

  test('refuses what the API would refuse later, with the reason', () => {
    assert.throws(() => composeSimple({ title: ' ', text: '', buttons: BUTTONS }), /title/);
    assert.throws(() => composeSimple({ title: 'Go?', text: '', buttons: [] }), /one button/);
    assert.throws(
      () =>
        composeSimple({
          title: 'Go?',
          text: '',
          buttons: [BUTTONS[0]!, { ...BUTTONS[1]!, action: 'reject' }],
        }),
      /share the action name "reject"/,
    );
  });
});

describe('parseSurface', () => {
  test('takes a JSON string or an object', () => {
    const surface = { root: 'root', dataModel: {}, components: [] };
    assert.deepEqual(parseSurface(JSON.stringify(surface)), surface);
    assert.deepEqual(parseSurface(surface), surface);
  });

  test('refuses what is not an A2UI surface', () => {
    assert.throws(() => parseSurface('{not json'), /must be JSON/);
    assert.throws(() => parseSurface({ root: 'root' }), /components/);
  });
});
