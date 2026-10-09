import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  deriveMinCatalogVersion,
  catalogVersion,
  UnknownComponentError,
} from '../src/min-catalog-version.mjs';
import {
  A2UI_VERSION,
  createValidator,
  definesComponent,
  requiredPropertiesOf,
  toA2uiMessages,
  validateSurface,
} from '../src/validator.mjs';

const read = (relative) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8'));

const catalog = read('../catalog.json');

const surfaceExample = read('../examples/approve-reject.surface.json');
const messagesExample = read('../examples/approve-reject.a2ui.json');
const actionExample = read('../examples/approve-reject.action.json');

const SURFACE_ID = 'msg_01HXYZ';

const componentsOf = (components) => ({
  version: A2UI_VERSION,
  updateComponents: { surfaceId: SURFACE_ID, components },
});

// The specification of `src/validator.mjs`.
let validate;
before(() => {
  validate = createValidator();
});

describe('catalog identity', () => {
  it('is published under its immutable URL, and $id matches catalogId', () => {
    assert.equal(catalog.catalogId, 'https://nibify.app/catalogs/nibify/v1/catalog.json');
    assert.equal(catalog.$id, catalog.catalogId);
  });

  it('defines exactly the v1 set — 14 components, and no Form', () => {
    assert.deepEqual(Object.keys(catalog.components).sort(), [
      'Button',
      'Card',
      'CheckBox',
      'ChoicePicker',
      'Column',
      'DateTimeInput',
      'Divider',
      'Icon',
      'Image',
      'List',
      'Row',
      'Slider',
      'Text',
      'TextField',
    ]);
  });

  it('lists every component in anyComponent, which is what the wire schema resolves', () => {
    const referenced = catalog.$defs.anyComponent.oneOf.map((branch) =>
      branch.$ref.replace('#/components/', ''),
    );
    assert.deepEqual(referenced.sort(), Object.keys(catalog.components).sort());
  });
});

describe('the PRD §6.1 approve/reject example', () => {
  it('validates as an A2UI message sequence', () => {
    for (const message of messagesExample.messages) {
      assert.ok(
        validate.agentToApp(message),
        `message ${Object.keys(message).join('+')}: ${JSON.stringify(validate.agentToApp.errors)}`,
      );
    }
  });

  it('is the expansion of the persisted surface — the two examples cannot drift', () => {
    assert.deepEqual(messagesExample.messages, toA2uiMessages(surfaceExample, SURFACE_ID));
  });

  it('needs catalogVersion 1', () => {
    assert.equal(deriveMinCatalogVersion(surfaceExample.components, catalog), 1);
  });

  it('answers with an A2UI action message, verbatim', () => {
    for (const message of actionExample.messages) {
      assert.ok(
        validate.appToAgent(message),
        `action: ${JSON.stringify(validate.appToAgent.errors)}`,
      );
    }
  });
});

describe('a surface outside the v1 set is rejected', () => {
  it('rejects an A2UI component we did not select (Tabs)', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([
          {
            id: 'root',
            component: 'Tabs',
            tabs: [{ title: 'One', child: 'body' }],
          },
          { id: 'body', component: 'Text', text: 'Hello' },
        ]),
      ),
    );
  });

  it('rejects a component that exists nowhere (Form is a pattern, not a component)', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([
          { id: 'root', component: 'Form', children: ['name'] },
          { id: 'name', component: 'TextField', label: 'Name' },
        ]),
      ),
    );
  });

  it('rejects a prop value outside its enum', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([{ id: 'root', component: 'Text', text: 'Hi', variant: 'h9' }]),
      ),
    );
  });

  it('rejects a component missing a required prop', () => {
    assert.ok(!validate.agentToApp(componentsOf([{ id: 'root', component: 'Text' }])));
  });

  it('rejects an unknown prop', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([{ id: 'root', component: 'Text', text: 'Hi', colour: 'red' }]),
      ),
    );
  });

  it('rejects a component without an id', () => {
    assert.ok(!validate.agentToApp(componentsOf([{ component: 'Text', text: 'Hi' }])));
  });

  it('rejects checks: client-side validation is not in v1', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([
          {
            id: 'root',
            component: 'TextField',
            label: 'Name',
            checks: [{ condition: { path: '/valid' }, message: 'Required' }],
          },
        ]),
      ),
    );
  });

  it('rejects a function call: v1 defines no catalog functions', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([
          {
            id: 'root',
            component: 'Text',
            text: { call: 'formatString', args: { value: 'Hello ${/name}' } },
          },
        ]),
      ),
    );
  });
});

