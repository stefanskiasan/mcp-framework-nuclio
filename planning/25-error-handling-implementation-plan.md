# Error Handling – Implementation Plan

Objective: Specify precise mechanics for mapping all error conditions to HTTP status, JSON-RPC error objects, logs and headers inside `createNuclioHandler`.

## Error Surfaces
- Transport layer (HTTP): content-type, body size, JSON parsing
- Authentication: API key / JWT (HMAC) / Keycloak (OIDC JWKS)
- JSON-RPC framing: structure, method presence, params shape
- MCP dispatch: unknown method, invalid params (Zod), tool/prompt/resource errors
- Uncaught exceptions

## Core Principles
- Deterministic HTTP status (see 20-error-codes-and-headers.md)
- JSON-RPC 2.0 compliant responses for all handled errors
- Emit `WWW-Authenticate` for 401
- Include `Mcp-Request-Id` in responses and logs
- No secrets in logs; no token echoing

## Implementation Steps
1) Request bootstrap
- Generate `requestId` (uuid v4)
- Enforce method POST, else 405 -> (optionally return 405 or 400; choose 400 for simplicity)
- Enforce `Content-Type: application/json` → else 415
- Enforce body size ≤ `limits.maxBodyBytes` → else 413

2) Parse JSON
- Try `JSON.parse`
- On failure: HTTP 400; JSON-RPC `error.code = -32700` (Parse error); `id = null`
- Accept single object or array; reject anything else → -32600

3) Authenticate (if configured)
- API key: check header, missing → 401 (ApiKey realm header), invalid → 401
- JWT HMAC: decode/verify; invalid/expired → 401 (Bearer realm, invalid_token)
- Keycloak: JWKS verify; set small leeway; invalid → 401
- Authorization (future): if enabled and denies → 403

4) Validate JSON-RPC request envelope(s)
- `jsonrpc === '2.0'`, `method` present, `id` optional; invalid → -32600

5) Dispatch MCP methods
- Supported:
  - `tools/list`, `tools/call`
  - `prompts/list`, `prompts/get`
  - `resources/list`, `resources/read`
- Unknown → -32601 (Method not found)

6) Params validation
- Tools: Zod parse; invalid → -32602 (include condensed zod issues in `error.data`)
- Prompts: Zod parse; same mapping
- Resources: `uri` required; 

7) Execution errors
- Tool thrown error → -32000; `error.message = "Internal error"` (do not leak internals), optional `data: { reason: 'tool_failed' }`
- Resource read exceptions → -32000, `data: { reason: 'resource_failed' }`

8) Response shaping
- Single request → single response object
- Batch → array preserving order of requests
- Always include headers: `Mcp-Transport: nuclio-batch`, `Mcp-Request-Id`

9) Logging
- Level guide:
  - INFO: start, end (with duration ms), method(s), counts
  - WARN: recoverable client issues (invalid JSON, method not found)
  - ERROR: server exceptions, auth system errors, JWKS fetch errors
  - DEBUG: detailed branch steps (optional/opt-in)
- Fields: { requestId, methods, status, errorCode?, durationMs }

10) Testing
- Unit tests for each mapping (table-driven) including headers
- Integration tests: happy path + all known failures

## Error Object Helpers
- `rpcError(code: number, message: string, id: RequestId|null, data?: any)` → JSON-RPC shaped object
- `badRequest(id: null, code = -32700 | -32600)`
- `invalidParams(id, zodIssues)`
- `methodNotFound(id)`
- `serverError(id, reason?)`

## Performance & Resilience
- JWKS caching TTL; refresh on `kid` miss
- Fail closed: if auth config invalid at start → fail fast (do not accept requests)

---

Deliverables:
- Handler internal error helpers
- Complete mapping testsuite
- Logging formatter with stable keys
