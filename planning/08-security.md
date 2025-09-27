# Security

## Prinzipien
- Least privilege: nur benötigte Env/Headers akzeptieren
- Eingaben strikt validieren (JSON‑RPC + Tool‑Schemas)
- Output‑Escaping für Logs

## Bedrohungen & Gegenmaßnahmen
- DoS über große Bodies → Max‑Größen, frühes Abweisen
- Auth‑Brute‑Force → Ratelimits (Nuclio‑seitig, optional), generische Fehlertexte
- Code‑Injection in Tools → Zod‑Validierung, keine eval‑ähnlichen Pfade

## Compliance/Reviews
- Security‑Checkliste für Releases
