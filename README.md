# mcp-framework-nuclio

Nuclio‑fokussiertes MCP‑Framework ohne Redis. Konfiguration erfolgt ausschließlich programmatisch im Code (keine `.env`‑Pflicht). Enthält Planung in `planning/` und eine lauffähige Implementierung.

## Features
- Einziger MCP‑Endpoint `/mcp`
  - JSON‑RPC Batch (HTTP POST)
  - Streaming via Streamable HTTP (SSE, HTTP GET mit `Accept: text/event-stream`)
- Programmatic Auth (Code‑only):
  - `auth.none()`
  - `auth.apiKey({ headerName?, keys })`
  - `auth.jwt({ secret, algorithms? })` (HS256/HS384 …)
  - `auth.keycloak({ issuer, audience?, jwksUri?, algorithms?, leeway? })`
  - `auth.dynamic((req) => strategy)`
- Server‑Metadaten im Code: `name`, `version`, `description`, `instructions`, `vendor`
- Klassenbasierte Runtime:
  - `MCPTool` (mit `zod`‑Schema, `ToolContext` inkl. `claims`, `sessionId`, `tenantId`, `headers`)
  - `MCPPrompt`
  - `MCPResource`
  - Auto‑Loader aus `dist/tools|prompts|resources` (Default‑Export = Klasse)
- CLI `mfn`:
  - `create <name> [--tenants] [--no-examples]`
  - `add tool|prompt|resource` (Tools: `--template outlook-send-mail` verfügbar)
  - `validate` (prüft Beschreibungen in Schemas)
  - `build` (tsc + validate)
- Dynamische Tenants (virtuelle MCPs): `/mcp/:id` via `tenants.resolve(ctx)`; kein DB‑Code im Framework

## Installation
```bash
npm install mcp-framework-nuclio
```
Voraussetzungen: Node.js 18+ empfohlen.

## Quickstart
Projekt anlegen und bauen:
```bash
npx mfn create my-mcp --tenants
cd my-mcp
npm install
npm run build
```
Handler‑Beispiel (`src/handler.ts`):
```ts
import { createNuclioHandler, auth } from 'mcp-framework-nuclio';

const server = { name: 'my-mcp', version: '0.1.0', description: 'Demo', instructions: 'Use tools', vendor: 'ACME' };
const strategy = auth.keycloak({ issuer: 'https://auth.example.com/realms/my', audience: ['my-client-id'] });

export const handler = createNuclioHandler({
  server,
  auth: strategy,
  transport: { mode: 'http-stream', endpoints: { mcp: '/mcp' } },
  tenants: { route: '/mcp/:id', resolve: async ({ id }) => ({ server: { name: 'mcp-my-mcp-' + id, version: '1.0.0' } }) }
});
```

JSON‑RPC initialize:
```bash
curl -sS -X POST http://localhost:8080/mcp \
  -H 'Content-Type: application/json' \
  -H 'Mcp-Session-Id: s1' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```

Streaming (SSE):
```bash
curl -N http://localhost:8080/mcp \
  -H 'Accept: text/event-stream' \
  -H 'Mcp-Session-Id: s1'
```

## Nuclio Deployment
Minimal `function.yaml` (wird bei `mfn create` erzeugt):
```yaml
spec:
  runtime: nodejs
  handler: handler:handler
  triggers:
    http:
      class: http
      kind: http
      attributes:
        methods: [GET, POST, OPTIONS]
        maxRequestBodySize: 4194304
build:
  commands:
    - npm install
    - npm run build
```

## CLI
- `mfn create <name> [--tenants] [--no-examples]`
  - Legt Projektstruktur an (`src/handler.ts`, `src/tools`, `src/resources`, `tsconfig.json`, `function.yaml`)
  - `--tenants` erzeugt `resolveTenant`‑Skeleton und aktiviert Stream‑Transport
- `mfn add tool <name> [--template outlook-send-mail]`
- `mfn add prompt <name>`
- `mfn add resource <name>`
- `mfn validate` – prüft fehlende Beschreibungen in Tool‑Feldern/Prompt‑Argumenten
- `mfn build` – `tsc` + `validate`

