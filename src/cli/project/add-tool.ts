import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function addTool(name: string, opts: { template?: string } = {}) {
  const className = toPascal(name) + 'Tool';
  const dir = join(process.cwd(), 'src', 'tools');
  await mkdir(dir, { recursive: true });
  const content = opts.template === 'outlook-send-mail'
    ? outlookSendMailTemplate(className, name)
    : defaultTemplate(className, name);
  await writeFile(join(dir, `${className}.ts`), content);
  console.log(`✔ Created tool '${name}' at src/tools/${className}.ts`);
}

function defaultTemplate(className: string, name: string) {
  return `import { MCPTool, ToolContext } from 'mcp-framework-nuclio';
import { z } from 'zod';

interface Input { example: string }
export default class ${className} extends MCPTool<Input> {
  name = '${name}';
  description = 'Describe what ${name} does';
  schema = { example: { type: z.string(), description: 'Example input' } };
  async execute(input: Input, ctx: ToolContext) { return { echo: input.example, sessionId: ctx.sessionId, tenantId: ctx.tenantId }; }
}
`;
}

function toPascal(s: string){ return s.split(/[-_]/).map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(''); }

function outlookSendMailTemplate(className: string, name: string) {
  return `import { MCPTool, ToolContext } from 'mcp-framework-nuclio';
import { z } from 'zod';

interface Input { to: string; subject: string; body: string }
/**
 * Stub for Microsoft Graph send mail via Outlook.
 * This is a planning-only skeleton. It does NOT perform any Graph calls.
 * Use ctx.claims and a validated access token to call Graph in your codebase.
 */
export default class ${className} extends MCPTool<Input> {
  name = '${name}';
  description = 'Send an email through Outlook (stub)';
  schema = {
    to: { type: z.string(), description: 'Recipient email address' },
    subject: { type: z.string(), description: 'Email subject' },
    body: { type: z.string(), description: 'Email body (text)' },
  };

  async execute(input: Input, ctx: ToolContext) {
    const user = ctx.claims?.preferred_username || ctx.claims?.email || 'unknown-user';
    // TODO: Implement Microsoft Graph call using a validated access token.
    // 1) Validate ctx.claims scopes (e.g., Mail.Send)
    // 2) Acquire token/OBO if needed
    // 3) POST https://graph.microsoft.com/v1.0/me/sendMail with payload
    return {
      planned: true,
      dryRun: true,
      wouldSend: { from: user, to: input.to, subject: input.subject, bodyPreview: input.body.slice(0, 64) },
      note: 'This is a stub. Implement Graph call in your project.'
    };
  }
}
`;
}
