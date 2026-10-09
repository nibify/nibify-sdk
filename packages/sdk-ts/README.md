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
- `client.environment` è `test` o `live`, dedotto dal prefisso della chiave.

ESM, Node ≥ 20.3, nessuna dipendenza a runtime.

Codice e catalogo: <https://github.com/nibify/nibify-sdk> · Licenza MIT.
