# Kritisk analyse af *Byg Dit Dyr* — gameplay & læring

**Dato:** 18. juni 2026
**Scope:** Prototypen (3 habitater: skov/arktis/ørken, BroadcastChannel, én skærm)
**Metode:** Fuld gennemlæsning af kodebasen (`survival.js`, `station.js`, `habitat.js` (1.568 linjer), `deathtext.js`, `oekonomi.js`, `names.js`) + GDD, Spildesign, Overlevelsesmatrix, Fejl-database i Notion. Programmatisk gennemregning af alle 576 dyrkombinationer. Didaktisk research (evolutions-misforståelser, museumsformidling).

Denne mappe indeholder hovedanalysen (dette dokument) + fem opgavepakker. Notion har en overbliksudgave; de fulde specs ligger her i repoet.

---

## 1. Samlet vurdering (den ærlige version)

**Simulationsmotoren er imponerende — faktisk overbygget. Læringssløjfen og aflæseligheden er underbygget. Spillet *simulerer* lige nu mere biologi end det *formidler*.**

`habitat.js` indeholder en ægte agent-baseret økologi: tilstandsmaskine (hviler/fouragerer/flygter/jager), sanseradiuser, energi-budget pr. individ, baghold vs. forfølgelse, gift/pigge/flugt-opløsning, Gause-konkurrence, trofisk kaskade, tæthedsafhængig sygdom og formering. Det er teknisk vellavet og biologisk ambitiøst. Problemet er ikke for lidt mekanik — det er at **mekanikken er usynlig for barnet ved skærmen**, og at **den ene direkte læringskobling, GDD'en selv udpegede som vigtigst, aldrig blev bygget.**

Målt på dine fire krav:

| Dit krav | Status | Kort dom |
|---|---|---|
| Tydelige konsekvenser af valg | 🔴 **Ikke opfyldt** | Egenskabs-checklisten (✅/❌ pr. valg) fra GDD'en findes ikke i koden. Dødsforklaringer vises kun når en hel art uddør — de fleste dyr dør i tavshed. |
| Klar interaktion mellem spillernes dyr | 🟡 **Delvist** | Interaktionen *findes* (jagt, konkurrence, kaskade, sygdom), men er anonym og svær at aflæse. Ingen ved hvem der spiste hvem. |
| Levende formidlingstekster hele vejen | 🟡 **Delvist** | `deathtext.js` er rigtig god — men bruges næsten ikke. Event-tekster er generiske ("leder efter mad"). Ingen ordliste, ingen forklaring af Linné-navnet, ingen fortælling af live-begivenheder. |
| Tilpasning til antal spillere | 🔴 **Ikke opfyldt** | Koden kender slet ikke begrebet "antal spillere". Plantemængde, sygdomstærskel og tempo er faste tal. Lavsæson = tom skærm; højsæson = konstante sygdomscrash. |

Den gode nyhed: fordi motoren allerede er rig, handler de fleste forbedringer om at **gøre eksisterende tilstande synlige og forklare dem** — ikke om at bygge ny simulering. Det er billigere end det lyder.

---

## 2. Det centrale paradoks

GDD'en (Q4) udpegede selv kernen i læringen:

> "Feedback skal koble direkte til de valg eleven tog — ikke bare 'du tabte'. Fx: ✅ Koldblodigt (god til varme) ❌ Tyk pels (overophedning i ørken)"

Den checklist er **aldrig implementeret**. `station.js → opdaterLiveStatus()` viser antal individer, ældste, afkom og et ressourceregnskab — men ikke ét ord om *hvilke af elevens seks valg* der hjælper eller skader i det aktuelle habitat. Eleven kan altså bygge et dyr, se det dø, og aldrig få at vide at det var skællene der ikke duede i Arktis.

Hele scoringen findes allerede (`Survival.beregnHabitatScore` kender hver egenskabs bidrag). Tallene ligger og venter; de bliver bare aldrig vist pr. egenskab. **Den vigtigste enkeltstående forbedring i hele projektet er at lukke denne sløjfe** (Opgavepakke 01).

