# Vision & Leitlinien

mcp-framework-nuclio wird ein leichtgewichtiges Framework, um Model Context Protocol (MCP) Server direkt als Nuclio-Funktionen zu betreiben.

Leitlinien:
- Nuclio-first: Fokus auf HTTP/JSON-RPC (Batch). Keine persistenten Streams (kein SSE/WebSocket), keine Redis-Abhängigkeit.
- Einfachheit vor Vollständigkeit: Das MVP deckt Tools/Prompts/Resources vollständig im Request/Response-Modell ab.
- Serverless-gerecht: Kaltstart, Timeouts, Speicherbudget und Nebenwirkungsfreiheit berücksichtigen.
- Klarer Developer-Flow: `create` → `add` → `build` → `deploy` (nuctl/YAML).
- Sichere Defaults: API-Key/JWT, begrenzte Payload-Größen, defensives Logging.

Nicht-Ziele (MVP):
- Keine Streaming-Transports (SSE/HTTP-Stream) und keine Subscriptions mit Push.
- Keine externe State-/Queue-Abhängigkeiten (z. B. Redis, Kafka).
