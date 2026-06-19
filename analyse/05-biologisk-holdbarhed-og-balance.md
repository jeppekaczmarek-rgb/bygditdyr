# Opgavepakke 05 — Biologisk holdbarhed & balance

**Lins:** Spildesigner + biolog. Er valgene meningsfulde, og er biologien til at stole på?
**Status i dag:** 🟡 Solidt fundament, men nogle "løste" valg, en fælde, en dominansstrategi og en didaktisk risiko
**Indsats:** Mest rene data-ændringer — høj læringsværdi pr. time

---

## Metode

Jeg regnede alle **576 kombinationer** igennem (`analyse/balance.js`, kørbar med `node`): energi-gyldighed, habitatscore pr. habitat, dominerende træk i top-builds, og "døde" valg. Tallene nedenfor er fra den kørsel. Koden matcher Notion-matricen præcist — biologien er altså trofast implementeret; spørgsmålet er om *spillet af den* er godt.

---

## Fund 1 — To af seks valg er "løst" på forhånd

Fordi habitatet vises før bygning, er **stofskifte** og **aktivitet** næsten determinerede:

- Skov & arktis: **dagaktiv** vælges i 20/20 top-builds. Ørken: **nataktiv** i 19/20.
- Stofskifte: **højt** dominerer skov/arktis, **lavt** dominerer ørken — én rigtig værdi pr. habitat.

Det betyder at eleven træffer to "valg" der reelt kun har ét fornuftigt svar. Det er ikke beslutninger, det er quiz-spørgsmål. De fire øvrige kategorier (hudtype, kost, størrelse, forsvar) bærer den egentlige strategiske dybde.

**Forslag:** giv stofskifte og aktivitet en *modsatrettet* bivirkning, så det bliver et ægte trade-off frem for et oplagt svar. Eksempler:
- **Nataktiv** kunne reducere fourageringsradius (sværere at finde mad i mørke) men øge detektionsradius mod rovdyr — så ørken-spilleren vinder klima men taber lidt føde-effektivitet. Motoren har allerede begge radiuser (`beregnFourageringsRadius`, `beregnDetektionsRadius`).
- **Højt stofskifte** giver hurtigere formering men hurtigere energitab (findes delvist allerede via `stofFaktor`) — gør den koblingen synlig, så "varmblodig = stærk men sulten" bliver et følt valg.

Dette er ikke nødvendigvis en fejl der *skal* rettes — men det er værd at vide at spillets seks valg i praksis er fire.

## Fund 2 — Glat hud er en ren fælde

**Glat hud optræder aldrig i en top-10 build i noget habitat.** Den er −1 (skov), −2 (arktis), −1 (ørken) og koster det samme som skæl (1), der er bedre eller lige god overalt. Der er ingen situation hvor glat hud er det rigtige valg. Et barn der vælger den (måske fordi en frø er glat og fascinerende) bliver straffet uden at have en reel chance — og lærer intet undtagen "det var det forkerte tryk".