Dertil kommer et didaktisk problem som er dybere end en manglende skærm: **selve byggefasen risikerer at lære børn det modsatte af evolution.** Forskning viser at den mest udbredte elev-misforståelse er at *individer ændrer sig med vilje for at passe til miljøet* (lamarckisme/"directed adaptation") — og spillets præmis ("design ét dyr der passer perfekt til habitatet") er en lærebogs-illustration af præcis den misforståelse. Spillet har råstoffet til at *rette* den (arten dør/overlever over generationer, monokultur straffes), men kun hvis formidlingen italesætter populationen og selektionen. Lige nu gør den ikke. Se Opgavepakke 05.

---

## 3. Gap-analyse: intention → implementering

Tre lag er drevet fra hinanden undervejs:

**GDD'ens overlevelsesformel** lover `Habitatscore + Nichescore + Jagtpres`. I praksis er kun **Habitatscore** i `survival.js`. Niche og jagt er i stedet blevet *emergente* i simulationen — det er faktisk en forbedring (emergent > formel), men det betyder at **scoren eleven bygger efter (og den levetid den giver) ikke afspejler konkurrencen.** To identiske dyr kan klare sig vildt forskelligt afhængigt af hvem andre der er på skærmen, uden at noget forklarer hvorfor. Godt for realisme, forvirrende for læring hvis det ikke formidles.

**GDD'ens feedback-løfte** (checklisten) blev sprunget over.

**GDD'ens "live feedback på stationen"** blev bygget — men som et *ressource*-dashboard (planter/bytte/flugt/angreb), ikke som et *lærings*-dashboard (egenskab → habitat-fit). Ressourceregnskabet er elegant, men det er en abstraktion oveni en abstraktion: et barn på 10 forstår ikke "Netto −3" som "dit dyr brugte mere på at flygte end det fik fra mad". Se Opgavepakke 01 + 04.

---

## 4. Hvad balance-testen viser (alle 576 builds gennemregnet)

Jeg regnede hver mulig kombination igennem mod alle tre habitater. Hovedfund:

- **Energibudgettet bider reelt:** kun **256 af 576 builds (44 %)** er gyldige (≤10 energi). Trade-off'et er ægte — godt.
- **Men flere valg er "løst" på forhånd.** Når habitatet er kendt (og det er det), er **stofskifte** og **aktivitet** næsten determineret: dagaktiv vælges 20/20 i skovens og arktis' bedste builds, nataktiv 19/20 i ørkenens. To af seks kategorier bærer altså næsten ingen reel beslutning. Eleven "vælger" noget der kun har ét rigtigt svar.
- **Allæder er en blød dominansstrategi:** +2 i skov, +2 i ørken, +1 i arktis, koster kun 2. Den er aldrig dårlig. "Når du er i tvivl, vælg allæder" virker — hvilket udvander kost-valget.
- **Glat hud er en ren fælde:** den optræder aldrig i en top-10 build i noget habitat. Strengt domineret af skæl (samme pris, bedre eller lige score overalt). Den har ingen niche, fordi der ikke findes et vådt/akvatisk habitat i prototypen.
- **Arktis er overspændt:** bedste *opnåelige* score er 6 ud af teoretisk 10. Budgettet tvinger næsten alle arktiske dyr til "intet forsvar" (15/20 i top-builds). Et dårligt arktisk dyr dør på gulvtiden **10 sekunder** — knap nok synligt på skærmen for det barn der byggede det.
- **Ørken har én dominerende optimal-build:** `lavt/skæl/allæder/lille/nataktiv/giftig` rammer både max score (11) *og* præcis 10 energi, og lever længst af alle (148 s). Der er ét tydeligt bedste ørkendyr.
- **Skov er bedst balanceret:** 6 forskellige builds deler topscoren, på tværs af begge stofskifter og tre hudtyper. Flere veje til at vinde.

Levetidsspænd (grundtid, før ressource- og jagt-modifikation): skov 28–108 s, arktis 10–108 s, ørken 20–148 s. Ørkenens loft (2,5 min) er markant højere end de andres — en asymmetri i "belønningsloft" mellem habitater.

Detaljer + forslag til rebalancering: **Opgavepakke 05**.

---

## 5. Aflæselighed på den store skærm (det oversete problem)

