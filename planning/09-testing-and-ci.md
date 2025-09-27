# Testing & CI

## Testarten
- Unit: Tools/Prompts/Resources, JSON‑RPC‑Parser/Mapper
- Integration: NuclioAdapter + MCPApp (Fake‑Event → Response)
- CLI‑Tests: Scaffold, Add‑Befehle, Build

## CI Pipeline (Beispiel)
- Lint + Typecheck
- Unit/Integration Tests (ohne echte Netzports)
- Optional: `nuctl` Smoke‑Test in separater Stage (wenn Runner es unterstützt)

## Testdaten
- Beispiel‑Tool (echo)
- Beispiel‑Resource (statisch)