**Forslag (vælg én):**
- **Giv glat hud en niche.** Biologisk hører glat hud til det våde — padder, ål, hvaler. Tilføj et **hav/vådområde-habitat** (allerede i GDD'ens habitatliste!) hvor glat hud er +2 og skæl/pels straffes. Så bliver fælden til et meningsfuldt specialistvalg.
- **Eller giv glat hud en fordel der findes i prototypen:** fx billigst mulige + en lille formerings-/fart-bonus ("simpel krop, hurtig at bygge biologisk"), så den bliver "high-risk, high-tempo" frem for strengt dårlig.

Lige nu er den et didaktisk benspænd: den lærer at nogle valg bare er forkerte, hvilket er det modsatte af trade-off-tænkning.

## Fund 3 — Allæder er en blød dominansstrategi

Allæder er **+2 i skov, +2 i ørken, +1 i arktis** og koster kun 2. Den er aldrig dårlig. "I tvivl? Vælg allæder" er en vindende heuristik, hvilket udvander kost-beslutningen — den mest biologisk interessante kategori (planteæder/kødæder/allæder rammer fødekæden direkte).

Det er biologisk *forsvarligt* (generalister er robuste — vaskebjørn, krage, menneske), men som spilvalg er det for sikkert. Specialisering bør belønnes nogле steder, ellers lærer spillet "vær aldrig specialist", hvilket er biologisk forkert (specialister vinder i stabile, ekstreme nicher).

**Forslag:** lad allæderens fleksibilitet koste noget specialisterne slipper for:
- Sænk allæder til **+1** i ørken og skov (behold +1 i arktis). Så er den stadig en sikker midterbane, men en *velvalgt specialist* (skæl-planteæder i ørken; kødæder i arktis) slår den. Det matcher økologien: i et ekstremt habitat vinder specialisten.
- Alternativt: giv specialist-kost en synlig bonus i simulationen (kødæder får mere ud af hver fangst; planteæder fouragerer hurtigere) så valget mærkes i live-spillet, ikke kun i scoren.

## Fund 4 — Arktis er overspændt, ørken er for "løst"

- **Arktis:** bedste *opnåelige* score er kun **6 af teoretisk 10**. Budgettet tvinger 15/20 top-builds til **"intet forsvar"** — forsvarskategorien forsvinder reelt. Og gulvet er brutalt: et dårligt arktisk dyr lever **10 sekunder**, knap synligt. Arktis straffer hårdt og fjerner et helt valg.
- **Ørken:** har **én** dominerende optimal-build (`lavt/skæl/allæder/lille/nataktiv/giftig`, score 11, præcis 10 energi) der også lever **længst af alle (148 s)**. Når den optimale er både entydig og billigst, er der lidt at opdage.
- **Skov** er forbilledet: **6 forskellige builds** deler topscoren, på tværs af begge stofskifter og tre hudtyper. Mange veje. Brug skoven som balance-mål for de andre.

**Forslag:**
- Arktis: hæv enten energibudgettet en smule *eller* sænk prisen på de arktiske kerne-træk (fx pels 2→1 i kraft af at "isolering er simpelt"), så et arktisk dyr har råd til ét forsvar. Mål: bedste opnåelige score op mod ~8, og forsvarskategorien bliver relevant igen.
- Ørken: spred topscoren over flere builds (fx hæv pigge eller flugt en smule i ørken) så der er 3–4 gode ørkendyr i stedet for ét.
- Generelt: hæv det absolutte levetidsgulv (`MIN_LEVETID`) fra 10 til ~20 s, så selv et dårligt dyr når at blive set og forklaret. Et dyr der dør på 10 s kan ikke bære en læring.

## Fund 5 — Den didaktiske hovedrisiko: spillet kan lære lamarckisme

Dette er det vigtigste i hele pakken. Forskning viser at den dominerende elev-misforståelse om evolution er at *individer ændrer sig med vilje for at passe til miljøet*. **Byg Dit Dyr's præmis — "design ét individ der passer perfekt til habitatet" — er en næsten perfekt iscenesættelse af præcis den misforståelse.** Hvis spillet ikke aktivt modvirker det, risikerer det at lære børn det stik modsatte af evolution.

Det stærke er, at motoren allerede har råstoffet til den *rigtige* fortælling:
- **Variation:** mange forskellige dyr i samme habitat.
- **Selektion:** de dårligt tilpassede dør hurtigt; de godt tilpassede lever.
- **Arv + reproduktion:** afkom arver forældrenes egenskaber (`spawnAfkom` kopierer `egenskaber`).
- **Differentiel reproduktion:** kun dyr i overskud får afkom (`trives`-gaten i `opdaterFormering`).

Det er bogstavelig talt darwinistisk selektion — men spillet *fortæller* det aldrig. Eleven oplever "jeg designede et godt dyr", ikke "de bedst tilpassede fik flest unger".

**Forslag (samspil med Opgavepakke 01 + 04):**
1. **Reframe bygningen som variation, ikke design.** Lad fortælleren sige: "Du sender én variant ud i naturen. Nu afgør habitatet om den slags klarer sig." Eleven laver et *individ i en population*, ikke en perfekt skabning.
2. **Gør generationer synlige.** Marker "1. generation / 2. generation" på afkom. Vis at arten *fortsætter gennem dem der overlevede* — det er selektionens kerne.
3. **(Ambitiøst, men dette er guldet) Indfør lille mutation ved formering.** Lad afkom have fx 10 % chance for at ét træk muterer til en naborværdi. Så kan klassen *se* en art ændre sig over generationer mod bedre tilpasning — uden at nogen "designede" det. Det forvandler spillet fra "intelligent design-simulator" til "evolutions-simulator" og er den enkeltændring der bedst indfrier museets faglige formål. Motoren understøtter det trivielt (ét linjes mutation i `spawnAfkom`), og det kobler direkte til den udskudte "evolutionsmekanik"-idé i jeres egne Noter.

> Hvis I kun gør én ting fra denne pakke: gør generationer + selektion synlige i sproget (billigt), og overvej mutation ved formering (mellem indsats, stor faglig gevinst).

---

## Prioriteret tjekliste for denne pakke

| Ændring | Type | Indsats | Gevinst |
|---|---|---|---|
| Hæv `MIN_LEVETID` 10→~20 s | Konstant | Triviel | Alle dyr når at blive set/forklaret |
| Allæder +2→+1 i skov/ørken | Data | Triviel | Specialisering bliver konkurrencedygtig |
| Gør glat hud meningsfuld (niche el. tempo-bonus) | Data/mekanik | Lav | Fjerner ren fælde |
| Rebalancér arktis (råd til ét forsvar) | Data | Lav | Genåbner forsvarsvalget |
| Spred ørkenens topscore over flere builds | Data | Lav | Mere at opdage |
| Bivirkning på stofskifte/aktivitet | Mekanik | Mellem | 6 ægte valg i stedet for 4 |
| Generationer + selektion synlige i sprog | Tekst | Lav | Modvirker lamarckisme |
| **Mutation ved formering** | Mekanik | Mellem | Forvandler spillet til ægte evolutions-sim |

## Berørte filer
`survival.js` (`HABITAT_SCORE`, `MIN_LEVETID`, evt. `ENERGI_OMKOSTNING`), `habitat.js` (`spawnAfkom` for mutation + generationstælling; evt. radius-bivirkninger), `analyse/balance.js` (genkør efter hver data-ændring for at se nye top-builds).

---

## Bilag: nøgletal fra balance-kørslen (18. juni 2026)

```
Gyldige builds (≤10 energi): 256 / 576 (44 %)
Bedste opnåelige score:  skov 6/8 · arktis 6/10 · ørken 11/11
Levetidsspænd (grundtid): skov 28–108 s · arktis 10–108 s · ørken 20–148 s
Aktivitet i top-builds:   dagaktiv 20/20 (skov, arktis) · nataktiv 19/20 (ørken)
Eneste "døde" valg:       glat hud (aldrig i top-10 noget sted)
Bedste generalist:        lavt/fjer/allæder/mellem/dagaktiv/flugt (snit 4,33)
```
