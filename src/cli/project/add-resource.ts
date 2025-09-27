import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function addResource(name: string) {
  const className = toPascal(name) + 'Resource';
  const dir = join(process.cwd(), 'src', 'resources');
  await mkdir(dir, { recursive: true });
  const content = `import { MCPResource, ResourceContent } from 'mcp-framework-nuclio';

export default class ${className} extends MCPResource {
  uri = 'resource://${name}';
  name = '${toPascal(name)}';
  mimeType = 'application/json';
  async read(): Promise<ResourceContent[]> { return [{ uri: this.uri, mimeType: this.mimeType, text: JSON.stringify({ ok: true }) }]; }
}
`;
  await writeFile(join(dir, `${className}.ts`), content);
  console.log(`✔ Created resource '${name}' at src/resources/${className}.ts`);
}

function toPascal(s: string){ return s.split(/[-_]/).map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(''); }

