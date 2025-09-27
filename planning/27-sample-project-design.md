# Sample Project Design (Template)

Ziel: Ein Referenzprojekt, das `mfn create` generiert. Programmatic Auth (auskommentiert), ein Tool und eine Resource, klar dokumentiert.

## Struktur
```
<name>/
  src/
    handler.ts
    tools/
      ExampleTool.ts
    resources/
      HeartbeatResource.ts
  function.yaml
  package.json
  tsconfig.json
  README.md
```

## handler.ts (Skizze)
```ts
import { createNuclioHandler, auth } from 'mcp-framework-nuclio';

// Choose ONE strategy below and uncomment:
// const strategy = auth.none();
// const strategy = auth.apiKey({ headerName: 'X-API-Key', keys: ['change-me'] });
// const strategy = auth.jwt({ secret: 'use-secret-manager', algorithms: ['HS256'] });
// const strategy = auth.keycloak({ issuer: 'https://auth.example.com/realms/my', audience: ['client-id'] });
// const strategy = auth.dynamic((req) => /* return a strategy based on req */ auth.none());

export const handler = createNuclioHandler({
  // auth: strategy,
  limits: { maxBodyBytes: 4 * 1024 * 1024 },
  logging: { debug: false },
});
```

## ExampleTool.ts (Skizze)
```ts
import { MCPTool } from 'mcp-framework-nuclio';
import { z } from 'zod';

interface Input { message: string }
export default class ExampleTool extends MCPTool<Input> {
  name = 'example_tool';
  description = 'Echoes the message';
  schema = { message: { type: z.string(), description: 'Message to echo' } };
  async execute(input: Input) { return `Echo: ${input.message}`; }
}
```

## HeartbeatResource.ts (Skizze)
```ts
import { MCPResource, ResourceContent } from 'mcp-framework-nuclio';

export default class HeartbeatResource extends MCPResource {
  uri = 'resource://heartbeat'; name = 'Heartbeat'; mimeType = 'application/json';
  private c = 0;
  async read(): Promise<ResourceContent[]> {
    return [{ uri: this.uri, mimeType: this.mimeType, text: JSON.stringify({ beat: this.c++ }) }];
  }
}
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
  build:
    commands:
      - npm install
      - npm run build
```

## README (Inhalte)
- Quickstart
- Programmatic Auth (how-to in `src/handler.ts`)
- Example Tool/Resource usage (curl JSON-RPC)
- Build & Deploy (nuctl)

## UX Ziele
- Minimaler Code, starke Kommentare
- Saubere Fehlermeldungen bei falscher Nutzung (z. B. fehlende `.describe()`) 