Museumsforskningen er entydig: interaktive udstillinger skal være *hurtige at afkode*, og "teknologi skal tjene didaktikken, ikke spektaklet". Lige nu sker der enormt meget i `habitat.js` samtidig — baghold, panikflugt, kaskade-vagtsomhed, konkurrence-bortjagning, smittespredning — men det meste kommunikeres med en lille farvet prik (`tilstand-indikator`) og et `+/−`-tal over dyret. **En 10-årig tre meter fra en 65-tommer skærm kan ikke se det.** De store, læsbare øjeblikke (en art uddør) er sjældne; de hyppige øjeblikke (et individ jages) er næsten usynlige.

Det er ikke et argument for *mere* simulering, men for at **udvælge nogle få begivenheder og iscenesætte dem stort**: en jagt der faktisk ses, en fødsel der fejres, en uddøen der får et øjeblik. Se Opgavepakke 03 + 04.

---

## 6. Roadmap — prioriteret

Rækkefølgen er valgt efter *læringsværdi pr. udviklingstime*. De første to deler en station-komponent (et egenskabs-panel) og bør laves sammen.

| # | Opgavepakke | Løser primært | Effekt | Indsats | Kerne-ændring |
|---|---|---|---|---|---|
| **01** | Tydelige konsekvenser & feedback-loop | Konsekvenser | 🟢🟢🟢 | Mellem | Egenskabs-checklist på stationen (data findes allerede); dødstekst ved *individ*, ikke kun art |
| **05** | Biologisk holdbarhed & balance | Konsekvenser/læring | 🟢🟢🟢 | Lav | Rene data-ændringer i matrix + et par mekanik-knap. Fjern fælder, åbn løste valg |
| **04** | Levende formidlingstekster | Formidling | 🟢🟢 | Mellem | Fortælle-lag for events, ordliste, Linné-forklaring, udvidet `deathtext.js`-brug |
| **02** | Skalering efter spillerantal | Skalering | 🟢🟢 | Mellem | Indfør `aktiveSpillere`-tal; gør plantemængde/sygdom/tempo til funktioner af det; NPC-dyr i lavsæson |
| **03** | Interaktion mellem spillernes dyr | Interaktion | 🟢🟢 | Mellem-høj | Tilskrivning ("Ræven fra station 3"); iscenesæt få store cross-player-øjeblikke |

**Foreslået sprint-opdeling:**
1. **Sprint A (læringssløjfen):** 01 + 05 sammen. Det er den billigste vej til at opfylde dit vigtigste krav — og 05 er næsten gratis (data).
2. **Sprint B (stemme & stemning):** 04. Gør sløjfen levende og retter evolutions-misforståelsen i sproget.
3. **Sprint C (drift & socialt):** 02 + 03. Gør spillet robust mod sæsonudsving og skaber "dit dyr tog min mad"-samtalerne.

Et detaljeret forslag til hver pakke ligger i sin egen fil. Hver pakke er skrevet til at kunne tages op selvstændigt og indeholder: problem, kodested, konkret forslag (med eksempeltekst/pseudokode) og et "gjort-når"-kriterium.

---

## 7. Tværgående anbefalinger

1. **Byg "hvorfor" ind, ikke kun "hvad".** Hver gang spillet viser at noget *sker* (dør, jager, flygter), skal det kunne sige *hvorfor* i ét barnesprogligt led koblet til et af elevens valg.
2. **Tal om arten og generationerne, ikke kun individet.** Det er den eneste måde at undgå at spillet utilsigtet lærer lamarckisme. Lad formidlingen sige "din *art* klarede sig", "anden generation", "for ens — derfor sygdom".
3. **Vælg få begivenheder og gør dem store.** Aflæselighed slår fuldstændighed på en museumsskærm.
4. **Gør de faste tal til knapper.** Næsten alt der skal til for skalering og rebalancering er allerede konstanter i toppen af `habitat.js`/`survival.js`. Gør dem afhængige af kontekst.
5. **Behold motorens dybde — den er et aktiv.** Den belønner den nysgerrige gæst der bliver stående. Den skal bare have en letlæselig overflade.
