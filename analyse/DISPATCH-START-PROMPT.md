# Dispatch start-prompt

Kopiér alt under linjen ind i dispatch-chatten for at sætte arbejdet i gang. (Findes også i Notion: "🚀 Dispatch start-prompt".)

---

Du arbejder på **Byg Dit Dyr** — et interaktivt museumsspil til Naturama (vanilla HTML/CSS/JS, ingen frameworks). Spillet er færdigbygget og LIVE på GitHub Pages (auto-udgiver når `main` opdateres). Du arbejder via GitHub: foreslå ændringer som PR'er — Jeppe merger, og Pages udgiver automatisk ca. 1 min senere.

**Læs først:** `CLAUDE.md`, derefter `analyse/00-hovedanalyse-og-roadmap.md`.

**Din opgave:** Implementér forbedrings-roadmappen fra den kritiske analyse, i denne rækkefølge:
1. **Sprint A:** Opgavepakke **01** (feedback-loop) + **05** (balance/data + mutation)
2. Derefter **04** (formidlingstekster) → **02** (skalering) → **03** (interaktion)

Hver pakke har en fil i `analyse/` (`01`–`05`) med problem, kodested, konkret forslag og "gjort-når". Følg dem.

**Arbejdsgang (vigtig — jeg er på farten):** Ét trin ad gangen. For HVERT trin: (1) vis en kort plan/diff og forklar hvad du vil ændre og hvorfor, (2) VENT på mit "ok", (3) implementér, (4) kør tests (`node analyse/balance.js` ved matrix-ændringer + `node --check js/*.js`), (5) vis resultatet og VENT på mit "ok". Åbn så en PR pr. trin — du merger den IKKE selv; jeg gennemser og merger (det udgiver via Pages). Merg/udgiv aldrig uden mit ok.

**To designvalg undervejs — spørg mig, beslut ikke selv:**
- *Arktis-rebalance:* vis før/efter-tal fra `balance.js` for (a) billigere forsvar-energi vs. (b) lokalt arktis-budget, og lad mig vælge.
- *Glat hud:* vis (a) tempo-bonus (`FART_MOD`) vs. (b) matrix-nudge (skov −1→0), og lad mig vælge.

**Mutation ved formering ("guldægget"):** byg den ind i `habitat.js → spawnAfkom` med `MUTATION_RATE = 0.08` (ændrer netop én egenskab, kan slås fra med 0) + en lille ✨-markør. Bevidst godkendt.

**Regler:** Vanilla JS, ingen frameworks. Kommentér på dansk. Hold `survival.js`/`oekonomi.js` adskilt fra visuals. Overlevelsesmatrixen ændres KUN bevidst (pakke 05). Log beslutninger i Notion → "Fremdrift & status" og fejl i "Fejl & bugs". Den fulde, afkrydselige opgaveliste ligger i Notion: "✅ Opgaveliste — roadmap (juni 2026)".

Start med at læse `CLAUDE.md` + `analyse/00` + `analyse/01`, og foreslå så din plan for det første trin i pakke 01.
