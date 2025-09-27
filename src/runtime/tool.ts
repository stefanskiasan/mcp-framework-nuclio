import { z } from 'zod';

export type ToolContent = { type: 'text'; text: string } | { type: 'error'; text: string };
export type ToolResponse = { content: ToolContent[] };

export interface ToolContext {
  sessionId?: string;
  tenantId?: string;
  headers: Record<string, string>;
  claims?: Record<string, any>;
}

export type ToolInputSchema<T> = { [K in keyof T]: { type: z.ZodType<T[K]>; description: string } };

export abstract class MCPTool<TInput extends Record<string, any> = any> {
  abstract name: string;
  abstract description: string;
  protected abstract schema: ToolInputSchema<TInput>;

  get inputSchema() {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(this.schema)) {
      properties[k] = { type: zodTypeToJson(v.type), description: v.description };
      // required if not optional
      if (!(v.type instanceof z.ZodOptional)) required.push(k);
    }
    return { type: 'object', properties, required };
  }

  async toolCall(args: Record<string, unknown>, ctx?: ToolContext): Promise<ToolResponse> {
    try {
      const parsed = this.parseArgs(args) as TInput;
      const result = await this.execute(parsed, ctx || { headers: {} });
      if (Array.isArray(result)) {
        const items = result.filter(isToolContent) as ToolContent[];
        if (items.length) return { content: items };
      }
      return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] };
    } catch (e: any) {
      return { content: [{ type: 'error', text: e?.message || String(e) }] };
    }
  }

  protected parseArgs(args: Record<string, unknown>): TInput {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [k, v] of Object.entries(this.schema)) shape[k] = v.type as z.ZodTypeAny;
    const obj = z.object(shape);
    return obj.parse(args) as TInput;
  }

  protected abstract execute(input: TInput, ctx: ToolContext): Promise<unknown>;
}

function isToolContent(x: any): x is ToolContent {
  return x && typeof x === 'object' && (x.type === 'text' || x.type === 'error') && typeof x.text === 'string';
}

function zodTypeToJson(t: z.ZodTypeAny): string {
  if (t instanceof z.ZodOptional) return zodTypeToJson(t._def.innerType);
  if (t instanceof z.ZodString) return 'string';
  if (t instanceof z.ZodNumber) return 'number';
  if (t instanceof z.ZodBoolean) return 'boolean';
  if (t instanceof z.ZodArray) return 'array';
  if (t instanceof z.ZodObject) return 'object';
  return 'string';
}
