# Transport & Protokoll

## Transport
- HTTP POST (Nuclio HTTP Trigger)
- Content‑Type: application/json
- Maximalgröße: konfigurierbar via Env (z. B. 4MB)
- Methoden: ausschließlich POST (OPTIONS für CORS)

## JSON‑RPC 2.0 Mapping
- Request: `{ jsonrpc: "2.0", id, method, params }` (Batch: Array)
- Response: `{ jsonrpc: "2.0", id, result }` oder `{ ..., error }`
- HTTP‑Status:
  - 200: gültige JSON‑RPC Response
  - 400: unlesbares/ungültiges JSON, nicht unterstützte Methoden
  - 401/403: Auth fehlgeschlagen
  - 500: interne Fehler

## MCP‑Methoden (MVP)
- tools/list, tools/call
- prompts/list, prompts/get
- resources/list, resources/read

Nicht im MVP: subscribe/unsubscribe Push‑Pfad (keine Streams).
