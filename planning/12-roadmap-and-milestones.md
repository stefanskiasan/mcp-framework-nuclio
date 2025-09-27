# Roadmap & Milestones

## Phase 0 – Planung (dieser Ordner)
- Vision, Scope, Architektur, CLI‑Design, Security, Tests

## Phase 1 – MVP Implementierung
- NuclioAdapter (HTTP→JSON‑RPC), MCPApp, SchemaValidator
- CLI `mfn`: create/add/build
- Beispiel‑Projekt & Doku

## Phase 2 – Deploy‑Helfer & DX
- CLI `mfn deploy` (nuctl Wrapper, optional)
- Fehlermeldungen/Diagnostik verbessern
- Keycloak/OIDC Auth (Authentication) gemäß 15-auth-keycloak-oidc.md

## Phase 3 – Erweiterungen
- Pagination‑Hilfen bei großen Resultaten
- Optionale Middleware‑Hooks (Pre/Post Tool‑Call)
- Autorisierung (Role‑Map auf Basis Keycloak‑Claims)

## Phase 4 – Stabilisierung
- Test‑Coverage > 85%
- Doku & Beispiele erweitern
