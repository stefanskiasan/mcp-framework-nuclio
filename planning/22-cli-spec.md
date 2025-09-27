# CLI Spezifikation – `mfn`

Ziel: Ein schlankes CLI, das Nuclio‑MCP‑Projekte scaffolded, erweitert, baut und optional deployt. Auth‑Konfiguration erfolgt ausschließlich programmatic in `src/handler.ts` – das CLI generiert lediglich kommentierte Snippets.

## Kommandos & Optionen

### `mfn create <name>`
Erzeugt ein neues Projekt.
- Strukturen:
  - `src/handler.ts` (mit kommentierten Auth‑Beispielen: apiKey/jwt/keycloak/dynamic)
  - `src/tools/ExampleTool.ts`
  - `src/resources/ExampleResource.ts`
  - `function.yaml`, `tsconfig.json`, `package.json`
- Optionen:
  - `--no-examples` – kein ExampleTool/Resource
  - `--pm <npm|pnpm|yarn>` – Package Manager wählen (default npm)
- Verhalten:
  - schreibt Dateien, optional `npm install`

### `mfn add tool <name>`
Erzeugt ein Tool mit Zod‑Schema (mit Beschreibungen) und `execute()` Stub.
- Optionen:
  - `--dir <path>` – abweichendes Zielverzeichnis
  - `--http-fetch` – Tool‑Template mit fetch‑Beispiel

### `mfn add prompt <name>`
Erzeugt ein Prompt mit Argument‑Schema.

### `mfn add resource <name>`
Erzeugt eine Resource mit `read()` und optionalen `subscribe()/unsubscribe()` Stubs (auskommentiert, da keine Push‑Subscriptions im MVP).

### `mfn build`
Baut das Projekt (`tsc`) und validiert:
- Tool‑Schemas: jedes Feld benötigt `.describe()`
- Prompt‑Argumente: jedes Feld benötigt `.describe()`

Exit‑Codes: `0` ok, `1` bei Fehlern, Liste der Verstöße wird mit Pfad ausgegeben.

### `mfn validate`
Führt nur die Validierung aus (ohne `tsc`). Praktisch für CI‑Jobs.

### `mfn deploy`
Optionaler Wrapper um `nuctl deploy`.
- Optionen:
  - `--name <fn-name>` – Funktionsname (default aus package.json)
  - `--platform <local|k8s>` – Zielplattform
  - `--project <name>` – optionales Nuclio‑Projekt
  - `--skip-build` – ohne Build/Validate
- Voraussetzung: `nuctl` im PATH.

### `mfn doctor`
Prüft Umgebung: Node‑Version, Nuclio CLI (`nuctl`), Schreibrechte.

## Interaktive Prompts
- Bei fehlenden Argumenten (z. B. bei `create`) fragt das CLI interaktiv.
- Für Auth: `handler.ts` enthält auskommentierte Beispiele; CLI kommentiert Hinweise, nimmt aber keine Secrets entgegen.

## Beispiele
```bash
mfn create my-mcp
mfn add tool fetch-user
mfn build
mfn deploy --name my-mcp --platform local
```

## Nicht‑Ziele des CLI
- Keine Verwaltung von Secrets
- Keine Auth‑Konfiguration über Dateien oder Env (nur Kommentar‑Snippets im Code)
