# Validierungs-Spezifikation (Tools/Prompts)

Ziel: Konsistente, aussagekräftige Validierung für Eingabeschemata beim Build und optional zur Laufzeit (Start‑Phase).

## Regeln (Tools)
- Tool‑Schema basiert auf Zod (Object)
- Jede Eigenschaft benötigt `.describe('…')`
- Optional/Default werden korrekt erkannt (required‑Liste nur für notwendige Felder)
- Enums/Unions werden als JSON‑Schema (`type`, `enum`) abgebildet
- Number‑Constraints (`min`, `max`, `int`, `positive`) werden auf JSON‑Schema übertragen

## Regeln (Prompts)
- Argument‑Schema (Zod Object)
- Jede Eigenschaft benötigt `.describe('…')`
- `required` Flag wird aus Optionalität abgeleitet

## Build‑Validierung (`mfn build` / `mfn validate`)
- Lädt kompiliertes `dist/tools/*.js` und `dist/prompts/*.js`
- Instanziert Default‑Export, ruft `validate()` wenn vorhanden
- Sammelt Verstöße:
  - Format: `<file>: Missing descriptions for fields: a, b, c`
  - Exit‑Code `1` wenn ≥1 Fehler

## Laufzeit‑Validierung (optional)
- Beim Handler‑Start kann `validateOnStart: true` aktiviert werden (Programmatic Option)
- Bei Fehler → Startfehler (500) mit Log‑Hinweis, Funktion startet nicht

## Beispiele – Fehlerausgabe
```
❌ Tool validation failed:
  ❌ src/tools/Price.ts: Missing descriptions for fields: symbol, currency
```

## CI‑Empfehlung
- `mfn validate` in `prepack`/`prebuild`
- Fester Satz an Lint‑Regeln für Zod (z. B. beschreibungs‑Pflicht in Review‑Checks)