describe('a surface inside the v1 set is accepted', () => {
  it('accepts every component of the set at least once', () => {
    const components = [
      { id: 'root', component: 'Column', children: ['card', 'list', 'divider', 'inputs'] },
      { id: 'card', component: 'Card', child: 'header' },
      { id: 'header', component: 'Row', children: ['icon', 'image', 'title'], align: 'center' },
      { id: 'icon', component: 'Icon', name: 'notifications' },
      { id: 'image', component: 'Image', url: 'https://example.com/a.png', variant: 'avatar' },
      { id: 'title', component: 'Text', text: 'Title', variant: 'h3', weight: 1 },
      { id: 'list', component: 'List', children: { path: '/items', componentId: 'row-tpl' } },
      { id: 'row-tpl', component: 'Text', text: { path: 'label' } },
      { id: 'divider', component: 'Divider', axis: 'horizontal' },
      {
        id: 'inputs',
        component: 'Column',
        children: ['field', 'check', 'pick', 'slide', 'when', 'submit'],
      },
      { id: 'field', component: 'TextField', label: 'Name', value: { path: '/name' } },
      { id: 'check', component: 'CheckBox', label: 'Agree', value: { path: '/agree' } },
      {
        id: 'pick',
        component: 'ChoicePicker',
        options: [{ label: 'A', value: 'a' }],
        value: { path: '/picked' },
        variant: 'multipleSelection',
        displayStyle: 'chips',
      },
      { id: 'slide', component: 'Slider', value: { path: '/amount' }, max: 10, min: 0 },
      { id: 'when', component: 'DateTimeInput', value: { path: '/when' }, enableDate: true },
      {
        id: 'submit',
        component: 'Button',
        child: 'submit-lbl',
        action: { event: { name: 'submit', context: { name: { path: '/name' } } } },
      },
      { id: 'submit-lbl', component: 'Text', text: 'Send' },
    ];

    assert.ok(
      validate.agentToApp(componentsOf(components)),
      JSON.stringify(validate.agentToApp.errors),
    );
    assert.equal(deriveMinCatalogVersion(components, catalog), 1);
  });
});

describe('what the catalog says about a component', () => {
  it('knows which components it defines', () => {
    assert.equal(definesComponent('Button'), true);
    assert.equal(definesComponent('Form'), false);
  });

  it('lists what a component requires, so a consumer can drop the other branches', () => {
    assert.deepEqual(requiredPropertiesOf('Button').sort(), ['action', 'child', 'component']);
    assert.deepEqual(requiredPropertiesOf('Text').sort(), ['component', 'text']);
    assert.deepEqual(requiredPropertiesOf('Form'), []);
  });
});

describe('validating a whole surface', () => {
  it('accepts the approve/reject example', () => {
    assert.deepEqual(validateSurface(validate, surfaceExample, SURFACE_ID), {
      valid: true,
      errors: [],
      issues: [],
    });
  });

  it('reports a readable error rather than just a boolean', () => {
    const invalid = {
      ...surfaceExample,
      components: [...surfaceExample.components, { id: 'oops', component: 'Form' }],
    };

    const result = validateSurface(validate, invalid, SURFACE_ID);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
    assert.ok(
      result.errors.every((error) => typeof error === 'string' && error.length > 0),
      JSON.stringify(result.errors),
    );
  });

  it('does not constrain the data model — A2UI leaves `value` untyped', () => {
    // A2UI leaves `updateDataModel.value` untyped, so a malformed data model is
    // the envelope schema's to reject, never Ajv's (README § Using it).
    const scalarDataModel = { ...surfaceExample, dataModel: 'not an object' };

    assert.equal(validateSurface(validate, scalarDataModel, SURFACE_ID).valid, true);
  });
});

describe('deriving the catalog version', () => {
  it('reads the version off the catalog rather than a declared number', () => {
    assert.equal(catalogVersion(catalog), 1);
  });

  it('takes the highest version among the components used', () => {
    const future = structuredClone(catalog);
    future.components.Slider.metadata.extensions.nibify.since = 2;

    assert.equal(deriveMinCatalogVersion([{ component: 'Text', text: 'Hi' }], future), 1);
    assert.equal(
      deriveMinCatalogVersion(
        [
          { component: 'Text', text: 'Hi' },
          { component: 'Slider', value: 1, max: 10 },
        ],
        future,
      ),
      2,
    );
    assert.equal(catalogVersion(future), 2);
  });

  it('counts a prop added after the component only when the prop is used', () => {
    const future = structuredClone(catalog);
    future.components.Slider.metadata.extensions.nibify.propsSince = { steps: 3 };

    assert.equal(deriveMinCatalogVersion([{ component: 'Slider', value: 1, max: 10 }], future), 1);
    assert.equal(
      deriveMinCatalogVersion([{ component: 'Slider', value: 1, max: 10, steps: 4 }], future),
      3,
    );
    assert.equal(catalogVersion(future), 3);
  });

  it('counts an enum value added after the prop only when that value is used', () => {
    const future = structuredClone(catalog);
    future.components.Text.metadata.extensions.nibify.enumSince = { variant: { h6: 4 } };

    assert.equal(
      deriveMinCatalogVersion([{ component: 'Text', text: 'a', variant: 'h1' }], future),
      1,
    );
    assert.equal(
      deriveMinCatalogVersion([{ component: 'Text', text: 'a', variant: 'h6' }], future),
      4,
    );
    assert.equal(catalogVersion(future), 4);
  });

  it('throws on a component outside the catalog: that is a rejected surface, not an old app', () => {
    assert.throws(
      () => deriveMinCatalogVersion([{ component: 'Tabs' }], catalog),
      UnknownComponentError,
    );
  });
});
