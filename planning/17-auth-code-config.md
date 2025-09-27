# Programmatic Auth‑Konfiguration (Code)

Ziel: Alle Auth‑Einstellungen werden ausschließlich im Code gesetzt. Keine Env‑ oder Datei‑Konfiguration.

## API‑Vorschlag

```ts
// Öffentliche API (Planung)
interface NuclioHandlerOptions {
  auth?: AuthStrategy;
  limits?: { maxBodyBytes?: number };
  logging?: { debug?: boolean };
}

// Auth Strategy
type AuthStrategy = NoneAuth | ApiKeyAuth | JwtAuth | KeycloakAuth | DynamicAuth;

interface NoneAuth { mode: 'none' }
interface ApiKeyAuth { mode: 'apikey'; headerName?: string; keys: string[] }
interface JwtAuth { mode: 'jwt'; headerName?: string; requireBearer?: boolean; algorithms?: string[]; secret: string }
interface KeycloakAuth {
  mode: 'keycloak';
  issuer: string;
  audience?: string | string[];
  headerName?: string;
  requireBearer?: boolean;
  algorithms?: string[]; // default RS256
  jwksUri?: string | null;
  leeway?: number; // seconds
}
interface DynamicAuth { mode: 'dynamic'; provider: (req: IncomingLike) => AuthStrategy }

type IncomingLike = { headers: Record<string, string | string[] | undefined> }

// Factory/Builder
declare function createNuclioHandler(opts: NuclioHandlerOptions): (ctx: any, evt: any) => Promise<any>;
```

## Beispiele

### 1) Keycloak (ein Realm)
```ts
import { createNuclioHandler } from 'mcp-framework-nuclio';

export const handler = createNuclioHandler({
  auth: {
    mode: 'keycloak',
    issuer: 'https://auth.example.com/realms/myrealm',
    audience: ['my-client-id'],
    headerName: 'Authorization',
    requireBearer: true,
    algorithms: ['RS256'],
    leeway: 60,
  },
  limits: { maxBodyBytes: 4 * 1024 * 1024 },
});
```

### 2) Dynamic (Tenant pro Host)
```ts
export const handler = createNuclioHandler({
  auth: {
    mode: 'dynamic',
    provider: (req) => {
      const host = String(req.headers['host'] || '').toLowerCase();
      if (host.endsWith('acme.com')) {
        return { mode: 'keycloak', issuer: 'https://kc.acme.com/realms/acme', audience: ['acme-cli'] };
      }
      return { mode: 'keycloak', issuer: 'https://auth.example.com/realms/default' };
    },
  },
});
```

### 3) API‑Key / JWT (HMAC)
```ts
export const handlerApiKey = createNuclioHandler({ auth: { mode: 'apikey', headerName: 'X-API-Key', keys: ['k1','k2'] } });
export const handlerJwtHmac = createNuclioHandler({ auth: { mode: 'jwt', secret: '…', algorithms: ['HS256'] } });
```

## Validierung & Fehler
- createNuclioHandler validiert die Optionen und wirft beim Start aussagekräftige Fehler (z. B. fehlender issuer/secret).
- Bei Request‑Fehlern liefert der Handler 401/403 mit `WWW-Authenticate` Header, ohne Secrets zu leaken.

## Multi‑Tenant Caching
- JWKS Remote Cache je Issuer/KID mit TTL.
- DynamicAuth provider kann pro Request verschiedene Issuer zurückgeben.

## Migration/Integration
- Für Secrets: Code kann z. B. Secrets aus K8s‑Volumes oder Secret‑APIs lesen und an createNuclioHandler übergeben (immer noch „programmatic“, ohne Env).

## Tests (Plan)
- Unit für jede Strategie (happy/sad)
- Integration: Fake‑Event → Handler → HTTP 200/401/403
- Dynamic Mapping: Host‑basiert, fallbacks
```
