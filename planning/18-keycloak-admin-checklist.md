# Keycloak Admin Checkliste (für programmatic Auth)

Ziel: Einrichten von Keycloak als OIDC‑Provider, inkl. optionaler Upstream‑IDPs (Microsoft Entra ID, Google). Der Nuclio‑Handler verifiziert Access Tokens lokal (JWKS) – keine Introspection.

## 1) Realm anlegen (oder bestehendes nutzen)
- Realm‑Name z. B. `mcp`
- Token‑Signatur: Standard RS256 beibehalten
- Token‑Lebensdauer: Access Token 5–15 min (je nach Sicherheitsanforderung)

## 2) Client (Ressource) anlegen
- Client‑ID: z. B. `mcp-client`
- Client‑Typ: „public“ (für Desktop/CLI Flows) oder „confidential“ (falls Backend‑Flow nötig)
- Standard Flow: Authorization Code (PKCE empfohlen für Public Clients)
- Allowed CORS / Redirect URIs: abhängig vom OAuth‑Client, nicht vom Nuclio‑Handler (der liest nur Tokens)

## 3) Client‑Scopes / Audience
- Stelle sicher, dass Access Tokens eine geeignete `aud` enthalten:
  - Option A: „aud“ als `mcp-client`
  - Option B: Resource Audience via „Client Scopes“ hinzufügen
- Optional: Rollen/Claims mappen (z. B. realm_access.roles)

## 4) JWKS & OIDC Discovery prüfen
- Well‑Known: `https://<kc-host>/realms/<realm>/.well-known/openid-configuration`
- JWKS URI: aus Well‑Known lesen (z. B. `/protocol/openid-connect/certs`)
- Signatur‑Algorithmus: RS256 (Empfehlung)

## 5) Upstream‑IDPs (Microsoft, Google) hinzufügen (optional)
- In Keycloak → Identity Providers → „OpenID Connect v1“ auswählen
- Microsoft Entra ID: Client ID/Secret, Autorisierungsendpunkte; Claim‑Mappers für Email/Name/Roles
- Google: analog; sichere Redirect‑URIs in Keycloak setzen
- Test: Benutzer über IDP anmelden, Token in Keycloak ausstellen lassen

## 6) Sicherheitsempfehlungen
- Rollen/Attribute in Access Token minimal halten (Data‑Minimierung)
- Kein Klartext‑Secret im Token (nur Signaturprüfung, keine sensiblen Infos)
- Token‑Lebensdauer eher kurz; optional Refresh Token für Clients

## 7) Kompatibilität mit dem Handler (Code‑Konfiguration)
- Im Code `issuer` auf den Realm‑Issuer setzen (z. B. `https://<kc-host>/realms/<realm>`)
- `audience` auf die erwartete Client‑ID (oder Liste) setzen
- Algorithmen: `['RS256']`
- Optional: `jwksUri` überschreiben, sonst Discovery nutzen
- Optional: Multi‑Tenant – per Hostname zu unterschiedlichen Issuern routen

## 8) Tests
- Gültiges Token gegen Handler: 200
- Falscher Issuer/Audience: 401
- Abgelaufen: 401
- Falscher `kid`/Key‑Roll: JWKS wird neu geladen → erneut verifizieren

## Notizen
- Der Handler speichert keine Secrets; er verifiziert nur Signaturen.
- Programmatic Setup: Alle Werte werden im Code gesetzt (keine Env/Datei für Auth).

