export type RequestId = string | number | null;

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id?: RequestId;
  method: string;
  params?: any;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: RequestId;
  result?: any;
  error?: JSONRPCError;
}

export type JSONRPCMessage = JSONRPCRequest | JSONRPCResponse;

export interface IncomingLike {
  headers: Record<string, string | string[] | undefined>;
}

export interface NoneAuth { mode: 'none' }
export interface ApiKeyAuth { mode: 'apikey'; headerName?: string; keys: string[] }
export interface JwtAuth { mode: 'jwt'; headerName?: string; requireBearer?: boolean; algorithms?: string[]; secret: string }
export interface KeycloakAuth { mode: 'keycloak'; issuer: string; audience?: string | string[]; headerName?: string; requireBearer?: boolean; algorithms?: string[]; jwksUri?: string | null; leeway?: number }
export interface DynamicAuth { mode: 'dynamic'; provider: (req: IncomingLike) => AuthStrategy }
export type AuthStrategy = NoneAuth | ApiKeyAuth | JwtAuth | KeycloakAuth | DynamicAuth;

export interface ServerOptions {
  name: string;
  version: string;
  description?: string;
  instructions?: string;
  vendor?: string;
}

export interface TransportOptions {
  mode?: 'batch' | 'sse' | 'http-stream';
  endpoints?: { mcp?: string };
  keepAliveMs?: number;
}

export interface NuclioHandlerOptions {
  auth?: AuthStrategy;
  limits?: { maxBodyBytes?: number };
  logging?: { debug?: boolean; toFile?: boolean; directory?: string };
  server?: ServerOptions;
  transport?: TransportOptions;
  tenants?: TenantsOptions;
}

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

export interface TenantsOptions {
  /** default '/mcp/:id' */
  route?: string;
  resolve: ResolveTenant;
  dispose?: DisposeTenant;
}

export type ResolveTenant = (ctx: ResolveTenantContext) => Promise<VirtualMcp | null>;
export type DisposeTenant = (ctx: { id: string }) => Promise<void> | void;

export interface ResolveTenantContext {
  id: string;
  req: { method: 'GET'|'POST'; headers: Record<string, string> };
  sessionId?: string;
  claims?: Record<string, unknown>;
  authMode?: 'none'|'apikey'|'jwt'|'keycloak';
}

export interface VirtualMcp {
  server: ServerOptions;
  auth?: AuthStrategy;
  transport?: { mode?: 'batch'|'sse'|'http-stream' };
  tools?: any[];
  prompts?: any[];
  resources?: any[];
}
