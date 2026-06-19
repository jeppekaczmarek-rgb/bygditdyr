# Opgavepakke 04 — Levende formidlingstekster

**Søjle:** Gode og levende formidlingstekster hele vejen rundt — biologi, valg og live-begivenheder
**Status i dag:** 🟡 Ét stærkt tekst-system (`deathtext.js`) bruges næsten ikke; resten er generisk eller mangler

---

## Problemet

Spillets sprog er ujævnt. Dødsteksterne i `deathtext.js` er rigtig gode — konkrete, dramatiske, biologisk præcise, skrevet til målgruppen ("Lille og koldblodigt i polarvinteren. Varmen forsvandt på få minutter."). Men:

1. **De vises næsten aldrig** (kun ved artsuddøen — se Opgavepakke 01).
2. **Event-teksterne er tomme kalorier.** `EVENT_TEKST` siger "🌿 X leder efter mad", "🎯 X jager et bytte", "💨 X flygter fra fare". Det beskriver *hvad* dyret gør, aldrig *hvorfor* det er biologisk interessant. Det er undertekster, ikke formidling.
3. **Byggevalgene forklares i én linje hver** ("God varmeisolering", "Simpel — men sprød") og koblingen til habitatet mangler helt indtil dyret er dødt.
4. **Linné-navnet forklares ikke.** GDD'en (Q12) designede et ordliste-panel: "Magnus = stor, venenatus = giftig". Det findes ikke. Spillet genererer smukke navne som *Magnocalor venenatus piluscarnivorus* og lader dem stå uforklaret — en oplagt læringschance der ligger ubrugt.
5. **Ingen stemme fortæller verdenen.** Den store skærm har ingen fortæller. Begivenheder sker, men ingen rammesætter dem for klassen.

---

## Forslag: et formidlingslag i tre niveauer

Tænk teksterne som tre lag efter hvor meget tid gæsten har — præcis som museumsforskningen anbefaler ("short interactions still teach key concepts; reward longer engagement with additional insight").

### Lag 1 — Mikrotekst (½ sekunds læsning): byggekortene

Hvert byggekort skal koble valg → krop → habitat i ét åndedrag. Behold den korte stil, men gør den til biologi frem for produktbeskrivelse:

| I dag | Forslag |
|---|---|
| Pels — "God varmeisolering" | Pels — "Holder på kropsvarmen. Tænk på en isbjørn — perfekt i kulde, en katastrofe i ørkenen." |
| Skæl — "Vandtæt og varmeresistent" | Skæl — "Låser fugten inde og tåler stegende sol. Krybdyrenes ørken-trick." |
| Lavt stofskifte — "Bruger solens varme" | Lavt stofskifte — "Koldblodig: gratis varme fra solen, men hjælpeløs i frost. Som en firben." |
| Giftig — "Effektivt — men biologisk dyrt" | Giftig — "Rovdyr lærer at holde sig væk. Men gift koster kroppen dyrt at lave." |

Princip: hvert kort = én funktion + ét virkeligt dyr eleven kender. Det forankrer abstraktionen i naturhistorie (og passer til Naturamas samling).

### Lag 2 — Konsekvenstekst (2 sekunders læsning): checklist + events

