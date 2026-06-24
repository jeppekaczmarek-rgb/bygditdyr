---
name: byg-dit-dyr-craft
description: >-
  Spilhåndværks-rygrad for "Byg Dit Dyr" — det interaktive museumsspil til
  Naturama i Svendborg. Brug ALTID denne skill når du arbejder i bygditdyr-repoet,
  uanset om opgaven er en ny feature, en bugfix, en visuel justering eller en
  balancering. Den definerer kvalitetsbaren for engagement, visuelt liv og polish,
  og den kræver at du KØRER og SER spillet, før noget kaldes færdigt. Aktivér den
  ved enhver ændring i spillet og ved ord som "spilfølelse", "føles ikke godt",
  "juice", "levende", "animation", "engagement", "kedeligt", "flowet" eller "polish".
---

# Byg Dit Dyr — Spilhåndværk

Du arbejder ikke på en kodeopgave. Du bygger et **museumsspil** der skal fange
10-12-årige skolebørn, der står foran en touchskærm i 30 sekunder, uden vejledning,
uden hjælp, midt i larm. Hold det billede for øje i alt hvad du laver: et barn,
der lige er gået hen til en skærm og skal forelske sig i den, før de går videre.

## Hvorfor denne skill findes

Spillets simulationsmotor er allerede stærk — faktisk overbygget. Den har ægte
agent-økologi, konkurrence, jagt, formering og sygdom. Problemet er ikke biologien.
Problemet er, at **spillet simulerer mere end det viser**, og at selve oplevelsen
halter på tre fronter: det fanger ikke barnet (engagement), verdenen virker ikke
levende (visuelt), og det føles teknisk ujævnt (polish).

Den dybeste årsag er en arbejdsvane: features bliver bygget "færdige nok til at
kompilere" — uden at nogen nogensinde har set det kørende spil med et barns øjne.
Denne skill retter netop dét. Den gør dig til håndværker, ikke kodemaskine.

## De tre kvalitetssøjler

Alt arbejde måles mod disse tre. Når du planlægger en opgave, så spørg eksplicit:
hvad gør det her ved engagement, visuelt liv og polish?

### 1. Engagement — fang barnet på 3 sekunder
- **Walk-up-and-play.** Ingen instruktioner. Det første valg skal være indlysende
  og give en synlig, sjov reaktion med det samme.
- **Øjeblikkelig belønning.** Hvert valg eleven træffer skal *føles* — en lyd, en
  bevægelse, dyret der ændrer sig for øjnene af dem. Aldrig et valg uden respons.
- **Få men STORE øjeblikke.** På en museumsskærm slår aflæselighed fuldstændighed.
  Ét stort, læsbart drama (dit dyr nedlægger et andet barns dyr) er mere værd end
  ti små samtidige hændelser, ingen kan følge.
- **Ejerskab.** Barnet skal kunne pege og sige "se MIT dyr". Markér, fremhæv og
  følg elevens eget dyr gennem hele dets liv.

### 2. Visuelt liv — verdenen skal ånde
- **Aldrig en død skærm.** Der skal altid bevæge sig noget: dyr der trækker vejret,
  vipper med ørerne, kigger sig omkring, planter der svajer, lys der skifter.
- **Variation.** Ingen to dyr må bevæge sig i takt. Forskyd faser, hastigheder og
  pauser, så det føles organisk og ikke som kopier af samme loop.
- **Dybde.** Brug lag, parallax, skala og let kamerabevægelse, så habitatet føles
  som en verden, ikke en plakat.
- **Feedback-partikler.** Små visuelle effekter (støv, glimt, ringe) på vigtige
  handlinger gør verdenen reaktiv og taktil.
- Råstoffet findes allerede: 576 sprites + animationsframes. Søjlen handler om
  *hvordan* de bruges — timing, variation og liv — ikke om mere grafik.

### 3. Polish & feel — det skal føles smurt
- **Easing på alt.** Intet flytter sig lineært. Brug ind/ud-easing på bevægelser,
  fades og skift. Lineær bevægelse er en bug, ikke en stil.
- **Anticipation & follow-through.** Store hændelser skal varsles og klinge ud,
  ikke bare poppe. Et øjebliks optakt gør en hændelse læsbar og tilfredsstillende.