## Handler‑Konfiguration (API)
```ts
createNuclioHandler({
  server: { name, version, description?, instructions?, vendor? },
  auth: auth.none() | auth.apiKey(...) | auth.jwt(...) | auth.keycloak(...) | auth.dynamic(fn),
  transport: { mode?: 'batch' | 'sse' | 'http-stream', endpoints?: { mcp?: string }, keepAliveMs?: number },
  tenants?: { route?: string, resolve(ctx), dispose?(ctx) }
})
```
- Endpunkt: `endpoints.mcp` (Default `/mcp`)
- Transport: `batch` (nur POST) oder `http-stream`/`sse` (GET + SSE)
- KeepAlive: standardmäßig 15s Ping‑Events

### Auth Strategien
```ts
auth.none();
auth.apiKey({ headerName: 'X-API-Key', keys: ['secret'] });
auth.jwt({ secret: 'hmac-secret', algorithms: ['HS256'] });
auth.keycloak({ issuer: 'https://kc/realms/acme', audience: ['client-id'], jwksUri?: string, algorithms?: ['RS256'], leeway?: 60 });
auth.dynamic((req) => /* return one of oben */);
```
#### Auth – Details & Beispiele
1) API‑Key
```bash
curl -H 'X-API-Key: my-secret-key' ...
```
```ts
auth.apiKey({ headerName: 'X-API-Key', keys: ['my-secret-key'] })
```
2) JWT (HMAC)
```bash
curl -H 'Authorization: Bearer <jwt>' ...
```
```ts
auth.jwt({ secret: 'use-secret-manager', algorithms: ['HS256'] })
```
3) Keycloak (OIDC/JWKS)
```bash
curl -H 'Authorization: Bearer <access_token_von_keycloak>' ...
```
```ts
auth.keycloak({
  issuer: 'https://auth.example.com/realms/my',
  audience: ['mcp-client-id'],
  // optional: jwksUri (sonst Discovery), algorithms: ['RS256'], leeway: 60
})
```
4) Dynamic (pro Request)
```ts
auth.dynamic((req) => req.headers['x-internal'] ? auth.apiKey({ keys: ['k'] }) : auth.none())
```
Hinweise:
- Headername kann via `headerName` gesetzt werden (API‑Key/JWT).
- `requireBearer` ist bei JWT/Keycloak standardmäßig aktiv.
- Verifizierte Claims stehen Tools in `ToolContext.claims` zur Verfügung.

### Dynamische Tenants
```ts
tenants: {
  route: '/mcp/:id',
  resolve: async (ctx) => ({
    server: { name: `mcp-tenant-${ctx.id}`, version: '1.0.0' },
    // optional: auth, transport.mode, tools, prompts, resources
  }),
  dispose?: async ({ id }) => {}
}
```
`ResolveTenantContext` enthält: `id`, `req { method, headers }`, `sessionId?`, `claims?` (aus Auth), `authMode?`.

## JSON‑RPC Methoden
- `initialize`
  - Response enthält `server` und `capabilities`
- `tools/list`
- `tools/call` `{ name, arguments }`
- `prompts/list`
- `prompts/get` `{ name, arguments }`
- `resources/list`
- `resources/read` `{ uri }`

## Runtime Klassen
### Tools
```ts
import { MCPTool, ToolContext } from 'mcp-framework-nuclio';
import { z } from 'zod';

interface Input { message: string }
export default class EchoTool extends MCPTool<Input> {
  name = 'echo';
  description = 'Echoes input message';
  schema = { message: { type: z.string(), description: 'Text to echo' } };
  async execute(input: Input, ctx: ToolContext) {
    const who = ctx.claims?.preferred_username || 'anonymous';
    return { text: `Echo: ${input.message} (by ${who})` };
  }
}
```
- `ToolContext`: `{ sessionId?, tenantId?, headers: Record<string,string>, claims? }`
- Rückgabe kann `ToolContent[]` (z. B. `{ type:'text', text }`) oder beliebig sein (wird in Text serialisiert)

