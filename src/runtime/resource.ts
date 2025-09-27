export type ResourceContent = { uri: string; mimeType?: string; text?: string };

export abstract class MCPResource {
  abstract uri: string;
  abstract name: string;
  mimeType?: string;
  abstract read(): Promise<ResourceContent[]>;
}