**Checklist-forklaringer** (føder Opgavepakke 01's egenskabs-checklist). Lav en tekstbank `forklaring[habitat][kategori][værdi]`:

```js
forklaring.oerken.hudtype.pels   = "Pelsen koger dyret indefra i ørkenheden.";
forklaring.oerken.hudtype.skael  = "Skæl låser fugten inde — bygget til ørken.";
forklaring.arktis.stofskifte.lavt= "Koldblodig i frost: kroppen kan ikke lave sin egen varme.";
forklaring.skov.forsvar.flugt    = "Træer og buske at flygte mellem — hurtige ben redder liv her.";
```

**Event-tekster med hvorfor.** Opgrader `EVENT_TEKST` fra handling til indsigt:

| Event | I dag | Forslag |
|---|---|---|
| spiser | "X leder efter mad" | "🌿 X æder planter — planteædere skal bruge meget tid på at samle nok energi" |
| jager | "X jager et bytte" | "🎯 X går på jagt — kød giver meget energi, men hver jagt kan slå fejl" |
| flygter | "X flygter fra fare" | "💨 X flygter — hver flugt brænder energi den ellers skulle bruge på at få unger" |
| foedsel | "X fik et afkom" | "💕 X fik en unge — den klarede sig godt nok til at føre arten videre" |

Bemærk den sidste: "føre arten videre" italesætter selektion og generationer (jf. Opgavepakke 05) i stedet for individuel succes.

### Lag 3 — Fortælletekst (den blivende gæst): fortælleren på skærmen

Giv habitatskærmen en diskret **fortællerstribe** der rammer de få store øjeblikke — ikke en konstant strøm, men 1 linje ad gangen ved nøglebegivenheder:

- Ved start: *"Tempereret skov. Her vrimler det med føde om sommeren — men vinteren afgør hvem der overlever."*
- Første kødæder ud: *"Et rovdyr er ankommet. Nu er planteæderne ikke længere alene."*
- Stor population af én art: *"Mange ens dyr tæt sammen. I naturen er det farligt — sygdom spreder sig let."*
- Sidste af en art dør: behold `deathtext.js`-linjen, stort.
- Ny rekord: *"Ny rekord! Denne art fandt en kombination der virker her."*

Fortælleren er stedet hvor evolutions-rammen sættes rigtigt (se didaktisk note nedenfor).

### Ordliste / Linné-panel

Byg det panel GDD'en designede. To anvendelser:

1. **På bygge-bekræftelsen:** når navnet *Magnocalor venenatus piluscarnivorus* vises, så bryd det ned interaktivt:
   *Magno = stor · calor = varm (varmblodig) · venenatus = giftig · pilus = pels · carnivor = kødæder.*
   "Sådan navngiver biologer rigtige arter — navnet fortæller hvad dyret er."
2. **Som lille opslags-ikon** ved hvert byggetrin der forklarer fagordet (stofskifte, nataktiv, niche).

Dataene findes allerede spredt i `names.js` (GENUS, HUDTYPE_ROD, KOST_SUFFIKS osv.) — saml betydningerne i én ordbog og vis dem.

---

## Tonebog (så alle tekster trækker samme vej)

- **Aldersmål 10–12:** korte hovedsætninger, konkrete billeder, ingen formalisme. Ét fagord ad gangen, altid forklaret i nærheden.
- **Naturhistorisk, ikke gamified:** "føde", "art", "fødekæde", "tilpasning" — ikke "points", "level", "loot".
- **Aldrig skadefro, aldrig "du tabte":** døden er biologi, ikke straf. "Den slags dyr får færre unger her" frem for "forkert valg".
- **Art + generationer frem for individ + vilje:** se næste afsnit.
- **Dramatisk, men sandt:** `deathtext.js` rammer tonen perfekt — brug den som stilreference for alt nyt.

## Didaktisk vagt (kritisk): undgå at sproget lærer lamarckisme

Den mest udbredte elev-misforståelse om evolution er at *individer ændrer sig med vilje for at passe ind*. Spillets byggefase ligner den misforståelse til forveksling. Sproget er vores bedste værktøj til at modvirke den. Konkret regelsæt for alle tekster:

- Tilskriv overlevelse til **arten i miljøet**, ikke til elevens kløgt eller dyrets vilje.
  - ✅ "Arter med skæl klarer sig i ørkenen — derfor finder vi dem der."
  - ❌ "Dit dyr tilpassede sig ørkenen."
- Brug **generationer**: "førte arten videre", "anden generation", "fik flere unger end de andre".
- Lad **variation + selektion** være synlig i sproget: "de der passede bedst, fik flest unger — sådan ændrer arter sig over lang tid."

Dette koster ingen ekstra mekanik — kun konsekvent ordvalg. Det er forskellen på et spil der ved et uheld bekræfter en misforståelse, og et der stille retter den.

---

## Gjort-når (acceptkriterier)

- [ ] Alle byggekort kobler funktion + habitat + et virkeligt dyr.
- [ ] Der findes en `forklaring[habitat][kategori][værdi]`-bank brugt af checklisten (Opgavepakke 01).
- [ ] Event-teksterne forklarer *hvorfor*, ikke kun *hvad*.
- [ ] Habitatskærmen har en fortællerstribe der rammer nøglebegivenheder, throttlet.
- [ ] Linné-navnet kan brydes ned i sine betydningsled; fagord har opslag.
- [ ] Ingen tekst tilskriver tilpasning til individets vilje eller elevens dygtighed; art + generationer bruges konsekvent.

## Berørte filer
`station.js` (`BYGGETRIN`-beskrivelser, navne-nedbrydning, ordliste), `deathtext.js` (udvid til individ-død + evt. flere årsager), `habitat.js` (`EVENT_TEKST`, ny fortællerstribe), `names.js` (saml betydnings-ordbog), `station.css`/`habitat.css`.
