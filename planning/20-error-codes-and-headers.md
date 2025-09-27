# Fehlercodes & Header (Programmatic Spec)

Dieses Dokument definiert die verbindliche Abbildung von Fehlerfällen auf HTTP‑Status, JSON‑RPC Error Codes und relevante HTTP‑Header.

## Grundprinzipien
- HTTP spiegelt Transport-/Authentifizierungsfehler wider.
- JSON‑RPC spiegelt Protokoll-/Methodenfehler wider (immer `jsonrpc: "2.0"`).
- Keine Geheimnisse im Body/Headers; generische und sichere Formulierungen.

## HTTP Status Mapping
- 200 OK – Erfolgreiche JSON‑RPC Response (single/batch)
- 400 Bad Request – Ungültiger Content‑Type/Body/JSON, unzulässige Struktur
- 401 Unauthorized – Fehlende/ungültige Credentials (API‑Key/JWT/Keycloak)
- 403 Forbidden – AuthN ok, aber fehlende Berechtigung (nur wenn AuthZ aktiviert)
- 415 Unsupported Media Type – Content‑Type ≠ `application/json`
- 413 Payload Too Large – Überschreitung `limits.maxBodyBytes`
- 500 Internal Server Error – Unerwarteter Serverfehler

## JSON‑RPC Error Codes
- -32700 Parse error – JSON parse fehlgeschlagen
- -32600 Invalid Request – Struktur nicht konform (kein `jsonrpc: "2.0"`, falsche Felder)
- -32601 Method not found – Unbekannte Methode
- -32602 Invalid params – Parameter ungültig (z. B. Zod‑Validation)
- -32000 Server error – Interner Fehler (Fallback)

## Auth-spezifische Header
- `WWW-Authenticate` bei 401
  - API‑Key: `ApiKey realm="MCP Server", header="X-API-Key"`
  - JWT/HMAC: `Bearer realm="MCP Server", error="invalid_token"`
  - Keycloak/OIDC: `Bearer realm="MCP Server", error="invalid_token"`

## Response-Header (empfohlen)
- `Mcp-Transport: nuclio-batch`
- `Mcp-Request-Id: <uuid>`
- CORS‑Header (falls aktiviert): `Access-Control-Allow-*`

## Beispiele
### 1) Ungültiges JSON
- HTTP 400
- Body:
```json
{ "jsonrpc": "2.0", "id": null, "error": { "code": -32700, "message": "Invalid JSON" } }
```

### 2) Fehlende Credentials (API‑Key)
- HTTP 401
- Header: `WWW-Authenticate: ApiKey realm="MCP Server", header="X-API-Key"`
- Body:
```json
{ "jsonrpc": "2.0", "id": null, "error": { "code": -32000, "message": "Unauthorized" } }
```

### 3) Unbekannte Methode
- HTTP 400 (oder 200, je nach Policy); empfohlen: 400
- Body:
```json
{ "jsonrpc": "2.0", "id": 1, "error": { "code": -32601, "message": "Method not found" } }
```

### 4) Zod-Validationfehler
- HTTP 400
- Body:
```json
{ "jsonrpc": "2.0", "id": 2, "error": { "code": -32602, "message": "Invalid params", "data": { "issues": [/* gekürzt */] } } }
```

### 5) Interner Fehler
- HTTP 500
- Body:
```json
{ "jsonrpc": "2.0", "id": 3, "error": { "code": -32000, "message": "Internal error" } }
```

## Logging (Fehler)
- Enthält `requestId`, `method` (falls vorhanden), `status`, `errorCode` und knappe Beschreibung
- Keine sensiblen Header/Token

