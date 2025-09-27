# Performance & Coldstart

## Kaltstart
- Minimale Imports im Handler
- Lazy‑Loading nur wenn nötig (aber Vorsicht: wiederholte Kaltstarts)
- Tools/Prompts/Resources kompakt halten

## Laufzeit
- Keine Streams: gesamte Antwort in einem JSON‑RPC Response
- Vermeide große Resultate → ggf. Pagination auf Applikationsebene

## Größen/Timeouts
- `NUCLIO_MAX_BODY_BYTES` (Default 4MB)
- function.yaml: `maxRequestBodySize`, Timeout, Speicher anpassen
