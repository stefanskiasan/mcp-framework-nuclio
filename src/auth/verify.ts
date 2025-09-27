import { ApiKeyAuth, AuthStrategy, IncomingLike, JwtAuth, KeycloakAuth } from '../types.js';
import { createRemoteJWKSet, jwtVerify, importJWK, JWTPayload } from 'jose';

export type AuthResult = { ok: true; claims?: JWTPayload } | { ok: false; status: number; headers: Record<string,string>; body: string };

const json = (o: any) => JSON.stringify(o);
const rpcErr = (code: number, message: string) => ({ jsonrpc: '2.0', id: null, error: { code, message } });

export async function verifyAuth(strategy: AuthStrategy | undefined, req: IncomingLike): Promise<AuthResult> {
  if (!strategy || strategy.mode === 'none') return { ok: true };
  if (strategy.mode === 'dynamic') return verifyAuth(strategy.provider(req), req);
  if (strategy.mode === 'apikey') return verifyApiKey(strategy, req);
  if (strategy.mode === 'jwt') return verifyJwtHmac(strategy, req);
  if (strategy.mode === 'keycloak') return verifyKeycloak(strategy, req);
  return { ok: true };
}

function verifyApiKey(cfg: ApiKeyAuth, req: IncomingLike): AuthResult {
  const name = (cfg.headerName || 'X-API-Key').toLowerCase();
  const v = req.headers[name];
  const key = Array.isArray(v) ? v[0] : v;
  if (!key || !cfg.keys.includes(key)) {
    return { ok: false, status: 401, headers: { 'WWW-Authenticate': `ApiKey realm="MCP Server", header="${cfg.headerName || 'X-API-Key'}"` }, body: json(rpcErr(-32000,'Unauthorized')) };
  }
  return { ok: true };
}

async function verifyJwtHmac(cfg: JwtAuth, req: IncomingLike): Promise<AuthResult> {
  const name = (cfg.headerName || 'Authorization').toLowerCase();
  const v = req.headers[name];
  const token = Array.isArray(v) ? v[0] : v;
  if (!token) return bearerFail();
  const raw = token.toString();
  if (cfg.requireBearer !== false && !raw.startsWith('Bearer ')) return bearerFail();
  const t = cfg.requireBearer !== false ? raw.slice('Bearer '.length) : raw;
  try {
    // For HS256/HS384 HMAC, use shared secret
    const algs = cfg.algorithms && cfg.algorithms.length ? cfg.algorithms : ['HS256'];
    // jose jwtVerify with secret as Uint8Array
    const secret = new TextEncoder().encode(cfg.secret);
    const { payload } = await jwtVerify(t, secret, { algorithms: algs as any });
    return { ok: true, claims: payload };
  } catch {
    return bearerFail();
  }
}

async function verifyKeycloak(cfg: KeycloakAuth, req: IncomingLike): Promise<AuthResult> {
  const name = (cfg.headerName || 'Authorization').toLowerCase();
  const v = req.headers[name];
  const token = Array.isArray(v) ? v[0] : v;
  if (!token) return bearerFail();
  const raw = token.toString();
  if (cfg.requireBearer !== false && !raw.startsWith('Bearer ')) return bearerFail();
  const t = cfg.requireBearer !== false ? raw.slice('Bearer '.length) : raw;
  try {
    const jwksUri = cfg.jwksUri || (cfg.issuer.replace(/\/$/, '') + '/.well-known/openid-configuration');
    let jwks: ReturnType<typeof createRemoteJWKSet>;
    if (cfg.jwksUri) {
      jwks = createRemoteJWKSet(new URL(cfg.jwksUri));
    } else {
      // Discover JWKS URI from well-known
      const r = await fetch(jwksUri);
      const j = await r.json();
      const uri = j.jwks_uri || (cfg.issuer.replace(/\/$/, '') + '/protocol/openid-connect/certs');
      jwks = createRemoteJWKSet(new URL(uri));
    }
    const algs = cfg.algorithms && cfg.algorithms.length ? cfg.algorithms : ['RS256'];
    const leeway = typeof cfg.leeway === 'number' ? cfg.leeway : 0;
    const { payload } = await jwtVerify(t, jwks, { issuer: cfg.issuer, audience: cfg.audience as any, algorithms: algs as any, clockTolerance: leeway });
    return { ok: true, claims: payload };
  } catch {
    return bearerFail();
  }
}

function bearerFail(): AuthResult {
  return { ok: false, status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="MCP Server", error="invalid_token"' }, body: json(rpcErr(-32000,'Unauthorized')) };
}

