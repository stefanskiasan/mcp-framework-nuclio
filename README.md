# mcp-framework-nuclio

Ein auf Nuclio fokussiertes MCP‑Framework ohne Redis. Konfiguration erfolgt ausschließlich programmatisch im Code (keine `.env`‑Pflicht). Enthält eine ausführliche Planung in `planning/` und eine lauffähige MVP‑Implementierung.

Was es bietet (Stand: MVP):
- MCP über einen einzigen HTTP‑Endpoint (`/mcp`) – unterstützt JSON‑RPC Batch und Streaming (Streamable HTTP/SSE).
- Programmatic Auth: `none`, `apiKey`, `jwt` (HMAC), `keycloak` (OIDC/JWKS), sowie `dynamic` Provider.
- Server‑Metadaten im Code: `name`, `version`, `description`, `instructions`, `vendor`.
- Tools/Prompts/Resources als Klassen, automatische Ladefunktion aus `dist/*`.
- CLI `mfn`: `create`, `add tool|prompt|resource`, `validate`, `build`.
- Dynamische Tenants: optionales Routing `/mcp/:id` mit programmatischem `resolve(id)` – das Framework liefert nur das Event/Context, die Datenbeschaffung bleibt außerhalb.

Schnellstart (lokal):
- `cd mcp-framework-nuclio && npm install && npm run build`
- Neues Projekt: `npx mfn create my-mcp && cd my-mcp && npm install && npm run build`

Keycloak‑Quickstart (Beispiel):
- In `src/handler.ts` des Projekts:
  ```ts
  import { createNuclioHandler, auth } from 'mcp-framework-nuclio';

  const server = { name: 'my-mcp', version: '0.1.0', description: 'Demo', instructions: 'Use tools', vendor: 'ACME' };
  const strategy = auth.keycloak({
    issuer: 'https://auth.example.com/realms/my',
    audience: ['my-client-id'],
    // optional: jwksUri, algorithms, leeway
  });

  export const handler = createNuclioHandler({ server, auth: strategy, transport: { mode: 'http-stream', endpoints: { mcp: '/mcp' } } });
  ```
- Call (JSON‑RPC initialize):
  ```bash
  curl -sS -X POST http://localhost:8080/mcp \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Mcp-Session-Id: s1' \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
  ```
- Streaming (SSE/Streamable HTTP):
  ```bash
  curl -N http://localhost:8080/mcp \
    -H 'Accept: text/event-stream' \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Mcp-Session-Id: s1'
  ```

Dynamische Tenants `/mcp/:id` (virtueller MCP):
- Aktivieren über `tenants: { route?: '/mcp/:id', resolve(ctx) { ... } }` beim Erzeugen des Handlers.
- `resolve(ctx)` liefert pro `id` ein `VirtualMcp`‑Objekt mit optionalen Overrides: `server`, `auth`, `transport.mode`, `tools`, `prompts`, `resources`.
- Das Framework führt keine DB‑Zugriffe durch – `resolve` ist die einzige Erweiterungsstelle, um z. B. aus einer DB die Konfiguration zu laden.

Wichtige Hinweise:
- Für Keycloak/JWT‑Verifikation wird `jose` verwendet. Installieren Sie die Abhängigkeiten im Projekt (`npm install`).
- Für Streaming setzt das Framework auf Streamable HTTP (SSE). Mehr Details in `planning/30-streaming-transport-plan.md`.
- Die CLI‑Befehle `validate` und `build` prüfen u. a. Beschreibungen in Schemas.

Mehr Details, Roadmap und Annahmen: siehe die Dokumente unter `planning/` (z. B. Auth‑Konzepte, Dynamic‑Tenants, Error‑Handling, Performance).
