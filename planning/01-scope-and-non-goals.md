# Scope & Non‑Goals

## Scope (MVP)
- Laufzeitumgebung: Nuclio (Node.js Runtime)
- Transport: HTTP + JSON‑RPC 2.0, Batch‑fähig
- Features:
  - Tools: Auflisten, Aufruf (tools/list, tools/call)
  - Prompts: Auflisten, Abrufen (prompts/list, prompts/get)
  - Resources: Auflisten, Lesen (resources/list, resources/read)
- CLI: `mfn` (mcp-framework-nuclio CLI) für Projekt‑Scaffold, Add‑Befehle, Build, Nuclio‑Deploy (optional via nuctl)
- Auth: API‑Key & JWT (konfigurierbar über Env)
- Logging: stderr + optionale Dateiablage über Env
- Konfiguration: ENV‑Variablen + function.yaml Defaults

## Non‑Goals (MVP)
- Keine SSE/HTTP‑Stream Persistenz, keine Subscriptions mit Push
- Keine externen Queues/Stores (Redis, Kafka, DB)
- Kein vendor‑übergreifender FaaS‑Support (nur Nuclio)
