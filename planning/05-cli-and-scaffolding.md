# CLI & Scaffolding (mfn)

Ziele: Ein klarer, minimaler Workflow für Nuclio‑Funktionen.

## Befehle
- `mfn create <name>`
  - Legt Projekt an: `src/handler.ts`, `src/tools/ExampleTool.ts`, `src/resources/ExampleResource.ts`, `tsconfig.json`, `function.yaml`, `package.json`
  - handler.ts enthält programmatic Auth‑Snippet (auskommentiert), das der Nutzer nach Bedarf anpasst
- `mfn add tool <name>` / `mfn add prompt <name>` / `mfn add resource <name>`
  - Erstellt TS‑Datei mit Zod‑Schema (Tools) oder Argumenten‑Schema (Prompts)
- `mfn build`
  - `tsc` + Schema‑Validierung (Zod‑Beschreibungen)
- `mfn deploy`
  - optionaler Wrapper für `nuctl deploy` (wenn nuctl vorhanden)

## Projektstruktur
```
<name>/
  src/
    handler.ts
    tools/
    prompts/
    resources/
  dist/
  function.yaml
  package.json
  tsconfig.json
```

## Handler
- `src/handler.ts`: `import { createNuclioHandler, auth } from 'mcp-framework-nuclio'`
  - Kommentierte Snippets (programmatic only):
    - Server‑Metadaten:
      ```ts
      const server = { name: 'my-mcp', version: '1.0.0', description: '...', instructions: '...', vendor: 'ACME' };
      ```
    - Auth‑Strategien: `auth.none() | auth.apiKey(...) | auth.jwt(...) | auth.keycloak(...) | auth.dynamic(...)`
    - Transport: `transport: { mode: 'batch' | 'sse' | 'http-stream', endpoints: { sse: '/sse', messages: '/messages' } }`
  - Minimaler Export:
    ```ts
    export const handler = createNuclioHandler({ server, auth: auth.none(), transport: { mode: 'batch' } });
    ```

## Build/Deploy
- Build: `npm run build`
- Deploy: `nuctl deploy ...` (function.yaml Werte verwenden)
