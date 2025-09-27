import { z } from 'zod';

export type ZodLike = z.ZodTypeAny;

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  [k: string]: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, JSONSchemaProperty>; required?: string[] };
}

export type ToolResponse = { content: Array<{ type: 'text' | 'error'; text: string } | { type: 'image'; data: string; mimeType: string }> };

export abstract class MCPTool<TInput extends Record<string, any> = any> {
  abstract name: string;
  abstract description: string;
  protected abstract schema: Record<string, { type: ZodLike; description: string }> | z.ZodObject<any>;

  validate(): void {
    if (this.isZodObject(this.schema)) {
      const shape = (this.schema as z.ZodObject<any>).shape;
      for (const [k, v] of Object.entries(shape)) {
        if (!(v as any)._def?.description) throw new Error(`Missing descriptions for fields: ${k}`);
      }
    } else {
      for (const [k, v] of Object.entries(this.schema)) {
        if (!v.description) throw new Error(`Missing descriptions for fields: ${k}`);
      }
    }
  }

  get toolDefinition(): ToolDefinition {
    if (this.isZodObject(this.schema)) {
      const shape = (this.schema as z.ZodObject<any>).shape;
      const properties: Record<string, JSONSchemaProperty> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(shape)) {
        const isOptional = v instanceof z.ZodOptional || v instanceof z.ZodNullable;
        const base: any = isOptional ? (v as any)._def.innerType || (v as any).unwrap() : v;
        properties[k] = { type: inferType(base), description: (base as any)._def?.description };
        if (!isOptional) required.push(k);
      }
      return { name: this.name, description: this.description, inputSchema: { type: 'object', properties, ...(required.length? { required }: {}) } };
    }
    const props: Record<string, JSONSchemaProperty> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(this.schema)) {
      props[k] = { type: inferType(v.type), description: v.description };
      if (!(v.type instanceof z.ZodOptional)) required.push(k);
    }
    return { name: this.name, description: this.description, inputSchema: { type: 'object', properties: props, ...(required.length? { required }: {}) } };
  }

  protected abstract execute(input: TInput): Promise<unknown> | unknown;

  async toolCall(args: Record<string, unknown> = {}): Promise<ToolResponse> {
    try {
      const input = this.parseArgs(args) as TInput;
      const result = await this.execute(input);
      return normalizeResult(result);
    } catch (e: any) {
      return { content: [{ type: 'error', text: e?.message || String(e) }] };
    }
  }

  private parseArgs(args: Record<string, unknown>): any {
    if (this.isZodObject(this.schema)) return (this.schema as z.ZodObject<any>).parse(args);
    const shape: Record<string, ZodLike> = {};
    for (const [k, v] of Object.entries(this.schema)) shape[k] = v.type;
    return z.object(shape).parse(args);
  }

  private isZodObject(x: any): x is z.ZodObject<any> { return x instanceof z.ZodObject; }
}

function inferType(t: any): string {
  if (t instanceof z.ZodString) return 'string';
  if (t instanceof z.ZodNumber) return 'number';
  if (t instanceof z.ZodBoolean) return 'boolean';
  if (t instanceof z.ZodArray) return 'array';
  if (t instanceof z.ZodObject) return 'object';
  return 'string';
}

function normalizeResult(result: unknown): ToolResponse {
  if (Array.isArray(result)) {
    const content: any[] = [];
    for (const item of result) {
      if (typeof item === 'object' && item && 'type' in item) content.push(item);
    }
    if (content.length) return { content };
  }
  if (typeof result === 'string') return { content: [{ type: 'text', text: result }] };
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}

