# n8n-nodes-nibify

**Placeholder — non ancora funzionante.** Il nome è pubblicato per riservarlo; il nodo vero arriva più avanti.

Nibify manda una richiesta interattiva a un umano — una card con bottoni e campi, su iPhone — e restituisce la risposta al workflow che l'ha chiesta.

Il nodo è un client indipendente della REST API di Nibify: per le linee guida di verifica n8n il pacchetto **non può avere dipendenze esterne**, quindi non usa `@nibify/sdk`. I due client restano allineati tramite la spec OpenAPI generata dal backend.

Codice, catalogo e SDK: <https://github.com/nibify/nibify-sdk> · Licenza MIT.
