# @nibify/sdk

**Not published yet.** npm still holds the `0.0.2` placeholder; the code below lives in this repository and reaches npm once the Nibify API is deployed.

Ask a person on their phone from your agent, wait for the answer, and go on with it.

```sh
npm install @nibify/sdk
```

```ts
import { Nibify } from '@nibify/sdk';

const nibify = new Nibify(); // reads NIBIFY_API_KEY

const result = await nibify.ask({
  sender: { name: 'invoice-flow' },
  notification: {
    title: 'Studio Rossi invoice: €1,240, due Oct 30',
    body: 'Read from the PDF. File it as consulting, or fix it first.',
    quickActions: [
      { name: 'file', label: 'File it' },
      { name: 'fix', label: 'Fix it' },
    ],
  },
});

if (result.status === 'answered') result.response.actionName; // 'file'
```

`ask()` resolves when the request is answered, expired, dismissed or cancelled: an outcome, never an error. The same client sends notifications, cancels and nudges requests, lists requests and threads, builds card surfaces with typed component constructors, and verifies webhook signatures.

ESM, Node ≥ 20.3, no runtime dependencies.

- [Quickstart](https://nibify.app/docs/quickstart): the first request, in a few minutes.
- [Documentation](https://nibify.app/docs): concepts, guides and the SDK reference.

Code and catalog: <https://github.com/nibify/nibify-sdk> · MIT License.
