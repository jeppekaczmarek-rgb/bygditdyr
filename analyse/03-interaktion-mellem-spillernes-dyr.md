# Opgavepakke 03 — Interaktion mellem spillernes dyr

**Søjle:** Klar interaktion mellem de forskellige spilleres dyr
**Status i dag:** 🟡 Interaktionen findes i motoren, men er anonym og svær at aflæse

---

## Problemet

Motoren har ægte cross-player-interaktion: en kødæder fra én station kan jage en planteæder fra en anden (`findByttedyr`/`opdaterJagt`), to fouragerere konkurrerer (`opdaterKonkurrence`), et stort rovdyr lægger en trofisk kaskade over hele skærmen (`opdaterKaskade`). Det er solidt bygget. Men tre ting forhindrer at det bliver til den sociale oplevelse GDD'en ønskede ("Dit dyr tog min mad!"):

1. **Alt er anonymt.** Når et bytte fanges, sender stationen `⚠️ {danskNavn} blev fanget af et rovdyr`. *Hvilket* rovdyr? Hvis station? Eleven får aldrig at vide at det var Sofies løve der spiste deres rådyr. `DYR_JAGES` bærer både `bytte_id` og `jaeger_id` — informationen findes, den kasseres bare.

2. **Interaktionen er visuelt usynlig.** En jagt er to prikker der nærmer sig hinanden og et lille `×`. En konkurrence-bortjagning er et 2-sekunders `✦ Bortjaget!`-mærke. Kaskaden er en usynlig +40px vagtsomhedsbonus. Tre meter fra skærmen ser man intet af det. Den mest sociale mekanik i spillet er den mindst synlige.

3. **Niche-konkurrencen er ren statistik.** GDD'en lovede synlig nicheoverlap ("to planteædere konkurrerer om føde"). I praksis er det emergent gennem `opdaterKonkurrence` (hvem der står nærmest en plante) — fint mekanisk, men der er intet der *fortæller* eleven "din art og Mathildes art lever af det samme, derfor presser I hinanden".

Konsekvens: børnene ser ikke at de spiller *sammen* i samme verden. De ser hver deres prik.

---

## Forslag

### A. Tilskriv interaktioner (billigst, størst social effekt)

Bær spillerens identitet med i begivenhederne. Hvert dyr kender sin oprindelsesstation (tilføj `stationId`/`byggerNavn` til dyr-objektet ved afsendelse i `station.js → sendDyr`). Så kan event-teksterne navngive modparten:

- I dag: `⚠️ Brune Grævling blev fanget af et rovdyr`
- Forslag: `⚠️ Din Brune Grævling blev fanget af Plettet Løve (station 3)`

Og symmetrisk til *jægerens* station, som en sejr:
- `🎯 Din Plettet Løve nedlagde en Brune Grævling — kød giver energi til at få afkom`

Pludselig er der en vinder og en taber med ansigter. Det er motoren til "den tog mit dyr!"-samtalen ved skærmen. Teknisk: udvid `DYR_EVENT`/`DYR_JAGES`-payload med jæger- og bytte-art + station, og lad stationen vise begge perspektiver.

> Designnote: hold tonen ikke-skadefro. Byttets død formuleres biologisk ("blev til føde i fødekæden"), ikke som personligt nederlag. Se Opgavepakke 04.

### B. Iscenesæt få store cross-player-øjeblikke

Vælg de 3–4 mest fortællende interaktioner og gør dem *store og læsbare* på habitatskærmen — resten kan blive i den fine-kornede sim:

- **Jagt-fangst (art mod art):** når en fangst lykkes mellem to *forskellige* spilleres dyr, så frys et kort øjeblik: en ring om de to dyr, en streg imellem, en label "Plettet Løve → Brune Grævling". 1,5 sekund. Det er fødekæden gjort synlig.
- **Konkurrence-møde:** når to arter gentagne gange skubbes fra samme planter, vis en diskret linje mellem dem + "Samme niche — konkurrerer om føde". Det formidler Gauses princip uden et ord latin.
- **Stort rovdyr ankommer (kaskade):** når `trofiskKaskade` slår til, marker det med en kort skærmtekst og en synlig stemningsændring ("Et stort rovdyr er på jagt — alle er på vagt"). Lige nu er kaskadens flotteste idé fuldstændig usynlig.

Throttle disse til maks. én ad gangen (jf. Opgavepakke 02E) så de forbliver begivenheder, ikke støj.

### C. Gør "samme niche" aflæselig med farve/form

Giv arter der deler niche-profil (kost × størrelse × aktivitet) et fælles visuelt mærke — fx samme lille ikon-ramme eller farvet prik på tidslinjen. Så kan klassen *se* "der er fire dyr der lever på samme måde — de kommer til at presse hinanden". Det gør den passive konkurrence til noget man kan pege på.

### D. Et delt "habitat-puls"-panel på den store skърm

En lille fælles status der gør verden til ét system frem for N individuelle dyr:
- antal arter i live, største art, hvem der har flest afkom,
- en mini-fødekæde: hvor mange planteædere / kødædere / allædere lige nu,
- en advarsel når balancen tipper ("Mange rovdyr, få byttedyr — fødekæden er ustabil").

Det giver børnene et fælles referat de kan diskutere, og det viser at deres valg tilsammen former et økosystem.

### E. (v2-bro) Direkte afhængigheder mellem arter

På sigt: lad en arts skæbne afhænge synligt af en andens. Hvis alle planteædere uddør, sulter kødæderne ("dit rovdyr har ikke mere bytte — fordi planteæderne forsvandt"). Motoren har allerede sult-årsagen (`bestemDoedsaarsag` → `sult`); den mangler bare at *tilskrive* den til de andre spilleres valg. Det er den dybeste form for "konsekvens af andres valg".

---

## Hvorfor det også er læring, ikke kun socialt

Cross-player-interaktionen *er* økologien: fødekæder, konkurrenceeksklusion, trofiske kaskader, prædator-byttedyr-cykler. Når interaktionen er anonym og usynlig, går både det sociale *og* det faglige tabt. Når den får navne og iscenesættelse, underviser den i præcis de begreber museet vil formidle — og skaber samtalen mellem gæster, som museumsforskningen peger på som den stærkeste engagementsdriver ("co-play: visitors see and hear one another").

---

## Gjort-når (acceptkriterier)

- [ ] Hvert dyr bærer sin oprindelsesstation/bygger; events navngiver både jæger og bytte.
- [ ] Elevens station viser både "dit dyr blev jaget af X" og (når relevant) "dit dyr nedlagde Y".
- [ ] Mindst tre cross-player-begivenheder (fangst, konkurrence, kaskade) er store og læsbare på habitatskærmen, throttlet til én ad gangen.
- [ ] Arter med samme niche er visuelt genkendelige som "samme slags".
- [ ] Et fælles habitat-puls-panel viser økosystemets tilstand.
- [ ] Tonen i alle interaktionstekster er biologisk, ikke skadefro.

## Berørte filer
`station.js` (`sendDyr` → tilføj station-id; event-feed med to perspektiver), `habitat.js` (`opdaterJagt`/`sendDyrEvent` payloads; iscenesatte overlays; niche-mærkning; puls-panel), `habitat.css` (jagt/konkurrence/kaskade-overlays, puls-panel).
