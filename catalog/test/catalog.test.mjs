import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import {
  deriveMinCatalogVersion,
  catalogVersion,
  UnknownComponentError,
} from '../src/min-catalog-version.mjs';
import {
  A2UI_VERSION,
  createValidator,
  definesComponent,
  propertiesOf,
  requiredPropertiesOf,
  toA2uiMessages,
  validateSurface,
} from '../src/validator.mjs';

const read = (relative) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8'));

const catalog = read('../catalog.json');
const commonTypes = read('../vendor/a2ui/v1_0/common_types.json');
const catalogDefinition = read('../vendor/a2ui/v1_0/catalog_definition.json');

const surfaceExample = read('../examples/approve-reject.surface.json');
const messagesExample = read('../examples/approve-reject.a2ui.json');
const actionExample = read('../examples/approve-reject.action.json');

const SURFACE_ID = 'msg_01HXYZ';

const componentsOf = (components) => ({
  version: A2UI_VERSION,
  updateComponents: { surfaceId: SURFACE_ID, components },
});

const note = { '@path': '/note' };

// The specification of `src/validator.mjs`.
let validate;
before(() => {
  validate = createValidator();
});

describe('catalog identity', () => {
  it('is published under the v2 URL, and $id matches catalogId', () => {
    assert.equal(catalog.catalogId, 'https://nibify.app/catalogs/nibify/v2/catalog.json');
    assert.equal(catalog.$id, catalog.catalogId);
  });

  it('says it is A2UI 1.0, which an omitted protocolVersion would not', () => {
    assert.equal(catalog.protocolVersion, '1.0');
    assert.equal(A2UI_VERSION, '1.0');
  });

  it('is a catalog by the A2UI 1.0 meta-schema', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    ajv.addSchema(commonTypes);
    const conforms = ajv.compile(catalogDefinition);
    assert.ok(conforms(catalog), JSON.stringify(conforms.errors));
  });

  it('refers only to what A2UI 1.0 lets a catalog refer to', () => {
    const allowed = new Set([
      'ComponentId',
      'Child',
      'ChildList',
      'DynamicString',
      'DynamicNumber',
      'DynamicBoolean',
      'DynamicStringList',
      'DynamicValue',
      'AccessibilityAttributes',
      'CheckRule',
      'Checkable',
      'Action',
      'DataBinding',
      'FunctionCall',
    ]);
    const refs = [];
    const collect = (node) => {
      if (Array.isArray(node)) return node.forEach(collect);
      if (node === null || typeof node !== 'object') return;
      if (typeof node.$ref === 'string') refs.push(node.$ref);
      for (const [key, value] of Object.entries(node)) {
        if (!['metadata', 'const', 'default', 'enum', 'description'].includes(key)) collect(value);
      }
    };
    collect([catalog.components, catalog.functions, catalog.$defs]);

    const offending = refs.filter((ref) => {
      const [, section, name] = ref.match(/^#\/(components|functions|\$defs)\/(.+)$/) ?? [];
      if (section === 'components') return !(name in catalog.components);
      if (section === 'functions') return !(name in catalog.functions);
      if (section === '$defs') return !(name in catalog.$defs) || name.startsWith('any');
      const external = ref.match(/^common_types\.json#\/\$defs\/(.+)$/);
      return !external || !allowed.has(external[1]);
    });
    assert.ok(refs.length > 0);
    assert.deepEqual(offending, []);
  });

  it('defines exactly its 14 components, and no Form', () => {
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

  it('defines two functions, required and regex, and anyFunction lists both', () => {
    assert.deepEqual(Object.keys(catalog.functions).sort(), ['regex', 'required']);
    const referenced = catalog.$defs.anyFunction.oneOf.map((branch) =>
      branch.$ref.replace('#/functions/', ''),
    );
    assert.deepEqual(referenced.sort(), ['regex', 'required']);
  });

  it('carries no theme', () => {
    assert.equal('theme' in catalog.$defs, false);
  });

  it('shows the agent only examples that validate', () => {
    const examples = [...catalog.instructions.matchAll(/```json\n([\s\S]*?)```/g)];
    assert.ok(examples.length > 0);
    for (const [, example] of examples) {
      assert.ok(
        validate.agentToApp(componentsOf(JSON.parse(example))),
        JSON.stringify(validate.agentToApp.errors),
      );
    }
  });
});

describe('the PRD §6.1 approve/reject example', () => {
  it('validates as an A2UI 1.0 message sequence', () => {
    for (const message of messagesExample.messages) {
      assert.equal(message.version, '1.0');
      assert.ok(
        validate.agentToApp(message),
        `message ${Object.keys(message).join('+')}: ${JSON.stringify(validate.agentToApp.errors)}`,
      );
    }
  });

  it('is the expansion of the persisted surface — the two examples cannot drift', () => {
    assert.deepEqual(messagesExample.messages, toA2uiMessages(surfaceExample, SURFACE_ID));
  });

  it('needs catalogVersion 2', () => {
    assert.equal(deriveMinCatalogVersion(surfaceExample.components, catalog), 2);
  });

  it('answers with an A2UI 1.0 action message, verbatim', () => {
    for (const message of actionExample.messages) {
      assert.equal(message.version, '1.0');
      assert.ok(
        validate.appToAgent(message),
        `action: ${JSON.stringify(validate.appToAgent.errors)}`,
      );
    }
  });
});

describe('a v0.9 surface is rejected', () => {
  it('rejects a v0.9 message', () => {
    assert.ok(
      !validate.agentToApp({
        version: 'v0.9',
        updateComponents: {
          surfaceId: SURFACE_ID,
          components: [{ id: 'root', component: 'Text', text: { path: '/note' } }],
        },
      }),
    );
  });

  it('rejects a v0.9 binding inside a 1.0 message: a binding is @path', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([{ id: 'root', component: 'Text', text: { path: '/note' } }]),
      ),
    );
  });

  it('rejects a theme on createSurface', () => {
    assert.ok(
      !validate.agentToApp({
        version: A2UI_VERSION,
        createSurface: { surfaceId: SURFACE_ID, catalogId: catalog.catalogId, theme: {} },
      }),
    );
  });

  it('rejects h4: a heading is Markdown, not a variant', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([{ id: 'root', component: 'Text', text: 'Hi', variant: 'h4' }]),
      ),
    );
  });

  it('rejects validationRegexp: validation is @checks', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([
          {
            id: 'root',
            component: 'TextField',
            label: 'Code',
            value: note,
            validationRegexp: '^[0-9]+$',
          },
        ]),
      ),
    );
  });
});

