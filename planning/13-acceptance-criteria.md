# Abnahmekriterien (MVP)

1. Nuclio-Funktion akzeptiert JSON‑RPC single & batch und antwortet synchron mit gültigen JSON‑RPC Objekten.
2. `tools/list`, `tools/call`, `prompts/list`, `prompts/get`, `resources/list`, `resources/read` funktionieren mit Beispiel‑Tool/Resource/Prompt.
3. CLI `mfn create` erzeugt lauffähiges Skeleton; `mfn add tool` erstellt Tool mit Zod‑Schema (mit Beschreibungen); `mfn build` baut ohne Fehler und warnt bei fehlenden Beschreibungen.
4. Auth (API‑Key/JWT) lässt sich aktivieren/deaktivieren; optional Keycloak‑Modus vorhanden (Konfiguration plausibilisiert); fehlendes/ungültiges Token führt zu 401/403.
5. Logging zeigt Request‑IDs, Dauer und Fehlerpfade; keine Secrets im Log.
6. Kein externer Dienst (Redis etc.) ist nötig. Nur Nuclio + Node.
