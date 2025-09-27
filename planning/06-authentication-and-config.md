# Authentifizierung & Konfiguration

## Auth
- API‑Key (Header: `X-API-Key`, konfigurierbar)
- JWT (Header: `Authorization`/`Bearer`, Algorithmen konfigurierbar)
- Keycloak (OIDC/JWT‑Verifikation gegen JWKS, siehe 15-auth-keycloak-oidc.md)
- Wichtig: Keine Konfiguration über Environment‑Variablen oder externe Dateien – die Auth wird ausschließlich programmatic über Code gesetzt (siehe 17-auth-code-config.md).

## Konfiguration – ausschließlich via Code (statt Env/Datei)
Die Authentifizierung wird in der Bootstrap‑Phase des Handlers per Code gesetzt (Builder/Factory). Parameter wie Issuer/Audience werden in Code injiziert (z. B. aus sicheren Secret‑APIs, nicht aus Env). Details in 17-auth-code-config.md.
- `NUCLIO_MAX_BODY_BYTES=4194304`
- `NUCLIO_DEBUG=true`
- `NUCLIO_LOG_TO_FILE=true`
- `NUCLIO_LOG_DIR=logs`

## function.yaml Defaults
- HTTP Trigger (POST, OPTIONS), maxRequestBodySize, ggf. Timeouts/Replicas
