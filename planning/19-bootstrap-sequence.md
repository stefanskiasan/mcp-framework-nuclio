# Bootstrap‑Sequenz (Handler)

Diese Sequenz beschreibt den Start‑ und Request‑Pfad des Nuclio‑Handlers in mcp-framework-nuclio.

## Start (Kaltstart/Warmstart)
1. Logging initialisieren (debug on/off)
2. createNuclioHandler(opts) ausführen:
   - Validierung der Optionen (auth, limits)
   - Aufbau der Auth‑Strategie (z. B. Keycloak: optional OIDC Discovery, JWKS‑Remote erstellen)
   - MCPApp initialisieren: Tools/Prompts/Resources aus `dist/` laden, SDK‑Server registrieren
   - InMemory‑Loop/Transport mit SDK verbinden
3. Optionales Pre‑Warm (lazy): erster Request kann JWKS‑Fetch triggern

## Request‑Pfad (jedes HTTP POST)
1. Request‑ID erzeugen (für Logs)
2. Content‑Type: `application/json` erfordern; Größe ≤ `limits.maxBodyBytes`
3. JSON parse (single oder batch Array)
4. Auth:
   - Strategy ‚none‘ → weiter
   - Strategy ‚apikey/jwt/keycloak‘ → Header prüfen & verifizieren; Fehler → 401/403
5. JSON‑RPC Dispatch:
   - Für jedes Message‑Objekt: in SDK injizieren, Ergebnis sammeln
   - Methoden: tools/list, tools/call, prompts/list, prompts/get, resources/list, resources/read
6. Response:
   - Single: Objekt
   - Batch: Array
   - HTTP 200 bei Erfolg; Fehler → JSON‑RPC error + geeigneter HTTP Code (400/401/403/500)

## Fehlerabbildung (empfohlen)
- JSON Parse‑Fehler → 400 Bad Request
- Unsupported Content‑Type → 415 Unsupported Media Type
- Auth fehlgeschlagen → 401 Unauthorized (WWW‑Authenticate) / 403 Forbidden
- Unbekannte Methode → 400 (oder JSON‑RPC error code -32601)
- Serverfehler → 500

## Performance‑Hinweise
- JWKS Cache (RS256) mit TTL; Reload bei `kid`‑Mismatch
- Tools/Prompts/Resources beim Start laden; bei großen Projekten optional „on demand“ (später)
- Keine Streams/Push: Antworten sind deterministisch, keine Leaks offener Verbindungen

## Tests (E2E‑Sicht)
- Happy path: tools/list, tools/call
- Fehlerfälle: großer Body, falscher Content‑Type, ungültiges JSON, fehlendes Token
- Keycloak: gültig/abgelaufen/falsche audience

