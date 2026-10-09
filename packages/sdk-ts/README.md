# @nibify/sdk

**Non ancora pubblicato.** Su npm c'è ancora il segnaposto `0.0.2`; il codice qui sotto vive in questo repo e arriva su npm col deploy dell'API.

Nibify manda una richiesta interattiva a un umano — una card con bottoni e campi, su iPhone — e restituisce la risposta all'agente che l'ha chiesta.

```ts
import { Nibify } from '@nibify/sdk';

const nibify = new Nibify(); // NIBIFY_API_KEY; baseUrl di default https://api.nibify.app

const result = await nibify.ask(surface, {
  sender: { name: 'Outreach agent' },
  notification: { title: 'Approvazione richiesta', body: "L'agente vuole inviare 3 email." },
});

if (result.status === 'answered') {
  result.response.actionName; // 'approve'
  result.response.context; // { note: 'vai pure, ma solo ai lead A' }
}
```

- `surface` è JSON A2UI conforme al catalogo Nibify.
- `ask()` aspetta finché la richiesta non è chiusa, anche per sempre. Un esito non è un errore: si risolve in `answered`, `expired`, `dismissed`, `cancelled`, oppure `timeout` se hai passato `timeout` (ms) o `signal` e l'attesa è finita prima. `timeout` non è `expired`: la richiesta resta aperta e `result.request.wait()` riprende ad aspettarla.
- Errori HTTP e di rete sollevano `NibifyError`, con `status` e `code` dell'API. `ask()` ritenta da sé su rete, `429` e `5xx`, con lo stesso `Idempotency-Key`: una richiesta sola.
- `notify()` manda una notifica che non chiede risposta, e non ritenta.
- `getRequest(id)` legge la richiesta com'è adesso, senza aspettare; `result.request` è lo stesso handle che dà `ask()`. Sull'handle: `wait()`, `nudge()` (ri-manda la push, la richiesta non cambia) e `cancel()` (la ritira: un `ask()` che la aspetta si risolve in `cancelled`). `nudge()` e `cancel()` non ritentano; su una richiesta già chiusa sollevano `NibifyError` `409`, con un `code` come `request_already_answered`.
- `requests.list()`, `threads.list()` e `threads.get(key).messages` sono iteratori asincroni: `for await` scorre tutte le pagine, `pageSize` dice quante righe per chiamata.

```ts
for await (const pending of nibify.requests.list({ status: 'pending' })) {
  await pending.request.cancel();
}
```

- `client.environment` è `test` o `live`, dedotto dal prefisso della chiave.

## Callback e webhook

Se passi `callbackUrl` a `ask()`, o hai un `WebhookEndpoint`, Nibify ti chiama con un corpo firmato. `webhooks.verify()` controlla la firma e restituisce l'evento:

```ts
import { webhooks } from '@nibify/sdk';

// `request` è una Request di fetch (Workers, Deno, Next, Hono): il corpo si legge come testo.
const event = await webhooks.verify({
  body: await request.text(),
  signature: request.headers.get('nibify-signature'),
  secret: process.env.NIBIFY_WEBHOOK_SECRET!, // whsec_…, il signing secret del Project
});

if (event.type === 'message.answered') event.data.response.actionName;
```

- `body` è la stringa ricevuta, non un oggetto: un JSON riparsato e riserializzato non è più ciò che è stato firmato, e la firma non combacia mai.
- La consegna è at-least-once: deduplica su `event.id`, uguale a ogni ritentativo, oppure su `event.data.response.responseId`.
- Se la firma non regge, `verify()` solleva `NibifyError` con un `code` che dice perché: `webhook_signature_mismatch` (corpo diverso o secret sbagliato), `webhook_timestamp_out_of_tolerance` (firma vera, `t` oltre `tolerance`, 300 secondi di default), `webhook_signature_missing`, `webhook_signature_malformed`, `webhook_secret_missing`, `webhook_body_not_raw`, `webhook_payload_invalid`.
- È anche `nibify.webhooks.verify()`, ma non serve una API key: un server che riceve e basta usa l'import.
- Usa solo Web Crypto, quindi è asincrona e gira anche su Bun, Deno e Workers.

ESM, Node ≥ 20.3, nessuna dipendenza a runtime.

Codice e catalogo: <https://github.com/nibify/nibify-sdk> · Licenza MIT.
