# Streaming Transport Plan (SSE + HTTP Messages)

Decision: Support SSE and HTTP message endpoints in Nuclio handler (no external Redis). Endpoints:
- GET `/sse` – establish Server‑Sent Events stream
- POST `/messages?connectionId=<id>` – send JSON‑RPC requests to the active stream

## Goals
- MCP‑compliant streaming over SSE
- Bi‑directional via HTTP (SSE out, POST in)
- In‑memory connection & queue (single instance friendly)
- Programmatic configuration via `transport: { mode: 'sse', endpoints, keepAliveMs }`

## Flow
1) Client opens GET /sse with `Accept: text/event-stream`
   - Server returns 200 with SSE headers; keeps connection open
   - A `connectionId` is created on the server side and tracked in a `connections` Map
   - Option: send endpoint/events to client (either as initial events or out‑of‑band doc). Simpler: client already knows /messages.
2) Client sends JSON‑RPC requests with POST /messages?connectionId=<id>
   - The handler validates `connectionId`, parses requests (single/batch), authenticates, dispatches
   - For each JSON‑RPC response/notification, server writes SSE `data: <json>

` for that `connectionId`
3) Keep‑alive pings every `keepAliveMs` (default 15000): SSE `data: {"jsonrpc":"2.0","method":"ping"}`
4) On disconnect (client closes SSE): mark connection inactive, drop queued messages, cleanup timer

## Data Structures
```ts
connections: Map<string, { createdAt: Date; lastActivity: Date; isActive: boolean }>
queues: Map<string, string[]> // preformatted SSE lines
```

## SSE Headers
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: * (configurable)
X-MCP-Transport: streamable-http
```

## Message Formatting
- SSE line: `data: <JSON>

`
- JSON must be valid JSON‑RPC 2.0 message (result/error/notification)
- Chunking: for payloads > N bytes, split into sequence with `data: { part, total, id, chunk }` (optional MVP+1)

## Error Handling
- Invalid `connectionId` → HTTP 403 for POST /messages + JSON‑RPC error: { code: -32000, message: 'Invalid or inactive connection' }
- Non‑streaming POST (no active connection) → 409 (Conflict) or 400 (Bad Request)
- Authentication failures → 401 + `WWW-Authenticate`
- Unknown method → -32601

## Limits & Timeouts
- Nuclio function timeout must allow long‑lived SSE; ensure platform supports streaming for endpoint
- Max connections: optional guard (e.g. 100)
- Idle timeout: mark inactive after period, close SSE server‑side if possible

## CORS
- Allow origin and headers configurable via programmatic handler options (outside of auth)

## Testing
- Unit: connection creation, queueing, ping, cleanup
- Integration: open SSE → POST messages → receive SSE data
- Error paths: invalid id, closed connection, huge payload

## Security
- No secrets in SSE stream
- Respect auth strategy for POST /messages
- Optional: per‑connection auth context (future)

## Open Questions
- Should server emit initial `connectionId` event? D365 does; we can either follow or require client to read it from header. Decision: client already knows to derive `connectionId` from server‑generated token; minimal path: no auto event, but allowed to add later.
