// One flat config for the whole workspace. It is copied verbatim into
// nibify/nibify-sdk rather than shared through a published package — see the
// "Forma del monorepo" section of README.md for why.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { COMPONENT_ADHERENCE } from './eslint.adherence.mjs';

// The design-system adherence rule, ported from `docs/design/_adherence.oxlintrc.json`
// — the oxlint config that arrived with the design system and that no tool in this repo
// runs. The selectors are the same ones, one by one: ESLint core speaks the same esquery
// syntax, so this is a port and not a rewrite. What changed is the severity, `warn`
// there; what stayed behind are the file's other two rules, because
// `react/forbid-elements` had an empty list and `no-restricted-imports` guarded a folder
// layout that does not exist here.
//
// These three selectors are the rule itself, and they hold for a line of CSS as much as
// for a component prop: no hex, no px, no font beyond the two. A value is written once
// in tokens.json and arrives as `var(--nb-…)` (ADR-0011). They are written by hand, and
// they stay written by hand: they are a decision, not a projection of a type.
//
// What follows them is not. Each component's declared props used to be spelled out
// here too, one selector per component and one per enum — a third copy of every prop,
// after the .jsx and the .d.ts, and the only one nothing checked. They now come from
// the .d.ts themselves through `pnpm adherence`, and `pnpm lint` compares the two
// before it runs anything, so it never works from a copy that has fallen behind (#76).
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

  ...COMPONENT_ADHERENCE,
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
