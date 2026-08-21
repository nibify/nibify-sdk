// One flat config for the whole workspace. It is copied verbatim into
// nibify/nibify-sdk rather than shared through a published package — see the
// "Forma del monorepo" section of README.md for why.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// The design-system adherence rule, ported from `docs/design/_adherence.oxlintrc.json`
// — the oxlint config that arrived with the design system and that no tool in this repo
// runs. The selectors are the same ones, one by one: ESLint core speaks the same esquery
// syntax, so this is a port and not a rewrite. What changed is the severity, `warn`
// there; what stayed behind are the file's other two rules, because
// `react/forbid-elements` had an empty list and `no-restricted-imports` guarded a folder
// layout that does not exist here.
//
// The first three selectors are the rule itself, and they hold for a line of CSS as much
// as for a component prop: no hex, no px, no font beyond the two. A value is written once
// in tokens.json and arrives as `var(--nb-…)` (ADR-0011).
const ADHERENCE = [
  {
    selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
    message: 'Raw hex color — use a design-system color token via var().',
  },
  {
    selector: 'Literal[value=/\\b\\d+px\\b/]',
    message: 'Raw px value — use a design-system spacing token via var().',
  },
  {
    selector: 'Literal[value=/font-family\\s*:\\s*(?![\'\\"]?(?:Space Grotesk|JetBrains Mono))/i]',
    message: 'Font not provided by the design system. Available: Space Grotesk, JetBrains Mono.',
  },

  // Each component's declared props, taken from its .d.ts: a name that does not
  // exist, or a value outside the enum, fails here instead of on screen.
  {
    selector:
      "JSXOpeningElement[name.name='Avatar'] > JSXAttribute > JSXIdentifier[name!=/^(?:initials|tone|size|key|ref|className|style|children)$/]",
    message: "<Avatar> doesn't accept that prop. Declared props: initials, tone, size.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Avatar'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:quiet|ink|accent)$/]",
    message: "<Avatar> tone must be one of 'quiet' | 'ink' | 'accent'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Button'] > JSXAttribute > JSXIdentifier[name!=/^(?:variant|platform|block|disabled|loading|children|onClick|type|key|ref|className|style|children)$/]",
    message:
      "<Button> doesn't accept that prop. Declared props: variant, platform, block, disabled, loading, children, onClick, type.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='variant'] > Literal[value!=/^(?:primary|secondary|ghost|inverse)$/]",
    message: "<Button> variant must be one of 'primary' | 'secondary' | 'ghost' | 'inverse'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='platform'] > Literal[value!=/^(?:mobile|web)$/]",
    message: "<Button> platform must be one of 'mobile' | 'web'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='type'] > Literal[value!=/^(?:button|submit)$/]",
    message: "<Button> type must be one of 'button' | 'submit'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='ChatBubble'] > JSXAttribute > JSXIdentifier[name!=/^(?:from|children|meta|key|ref|className|style|children)$/]",
    message: "<ChatBubble> doesn't accept that prop. Declared props: from, children, meta.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='ChatBubble'] > JSXAttribute[name.name='from'] > Literal[value!=/^(?:agent|user)$/]",
    message: "<ChatBubble> from must be one of 'agent' | 'user'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='ChatComposer'] > JSXAttribute > JSXIdentifier[name!=/^(?:value|placeholder|onChange|onSend|key|ref|className|style|children)$/]",
    message:
      "<ChatComposer> doesn't accept that prop. Declared props: value, placeholder, onChange, onSend.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='CodeBlock'] > JSXAttribute > JSXIdentifier[name!=/^(?:children|tabs|activeTab|footer|onTab|key|ref|className|style|children)$/]",
    message:
      "<CodeBlock> doesn't accept that prop. Declared props: children, tabs, activeTab, footer, onTab.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='DeliveryChip'] > JSXAttribute > JSXIdentifier[name!=/^(?:step|key|ref|className|style|children)$/]",
    message: "<DeliveryChip> doesn't accept that prop. Declared props: step.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='DeliveryChip'] > JSXAttribute[name.name='step'] > Literal[value!=/^(?:sent|delivered|read|answered)$/]",
    message: "<DeliveryChip> step must be one of 'sent' | 'delivered' | 'read' | 'answered'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='EmptyState'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|hint|key|ref|className|style|children)$/]",
    message: "<EmptyState> doesn't accept that prop. Declared props: label, hint.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='FilterChip'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|active|onClick|key|ref|className|style|children)$/]",
    message: "<FilterChip> doesn't accept that prop. Declared props: label, active, onClick.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='IconButton'] > JSXAttribute > JSXIdentifier[name!=/^(?:variant|size|ariaLabel|children|onClick|key|ref|className|style|children)$/]",
    message:
      "<IconButton> doesn't accept that prop. Declared props: variant, size, ariaLabel, children, onClick.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='IconButton'] > JSXAttribute[name.name='variant'] > Literal[value!=/^(?:primary|secondary)$/]",
    message: "<IconButton> variant must be one of 'primary' | 'secondary'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='InboxRow'] > JSXAttribute > JSXIdentifier[name!=/^(?:agent|time|message|state|tone|onClick|key|ref|className|style|children)$/]",
    message:
      "<InboxRow> doesn't accept that prop. Declared props: agent, time, message, state, tone, onClick.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='InboxRow'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:open|ageing|closed|expired)$/]",
    message: "<InboxRow> tone must be one of 'open' | 'ageing' | 'closed' | 'expired'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Lockup'] > JSXAttribute > JSXIdentifier[name!=/^(?:size|tone|key|ref|className|style|children)$/]",
    message: "<Lockup> doesn't accept that prop. Declared props: size, tone.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Lockup'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:light|dark)$/]",
    message: "<Lockup> tone must be one of 'light' | 'dark'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Mark'] > JSXAttribute > JSXIdentifier[name!=/^(?:size|tone|ball|pulse|title|key|ref|className|style|children)$/]",
    message: "<Mark> doesn't accept that prop. Declared props: size, tone, ball, pulse, title.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Mark'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:light|dark|mono)$/]",
    message: "<Mark> tone must be one of 'light' | 'dark' | 'mono'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Mark'] > JSXAttribute[name.name='ball'] > Literal[value!=/^(?:center|sent|reply|answered|expired)$/]",
    message: "<Mark> ball must be one of 'center' | 'sent' | 'reply' | 'answered' | 'expired'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='MetricCard'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|value|note|tone|key|ref|className|style|children)$/]",
    message: "<MetricCard> doesn't accept that prop. Declared props: label, value, note, tone.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='MetricCard'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:neutral|accent|ageing)$/]",
    message: "<MetricCard> tone must be one of 'neutral' | 'accent' | 'ageing'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='PongLoader'] > JSXAttribute > JSXIdentifier[name!=/^(?:width|tone|label|key|ref|className|style|children)$/]",
    message: "<PongLoader> doesn't accept that prop. Declared props: width, tone, label.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='PongLoader'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:dark|light)$/]",
    message: "<PongLoader> tone must be one of 'dark' | 'light'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='QuickReply'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|tone|onClick|key|ref|className|style|children)$/]",
    message: "<QuickReply> doesn't accept that prop. Declared props: label, tone, onClick.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='QuickReply'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:suggested|neutral)$/]",
    message: "<QuickReply> tone must be one of 'suggested' | 'neutral'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='RadioGroup'] > JSXAttribute > JSXIdentifier[name!=/^(?:name|legend|value|onChange|key|ref|className|style|children)$/]",
    message:
      "<RadioGroup> doesn't accept that prop. Declared props: name, legend, value, onChange.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='RadioOption'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|value|selected|onSelect|key|ref|className|style|children)$/]",
    message:
      "<RadioOption> doesn't accept that prop. Declared props: label, value, selected, onSelect.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='RequestCard'] > JSXAttribute > JSXIdentifier[name!=/^(?:agent|time|state|question|footer|open|children|key|ref|className|style|children)$/]",
    message:
      "<RequestCard> doesn't accept that prop. Declared props: agent, time, state, question, footer, open, children.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='RequestCard'] > JSXAttribute[name.name='state'] > Literal[value!=/^(?:waiting|ageing|answered|expired|read|delivered|sent)$/]",
    message:
      "<RequestCard> state must be one of 'waiting' | 'ageing' | 'answered' | 'expired' | 'read' | 'delivered' | 'sent'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='SegmentedControl'] > JSXAttribute > JSXIdentifier[name!=/^(?:options|value|onChange|key|ref|className|style|children)$/]",
    message:
      "<SegmentedControl> doesn't accept that prop. Declared props: options, value, onChange.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='SidebarItem'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|badge|active|onClick|key|ref|className|style|children)$/]",
    message:
      "<SidebarItem> doesn't accept that prop. Declared props: label, badge, active, onClick.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='StateBadge'] > JSXAttribute > JSXIdentifier[name!=/^(?:state|label|size|key|ref|className|style|children)$/]",
    message: "<StateBadge> doesn't accept that prop. Declared props: state, label, size.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='StateBadge'] > JSXAttribute[name.name='state'] > Literal[value!=/^(?:sent|delivered|read|waiting|ageing|answered|expired)$/]",
    message:
      "<StateBadge> state must be one of 'sent' | 'delivered' | 'read' | 'waiting' | 'ageing' | 'answered' | 'expired'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='StateBadge'] > JSXAttribute[name.name='size'] > Literal[value!=/^(?:s|m)$/]",
    message: "<StateBadge> size must be one of 's' | 'm'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Switch'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|checked|onChange|key|ref|className|style|children)$/]",
    message: "<Switch> doesn't accept that prop. Declared props: label, checked, onChange.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TextField'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|value|placeholder|prefix|suffix|mono|state|hint|type|autoComplete|onChange|key|ref|className|style|children)$/]",
    message:
      "<TextField> doesn't accept that prop. Declared props: label, value, placeholder, prefix, suffix, mono, state, hint, type, autoComplete, onChange.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TextField'] > JSXAttribute[name.name='type'] > Literal[value!=/^(?:text|email|tel|url|number|password)$/]",
    message:
      "<TextField> type must be one of 'text' | 'email' | 'tel' | 'url' | 'number' | 'password'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TextField'] > JSXAttribute[name.name='state'] > Literal[value!=/^(?:default|active|error)$/]",
    message: "<TextField> state must be one of 'default' | 'active' | 'error'.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='Textarea'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|value|placeholder|rows|onChange|key|ref|className|style|children)$/]",
    message:
      "<Textarea> doesn't accept that prop. Declared props: label, value, placeholder, rows, onChange.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TimelineItem'] > JSXAttribute > JSXIdentifier[name!=/^(?:label|time|tone|last|key|ref|className|style|children)$/]",
    message: "<TimelineItem> doesn't accept that prop. Declared props: label, time, tone, last.",
  },
  {
    selector:
      "JSXOpeningElement[name.name='TimelineItem'] > JSXAttribute[name.name='tone'] > Literal[value!=/^(?:quiet|strong|answered|accent)$/]",
    message: "<TimelineItem> tone must be one of 'quiet' | 'strong' | 'answered' | 'accent'.",
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      // Next's build output, `apps/web`'s equivalent of a dist/.
      '**/.next/**',
      // Verbatim copies of the A2UI schemas and generated artefacts: linting
      // them would invite editing them.
      'catalog/vendor/**',
      'apps/api/openapi/**',
      // Flutter's build output and tool cache. `apps/mobile` is outside the
      // Turborepo pipeline but not outside this file, which runs from the root
      // over the whole tree — and on iOS the build directory holds the *sources*
      // of every Swift package the build resolved, JavaScript examples included.
      // Left in, `pnpm lint` reports the style of other people's sample code.
      // `apps/mobile/tool/` is deliberately not ignored: it is the one hand-written
      // JavaScript file in there, and it is the bridge to this half of the repo.
      'apps/mobile/build/**',
      'apps/mobile/.dart_tool/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // The design-system boundary, and where it stops. The rule holds everywhere code is
  // written by hand; `packages/ui` is exempt because the library *is* the boundary —
  // the values live inside it (`"0 24px"`, `width: 16`, `"14.5px"`) and only tokens live
  // outside. The exemption covers this one rule and reads in three lines: putting the
  // package in `ignores` was cheaper and said something else, that nothing is checked
  // in there at all.
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      'no-restricted-syntax': ['error', ...ADHERENCE],
    },
  },

  {
    files: ['packages/ui/**'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  {
    files: ['**/*.ts'],
    rules: {
      // Nest providers and Drizzle rows both carry types the compiler already
      // checks; an unused argument prefixed with _ is a deliberate signature.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // The state machine of a Request is the product's promise, and issue #11 asks
  // for it to live somewhere neither HTTP nor the jobs can go around. It cannot
  // be a compile error: `DatabaseModule` is `@Global()`, so the connection is
  // injectable anywhere, and making it a type error would cost branded types or
  // a per-module `Database` — more than the guarantee is worth. So the boundary
  // is a lint error, the trigger in `0001` is the net underneath, and neither
  // pretends to be the other.
  //
  // In `nibify/nibify-sdk`, which carries a verbatim copy of this file, these two
  // blocks match nothing. That is the cost of copying instead of publishing, and
  // it is the deal the README already describes.
  {
    files: ['apps/api/src/**/*.ts'],
    ignores: ['apps/api/src/db/**', 'apps/api/src/requests/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/db/schema'],
              importNames: ['messages', 'responses'],
              message:
                "A Request's status and its Response are written only by src/requests. Use RequestTransitions — writing the tables directly is how the first-terminal-transition-wins guarantee stops being one (#11).",
            },
          ],
        },
      ],
    },
  },

  // The Inbox is the one reader of `messages` outside src/requests, and the
  // exception is narrowed to exactly what #29 needs rather than opened to the
  // folder. It may list Messages; it may not touch `responses`, which is where
  // the action `context` lives — Content in the sense of ADR-0003, and the one
  // thing a list must never learn to read. The status boundary the rule above
  // protects is not weakened by this: nothing here writes a status, and the
  // trigger of migration 0002 refuses one from outside the state machine even if
  // something later tried. The `read_at` this module does write is precisely
  // what migration 0001 wrote down as still legal.
  {
    files: ['apps/api/src/inbox/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/db/schema'],
              importNames: ['responses'],
              message:
                "The Inbox publishes Metadata, not Content. A Response's context is never listed (ADR-0003, #29).",
            },
          ],
        },
      ],
    },
  },

  // And a controller may not reach for the connection at all, wherever it lives —
  // including inside src/requests, which the rule above lets through. This is the
  // sentence in #11 made mechanical: "if a terminal transition is reachable by
  // writing to the table straight from a controller, the guarantee does not
  // exist". A controller that needs the database asks a named provider for what
  // it needs, the way src/health/database-probe.ts does.
  {
    files: ['apps/api/src/**/*.controller.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/db/schema'],
              message: 'A controller does not touch tables. Inject a provider that owns the query.',
            },
            {
              group: ['**/db/db.module'],
              importNames: ['DATABASE', 'DATABASE_POOL'],
              message:
                'A controller does not hold the connection. Inject a provider that owns the query — see src/health/database-probe.ts.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['catalog/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
