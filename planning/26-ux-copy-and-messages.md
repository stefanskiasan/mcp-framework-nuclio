# UX Copy & Messages (CLI + Handler)

Ziel: konsistente, klare Benutzertexte für CLI und Runtime, ohne sensitive Daten.

## CLI Copy (English default)

### create
- Success: `✔ Project created at <path>. Run 'npm install' then 'npm run build'.`
- With install: `✔ Dependencies installed. Run 'npm run build' to compile.`
- Hints:
  - `ℹ Configure authentication programmatically in src/handler.ts (see commented examples).`

### add tool/prompt/resource
- Success: `✔ Created <type> '<Name>' at <path>.`
- Overwrite prompt: `? File exists. Overwrite? (y/N)`
- Validation hint: `ℹ Remember to add .describe() to all schema fields.`

### build
- OK: `✔ Build completed.`
- Validation errors:
  - Summary: `✖ Validation failed: <count> issue(s).`
  - List: `<file>: Missing descriptions for fields: a, b, c`
  - Exit with status 1

### validate
- OK: `✔ Validation passed.`
- Errors: same as build

### deploy
- OK: `✔ Deployed function '<name>' to <platform>.`
- Missing nuctl: `✖ 'nuctl' not found in PATH. Please install Nuclio CLI.`
- Bad args: `✖ Missing required option --name`

### doctor
- OK: `✔ Environment looks good.`
- Warnings: `⚠ Node.js version <found> != required <required>`

## Runtime/Handler Messages (Logs)
- INFO (start): `Starting request`, fields: requestId, methods, count
- INFO (end): `Request completed`, fields: requestId, status, durationMs
- WARN (client): `Invalid JSON` | `Method not found`, fields: requestId
- ERROR (server): `Unhandled error`, fields: requestId, stack? (redacted)
- DEBUG (optional): `Auth: keycloak verify ok`, `JWKS refresh`, `Dispatch tools/list`

## HTTP Headers (Responses)
- `Mcp-Request-Id: <uuid>`
- `Mcp-Transport: nuclio-batch`
- `WWW-Authenticate: ...` for 401

## Content Guidelines
- No tokens, secrets, or PII in logs
- Short, action-oriented phrasing
- Use icons consistently (✔, ✖, ℹ, ⚠) in CLI only (not in JSON responses)

## i18n
- Default English copy
- Allow override via CLI flag `--locale` (future), but avoid mixing languages
