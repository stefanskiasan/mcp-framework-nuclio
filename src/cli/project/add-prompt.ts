import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function addPrompt(name: string) {
  const className = toPascal(name) + 'Prompt';
  const dir = join(process.cwd(), 'src', 'prompts');
  await mkdir(dir, { recursive: true });
  const content = `import { z } from 'zod';

export default class ${className} {
  name = '${name}';
  description = 'Describe the prompt ${name}';
  schema = { text: { type: z.string(), description: 'User text' } };
  async getMessages(args: { text: string }) { return [{ role: 'user', content: { type: 'text', text: args.text } }]; }
}
`;
  await writeFile(join(dir, `${className}.ts`), content);
  console.log(`✔ Created prompt '${name}' at src/prompts/${className}.ts`);
}

function toPascal(s: string){ return s.split(/[-_]/).map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(''); }

