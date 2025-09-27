# Sample Flows (End-to-End)

Dieses Dokument zeigt typische Request/Response-Flows mit dem Nuclio-Handler (Batch-HTTP, programmatic Auth).

## 1) Tools
### tools/list
Request:
```json
{ "jsonrpc":"2.0", "id":1, "method":"tools/list", "params":{} }
```
Response:
```json
{ "jsonrpc":"2.0", "id":1, "result": { "tools": [{ "name":"example_tool", "description":"…", "inputSchema":{ "type":"object", … } }] } }
```

### tools/call
Request:
```json
{ "jsonrpc":"2.0", "id":2, "method":"tools/call", "params":{ "name":"example_tool", "arguments": { "message":"Hi" } } }
```
Response:
```json
{ "jsonrpc":"2.0", "id":2, "result": { "content":[ { "type":"text", "text":"Echo: Hi" } ] } }
```

## 2) Prompts
### prompts/list
```json
{ "jsonrpc":"2.0", "id":3, "method":"prompts/list", "params":{} }
```

### prompts/get
```json
{ "jsonrpc":"2.0", "id":4, "method":"prompts/get", "params":{ "name":"welcome", "arguments":{ "user":"Jane" } } }
```
Response (Beispiel):
```json
{ "jsonrpc":"2.0", "id":4, "result": { "messages": [ {"role":"user","content":{"type":"text","text":"Hello Jane"}} ] } }
```

## 3) Resources
### resources/list
```json
{ "jsonrpc":"2.0", "id":5, "method":"resources/list", "params":{} }
```

### resources/read
```json
{ "jsonrpc":"2.0", "id":6, "method":"resources/read", "params":{ "uri":"resource://heartbeat" } }
```
Response (Beispiel):
```json
{ "jsonrpc":"2.0", "id":6, "result": { "contents": [ {"uri":"resource://heartbeat","mimeType":"application/json","text":"{"beat":1}"} ] } }
```

## 4) Batch Requests
Mehrere JSON‑RPC Nachrichten in einem Array senden.
```json
[
  { "jsonrpc":"2.0", "id":1, "method":"tools/list", "params":{} },
  { "jsonrpc":"2.0", "id":2, "method":"tools/call", "params":{ "name":"example_tool", "arguments": {"message":"Hi"} } }
]
```
Antwort ist ein Array paralleler Responses.

## 5) Auth Beispiele (programmatic)
- API‑Key: Client sendet `X-API-Key: <key>`
- JWT (HMAC): `Authorization: Bearer <token>` (HS256) – Verifikation im Code
- Keycloak: `Authorization: Bearer <access_token>` (RS256) – JWKS Verify, Issuer/Audience passend

## 6) Fehlerbeispiele
- Ungültiges JSON → HTTP 400, JSON‑RPC error -32700
- Fehlender API‑Key → HTTP 401 + `WWW-Authenticate: ApiKey realm="MCP Server"`
- Unbekannte Methode → HTTP 400 + JSON‑RPC error -32601

Siehe 20-error-codes-and-headers.md für vollständige Abbildung.
