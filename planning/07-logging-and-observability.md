# Logging & Observability

## Logging
- stderr‑basiert; Option: File‑Logging (rotierend per Timestamp)
- Log Levels: INFO/WARN/ERROR/DEBUG (DEBUG opt‑in via Env)
- Keine secret values loggen (nur Headernamen)

## Metriken (Optional, ohne externe Dependencies)
- Request‑Zähler und Dauer als einfache Logs
- Fehlercodes‑Histogramm über Logs aggregierbar

## Tracing (Nicht‑Ziel im MVP)
- Kein verteiltes Tracing; optional später via Header‑Durchreichung
