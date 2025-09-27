# Beispiel‑Funktion: Layout & Handler

## Layout
```
<proj>/
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

## handler.ts
```ts
import { nuclioHandler as handler } from 'mcp-framework-nuclio';
export { handler };
```

## function.yaml (Skizze)
```yaml
spec:
  runtime: nodejs
  handler: handler:handler
  triggers:
    http:
      class: http
      kind: http
      attributes:
        methods: [POST, OPTIONS]
        maxRequestBodySize: 4194304
  env:
    - name: NUCLIO_MCP_AUTH
      value: "apikey"
    - name: NUCLIO_API_KEYS
      value: "change-me"
```