describe('a surface outside the v2 set is rejected', () => {
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
          { id: 'name', component: 'TextField', label: 'Name', value: note },
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
    assert.ok(
      !validate.agentToApp(componentsOf([{ id: 'root', component: 'TextField', label: 'Name' }])),
    );
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

  it('rejects @checks anywhere but a TextField', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([
          {
            id: 'root',
            component: 'CheckBox',
            label: 'Agree',
            value: { '@path': '/agree' },
            '@checks': [{ condition: { '@path': '/agree' }, message: 'Required' }],
          },
        ]),
      ),
    );
  });

  it('rejects a check calling a function the catalog does not define', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([
          {
            id: 'root',
            component: 'TextField',
            label: 'Email',
            value: note,
            '@checks': [
              { condition: { '@call': 'email', args: { value: note } }, message: 'Not an email' },
            ],
          },
        ]),
      ),
    );
  });

  it('rejects a catalog function outside @checks', () => {
    const regex = { '@call': 'regex', args: { value: note, pattern: '^[0-9]+$' } };
    const outside = [
      [{ id: 'root', component: 'Text', text: regex }],
      [{ id: 'root', component: 'CheckBox', label: 'Agree', value: regex }],
      [{ id: 'root', component: 'Text', text: 'Hi', '@accessibility': { label: regex } }],
      [
        { id: 'root', component: 'Button', child: 'lbl', action: { functionCall: regex } },
        { id: 'lbl', component: 'Text', text: 'Go' },
      ],
      [
        {
          id: 'root',
          component: 'Button',
          child: 'lbl',
          action: { event: { name: 'go', context: { valid: regex } } },
        },
        { id: 'lbl', component: 'Text', text: 'Go' },
      ],
    ];
    for (const components of outside) {
      assert.ok(!validate.agentToApp(componentsOf(components)), JSON.stringify(components[0]));
    }
  });

  it('rejects @index outside @checks, where no function call is taken', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([
          { id: 'root', component: 'List', children: { path: '/items', componentId: 'row' } },
          { id: 'row', component: 'Slider', value: { '@call': '@index' }, max: 10 },
        ]),
      ),
    );
  });

  it('rejects a function call the catalog does not define', () => {
    assert.ok(
      !validate.agentToApp(
        componentsOf([
          {
            id: 'root',
            component: 'Text',
            text: { '@call': 'formatString', args: { value: 'Hello ${/name}' } },
          },
        ]),
      ),
    );
  });
});

