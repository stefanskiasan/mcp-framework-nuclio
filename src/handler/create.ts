import { NuclioHandlerOptions, JSONRPCRequest, JSONRPCResponse, RequestId, AuthStrategy, IncomingLike } from '../types.js';
import { verifyAuth } from '../auth/verify.js';

function json(data: any) { return JSON.stringify(data); }

function rpcError(id: RequestId, code: number, message: string, data?: any): JSONRPCResponse {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } };
}

function rpcResult(id: RequestId, result: any): JSONRPCResponse {
  return { jsonrpc: '2.0', id, result };
}

function toArray<T>(maybeArray: T | T[]): T[] { return Array.isArray(maybeArray) ? maybeArray : [maybeArray]; }

function readBody(event: any): { ok: boolean; value?: any; error?: JSONRPCResponse } {
  const ct = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toString();
  if (!ct.includes('application/json')) {
    return { ok: false, error: rpcError(null, -32600, 'Unsupported content-type') };
  }
  const raw = typeof event.body === 'string' ? event.body : (Buffer.isBuffer(event.body) ? event.body.toString('utf-8') : '');
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) return { ok: false, error: rpcError(null, -32700, 'Invalid JSON') };
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: rpcError(null, -32700, 'Invalid JSON') };
  }
}

function authCheck(auth: AuthStrategy | undefined, req: IncomingLike): { ok: boolean; status?: number; headers?: Record<string,string>; body?: string } {
  if (!auth || auth.mode === 'none') return { ok: true };
  if (auth.mode === 'dynamic') return authCheck(auth.provider(req), req);
  if (auth.mode === 'apikey') {
    const name = (auth.headerName || 'X-API-Key').toLowerCase();
    const v = req.headers[name];
    const key = Array.isArray(v) ? v[0] : v;
    if (!key || !auth.keys.includes(key)) {
      return { ok: false, status: 401, headers: { 'WWW-Authenticate': `ApiKey realm="MCP Server", header="${auth.headerName || 'X-API-Key'}"` }, body: json(rpcError(null, -32000, 'Unauthorized')) };
    }
    return { ok: true };
  }
  // For MVP skeleton: accept any Bearer token (no real JWT/JWKS in skeleton)
  if (auth.mode === 'jwt' || auth.mode === 'keycloak') {
    const name = (auth.headerName || 'Authorization').toLowerCase();
    const v = req.headers[name];
    const token = Array.isArray(v) ? v[0] : v;
    if (!token || (auth.requireBearer !== false && !token.toString().startsWith('Bearer '))) {
      return { ok: false, status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="MCP Server", error="invalid_token"' }, body: json(rpcError(null, -32000, 'Unauthorized')) };
    }
    return { ok: true };
  }
  return { ok: true };
}

export function createNuclioHandler(options: NuclioHandlerOptions = {}) {
  const defaultMcpPath = options.transport?.endpoints?.mcp || '/mcp';
  const keepAliveMs = options.transport?.keepAliveMs ?? 15000;

  // In-memory connection + session mapping (single instance)
  const connections = new Map<string, { active: boolean; lastActivity: number; sessionId: string; queue: string[]; writer?: { write: (s: string)=>void; end?: ()=>void }; ping?: any }>();
  const sessions = new Map<string, { created: number }>();
  const sessionToConnections = new Map<string, Set<string>>();

  const genId = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const now = () => Date.now();
  const fmtSse = (obj: any) => `data: ${JSON.stringify(obj)}\n\n`;

  // Lazy app loading
  let loaded = false;
  let tools: any[] = [];
  let prompts: any[] = [];
  let resources: any[] = [];
  async function ensureLoaded() {
    if (loaded) return;
    const { loadTools, loadPrompts, loadResources } = await import('../loader.js');
    tools = await loadTools();
    prompts = await loadPrompts();
    resources = await loadResources();
    loaded = true;
  }

  function matchTenant(pathname: string, routePattern?: string): { id: string } | null {
    const pattern = (routePattern || '/mcp/:id').replace(/\/$/, '');
    const rx = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(':id', '([^/]+)') + '$');
    const m = pathname.replace(/\/$/, '').match(rx);
    if (!m) return null;
    return { id: decodeURIComponent(m[1]) };
  }

  return async function handler(context: any, event: any) {
    const lowerHeaders: Record<string,string> = Object.fromEntries(
      Object.entries(event.headers || {}).map(([k,v]) => [k.toLowerCase(), Array.isArray(v)? v[0].toString(): (v??'').toString()])
    );

    const reqLike: IncomingLike = { headers: lowerHeaders };

    // Per-request tenant resolution and transport mode
    const rawPath0 = (event.path || event.url || '').toString();
    const url0 = new URL(rawPath0, 'http://localhost');
    const path0 = url0.pathname;
    const tenantMatch0 = options.tenants ? matchTenant(path0, options.tenants.route) : null;
    let virtual0: any | null = null;
    if (tenantMatch0 && options.tenants?.resolve) {
      const ctx0 = { id: tenantMatch0.id, req: { method: event.method as 'GET'|'POST', headers: lowerHeaders }, sessionId: (lowerHeaders['mcp-session-id'] as string|undefined), authMode: (options.auth?.mode as any) };
      virtual0 = await options.tenants.resolve(ctx0);
      if (!virtual0) {
        return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: json(rpcError(null, -32601, 'Tenant not found')) };
      }
    }
    const effectiveTransportMode = (virtual0?.transport?.mode || options.transport?.mode || 'batch') as 'batch'|'sse'|'http-stream';
    const mcpPath = defaultMcpPath;

    // Streaming: single MCP endpoint per spec
    if (effectiveTransportMode !== 'batch') {
      const rawPath = (event.path || event.url || '').toString();
      const url = new URL(rawPath, 'http://localhost');
      const path = url.pathname;
      const accept = lowerHeaders['accept'] || '';
      // SSE stream: GET /mcp (or /mcp/:id) with Accept: text/event-stream
      if (event.method === 'GET' && (path === mcpPath || (options.tenants && matchTenant(path, options.tenants.route))) && accept.includes('text/event-stream')) {
        // Require session id and verify auth (tenant-aware)
        const sessHeader = lowerHeaders['mcp-session-id'];
        const sessionId = Array.isArray(sessHeader) ? sessHeader[0] : sessHeader;
        if (!sessionId) {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: json(rpcError(null, -32600, 'Missing Mcp-Session-Id')) };
        }
        const a0 = await verifyAuth(virtual0?.auth || options.auth, reqLike);
        if (!a0.ok) return { statusCode: a0.status, headers: { 'Content-Type': 'application/json', ...(a0.headers||{}) }, body: a0.body };
        // Create or accept connectionId
        const qId = url.searchParams.get('connectionId') || undefined;
        const connectionId = qId || genId();
        const existing = connections.get(connectionId);
        if (!existing) connections.set(connectionId, { active: true, lastActivity: now(), sessionId, queue: [] });
        const conn = connections.get(connectionId)!;
        // map session -> connection
        let set = sessionToConnections.get(sessionId);
        if (!set) { set = new Set<string>(); sessionToConnections.set(sessionId, set); }
        set.add(connectionId);
        const eventLines = [`event: connectionId\ndata: ${connectionId}\n\n`];
        const flush = conn.queue.join('');
        conn.queue = [];
        // Try to attach writer for live streaming
        const writer = (context?.response && typeof context.response.write === 'function') ? context.response as any
                    : (context?.res && typeof context.res.write === 'function') ? context.res as any
                    : null;
        if (writer) {
          conn.writer = { write: (s: string) => { try { writer.write(s); } catch {} }, end: () => { try { writer.end?.(); } catch {} } };
          // Initial write
          conn.writer.write(eventLines.join(''));
          if (flush) conn.writer.write(flush);
          // KeepAlive ping timer
          if (conn.ping) { try { clearInterval(conn.ping); } catch {} }
          conn.ping = setInterval(() => {
            if (!conn.active) { try { clearInterval(conn.ping); } catch {} ; return; }
            conn.writer!.write(`data: {"jsonrpc":"2.0","method":"ping"}\n\n`);
          }, keepAliveMs);
          // Attach cleanup handlers
          const resObj = (context?.response || context?.res);
          const cleanup = () => {
            conn.active = false;
            if (conn.ping) { try { clearInterval(conn.ping); } catch {} }
            connections.delete(connectionId);
            const sset = sessionToConnections.get(sessionId);
            if (sset) { sset.delete(connectionId); if (sset.size === 0) sessionToConnections.delete(sessionId); }
          };
          if (resObj && typeof resObj.on === 'function') {
            try { resObj.on('close', cleanup); resObj.on('finish', cleanup); resObj.on('error', cleanup); } catch {}
          }
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-MCP-Transport': 'streamable-http',
              'Mcp-Connection-Id': connectionId,
              'Mcp-Session-Id': sessionId
            },
            body: '',
            isStreaming: true
          };
        }
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-MCP-Transport': 'streamable-http',
            'Mcp-Connection-Id': connectionId,
            'Mcp-Session-Id': sessionId
          },
          body: eventLines.join('') + flush,
          isStreaming: true
        };
      }
      // No separate messages path in Streamable HTTP; all POSTs go to /mcp
    }

    // JSON-RPC endpoint (single/batch)
    if (event.method !== 'POST') {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: json(rpcError(null, -32600, 'Invalid request method')) };
    }
    const rawPathPost = (event.path || event.url || '').toString();
    const urlPost = new URL(rawPathPost, 'http://localhost');
    const pathPost = urlPost.pathname;
    const tenantForPost = options.tenants ? matchTenant(pathPost, options.tenants.route) : null;
    if (!(pathPost === mcpPath || !!tenantForPost)) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: json(rpcError(null, -32601, 'Not Found')) };
    }

    // Resolve tenant (POST)
    let virtualForPost = virtual0;
    if (!virtualForPost && tenantForPost && options.tenants?.resolve) {
      const ctxP = { id: tenantForPost.id, req: { method: 'POST' as const, headers: lowerHeaders }, sessionId: (lowerHeaders['mcp-session-id'] as string|undefined), authMode: (options.auth?.mode as any) };
      virtualForPost = await options.tenants.resolve(ctxP);
      if (!virtualForPost) {
        return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: json(rpcError(null, -32601, 'Tenant not found')) };
      }
    }

    const a = await verifyAuth(virtualForPost?.auth || options.auth, reqLike);
    if (!a.ok) {
      return { statusCode: a.status, headers: { 'Content-Type': 'application/json', ...(a.headers||{}) }, body: a.body };
    }

    const parsed = readBody(event);
    if (!parsed.ok) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: json(parsed.error) };
    }

    await ensureLoaded();
    const messages = toArray<JSONRPCRequest>(parsed.value);
    const responses: JSONRPCResponse[] = [];
    const useTools = (virtualForPost?.tools && virtualForPost.tools.length ? virtualForPost.tools : tools) as any[];
    const usePrompts = (virtualForPost?.prompts && virtualForPost.prompts.length ? virtualForPost.prompts : prompts) as any[];
    const useResources = (virtualForPost?.resources && virtualForPost.resources.length ? virtualForPost.resources : resources) as any[];
    const srv = virtualForPost?.server || options.server || { name: 'nuclio-mcp', version: '0.0.0' };

    for (const msg of messages) {
      if (!msg || msg.jsonrpc !== '2.0' || !msg.method) {
        responses.push(rpcError(msg?.id ?? null, -32600, 'Invalid Request'));
        continue;
      }

      // Minimal dispatch for skeleton
      if (msg.method === 'initialize') {
        responses.push(rpcResult(msg.id ?? null, {
          server: {
            name: srv?.name || 'nuclio-mcp',
            version: srv?.version || '0.0.0',
            description: srv?.description,
            instructions: srv?.instructions,
            vendor: srv?.vendor
          },
          capabilities: { tools: {}, prompts: {}, resources: {} }
        }));
        continue;
      }
      if (msg.method === 'tools/list') {
        responses.push(rpcResult(msg.id ?? null, { tools: useTools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) }));
        continue;
      }
      if (msg.method === 'tools/call') {
        const name = msg.params?.name as string; const args = msg.params?.arguments || {};
        const tool = useTools.find(t => t.name === name);
        if (!tool) { responses.push(rpcError(msg.id ?? null, -32601, `Unknown tool: ${name}`)); continue; }
        try { if (typeof (tool as any).parseArgs === 'function') (tool as any).parseArgs(args); }
        catch (e: any) { const issues = Array.isArray(e?.issues)? e.issues.map((i: any)=>({ path: i.path, message: i.message })) : undefined; responses.push(rpcError(msg.id ?? null, -32602, 'Invalid params', issues? { issues }: undefined)); continue; }
        const sessHeader2 = lowerHeaders['mcp-session-id'];
        const sid = Array.isArray(sessHeader2) ? sessHeader2[0] : sessHeader2;
        const tenantMatchForCtx = options.tenants ? matchTenant(pathPost, options.tenants.route) : null;
        const ctx = { sessionId: sid, tenantId: tenantMatchForCtx?.id, headers: Object.fromEntries(Object.entries(lowerHeaders).map(([k,v])=>[k, Array.isArray(v)? v[0] as string: (v||'') as string])), claims: (a as any).claims };
        const out = await tool.toolCall(args, ctx);
        responses.push(rpcResult(msg.id ?? null, out));
        continue;
      }
      if (msg.method === 'prompts/list') {
        responses.push(rpcResult(msg.id ?? null, { prompts: usePrompts.map(p => ({ name: p.name, description: p.description, arguments: Object.entries(p.schema||{}).map(([k,v]: any)=>({ name:k, description:v?.description||'' })) })) }));
        continue;
      }
      if (msg.method === 'prompts/get') {
        const name = msg.params?.name as string; const args = msg.params?.arguments || {};
        const p = usePrompts.find(x => x.name === name);
        if (!p) { responses.push(rpcError(msg.id ?? null, -32601, `Unknown prompt: ${name}`)); continue; }
        try {
          const messagesOut = await p.getMessages(args);
          responses.push(rpcResult(msg.id ?? null, { messages: messagesOut }));
        } catch (e: any) {
          const issues = Array.isArray(e?.issues)? e.issues.map((i: any)=>({ path: i.path, message: i.message })) : undefined;
          responses.push(rpcError(msg.id ?? null, -32602, 'Invalid params', issues? { issues }: undefined));
        }
        continue;
      }
      if (msg.method === 'resources/list') {
        responses.push(rpcResult(msg.id ?? null, { resources: useResources.map(r => ({ uri: r.uri, name: r.name, mimeType: r.mimeType })) }));
        continue;
      }
      if (msg.method === 'resources/read') {
        const uri = msg.params?.uri as string;
        const r = useResources.find(x => x.uri === uri);
        if (!r) { responses.push(rpcError(msg.id ?? null, -32601, `Unknown resource: ${uri}`)); continue; }
        const contents = await r.read();
        responses.push(rpcResult(msg.id ?? null, { contents }));
        continue;
      }

      responses.push(rpcError(msg.id ?? null, -32601, 'Method not found'));
    }

    // Session header handling
    let resHeaders: Record<string,string> = { 'Content-Type': 'application/json', 'Mcp-Transport': ((virtualForPost?.transport?.mode || options.transport?.mode || 'batch') === 'batch') ? 'nuclio-batch' : 'streamable-http' };
    const sessHeader = lowerHeaders['mcp-session-id'];
    let sessionId = Array.isArray(sessHeader) ? sessHeader[0] : sessHeader;
    // Generate a session id on first initialize if none
    if (!sessionId && messages.some(m => m.method === 'initialize')) {
      sessionId = genId(); sessions.set(sessionId, { created: now() });
      resHeaders['Mcp-Session-Id'] = sessionId;
    }
    const body = Array.isArray(parsed.value) ? json(responses) : json(responses[0]);
    // If this is a streaming session and we have a writer, also push responses to any active connection for this session
    const sessIdHeader = lowerHeaders['mcp-session-id'];
    const sessId = Array.isArray(sessIdHeader) ? sessIdHeader[0] : sessIdHeader;
    if (((virtualForPost?.transport?.mode || options.transport?.mode || 'batch') !== 'batch') && sessId) {
      const set = sessionToConnections.get(sessId);
      if (set && set.size) {
        const payloads = Array.isArray(parsed.value) ? responses : [responses[0]];
        for (const cid of set) {
          const conn = connections.get(cid);
          if (!conn || !conn.active) continue;
          for (const r of payloads) {
            const line = fmtSse(r);
            if (conn.writer) conn.writer.write(line); else conn.queue.push(line);
          }
        }
      }
    }
    return { statusCode: 200, headers: resHeaders, body };
  };
}