- **Jævnhed.** Sigt mod stabile 60 fps. Ingen synlig stutter, ingen layout-spring,
  ingen fejl i konsollen.
- **Lyd.** Selv simpel syntetiseret lyd på nøglehandlinger hæver feel markant. En
  stum handling føles ødelagt.

## Ufravigelig arbejdsgang: SE før du siger færdig

Dette er skillens vigtigste regel. Du må **aldrig** kalde en visuel- eller
feel-opgave færdig, før du har set det kørende spil med dine egne (screenshot-)øjne.

1. Læs `CLAUDE.md` og kør `git log --oneline -10` (eksisterende projektregel).
2. Foreslå plan → vent på Jeppes ok → implementér.
3. **Kør spillet og se det:**
   - Start en lokal server: `python3 -m http.server 8000` (eller brug live-URL'en
     `https://jeppekaczmarek-rgb.github.io/bygditdyr/`).
   - Brug Playwright eller Puppeteer (node) til at åbne **både** en byggestation
     **og** den store habitat-skærm — de taler sammen via BroadcastChannel, så åbn
     to sider/kontekster og lad dem kommunikere.
   - Klik gennem et helt flow: byg et dyr → send til habitat → lad det leve og dø.
   - Tag screenshots på nøgletidspunkter (byggevalg, dyr i habitat, en hændelse,
     en død). Optag en kort video/gif hvis muligt.
   - Tjek konsollen for fejl. Mål fps hvor du kan.
4. **Vurder mod kvalitetsbaren nedenfor** — som en 10-årig på 2 meters afstand,
   ikke som en udvikler der læser kode.
5. Ret det svageste punkt. Gentag fra trin 3, til baren er grøn.
6. Først når baren er grøn: `node --check js/*.js`, derefter PR.

Se `scripts/playtest.md` for en konkret skabelon til screenshot-løkken.

## Kvalitetsbar (Definition of Good)

En visuel/feel-opgave er først færdig, når alle disse kan besvares med JA — og du
har set beviset på et screenshot, ikke bare antaget det:

- [ ] Kan en fremmed forstå hvad der sker på skærmen inden for 5 sekunder?
- [ ] Bevæger der sig altid noget? (ingen død skærm)
- [ ] Giver hvert spillervalg en synlig reaktion med det samme?
- [ ] Er der mindst ét "wow"-øjeblik pr. session?
- [ ] Har nøglehandlinger easing, optakt og feedback (ikke hårde spring)?
- [ ] Kører det jævnt — ingen synlig stutter, ingen konsol-fejl?
- [ ] Ville et barn pege på skærmen og råbe "se MIT dyr!"?

## Anti-mønstre — gør IKKE dette

- **Byg ikke endnu et usynligt simulationslag.** Motoren er allerede overbygget.
  Hvert nyt stykke logik skal have en synlig, aflæselig overflade — ellers byg det
  ikke. Spørg altid: kan barnet *se* det her?
- **Deklarér ikke "færdig" ud fra at koden kører.** Færdig = kvalitetsbaren er grøn
  og du har set det.
- **Lav ikke ti små hændelser.** Lav få store, læsbare. Aflæselighed > fuldstændighed.
- **Brug ikke lineær bevægelse.** Det føles altid billigt.

## Bevar — det der allerede er godt

- **Biologisk korrekthed.** Overlevelsesmatricen og trade-off'et er solidt. Bryd
  det ikke for at lave en effekt.
- **Art + generationer, ikke individ + vilje.** Tekster og feedback skal tale om
  arter der udvikler sig over generationer (ikke individer der ændrer sig med vilje)
  — ellers fodrer spillet den lamarckistiske misforståelse.
- **Notion-disciplin.** Brug `update_content` frem for `replace_content` på sider
  med undersider. Log beslutninger i "Fremdrift & status", fejl i "Fejl & bugs".

## Dyk dybere

Når en opgave kræver det, så læs den relevante reference:

- `references/game-feel.md` — easing-kurver, timing, anticipation, konkrete juice-opskrifter.
- `references/museum-craft.md` — attract-loop, walk-up-and-play, aflæselighed på afstand.
- `references/visual-life.md` — idle-animation, fase-forskydning, kamera, parallax, partikler.

(Disse bygges sammen med Jeppe — se dem som næste skridt, ikke som færdige endnu.)
