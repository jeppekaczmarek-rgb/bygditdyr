# Dispatch start-prompt

Kopiér alt under linjen ind i en ny chat for at sætte arbejdet i gang. (Opdateret 23. juni 2026 — afspejler at roadmap 01–05 er implementeret.)

---

Du arbejder på **Byg Dit Dyr** — et interaktivt museumsspil til Naturama (vanilla HTML/CSS/JS, ingen frameworks). Spillet er **færdigbygget og LIVE** på GitHub Pages (auto-udgiver når `main` opdateres via PR).

**Start med at læse:** `CLAUDE.md` i repoet — det er den primære kilde til projektets nuværende tilstand, hvad der er bygget og hvad der er næste.

**Nuværende situation (23. juni):** Alle 5 forbedringspakker fra den kritiske analyse (01–05) er implementeret. Kør `git log --oneline -10` for at se hvad der senest er gjort. Der er ingen planlagte kodepakker pt. — spørg Jeppe hvad der er aktuelt.

**Mulige opgavetyper:**
- Kode-fix eller tuning baseret på real-world test ved Naturama
- Balancejustering efter test (kør `node analyse/balance.js` ved matrix-ændringer)
- Eventuelle nye features aftalt med Jeppe

**Arbejdsgang — vigtig:**
Ét trin ad gangen. For HVERT trin: (1) vis kort plan og forklar hvad og hvorfor, (2) VENT på ok, (3) implementér, (4) test (`node --check js/*.js`), (5) vis resultat og VENT på ok. Åbn PR og merg den med det samme uden at spørge → Pages udgiver automatisk ~1 min.

**Regler:** Vanilla JS, ingen frameworks. Kommentér på dansk. Hold `survival.js`/`oekonomi.js` adskilt fra visuals. Log beslutninger i Notion → "Fremdrift & status"; fejl i "Fejl & bugs".

Start med `CLAUDE.md` + `git log --oneline -10`.
