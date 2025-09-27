import { z } from 'zod';

export type PromptArgSchema<T> = { [K in keyof T]: { type: z.ZodType<T[K]>; description: string; required?: boolean } };

export abstract class MCPPrompt<TArgs extends Record<string, any> = {}> {
  abstract name: string;
  abstract description: string;
  protected abstract schema: PromptArgSchema<TArgs>;

  async getMessages(args: Record<string, unknown> = {}) {
    const zobj = z.object(Object.fromEntries(Object.entries(this.schema).map(([k, v]) => [k, v.type as z.ZodTypeAny])));
    const a = zobj.parse(args) as TArgs;
    return this.generateMessages(a);
  }

  protected abstract generateMessages(args: TArgs): Promise<Array<{ role: string; content: { type: string; text: string } }>>;
}

