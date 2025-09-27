# Offene Fragen

1. Sollen wir optionale Long‑Poll‑Semantik anbieten (z. B. paginate/poll statt Streams)?
2. Wie sollen große Tool‑Outputs (< 4MB) gehandhabt werden? Split in mehrere Calls oder serverseitige Kompression?
3. Brauchen wir ein minimales Ratelimiting auf Adapter‑Ebene (z. B. Token Bucket in Memory)?
4. Benötigt die CLI ein Template‑System für function.yaml (verschiedene Plattformen/Cluster)?
5. Wie gestalten wir Versionierung/Kompatibilität zum Haupt‑Framework am besten (Exports/Typen teilen)?
