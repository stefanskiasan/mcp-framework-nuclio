# Architektur

## High‑Level
- Nuclio HTTP Trigger → JSON‑RPC Router → MCP SDK Server → Tools/Prompts/Resources
- Keine langlebigen Verbindungen. Jeder HTTP Request liefert alle Antworten synchron.

## Komponenten
- NuclioAdapter
  - Mapper zwischen HTTP/JSON und JSON‑RPC 2.0
  - Validiert Content‑Type, Body‑Größe, Auth
  - Konfigurierbar via Env
- MCPApp (leichtgewichtiger Kern)
  - Lädt Tools/Prompts/Resources aus `dist/`
  - Registriert Handler im MCP SDK Server
  - Kein eigener Netzwerk‑Transport nötig, nutzt InMemory‑Loop zum SDK Server
- SchemaValidator
  - Prüft Zod‑Schemata auf Beschreibungen während Build und optional beim Start

## Datenfluss
1) HTTP POST /mcp (JSON‑RPC) → Adapter parst, prüft Auth
2) Adapter injiziert Requests in App/SDK → App ausführen → Resultate
3) Adapter serialisiert JSON‑RPC Response, sendet 200/4xx/5xx

## Limits/Time‑outs
- Timeouts von Nuclio müssen in function.yaml beachtet werden
- Lange Tool‑Tasks sind zu vermeiden oder aufzuteilen (keine Streams)
