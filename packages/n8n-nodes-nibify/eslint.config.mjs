// The workspace config, plus n8n's lint for community nodes on what n8n loads.
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';
import tseslint from 'typescript-eslint';

import workspace from '../../eslint.config.mjs';

const { plugins, rules } = n8nCommunityNodesPlugin.configs.recommended;

export default [
  ...workspace,
  { files: ['credentials/**/*.ts', 'nodes/**/*.ts'], plugins, rules },
  {
    files: ['package.json'],
    plugins,
    rules: {
      ...rules,
      // package.json is parsed as one TypeScript expression statement, like n8n's own config does.
      '@typescript-eslint/no-unused-expressions': 'off',
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { extraFileExtensions: ['.json'] },
    },
  },
];