describe('a surface inside the v2 set is accepted', () => {
  it('accepts every component of the set at least once', () => {
    const components = [
      { id: 'root', component: 'Column', children: ['card', 'list', 'divider', 'inputs'] },
      { id: 'card', component: 'Card', child: 'header' },
      { id: 'header', component: 'Row', children: ['icon', 'image', 'title'], align: 'center' },
      { id: 'icon', component: 'Icon', name: 'notifications' },
      { id: 'image', component: 'Image', url: 'https://example.com/a.png', variant: 'avatar' },
      { id: 'title', component: 'Text', text: '### Title', weight: 1 },
      { id: 'list', component: 'List', children: { path: '/items', componentId: 'row-tpl' } },
      { id: 'row-tpl', component: 'Text', text: { '@path': 'label' }, variant: 'caption' },
      { id: 'divider', component: 'Divider', axis: 'horizontal' },
      {
        id: 'inputs',
        component: 'Column',
        children: ['field', 'check', 'pick', 'slide', 'when', 'submit'],
      },
      {
        id: 'field',
        component: 'TextField',
        label: 'Name',
        value: { '@path': '/name' },
        '@checks': [
          {
            condition: { '@call': 'required', args: { value: { '@path': '/name' } } },
            message: 'Required',
          },
          {
            condition: {
              '@call': 'regex',
              args: { value: { '@path': '/name' }, pattern: '^[A-Z]' },
            },
            message: 'Capital first',
          },
        ],
      },
      { id: 'check', component: 'CheckBox', label: 'Agree', value: { '@path': '/agree' } },
      {
        id: 'pick',
        component: 'ChoicePicker',
        options: [{ label: 'A', value: 'a' }],
        value: { '@path': '/picked' },
        variant: 'multipleSelection',
        displayStyle: 'chips',
      },
      { id: 'slide', component: 'Slider', value: { '@path': '/amount' }, max: 10, min: 0 },
      { id: 'when', component: 'DateTimeInput', value: { '@path': '/when' }, enableDate: true },
      {
        id: 'submit',
        component: 'Button',
        variant: 'default',
        child: 'submit-lbl',
        action: { event: { name: 'submit', context: { name: { '@path': '/name' } } } },
      },
      { id: 'submit-lbl', component: 'Text', text: 'Send' },
    ];

    assert.ok(
      validate.agentToApp(componentsOf(components)),
      JSON.stringify(validate.agentToApp.errors),
    );
    assert.equal(deriveMinCatalogVersion(components, catalog), 2);
  });

  it('accepts required and regex in the @checks of a TextField', () => {
    assert.ok(
      validate.agentToApp(
        componentsOf([
          {
            id: 'root',
            component: 'TextField',
            label: 'Code',
            value: note,
            '@checks': [
              { condition: { '@call': 'required', args: { value: note } } },
              { condition: { '@call': 'regex', args: { value: note, pattern: '^[0-9]+$' } } },
            ],
          },
        ]),
      ),
      JSON.stringify(validate.agentToApp.errors),
    );
  });

  it('accepts @index inside @checks: the protocol gives it to every catalog', () => {
    assert.ok(
      validate.agentToApp(
        componentsOf([
          { id: 'root', component: 'List', children: { path: '/items', componentId: 'row' } },
          {
            id: 'row',
            component: 'TextField',
            label: 'Code',
            value: { '@path': 'code' },
            '@checks': [
              {
                condition: {
                  '@call': 'regex',
                  args: { value: { '@call': '@index' }, pattern: '^[0-9]+$' },
                },
              },
            ],
          },
        ]),
      ),
      JSON.stringify(validate.agentToApp.errors),
    );
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
    assert.deepEqual(requiredPropertiesOf('TextField').sort(), ['component', 'label', 'value']);
    assert.deepEqual(requiredPropertiesOf('Form'), []);
  });

  it('lists what a component accepts, @checks where it is', () => {
    assert.ok(propertiesOf('TextField').includes('@checks'));
    assert.equal(propertiesOf('Text').includes('@checks'), false);
    assert.deepEqual(propertiesOf('Form'), []);
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
    assert.equal(catalogVersion(catalog), 2);
  });

  it('starts every component of the v2 set at 2', () => {
    for (const definition of Object.values(catalog.components)) {
      assert.equal(definition.metadata.extensions.app_nibify.since, 2);
    }
  });

  it('takes the highest version among the components used', () => {
    const future = structuredClone(catalog);
    future.components.Slider.metadata.extensions.app_nibify.since = 3;

    assert.equal(deriveMinCatalogVersion([{ component: 'Text', text: 'Hi' }], future), 2);
    assert.equal(
      deriveMinCatalogVersion(
        [
          { component: 'Text', text: 'Hi' },
          { component: 'Slider', value: 1, max: 10 },
        ],
        future,
      ),
      3,
    );
    assert.equal(catalogVersion(future), 3);
  });

  it('counts a prop added after the component only when the prop is used', () => {
    const future = structuredClone(catalog);
    future.components.Slider.metadata.extensions.app_nibify.propsSince = { steps: 4 };

    assert.equal(deriveMinCatalogVersion([{ component: 'Slider', value: 1, max: 10 }], future), 2);
    assert.equal(
      deriveMinCatalogVersion([{ component: 'Slider', value: 1, max: 10, steps: 4 }], future),
      4,
    );
    assert.equal(catalogVersion(future), 4);
  });

  it('counts an enum value added after the prop only when that value is used', () => {
    const future = structuredClone(catalog);
    future.components.Text.metadata.extensions.app_nibify.enumSince = { variant: { overline: 5 } };

    assert.equal(
      deriveMinCatalogVersion([{ component: 'Text', text: 'a', variant: 'caption' }], future),
      2,
    );
    assert.equal(
      deriveMinCatalogVersion([{ component: 'Text', text: 'a', variant: 'overline' }], future),
      5,
    );
    assert.equal(catalogVersion(future), 5);
  });

  it('throws on a component outside the catalog: that is a rejected surface, not an old app', () => {
    assert.throws(
      () => deriveMinCatalogVersion([{ component: 'Tabs' }], catalog),
      UnknownComponentError,
    );
  });
});
