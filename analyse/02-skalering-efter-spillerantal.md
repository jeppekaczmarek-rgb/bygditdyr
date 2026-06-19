# Opgavepakke 02 — Skalering efter spillerantal

**Søjle:** Spillet skal føles rigtigt fra 1–2 gæster (lavsæson) til mange samtidige (højsæson)
**Status i dag:** 🔴 Koden kender ikke begrebet "antal spillere". Alle bærекapaciteter er faste tal.

---

## Problemet

Hele økologien er kalibreret til ét usynligt antagent spillertal. Konsekvenserne ligger i to ekstremer:

**Lavsæson (1–2 gæster):** En enkelt elev sender ét dyr ud i et habitat med 12 planter og ingen andre dyr. Der er ingen at konkurrere med, ingen rovdyr (medmindre eleven selv byggede en kødæder uden bytte), ingen jagt, ingen kaskade. Skærmen er næsten tom, "showet" udebliver, og halvdelen af motorens mekanik (konkurrence, jagt, kaskade, sygdom) udløses aldrig. Den ensomme gæst ser et dyr drive rundt og dø af klima.

**Højsæson (mange gæster):** Dyr formerer sig (`opdaterFormering`). Med mange velbyggede arter rammer populationen hurtigt `SYGDOM_THRESHOLD = 20` for samme art — og så crasher den i et sygdomsudbrud. Tuning-noten i koden indrømmer det allerede: *"halveret formeringstempo — overbefolkning udløste gentagne sygdomscrash der overdøvede rovdyr/byttedyr-dynamikken."* Planterne (`PLANTE_ANTAL`) deles af alle; ved mange planteædere bliver fouragering en stolelegs-leg, og dyr sulter uanset hvor godt de er bygget. Den dygtige gæsts gode dyr dør af trængsel, ikke af egne valg — hvilket *direkte underminerer Opgavepakke 01's konsekvens-kobling.*

De faste tal i dag:

```
PLANTE_ANTAL = { skov: 12, arktis: 8, oerken: 4 }
SYGDOM_THRESHOLD = 20
FORMERING_FART_*  (faste rater)
```

Ingen af dem ved hvor mange der spiller.

---

## Forslag: indfør ét kontekst-tal og gør resten til funktioner af det

### A. Mål "økologisk belastning"

Den rigtige skaleringsvariabel er ikke antal *stationer*, men hvor meget liv der faktisk er på skærmen. Beregn løbende i `habitat.js`:

```js
// Antal levende individer og antal distinkte arter (= aktive spillere ~)
function maalBelastning() {
  let individer = 0; const arter = new Set();
  for (const d of dyrListe) {
    if (d.doedsTid) continue;
    individer++; arter.add(d.artsnavn);
  }
  return { individer, arter: arter.size };
}
```

`arter.size` er en god proxy for "antal aktive spillere", fordi hver gæsts dyr + afkom deler ét artsnavn. (Suppler evt. med et heartbeat: hver station sender `STATION_AKTIV` hvert 10. sek, så du også kender tomme-men-bemandede stationer.)

### B. Dynamisk bærекapacitet (planter)

Lad mademængden vokse med antallet af munde, men aftagende (planteædere skal stadig konkurrere lidt):

```js
// Basis pr. habitat + tilskud pr. art, med loft
const PLANTE_BASIS   = { skov: 6, arktis: 4, oerken: 3 };
const PLANTE_PR_ART  = { skov: 3, arktis: 2, oerken: 1.5 };
const PLANTE_LOFT    = { skov: 26, arktis: 16, oerken: 10 };

function planteMaal(habitat, arter) {
  return Math.round(Math.min(
    PLANTE_LOFT[habitat],
    PLANTE_BASIS[habitat] + PLANTE_PR_ART[habitat] * arter
  ));
}
```

Lad `initPlanter()` og respawn justere antallet op/ned mod `planteMaal()` løbende, ikke kun ved start. Effekt: 1 gæst får et roligt, ikke-tomt habitat; 8 gæster får et yldende et — men aldrig nok til at alle kan æde frit, så konkurrencen (og dermed læringen om niche) består.

