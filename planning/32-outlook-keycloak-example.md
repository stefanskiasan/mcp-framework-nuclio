# Outlook (Microsoft Graph) via Keycloak – Beispielplan

Ziel: Ein MCP (Nuclio) authentifiziert gegen Keycloak (OIDC). Keycloak ist an einen externen IDP (z. B. Microsoft) angebunden. Der MCP erhält Access Tokens von Keycloak (Audience = MCP‑Client), nutzt diese ggf. zum Aufruf von Microsoft Graph (Delegation) oder fordert On‑Behalf‑Of (OBO) Tokens an, wenn erlaubt.

Wichtig: Die Konfiguration erfolgt ausschließlich im Code, nicht über `.env`. Secrets sollten aus einem Secret‑Manager bezogen werden (aber nicht als `.env`).

## Architektur
- Client ↔ MCP (Nuclio) ↔ Keycloak (OIDC) ↔ Microsoft (IDP/Graph)
- MCP verifiziert Bearer Token via JWKS (`auth.keycloak({ issuer, audience })`).
- Tools im MCP kapseln Graph‑Calls (z. B. Kalender/Outlook), verwenden das verifizierte Token (oder OBO) für Microsoft Graph.

## Schritte
1) Keycloak Realm + Client:
   - Public/Confidential Client für MCP; Audience = MCP‑Client ID.
   - Identity Provider: Microsoft (OIDC/SAML) hinzufügen.
   - Mappings (groups/roles) nach Bedarf.
2) MCP‑Code (programmatisch):
   - `auth.keycloak({ issuer: 'https://<kc>/realms/<realm>', audience: ['mcp-client-id'] })`.
   - Optional: `jwksUri`, `algorithms`, `leeway` konfigurieren.
3) Tool‑Entwurf (z. B. `outlook_send_mail`):
   - Input‑Schema: `to`, `subject`, `body` (mit Beschreibungen).
   - Ausführung: nimmt verifiziertes Token aus Request‑Context (später Execution‑Context), ruft Microsoft Graph `/sendMail`.
4) Sicherheit:
   - Scopes in Keycloak/Microsoft definieren (z. B. `Mail.Send`).
   - Tokenprüfung strikt: `issuer`, `audience`, `exp`, `alg`.
5) Tenants (optional):
   - `/mcp/:id` mappt tenant‑spezifisch auf unterschiedliche `issuer`/`audience` + Tools.

## Pseudocode (nur Konzept, keine Implementierung)
```ts
import { createNuclioHandler, auth } from 'mcp-framework-nuclio';
const handler = createNuclioHandler({
  server: { name: 'mcp-outlook', version: '1.0.0' },
  auth: auth.keycloak({ issuer: 'https://kc/realms/acme', audience: ['mcp-outlook'] }),
  transport: { mode: 'http-stream' },
  tenants: {
    resolve: async ({ id, sessionId /* claims? */ }) => {
      // Lookup config per tenant id (extern, nicht im Framework)
      return { server: { name: `mcp-outlook-${id}`, version: '1.0.0' }, tools: [/* Outlook tools */] };
    }
  }
});
```

## Hinweise
- Access Token Weitergabe an Graph nur, wenn Audience/Scopes passen. Sonst OBO‑Flow einplanen.
- Keine `.env`‐Pflicht: Konfigurationswerte aus Code/Secret‑Provider laden.
- Logging ohne Tokens/PII.
