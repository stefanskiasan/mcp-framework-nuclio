# Konfigurationsformat

Die Funktion liest eine Datei `config/mcp-nuclio.config.json` (oder `.yaml`) beim Start. Kein Env‑basierter Auth‑Modus. Ziel: reproduzierbare, versionierte Konfiguration im Code/Repo.

## JSON Schema (informell)
```json
{
  "auth": {
    "mode": "none|apikey|jwt|keycloak",
    "apiKey": {
      "headerName": "X-API-Key",
      "keys": ["<redacted>"]
    },
    "jwt": {
      "headerName": "Authorization",
      "requireBearer": true,
      "algorithms": ["HS256"],
      "secretFile": "./secrets/jwt.secret"  
    },
    "keycloak": {
      "issuer": "https://.../realms/...",
      "audience": ["client-id"],
      "headerName": "Authorization",
      "requireBearer": true,
      "algorithms": ["RS256"],
      "jwksUri": null,
      "leeway": 60,
      "tenants": [
        { "host": "host-a", "issuer": "https://.../realms/a", "audience": ["a-cli"] }
      ],
      "default": { "issuer": "https://.../realms/default" }
    }
  },
  "limits": {
    "maxBodyBytes": 4194304
  },
  "logging": {
    "debug": false,
    "file": false,
    "directory": "logs"
  }
}
```

## Hinweise
- Secrets (z. B. HMAC‑JWT‑Secret) nicht im Klartext; stattdessen Datei‑Pfad (`secretFile`) und K8s‑Secret als Volume mounten.
- Multi‑Tenant anhand `Host`‑Header möglich.
- Bei YAML analoges Mapping.

## Lade‑Reihenfolge
1. `./config/mcp-nuclio.config.json` (oder `.yaml`) – verpflichtend
2. Optional: `./config/mcp-nuclio.local.json` – lokale Overrides (Entwicklung)

## Validierung
- Das Framework validiert das Schema beim Start und liefert eine klare Fehlermeldung + 500, wenn Konfiguration ungültig ist.
