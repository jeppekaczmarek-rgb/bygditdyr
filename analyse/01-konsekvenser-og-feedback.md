# Opgavepakke 01 — Tydelige konsekvenser & feedback-loop

**Søjle:** Tydelige konsekvenser af spillerens valg
**Prioritet:** Højest (kerne-læringssløjfen)
**Status i dag:** 🔴 Den vigtigste feedback-mekanisme er ikke bygget

---

## Problemet

Eleven tager seks valg, sender dyret ud — og får aldrig at vide *hvilke valg* der var gode eller dårlige. Konkret:

1. **Egenskabs-checklisten mangler.** GDD'en (Q4) designede den eksplicit: "✅ Koldblodigt (god til varme) ❌ Tyk pels (overophedning i ørken)". Den findes ikke i koden. `station.js → opdaterLiveStatus()` viser antal, ældste, afkom og et ressourceregnskab — men intet om egenskab-til-habitat-fit.

2. **Dødsforklaringer vises kun ved artsuddøen.** I `habitat.js` genereres `doedsTekst` udelukkende `if (sidsteAfArt)` (linjer ~1026 og ~1125). Et veltilpasset dyr får afkom, så arten uddør sjældent — og dermed vises den fremragende `deathtext.js` næsten aldrig. De fleste individer dør i fuld tavshed.

3. **Elevens eget individ forsvinder i "arten".** Stationen følger `minArtsnavn` (arten = dit dyr + alt afkom). Når dit oprindelige dyr dør men afkom lever, sker der intet synligt. Barnet mister sit "mit dyr"-ejerskab i en abstraktion.

4. **Bekræftelsesskærmen scorer ikke.** `visBekraeftelse()` lister valgene som ren tekst (`valg-oversigt`) uden at vise at de tilsammen giver fx score +4 mod skoven. Eleven trykker "send" i blinde.

Resultatet: spillet kan ikke svare på barnets eneste spørgsmål — *"hvorfor døde mit dyr?"* — undtagen i det sjældne tilfælde hvor hele arten bukker under.

---

## Forslag

### A. Egenskabs-checklist på bekræftelses- OG følg-skærmen (vigtigst)

Dataene findes allerede. `Survival.HABITAT_SCORE[habitat][kategori][værdi]` giver det præcise bidrag for hvert valg. Byg en lille ren funktion og vis den to steder.

**Ny funktion i `survival.js`:**

```js
// Returnér hver egenskabs bidrag i et givet habitat, sorteret værst→bedst
function forklarEgenskaber(dyr, habitat) {
  const matrix = HABITAT_SCORE[habitat];
  return Object.entries(dyr.egenskaber).map(([kat, vaerdi]) => {
    const score = matrix[kat]?.[vaerdi] ?? 0;
    return { kategori: kat, vaerdi, score,
             tegn: score > 0 ? 'god' : score < 0 ? 'daarlig' : 'neutral' };
  }).sort((a, b) => a.score - b.score);
}
```

**Visning (eksempel, ørken-dyr med pels):**

```
DIT DYR I ØRKENEN
❌  Pels            — overopheder i den ekstreme varme   (−2)
❌  Dagaktiv        — ude i den værste middagshede        (−1)
✅  Lavt stofskifte — sparer vand, bruger solens varme    (+2)
✅  Skæl* ...
   Samlet: din art starter på 78 sekunder
```

Hver linje = ét valg + ét barnesprogligt *hvorfor* (se Opgavepakke 04 for tekstbanken) + tallet. Det røde øverst, så barnet straks ser sin svageste beslutning. Dette er den direkte "valg → konsekvens"-kobling spillet mangler.

**Hvor:**
- `visBekraeftelse()` — vis checklisten *før* afsendelse, så valget bliver informeret (og inviterer til at gå tilbage og ændre = mere læring).
- `opdaterLiveStatus()` — vis den samme checklist mens dyret lever, så "ældste: 40 sek" får en forklaring ved siden af sig.

### B. Lad individets død forklare sig — ikke kun artens

Adskil to begreber spillet i dag blander: **individets død** (hyppig, lærerig) og **artens uddøen** (sjælden, dramatisk).

- **Individ dør:** send en kort årsag til stationen for *det individ* (især elevens eget oprindelige dyr). I dag sendes kun et generisk `DYR_EVENT 'jaget'`. Udvid `bestemDoedsaarsag()`-resultatet til altid at følge med døden i et `DYR_DOEDE_INDIVID`-event med `aarsag` + en kort `deathtext`. Stationen viser det i event-feedet: *"⚠️ Din Brune Grævling blev fanget — uden forsvar var den et let bytte."*
- **Art uddør:** behold den nuværende store, dramatiske overlay + fuld dødstekst. Det er det rigtige klimaks.

Teknisk er ændringen lille: `deathtext.js` kan allerede generere tekst for et hvilket som helst individ; fjern blot `if (sidsteAfArt)`-gaten for den *korte* variant, og behold den for den *store* overlay.

### C. Marker elevens stamdyr

Giv elevens oprindelige individ en lille krone/markør (`👑` eller en ring) så barnet kan følge præcis sit dyr på skærmen, adskilt fra afkommet. Når stamdyret dør, så sig det på stationen ("Dit første dyr døde efter 52 sek — men arten lever videre i 3 afkom"). Det løser ejerskabstabet *og* introducerer generations-tanken (bro til Opgavepakke 05).

### D. Scoren synlig under bygning

Vis en lille løbende "habitat-match"-indikator ved siden af energimåleren under bygning — ikke kun energi tilbage, men også "hvor godt passer det her til ørkenen lige nu". To målere = to spørgsmål eleven skal balancere ("har jeg råd?" + "passer det?"), hvilket er hele den biologiske pointe om trade-offs.

> ⚠️ Designnote: gør match-måleren *kvalitativ* (fx en termometer-pil dårlig↔god), ikke et råt tal eleven kan min-maxe. Vi vil lære trade-off-tænkning, ikke optimering mod en formel.

---

## Didaktisk vagt: undgå at lære "design = evolution"

Checklisten gør konsekvensen tydelig — men den må ikke cementere at *du* gjorde dyret bedre. Formulér feedback om **arten i habitatet**, ikke om elevens kløgt:

- I stedet for "Godt valgt! Du gjorde dit dyr perfekt" → "Arter med skæl klarer sig i ørkenen — derfor ser vi dem der i virkeligheden."
- Ved død: ikke "du tabte", men "den her kombination havde det svært her — i naturen ville den slags dyr få færre unger." Se Opgavepakke 04 + 05.

---

## Gjort-når (acceptkriterier)

- [ ] Eleven kan på bekræftelsesskærmen se hver af sine 6 egenskaber markeret god/neutral/dårlig for det aktuelle habitat, med en kort forklaring.
- [ ] Samme checklist er synlig mens dyret lever.
- [ ] Når et individ (ikke kun en hel art) dør, kan eleven se en kort årsag koblet til en egenskab.
- [ ] Elevens stamdyr er visuelt markeret på habitatskærmen, og dets død meldes på stationen.
- [ ] Ingen feedbacktekst tilskriver overlevelse til elevens "dygtighed"; alt er formuleret om art + habitat.

## Berørte filer
`survival.js` (ny `forklarEgenskaber`), `station.js` (`opdaterLiveStatus`, `visBekraeftelse`, event-feed), `habitat.js` (`bestemDoedsaarsag`/`draebDyr`/`tjekDoed` → individ-event; stamdyr-markør), `station.css`/`habitat.css` (checklist + markør).