#### Tool‑Schemas mit zod (Pflicht/Optional/Defaults/Enums/Arrays/Objekte)
- Pflichtfelder: alles ohne `z.optional(...)` ist required und wird in `inputSchema.required` aufgenommen.
- Optionale Felder: mit `z.optional(...)` sind nicht required; `z.default(...)` setzt Defaults beim Parsen.
- Enums validieren: `z.enum(['fast','safe'])` wird zur Laufzeit geprüft. Wenn Clients die Enum‑Werte im `tools/list` sehen sollen, überschreiben Sie `inputSchema`:
  ```ts
  import { MCPTool, ToolContext } from 'mcp-framework-nuclio';
  import { z } from 'zod';

  export default class ModeTool extends MCPTool<{ mode: 'fast'|'safe' }>{
    name = 'mode_tool';
    description = 'Select a mode';
    schema = { mode: { type: z.enum(['fast','safe']), description: 'Execution mode' } };
    get inputSchema(){
      const base = super.inputSchema as any;
      base.properties.mode.enum = ['fast','safe'];
      return base;
    }
    async execute(i: { mode: 'fast'|'safe' }, ctx: ToolContext){
      return { content: [{ type: 'text', text: `Mode set to ${i.mode}` }] };
    }
  }
  ```
- Arrays/Objekte: `z.array(z.string())`, `z.object({...})` funktionieren; der ausgelieferte Typ ist `array`/`object`, Details validiert zod.
- Unions: `z.union([z.string(), z.number()])` werden geparst; bei Bedarf exaktes JSON‑Schema durch Override von `inputSchema` wie oben ergänzen.

#### Registrierung & Discovery der Tools
- Default‑Klassen unter `src/tools/*.ts` anlegen (`export default class ...`).
- Build kompiliert nach `dist/tools/*.js`; der Loader findet alle Default‑Exporte automatisch.
- Pro Tenant können Sie `tools` in `tenants.resolve(ctx)` explizit bereitstellen und so die Projekt‑Defaults überschreiben.

### Prompts
```ts
import { MCPPrompt } from 'mcp-framework-nuclio';
import { z } from 'zod';

export default class GreetingPrompt extends MCPPrompt<{ name: string }> {
  name = 'greet';
  description = 'Greeting messages';
  schema = { name: { type: z.string(), description: 'User name' } };
  async generateMessages(a: { name: string }) {
    return [{ role: 'user', content: { type: 'text', text: `Hello ${a.name}!` } }];
  }
}
```

### Resources
```ts
import { MCPResource, ResourceContent } from 'mcp-framework-nuclio';

export default class HeartbeatResource extends MCPResource {
  uri = 'resource://heartbeat'; name = 'Heartbeat'; mimeType = 'application/json';
  private c = 0;
  async read(): Promise<ResourceContent[]> { return [{ uri: this.uri, mimeType: this.mimeType, text: JSON.stringify({ beat: this.c++ }) }]; }
}
```

## Loader
Zur Laufzeit werden Klassen aus `dist/tools|prompts|resources` geladen. Exportieren Sie jeweils eine Default‑Klasse (`export default class …`).

## Streaming‑Details (SSE)
- Öffnen: `GET /mcp` mit Header `Accept: text/event-stream` und `Mcp-Session-Id`
- Der Server sendet zuerst `event: connectionId` mit einer ID; optional kann `connectionId` als Query verwendet werden, um Streams wieder anzuschließen
- Keepalive‑Pings: `data: {"jsonrpc":"2.0","method":"ping"}`
- Alle POST‑Antworten der gleichen Session werden zusätzlich als `data: <jsonrpc>` über SSE gepusht
- Eine Session kann mehrere parallele Verbindungen besitzen; sauberes Cleanup auf Close/Error

## Fehler‑Mapping
- 400 + `-32700` Invalid JSON
- 400 + `-32600` Invalid Request / Unsupported content-type / Falsche Methode
- 401 + `-32000` Unauthorized (ApiKey/Bearer)
- 404 + `-32601` Not Found (falscher Pfad/Tenant) oder Unknown tool/resource
- 422 + `-32602` Invalid params (Zod‑Issues unter `error.data.issues`)

## Keycloak + Outlook (Beispielplan)
- Siehe `planning/32-outlook-keycloak-example.md`
- Tool‑Template: `mfn add tool outlook_send_mail --template outlook-send-mail` (Stub – ohne Graph‑Call)

## Hinweise & Sicherheit
- Keine `.env`‑Pflicht: Alles im Code konfigurierbar; Secrets über Secret‑Manager beziehen
- `jose` wird für JWT/JWKS verwendet
- Framework enthält keinen DB‑Code; Tenants müssen über `resolve()` bereitgestellt werden

## Entwicklung am Framework
```bash
git clone https://github.com/stefanskiasan/mcp-framework-nuclio
cd mcp-framework-nuclio
npm install
npm run build
```

## Lizenz & Beiträge
Lizenz siehe Repository. Contributions via Pull Requests sind willkommen.
