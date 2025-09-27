# Anforderungen

## Funktionale Anforderungen
1. HTTP‑Endpoint akzeptiert JSON‑RPC 2.0 (single oder batch) und antwortet synchron.
2. Unterstützt vollständige MCP‑Methoden für Tools/Prompts/Resources (ohne Subscription‑Push).
3. Fehlertolerante Validierung (saubere Fehlermeldungen, HTTP 400/401/403/500 mappen).
4. CLI erzeugt Nuclio‑fähige Projektstruktur (TypeScript), inkl. function.yaml Schablone.
5. Buildprozess compiliert TS → JS (dist/*) und validiert Tool‑Schemata (Zod‑Beschreibungen).

## Nicht‑funktionale Anforderungen
1. Kaltstart < 1s (Ziel, abhängig von Umgebung/Toolanzahl).
2. Antwortzeit < 500ms für einfache Methoden (ohne externe IO).
3. Speicherbudget < 256 MB im Normalfall (konfigurierbar).
4. Sicherheitsanforderungen: Auth verpflichtend aktivierbar, begrenzte Payloadgröße, Logging ohne Secrets.
5. Portabilität: Keine externen Services nötig; reines Nuclio + Node.
