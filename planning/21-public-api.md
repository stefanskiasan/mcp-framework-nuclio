# Public API (Entwurf)

Diese Datei beschreibt die geplanten öffentlichen Exporte/Typen von `mcp-framework-nuclio`.

## Modul-Exports

```ts
// Factory – erzeugt den Nuclio-Handler (HTTP JSON-RPC Batch)
export function createNuclioHandler(options?: NuclioHandlerOptions): (ctx: any, evt: any) => Promise<any>;

// Auth Namespace
export const auth: {
  none(): NoneAuth;
  apiKey(opts: { headerName?: string; keys: string[] }): ApiKeyAuth;
  jwt(opts: { headerName?: string; requireBearer?: boolean; algorithms?: string[]; secret: string }): JwtAuth;
  keycloak(opts: { issuer: string; audience?: string | string[]; headerName?: string; requireBearer?: boolean; algorithms?: string[]; jwksUri?: string | null; leeway?: number }): KeycloakAuth;
  dynamic(provider: (req: IncomingLike) => AuthStrategy): DynamicAuth;
};

// Utils (optional, nicht MVP-stabil)
export const logger: Logger;
```

## Typen

```ts
export interface NuclioHandlerOptions {
  auth?: AuthStrategy;
  limits?: { maxBodyBytes?: number };
  logging?: { debug?: boolean; toFile?: boolean; directory?: string };
  server?: ServerOptions;
  transport?: TransportOptions;
  tenants?: TenantsOptions;
}

export type AuthStrategy = NoneAuth | ApiKeyAuth | JwtAuth | KeycloakAuth | DynamicAuth;

export interface NoneAuth { mode: 'none' }
export interface ApiKeyAuth { mode: 'apikey'; headerName?: string; keys: string[] }
export interface JwtAuth { mode: 'jwt'; headerName?: string; requireBearer?: boolean; algorithms?: string[]; secret: string }
export interface KeycloakAuth {
  mode: 'keycloak'; issuer: string; audience?: string | string[]; headerName?: string; requireBearer?: boolean; algorithms?: string[]; jwksUri?: string | null; leeway?: number;
}
export interface DynamicAuth { mode: 'dynamic'; provider: (req: IncomingLike) => AuthStrategy }

export type IncomingLike = { headers: Record<string, string | string[] | undefined> }

export interface Logger {
  info(msg: string): void; warn(msg: string): void; error(msg: string): void; debug(msg: string): void;
}

export interface ServerOptions {
  name: string;
  version: string;
  description?: string;
  instructions?: string;
  vendor?: string;
}

export interface TransportOptions {
  mode?: 'batch' | 'sse' | 'http-stream';
  endpoints?: { mcp?: string };
  keepAliveMs?: number; // default 15000
}

// Dynamic tenants – programmatic only
export interface TenantsOptions {
  route?: string;                    // default '/mcp/:id'
  resolve: ResolveTenant;            // required
  dispose?: DisposeTenant;           // optional
}

export type ResolveTenant = (ctx: ResolveTenantContext) => Promise<VirtualMcp | null>;
export type DisposeTenant = (ctx: { id: string }) => Promise<void> | void;

export interface ResolveTenantContext {
  id: string;
  req: { method: 'GET'|'POST'; headers: Record<string, string> };
  sessionId?: string;
  claims?: Record<string, unknown>;
  authMode?: 'none'|'apikey'|'jwt'|'keycloak';
}

export interface VirtualMcp {
  server: ServerOptions;
  auth?: AuthStrategy;
  transport?: { mode?: 'batch'|'sse' };
  tools?: any[];      // MCPTool instances
  prompts?: any[];    // MCPPrompt instances
  resources?: any[];  // MCPResource instances
}
```

## Handler-Vertrag (Nuclio)
- Erwartet `event` mit Feldern: `body` (string/Buffer), `headers`, `method` (POST)
- Antwort: `{ statusCode, headers, body }`
- CORS/OPTIONS: 204 + Allow‑Headers/Methods/Origin (falls aktiviert – außerhalb Auth konfigurierbar)

## Stabilitätsnotizen
- `createNuclioHandler` & `auth.*` sind stabil (SemVer: MAJOR bei Breaking Changes)
- `logger` als Utility ist „best effort“ und kann sich ändern

## Beispiele
Siehe 17-auth-code-config.md

## Defaults & Entscheidungen
- Transport default: `batch`
- Streaming Endpunkte: `GET /sse`, `POST /messages?connectionId=...`

## Beispiel: Vollkonfiguration (Server + Keycloak + SSE)

```ts
import { createNuclioHandler, auth } from 'mcp-framework-nuclio';

const server = {
  name: 'd365-mcp',
  version: '1.0.0',
  description: 'ERP companion server for Dynamics 365',
  instructions: 'Use tools to query resources. See docs for prompts.',
  vendor: 'ACME GmbH'
};

export const handler = createNuclioHandler({
  server,
  auth: auth.keycloak({
    issuer: 'https://auth.example.com/realms/myrealm',
    audience: ['mcp-client'],
    headerName: 'Authorization',
    requireBearer: true,
    algorithms: ['RS256'],
    leeway: 60,
  }),
  transport: {
    mode: 'sse',
    endpoints: { sse: '/sse', messages: '/messages' },
    keepAliveMs: 15000,
  },
  limits: { maxBodyBytes: 4 * 1024 * 1024 },
  logging: { debug: false }
});
```

## Beispiel: Batch‑only (ohne Auth)

```ts
import { createNuclioHandler, auth } from 'mcp-framework-nuclio';

export const handler = createNuclioHandler({
  server: { name: 'my-mcp', version: '0.1.0' },
  auth: auth.none(),
  transport: { mode: 'batch' }
});
```

## Beispiel: HTTP‑Stream (später)

```ts
export const handler = createNuclioHandler({
  server: { name: 'my-mcp', version: '0.1.0' },
  auth: auth.apiKey({ headerName: 'X-API-Key', keys: ['change-me'] }),
  transport: { mode: 'http-stream', endpoints: { sse: '/sse', messages: '/messages' } }
});
```
