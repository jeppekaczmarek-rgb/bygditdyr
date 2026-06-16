# 📊 Telemetri — sessionsdata til gameplay-tuning

Her lægges anonyme sessionsfiler (`telemetri-*.json`) som habitatet eksporterer.
Ingen persondata gemmes — kun adfærdstællere, tilstandsfordeling, levetider og dødsårsager.

## Sådan virker det

1. Åbn `habitat.html` og kør en testsession (brug evt. `test-dyr.html` til at spawne dyr).
2. Tast **D** for live debug-overlay. Tast **E** (eller knappen) for at eksportere som JSON.
   En eksport forsøges også automatisk når du lukker vinduet.
3. Gem JSON-filen i **denne mappe** (`telemetri/`).
   - Tip: sæt Chrome til at downloade hertil, eller flyt filen ind.
4. Bed Claude analysere — eller kør selv:

   ```
   node analyser_telemetri.js
   ```

Værktøjet aggregerer alle filer i mappen og udskriver:
flow (tid i hver tilstand), om mekanikkerne udløses (panik, ambush, konkurrence, kaskade),
jagtbalance, levetid pr. egenskab og **konkrete tuning-forslag** til konstanterne i `js/habitat.js`.

## Hvad måles

| Felt | Spørgsmål det besvarer |
|------|------------------------|
| Tilstandsfordeling | Er der flow, eller hviler dyrene for meget? |
| Mekanik-tællere | Bliver de biologiske v2-forhold faktisk vist? |
| Jagtbalance | Er rovdyr/bytte-forholdet fair? |
| Levetid pr. egenskab | Er overlevelsesmatrixen balanceret? |
