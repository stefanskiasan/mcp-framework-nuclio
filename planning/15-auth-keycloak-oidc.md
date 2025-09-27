# Keycloak / OIDC – Authentifizierungsplanung

Ziel: Unterstützung für Keycloak als OIDC‑Provider, inkl. Upstream‑IDPs (Microsoft Entra ID, Google, etc.) via Keycloak Identity Providers. Der Nuclio‑Endpoint verifiziert eingehende `Bearer`‑Tokens lokal gegen JWKS.

## Ziele
- Lokale JWT‑Verifikation (keine Netzaufrufe pro Request abseits initialer JWKS‑Discovery)
- Konfiguration über Env (Issuer, Audience, Algorithmen, Headername)
- Saubere Fehlerrückgaben (401 mit `WWW-Authenticate`), kein Secret‑Leak im Log
- Zukunftssichere Erweiterung für rollenbasierte Autorisierung (optional)

## Nicht‑Ziele
- Kein Token‑Introspection‑Call (Latenz, Availability); ausschließlich Signaturprüfung + Claims
- Keine Multi‑Realm‑Automatik im MVP (ein Realm pro Funktion)

## Sequenz (Happy Path)
1. Client sendet `Authorization: Bearer <access_token>`
2. Adapter prüft Header, extrahiert Token
3. OIDC Discovery (einmalig beim Start): `/.well-known/openid-configuration` → `jwks_uri`
4. JWKS Laden (einmalig/lazy) und Caching
5. `jwtVerify(token, JWKS, { issuer, audience, algorithms })`
6. Bei Erfolg: Claims (`sub`, `exp`, `aud`, Rollen) stehen für Logging/optional Authorisierung bereit

## Edge Cases
- Abgelaufenes Token (exp) → 401, `WWW-Authenticate: Bearer realm="MCP Server", error="invalid_token"`
- Falscher Issuer/Audience/Algo → 401
- JWKS Roll (Keys wechseln): On‑the‑fly neu laden bei `kid`‑Mismatch (Backoff/TTL)
- Clock Skew: Leeway 30–60s (konfigurierbar)

## Konfiguration über Code (statt Env/Datei)
Die Authentifizierung wird im Handler‑Bootstrap per Code gesetzt. Parameter (Issuer, Audience, Algorithmen, Leeway, Headername) werden direkt übergeben. Optional: Multi‑Tenant via Callback. Siehe 17-auth-code-config.md für API‑Details.

## Autorisierung (optional, später)
- `MCP_AUTHZ_MODE=none|role_map`
- `MCP_ROLE_MAP` (JSON): Map von Rolle → erlaubte Tool/Prompt/Resource‑Listen
- Claims‑Quellen: realm_access.roles, resource_access[client].roles, custom claims

## Fehlerbehandlung & Antworten
- Fehlende Credentials → 401, `WWW-Authenticate: Bearer realm="MCP Server"`
- Ungültiges Token → 401, `... error="invalid_token"`
- Unzureichende Rechte (bei aktivierter Autorisierung) → 403

## Logging
- Nur Headernamen loggen, nie Tokens
- Bei Verify‑Fehlern: `iss/aud/kid` anonymisiert oder als Hash; keine Token‑Payload im Klartext

## Performance
- JWKS wird gecacht (TTL 10–15 min); Refresh bei `kid`‑Missmatch
- Verifikation mit `jose` (Node‑native, schnell genug für FaaS)

## Pseudocode (Adapter‑Ebene)
```ts
if (AUTH_MODE === 'keycloak') {
  const header = req.headers[KC_HEADER.toLowerCase()]
  const raw = Array.isArray(header) ? header[0] : header
  if (!raw) return unauthorized()
  const token = REQUIRE_BEARER ? raw.replace(/^Bearer\s+/,'') : raw

  const jwks = getCachedJwks() ?? fetchAndCacheJwks()
  const { payload, protectedHeader } = await jwtVerify(token, jwks, {
    issuer: KC_ISSUER,
    audience: KC_AUDIENCE,
    algorithms: KC_ALGOS
  })
  // optional: authorize(payload)
}
```

## Testplan
- Gültiges Token (RS256) → 200
- Falsche Audience/Issuer → 401
- Abgelaufenes Token → 401
- Falsches `alg`/`kid` → Neu‑Fetch JWKS, ansonsten 401
- Fehlender `Bearer` → 401

## function.yaml (Snippet)
```yaml
spec:
  build:
    commands:
      - npm install
      - npm run build
```

## Roadmap‑Integration
- Phase 2: Keycloak‑Support implementieren (nur AuthN). Autorisierung (Role‑Map) in Phase 3.
