# Dynamic Tenants (/mcp/:id) – Planung (Programmatic Only)

Ziel: Mehrere „virtuelle“ MCP‑Instanzen dynamisch unter `/mcp/:id` bereitstellen, ohne dass das Framework Datenbanken oder Fetch‑Logik enthält. Das Framework liefert nur Programmatic‑Events/Callbacks, über die Anwendungs‑Code Tenant‑Konfiguration, Tools/Prompts/Resources lädt, validiert und zurückgibt.

## Endpunkte (Streamable HTTP konform)
- `POST /mcp/:id` – JSON‑RPC (Single/Batch), Responses synchron im HTTP‑Body.
- `GET /mcp/:id` + `Accept: text/event-stream` – eröffnet SSE‑Stream für diese Tenant‑Session.
- Session via Header `Mcp-Session-Id` (wird bei erster `initialize` gesetzt, wenn nicht übermittelt).

## Public API – Programmatic Callback
`createNuclioHandler(options)` erhält ein neues Feld `tenants`:

```ts
interface NuclioHandlerOptions {
  // ... bereits bestehend
  tenants?: {
    /** optional, default '/mcp/:id' */
    route?: string;
    /** Resolve Tenant-Konfiguration und -Instanz – programmatic only */
    resolve: ResolveTenant;
    /** optionales Cleanup */
    dispose?: DisposeTenant;
  };
}

export type ResolveTenant = (ctx: ResolveTenantContext) => Promise<VirtualMcp | null>;
export type DisposeTenant = (ctx: { id: string }) => Promise<void> | void;

export interface ResolveTenantContext {
  id: string; // aus Pfad /mcp/:id
  req: { method: 'GET'|'POST'; headers: Record<string, string> };
  sessionId?: string;               // aus Mcp-Session-Id
  claims?: Record<string, unknown>; // aus verifizierten Tokens, falls Auth aktiv
  authMode?: 'none'|'apikey'|'jwt'|'keycloak';
}

export interface VirtualMcp {
  server: { name: string; version: string; description?: string; instructions?: string; vendor?: string };
  auth?: AuthStrategy;          // optional: tenant-spezifisch; andernfalls globaler Handler-Auth
  transport?: { mode?: 'batch'|'sse' };
  tools?: MCPTool[];
  prompts?: MCPPrompt[];
  resources?: MCPResource[];
}
```

## Ablauf
1) Router extrahiert `id` aus dem Pfad.
2) Handler ruft `resolve({ id, req, sessionId, claims })` auf.
3) `resolve` liefert `VirtualMcp` (oder `null` bei unbekanntem Tenant).
4) Handler prüft Auth (global oder tenant‑spezifisch) und dispatcht Methoden (initialize, tools/prompts/resources) gegen die virtuelle Instanz.

## Verhalten bei Fehlern
- Unbekannter Tenant: HTTP 404 + JSON‑RPC error (Method not found / Not Found).
- Auth‑Fehler: 401/403 mit `WWW-Authenticate` (ApiKey/Bearer je Modus).
- Invalid JSON/Content-Type: 400 + -32700/-32600.
- Unbekannte Methoden/Tools: -32601.
- Invalid params (Zod): -32602 + `error.data.issues` (path + message).
- Serverfehler: 500 (keine Secrets loggen).

## Sicherheit
- Framework führt keinen DB‑/Fetch‑Code aus.
- Keine dynamische Code‑Ausführung aus externen Quellen. Tools/Prompts/Resources sind Instanzen oder (optional) deklarativ über ein sicheres DSL in Anwendungs‑Code erzeugt.
- Auth programmatic (Keycloak/JWT/API‑Key) global oder pro Tenant im zurückgegebenen `VirtualMcp`.

## Caching (außerhalb des Frameworks)
- Beliebig im anwendenden Code (z. B. LRU anhand id + config_version). Das Framework ruft `resolve` pro Request auf; der Anwender entscheidet, wie er cached.
- Optional `dispose({ id })` zum Aufräumen, wenn Tenant‑Instanzen explizit freigegeben werden sollen.

## Streaming (SSE)
- `GET /mcp/:id` öffnet Stream; Writer/Queue im Handler.
- `POST /mcp/:id` liefert Responses im HTTP‑Body; parallele SSE‑Events (data: …) sind möglich, wenn ein Writer aktiv ist.

## CLI/Doku (Erweiterungen)
- Kein DB‑Stub. Optional kann `mfn create` eine `resolve`‑Skeleton‑Funktion generieren:
  ```ts
  tenants: {
    resolve: async ({ id, req, sessionId, claims }) => {
      // TODO: hol Konfig (DB/API), validiere, erzeuge Tools/Prompts/Resources
      return { server: { name: `mcp-${id}`, version: '1.0.0' }, tools: [], prompts: [], resources: [], transport: { mode: 'sse' } };
    }
  }
  ```

## Akzeptanzkriterien
- `POST/GET /mcp/:id` funktionieren parallel für mehrere Tenants.
- `resolve` wird pro Request aufgerufen; Framework enthält keine DB‑Calls.
- Dispatch und Auth verhalten sich tenant‑spezifisch gemäß zurückgegebenem `VirtualMcp`.
- Fehler‑ und Session‑Mapping MCP‑konform.
