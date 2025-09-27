import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export async function createProject(name: string, opts: { examples?: boolean; tenants?: boolean } = {}) {
  const target = join(process.cwd(), name);
  if (existsSync(target)) {
    console.error(`✖ Directory already exists: ${target}`);
    process.exit(1);
  }
  await mkdir(join(target, 'src', 'tools'), { recursive: true });
  await mkdir(join(target, 'src', 'resources'), { recursive: true });

  const pkg = {
    name,
    version: '0.1.0',
    type: 'module',
    scripts: { build: 'tsc' },
    dependencies: { 'mcp-framework-nuclio': '^0.0.1', zod: '^3.23.8' },
    devDependencies: { typescript: '^5.3.3', '@types/node': '^20.11.24' }
  };

  const tsconfig = {
    compilerOptions: {
      target: 'ES2022', module: 'ESNext', moduleResolution: 'Node', outDir: './dist', rootDir: './src',
      declaration: false, strict: true, esModuleInterop: true, skipLibCheck: true
    }, include: ['src/**/*'], exclude: ['node_modules']
  };

  const handler = `import { createNuclioHandler, auth, MCPTool, MCPPrompt, MCPResource } from 'mcp-framework-nuclio';

// Server metadata (edit as needed)
const server = { name: '${name}', version: '0.1.0', description: 'My Nuclio MCP server', instructions: 'Use tools to query resources', vendor: 'Your Company' };

// Choose ONE strategy below (programmatic only)
// const strategy = auth.none();
// const strategy = auth.apiKey({ headerName: 'X-API-Key', keys: ['change-me'] });
// const strategy = auth.jwt({ secret: 'use-secret-manager', algorithms: ['HS256'] });
// const strategy = auth.keycloak({ issuer: 'https://auth.example.com/realms/my', audience: ['client-id'] });
const strategy = auth.none();
${opts.tenants ? `
// Optional: dynamic tenants (/mcp/:id). The framework does NOT fetch from DB.
// Implement your own resolve() to load per-tenant config, tools, prompts, resources.
async function resolveTenant({ id }) {
  // Example: statically generate a virtual MCP based on id
  return {
    server: { name: \
      \\`mcp-${name}-\\${id}\\`, version: '0.1.0', description: 'Tenant-scoped MCP', vendor: 'Your Company' },
    transport: { mode: 'http-stream' },
    // You can return tenant-specific tools/prompts/resources arrays, or leave empty to use project defaults in dist/*
    tools: [], prompts: [], resources: []
  };
}
` : ''}

export const handler = createNuclioHandler({
  server,
  auth: strategy,
  transport: { mode: ${opts.tenants ? `'http-stream'` : `'batch'`}, endpoints: { mcp: '/mcp' } },
  ${opts.tenants ? `tenants: { route: '/mcp/:id', resolve: resolveTenant }` : ``}
});
`;

  const tool = `import { MCPTool, ToolContext } from 'mcp-framework-nuclio';
import { z } from 'zod';

interface Input { message: string }
export default class ExampleTool extends MCPTool<Input> {
  name = 'example_tool';
  description = 'Echoes the message';
  schema = { message: { type: z.string(), description: 'Message to echo' } };
  async execute(input: Input, ctx: ToolContext) {
    const who = ctx.claims?.email || ctx.claims?.preferred_username || 'anonymous';
    return `Echo: ${input.message} (by ${who})`;
  }
}
`;

  const resource = `import { MCPResource, ResourceContent } from 'mcp-framework-nuclio';

export default class HeartbeatResource extends MCPResource {
  uri = 'resource://heartbeat'; name = 'Heartbeat'; mimeType = 'application/json';
  private c = 0;
  async read(): Promise<ResourceContent[]> {
    return [{ uri: this.uri, mimeType: this.mimeType, text: JSON.stringify({ beat: this.c++ }) }];
  }
}
`;

  const fn = `spec:\n  runtime: nodejs\n  handler: handler:handler\n  triggers:\n    http:\n      class: http\n      kind: http\n      attributes:\n        methods: [GET, POST, OPTIONS]\n        maxRequestBodySize: 4194304\n  build:\n    commands:\n      - npm install\n      - npm run build\n`;

  await writeFile(join(target, 'package.json'), JSON.stringify(pkg, null, 2));
  await writeFile(join(target, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  await writeFile(join(target, 'function.yaml'), fn);
  await writeFile(join(target, 'src', 'handler.ts'), handler);
  if (opts.examples !== false) {
    await writeFile(join(target, 'src', 'tools', 'ExampleTool.ts'), tool);
    await writeFile(join(target, 'src', 'resources', 'HeartbeatResource.ts'), resource);
  }

  console.log(`✔ Project created at ${target}`);
  console.log(`ℹ Run 'npm install' then 'npm run build'.`);
}