### C. Tæthedsafhængig sygdom og formering (det rigtige biologi-greb)

I stedet for en fast sygdomstærskel: gør både sygdom og formering **tæthedsafhængige** — hvilket tilfældigvis er præcis sådan ægte populationer reguleres (logistisk vækst mod en bærекapacitet).

```js
// Sygdom udløses ved en andel af bærекapaciteten, ikke et fast tal
function sygdomsTaerskel(habitat, arter) {
  return Math.max(8, Math.round(planteMaal(habitat, arter) * 1.5));
}

// Formering bremser når arten nærmer sig sin egen "carrying capacity"
function formeringsDaempning(artensAntal, habitat, arter) {
  const K = Math.max(4, planteMaal(habitat, arter) / 2); // plads pr. art
  return Math.max(0, 1 - artensAntal / K);               // 1 → fri vækst, 0 → stop
}
```

Gang `dyr.formeringFart` med `formeringsDaempning(...)` i `opdaterFormering()`. Nu regulerer populationen sig selv glat i stedet for at vokse til 20 og crashe. Sygdom bliver en sjælden, meningsfuld monokultur-straf (se Opgavepakke 05) frem for et tilbagevendende støjsignal. **Bonus:** logistisk vækst + tæthedsafhængig regulering er pensum-biologi du nu kan formidle direkte ("der er ikke plads til flere — bestanden flader ud").

### D. Lavsæson: liv på skærmen uden gæster

Når `arter < 2` over en periode, så befolk habitatet med 1–3 **vilde NPC-dyr** (realistiske arter for habitatet, fx en ræv i skoven, en polarræv i arktis). De:
- giver den ensomme gæsts dyr nogen at interagere med (en rovdyr-trussel at flygte fra, en konkurrent),
- demonstrerer "showet" så selv en tom skærm er levende,
- forsvinder elegant når rigtige gæster kommer (eller bliver som en fast del af økosystemet — designvalg).

NPC-dyrene kan genbruge hele `tilfoejDyr`-pipelinen med et `_npc: true`-flag (tæller ikke i scoreboardet, får ikke station-events). Dette er den enkleste vej til at gøre lavsæson levende.

### E. Eksplicit "tempo"-skalering (valgfrit, men anbefalet)

Lad spawn-/event-tempo afhænge let af belastning, så en travl skærm ikke drukner i samtidige dramaer: throttle de *store* iscenesatte begivenheder (Opgavepakke 03) til maks. 1 ad gangen, og lad de små køre frit. "Vælg få, gør dem store" gælder dobbelt i højsæson.

---

## En "sæson-knap" til personalet

Eksponér en skjult admin-parameter (samme mønster som habitat-override via URL) med tre forudindstillinger personalet kan vælge efter dagen:

| Tilstand | `arter`-gulv | Effekt |
|---|---|---|
| `stille` | min. 2 (NPC'er udfylder) | Altid liv på skærmen selv med 0–1 gæster |
| `auto` | — | Skalerer frit efter faktisk belastning (standard) |
| `myldretid` | loft sænket lidt | Holder tempoet aflæseligt når der er kaos af gæster |

---

## Gjort-når (acceptkriterier)

- [ ] `habitat.js` beregner løbende antal levende individer + distinkte arter.
- [ ] Plantemængde, sygdomstærskel og formeringstempo er funktioner af det tal — ingen rå konstanter tilbage som bærекapacitet.
- [ ] Med 1 gæst er skærmen aldrig tom (NPC-dyr) og mindst én interaktionstype udløses.
- [ ] Med mange gæster opstår der ikke længere gentagne sygdomscrash; populationen flader ud i stedet.
- [ ] Personalet kan vælge stille/auto/myldretid uden at røre koden.
- [ ] En dygtig gæsts dyr dør pga. sine egne valg, ikke pga. trængsel (testet ved højsæson-simulering).

## Berørte filer
`habitat.js` (ny belastnings-måling + alle bærекapacitet-funktioner; `initPlanter`/`opdaterPlanter`/`opdaterFormering`/`opdaterSygdom`; NPC-spawn), `config.js` (sæson-preset), evt. `broadcast.js` (station-heartbeat).
