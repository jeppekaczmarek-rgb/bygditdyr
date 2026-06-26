Dette dokument beskriver projektet til Claude Code. Læs det før du skriver en eneste linje kode.

---

## Hvad er dette?

Et interaktivt museumsoplevelse-spil til Naturama i Svendborg. Elever i 4.-6. klasse bygger et dyr med biologiske egenskaber og sender det ud i et habitat på en stor fælles skærm.

## Aktuel status (26. juni 2026, opdateret sjette gang)

**Spillet er live:** https://jeppekaczmarek-rgb.github.io/bygditdyr/ (forside · /station.html · /habitat.html)

Kerne-spiludviklingen er **færdig**. Alle forbedringspakker er implementeret:

| Pakke | Indhold | Status |
|---|---|---|
| 01 | Egenskabs-checklist, individ-dødsbeskeder, stamdyr-markør (★), habitat-match-måler | ✅ |
| 02 | Dynamisk skalering: NPC-dyr i lavsæson, bærekapacitet, logistisk sygdom/formering | ✅ |
| 03 | Cross-player: jagt-attribution, puls-panel, niche-markering, trofiske afhæng. | ✅ |
| 04 | Biologiske byggekort, Linné-nedbrydning, event-forklaringer, fortæller-stribe | ✅ |
| 05 | Balance (MIN_LEVETID→20s, allæder, arktis, glat hud) + mutation 8 % ved formering | ✅ |
| 06 | Byggestruktur redesign: 5-trins betinget flow, nyt egenskabs-skema, enkelt skov-habitat, MAX_ENERGI=12 | ✅ |
| 07 | `deathtext.js` og `sprites.js` opdateret til nye egenskaber (pr. pakke 06) | ✅ |

**Derudover bygget:** statistik/personaledashboard (`indstillinger.html`), dag/nat-cyklus (60s dag / 30s nat), fangst-flash ved drab, formeringsanimation (✨), levende baggrundspuls, automatiseret CI-playtest (`.github/workflows/playtest.yml`), populationsgraf (kurvegraf: antal dyr over tid pr. art, rullende 180s-vindue).

**Bugfixes (PR #18, 25. juni):**
- Formering virker nu for alle score-niveauer: `FORM_ENERGI_MIN` sænket 0.5→0.3; rater hævet (HURTIG 33→20s, MIDDEL 120→50s, LANGSOM 240→90s)
- NPC-dyr bruger nu `Names.genererDanskNavn()` + `Names.genererArtsnavn()` — ikke mere hardcodede navne ('Skovræv'/'Skovhare')
- Stofskifte-balance: `kold: -1 → 0` i `HABITAT_SCORE.skov` — koldblodig er neutral i skov (stadig billigst i energibudget: kost 1 vs 3)
- CI: node-version 20→24, playtest-script opdateret til pakke 06's 5-trins skema

**PR #19 (25. juni):**
- Tidslinje (Gantt) erstattet med kurvegraf der viser antal levende individer pr. art over tid
- Rullende 180s-vindue; samples hvert 5. sekund (`POP_SAMPLE_INTERVAL`); maks 500 samples
- NPC-dyr tælles ikke med i grafen; Y-akse og X-akse med dynamiske gridlinjer

**PR #23 (25. juni):**
- `#oekonomi-tavle` (levende dyr ressource-tabel) fjernet fra `habitat.html` og CSS
- Scoreboard ("Dagens bedste" + "Rekordlisten") fjernet fra `habitat.html` — `scoreboard.js` bevaret til dataindsamling og mini-scoreboard på stationen
- `teststation.html` tilføjet: send dyr direkte til habitatet uden stationsflow, med dropdowns, 6 presets, bulk-send og live score-beregning
- `index.html`: 🧪 Teststation-link tilføjet i fodfoden ved siden af ⚙️ Personalemenu

**PR #27 (26. juni):**
- Formerings-rater 4× hævet: `HURTIG 100/20→100/6`, `MIDDEL 100/50→100/12`, `LANGSOM 100/55→100/18` — et veltilpasset stamdyr giver nu 8–10 individer inden for 30 sekunder
- Populationsgraf: label-overlap løst (resolver skyder labels lodret, min. 15 px afstand); labels placeret i bred højre margin (mr 8→100 px) med farvet dot; linjerne tykkere (2→2,5 px, roundede joins); Y-akse starter ved 5
- Station afsendt-skærm: "Byg nyt dyr"-knap altid synlig — `overflow-y: auto` tilføjet globalt på `.afsendt-indhold`

**PR #29 (26. juni) — Procedurelle placeholder-karaktersprites:**
- `sprites.js` omskrevet til en **procedurel SVG-generator**: tegner et simpelt, men aflæseligt dyr ud fra de fem egenskaber — stand-in for de kommende Blender/billede-renders. Hver egenskab har en synlig overflade: `kropsform`→silhuet+størrelse (lave krybdyr-positurer for `kold_*`), `hudtype`→grundfarve+mønster+hoved-feature (pels=øre, fjer=krest, skael=kam), `stofskifte`→varm/kølig tone, `foedevalg`→snude (rovdyr-tænder vs. blød mule), `forsvar`→kendetegn (pigge, giftpletter, camouflage, fartstriber, mimicry-øjeplet).
- **Baggrund/årsag:** de 5184 gamle PNG-sprites brugte det gamle egenskabs-skema (`hojt`/`lavt`/`alleaeder`), så habitatet renderede dyr som *brudte billeder* under det nye skema, og stationens preview faldt tilbage til ren tekst. Der var reelt ingen fungerende dyregrafik.
- **Vektor (SVG)** → skarpt i alle størrelser (også 15.360 px-museumsvæggen); **ingen asset-filer**. Animeres via cachede frame-data-URLs (`walk`/`flee`/`eat` + `idle` med vejrtrækning), cachet pr. art (`Sprites.genererFrames()`).
- `habitat.js`: frame-cycling bruger nu `Sprites.genererFrames()` i stedet for ikke-eksisterende PNG-stier; stillestående dyr fryser på idle.
- `station.js`: byggepreview viser den procedurelle sprite, så hvert valg giver øjeblikkelig visuel reaktion.
- De 5184 forældede gamle-skema PNG'er i `assets/sprites/` er **slettet** (helt ubrugte). `assets/sprites/nye-test/` (Blender-pilotrenders, brugt af `render-demo.html`) er bevaret.

**PR #31 (26. juni) — Graf-forbedringer + generations-popup (fra Jeppes opgaveliste):**
- Populationsgraf: vindue `TIDSLINJE_VINDUE 180→600` (10 min); X-akse vist i **minutter** (markør hvert 2. min) i stedet for sekunder.
- Populationsgraf: **NPC-dyr tælles nu med** — samlet i én fælles stiplet grå "Vildtlevende"-linje (nøgle `__npc__` i `artsData`), så grafens tal stemmer med skærmen.
- Populationsgraf: venstre (ældste) kant **fades blødt ud** over ca. 1/8 af bredden + gul stiplet **"NU"-markør** ved højre kant — adskiller start/slut visuelt på den cirkulære skærm. (Den røde START-linje fra første udkast blev fjernet igen efter feedback.)
- Fjernet pop-up-teksten ("✨ Ny generation!") ved formering — de flyvende ♥ er bevaret. Udslettelses-besked holdes længere via ny `FADE_UDDOED = 14000` (var 8s) + CSS-klasse `.doed-besked.uddoed`; placeres som før ved sidste individ.

**Næste arbejde:**

1. **Visuel stil — Arktis-habitat i Blender** (brugerens offline-opgave): Lav Arktis-scene med tre lag (baggrund/midterplan/forgrund), animeret sne/is/vind. Se installationsarkitektur nedenfor for tekniske krav.
2. **Blender-pipeline for dyr** (brugerens offline-opgave): `base1_generalist` kræver re-rigging + re-animation på ny grævling-krop. `base2_slank` og `base3_kraftig` er klar til rig. Detaljer: Assets-sektionen + `assets/blender/LAG-RENDER-GUIDE.md`.
3. **Forhåndsgenererede billeder** til stationsflowet: `assets/dyrbygger/{stofskifte}_{kropsform}_{hudtype}_{foedevalg}_{forsvar}.webp` — ét billede pr. egenskabs-kombination. Genereres med Google image API (offline-opgave). **Bemærk:** indtil disse + Blender-renders findes, viser spillet nu procedurelle SVG-placeholder-sprites (PR #29) i både station og habitat — så der ER fungerende dyregrafik overalt nu.
4. **Real-world test:** test med rigtige elever ved Naturama; tune kode baseret på observationer.
5. **Ingen planlagte kodepakker pt.** — næste kodearbejde aftales med Jeppe baseret på testresultater.

**Arbejdsgang i dispatch:** foreslå plan → vent på Jeppes ok → implementér → test (`node --check js/*.js`) → vent på ok → PR (merg den med det samme uden at spørge → Pages udgiver ~1 min) → **kør `/sync-projekt`** (opdater CLAUDE.md + Notion). Log beslutninger i Notion → Fremdrift & status; fejl i Fejl & bugs.

> **Obligatorisk efter enhver merget PR:** opdater CLAUDE.md "Aktuel status" og tilføj en entry til Notion "Fremdrift & status" beslutningslog. Brug `/sync-projekt` som tjekliste.

---

## Teknisk stack

- **Sprog:** Vanilla HTML + CSS + JavaScript. INGEN frameworks. INGEN build-tools.
- **Kommunikation:** Abstraktionslaget `window.Broadcast` (send/lyt). To transporter, samme API: Supabase Realtime Broadcast (online, tværs af enheder) ELLER BroadcastChannel (lokalt, samme enhed) — vælges automatisk i `js/broadcast.js` ud fra `js/config.js`.
- **Lyd:** Web Audio API — alt syntetiseret i realtid via `js/audio.js`, ingen lydfiler.
- **Grafik:** Hybrid lag-rendering bagt til `ImageBitmap` ved spawn (`js/render.js`) + requestAnimationFrame.
- **Deployment:** Lokalt: åbn index.html i Chrome (bruger BroadcastChannel-fallback). Online: GitHub Pages auto-udgiver ved push til `main` + Supabase Realtime relay. Deploy KUN runtime-filer (html/css/js + assets/sprites + assets/backgrounds) — IKKE Blender-kilder eller rå frames. **Bemærk:** Linux er case-sensitive — mappenavne i kode skal matche disken præcist (fx `walk/base`, ikke `Walk/Base`).

## Filstruktur

```
bygditdyr/
├── index.html             # Startside — vælg: station, habitat eller teststation
├── station.html           # Byggestation (5 stk i produktion)
├── habitat.html           # Habitatskærm (1 stk i produktion)
├── indstillinger.html     # Personalemenu: statistik, sæsonindstilling, Supabase-log
├── teststation.html       # Udviklerværktøj: send dyr direkte til habitatet (dropdowns + bulk-send)
├── css/
│   ├── station.css
│   └── habitat.css
├── js/
│   ├── station.js         # Byggeflow, energimåler, egenskabs-checklist, match-måler
│   ├── habitat.js         # Simulationsloop, tilstandsmaskine, NPC-dyr, dag/nat-cyklus, populationsgraf
│   ├── broadcast.js       # Kommunikation: Supabase Realtime ELLER BroadcastChannel (samme API)
│   ├── config.js          # Runtime-config: Supabase-endpoint + kanalnavn
│   ├── names.js           # Linneansk navnegenerator + genererDanskNavn() (foedevalg×hudtype→visuelt navn) + forklarArtsnavn()
│   ├── render.js          # Lag-compositing + bake-ved-spawn (ImageBitmap-cache)
│   ├── survival.js        # Overlevelsesmatrix, score-beregning, forklarEgenskaber()
│   ├── oekonomi.js        # Ressource-regnskab (planter/bytte/flugt/angreb)
│   ├── deathtext.js       # Biologiske dødsforklaringer (individ OG art)
│   ├── scoreboard.js      # Rekordliste-datastruktur (vises ikke på habitat — kun mini-scoreboard på station)
│   ├── audio.js           # Syntetiseret lyd via Web Audio: ambient loops + event-effekter
│   ├── sprites.js         # PROCEDUREL SVG-sprite-generator (placeholder for Blender/billeder): genererSprite/genererFrames ud fra de 5 egenskaber + hentDyrFarve
│   └── telemetri.js       # Anonym gameplay-telemetri til Supabase (tuning-data)
├── assets/
│   ├── sprites/           # Pixel art PNG sprites
│   ├── backgrounds/       # Habitatbaggrunde
│   └── sounds/            # (tom — lyd er syntetiseret i audio.js)
├── analyse/               # Kritisk analyse + 5 opgavepakker — HISTORISK (alle implementeret)
│   ├── 00-05 + balance.js
│   └── DISPATCH-START-PROMPT.md   # Opdateres ved ny større opgave
└── CLAUDE.md
```

## Kerneregler

1. Hold koden simpel. Hvis noget kan løses med 10 linjer, brug ikke 50.
2. Ingen eksterne biblioteker (Howler.js må bruges til lyd hvis Web Audio API er besværligt).
3. Al kommunikation mellem station og habitat går via `window.Broadcast` (send/lyt) — aldrig direkte BroadcastChannel eller Supabase i spil-koden.
4. Overlevelseslogikken er i `survival.js` — hold den adskilt fra visuals.
5. Kommentér på dansk i koden.
6. `MUTATION_RATE = 0.08` i `habitat.js` styrer mutationsraten ved formering — kan sættes til 0 for at slå fra.
7. `MAX_ENERGI = 12` i `survival.js` — energibudget for byggestationen. Egenskabs-omkostninger er defineret i `ENERGI_OMKOSTNING`.
8. Størrelse afledes altid fra `kropsform` via `Survival.kropsformTilStorrelse()` — der er IKKE et selvstændigt `storrelse`-felt på dyr-objektet.
9. Enkelt habitat: kun `'skov'` (lysåben dansk skov, istidsperiode). Arktis og ørken er fjernet fra både survival.js, habitat.js og deathtext.js.
10. Dansk dyrenavn (`genererDanskNavn`) bruger `foedevalg × hudtype` som nøgle — aldrig `foedevalg × kropsform`. Navne må ikke referere til rigtige dyr med stærke udseende-forventninger (ingen Skildpadde, Løve osv.). **NPC-dyr bruger samme navnegenerator** — ingen hardcodede dyrenavne i koden.
11. Formerings-konstanter i `habitat.js`: `FORM_ENERGI_MIN = 0.15` (energitærskel), `FORM_NETTO_MIN = -3` (ressource-tærskel), `FORMERING_FART_HURTIG/MIDDEL/LANGSOM = 100/6, 100/12, 100/18` (%/sek) — giver hhv. 8–10 / 4–5 / 1–2 dyr fra ét stamdyr inden 30s. Stofskifte: `kold: 0` i `HABITAT_SCORE.skov` — begge stofskifter er levedygtige i skov.
12. Populationsgraf i `habitat.js`: `TIDSLINJE_VINDUE = 600` (sekunder synligt = 10 min; X-akse i minutter), `POP_SAMPLE_INTERVAL = 5000` (ms mellem samples). `popGrafData[]` er et array af `{ tid, artsData: { artsnavn: antal } }`. NPC-dyr tælles **med** og samles under nøglen `__npc__` (én fælles stiplet grå "Vildtlevende"-linje). Venstre kant fades blødt ud (~1/8 bredde) + gul "NU"-markør til højre — start/slut-adskillelse på den cirkulære skærm. Generations-popup er fjernet; udslettelses-besked bruger `FADE_UDDOED = 14000`.

## Vigtige datastrukturer

### Dyr-objekt

```js
{
  id: "uuid",
  artsnavn: "Magnocalor venenatus piluscarnivorus",
  danskNavn: "Skovræv",
  egenskaber: {
    stofskifte: "varm",      // 'varm' | 'kold'
    kropsform:  "stor_slank", // 'lille_slank' | 'stor_slank' | 'lille_kraftig' | 'stor_kraftig'
                              // | 'mega_kraftig' | 'kold_lille' | 'kold_langstrakt'
                              // (kold_* er kun tilgængelige hvis stofskifte='kold')
    hudtype:    "pels",       // 'pels' | 'skael' | 'fjer'
                              // (kold → automatisk 'skael', trin 3 auto-springes over)
    foedevalg:  "koedaeder",  // 'planteaeder' | 'koedaeder' | 'altaeder'
    forsvar:    "gift"        // 'camouflage' | 'mimicry' | 'pigge' | 'hastighed' | 'gift'
  },
  energiBrugt: 9,             // maks MAX_ENERGI = 12 (defineret i survival.js)
  overlevelsesScore: 0,
  position: { x: 0, y: 0 },
  levetid: 0,
  levende: true,
  generation: 1,              // generationsnummer; muterede afkom viser ✨
  stationId: "station-1",     // oprindelse — bruges til cross-player attribution
  _npc: false                 // true = NPC-dyr (tæller ikke i scoreboard)
  // BEMÆRK: størrelse AFLEDES — brug Survival.kropsformTilStorrelse(egenskaber.kropsform)
  // → 'lille' | 'mellem' | 'stor' | 'mega'
}
```

### Broadcast-beskeder

```js
// Station → Habitat
{ type: 'NYT_DYR', dyr: {...} }

// Habitat → Station
{ type: 'HABITAT_INFO', habitat: 'skov' }
{ type: 'DYR_DOEDE', id, aarsag, levetid, artsnavn }
{ type: 'DYR_JAGES', bytte_id, jaeger_id, jaeger_art, bytte_art }
{ type: 'DYR_EVENT', id, type: 'spiser'|'jager'|'foedsel'|... }
{ type: 'ARTER_STATUS', [...] }    // live-status pr. art
{ type: 'SCOREBOARD', [...] }      // opdateret rekordliste
```

## Assets & rendering

Mål: markant højere visuel finish end flade SVG'er, performant i ren HTML5, uden 576 fulde billeder.

### Strategi: 12 krop×hud-modeller

`foedevalg` bestemmer **kropsbygning**; `hudtype` bages ind i modellen. Størrelse skaleres via `kropsform` i `render.js`.

| `foedevalg` | basekrop | |
|---|---|---|
| `koedaeder` | `base2_slank` | spinkelt jagt-rovdyr (gepard/mynde) |
| `planteaeder` | `base3_kraftig` | stor planteæder (flodhest/næsehorn) |
| `altaeder` | `base1_generalist` | lav, langstrakt mustelid (grævling/jærv) |

3 kroppe × 4 hudtyper = 12 modeller. `pigge` er eneste lag-pass. Pipeline pr. model:
1. **Turnaround:** Gemini image-til-image på neutral krop — side/¾/front/bag.
2. **Meshy:** multi-view image-til-3D → mesh + tekstur (GLB, INGEN rig).
3. **Blender:** én armatur pr. kropstype; hud-varianter parentes med Data Transfer-modifier (Vertex Groups, Nearest Face Interpolated). `base2`/`base3`: duplikér armatur, flyt knogler — samme knoglenavne = samme Action.
4. **Render:** ortografisk walk, 24 frames, 720px WebP. Crop fra `walk/crop-info.json` SKAL bruges på alle lag-passes for at bevare registrering. Frames vender MOD HØJRE.
5. **Runtime:** `js/render.js` baker alle lag til `ImageBitmap` ved spawn; sim-loopet blitter kun det færdige sprite.

**Aktuel stand (26. juni):**
- **Runtime bruger pt. procedurelle SVG-placeholder-sprites** (`js/sprites.js`, PR #29) — IKKE den bagte ImageBitmap/PNG-pipeline. Når Blender-renders eller `assets/dyrbygger/`-billeder er klar, kan habitat/station kobles over på dem. De gamle gamle-skema PNG'er er slettet.
- `base1_generalist`: omformet til grævling-krop; **kræver re-rigging + re-animation** i Blender. Kun `side`-turnarounds regenereret; trekvart/front/bag udestår.
- `base2_slank`, `base3_kraftig`: uændrede og klar til Blender-rig.
- `base1_generalist_pels` pilot: gennemført på gammel katte-krop — skal redo på ny krop.
- Detaljer og trin-for-trin guide: `assets/blender/LAG-RENDER-GUIDE.md`.

```
assets/
├── dyr/<basekrop>[_<hud>]/
│   ├── turnaround/         # side, trekvart, front, bag
│   ├── Walk/Base/          # rå Blender-frames 1920×1080 (urørte originaler)
│   └── walk/
│       ├── crop-info.json  # FÆLLES crop — SKAL genbruges på alle lag-passes
│       ├── base/           # 720px WebP frames
│       └── forsvar_pigge/  # lag-pass (samme crop)
├── dyrbygger/              # forhåndsgenererede stationsbilleder (offline-opgave)
│   └── {stofskifte}_{kropsform}_{hudtype}_{foedevalg}_{forsvar}.webp
├── _backup_turnarounds_15jun/  # sikkerhedskopier af gamle versioner
└── blender/                # .blend + LAG-RENDER-GUIDE.md
```

### Installationsarkitektur (fastlagt 24. juni)

Produktionsskærmen er et **360° oktonalt rum** ved Naturama: 8 projektorer à 1.920×1.200 px = **15.360×1.200 px total**. Børnene står inde i habitatet, omgivet af det på alle sider.

**Millumin** kører alle 8 projektorer fra én computer og outputter som ét bredt canvas. Spillet er ét enkelt `habitat.html` i én browser — Millumin distribuerer. Ingen inter-skærm-kommunikation nødvendig i spilkoden.

- **Dev-config:** `NUM_PANELS = 1` → 1.920×1.200 px (normal skærm)
- **Produktion:** `NUM_PANELS = 8` → 15.360×1.200 px (én bredde-konstant i config)
- **Wrap-around:** dyr der løber ud af højre kant dukker op til venstre (modulo-aritmetik)

**Blender-habitatscene** renderes som ét seamless bredt billede (8 kameraer i ring, identisk højde/vinkel). Tre dybdelag:
- 0–300 px: himmel / fjerne trækroner (langsom bevægelse)
- 300–800 px: habitatzone — dyrene lever her
- 800–1.200 px: forgrund, græs og blade (hurtigere bevægelse)

Første habitat der produceres: **Arktis**.

## Fuldt GDD

Se: [Game Design Document — Byg Dit Dyr](https://www.notion.so/Game-Design-Document-Byg-Dit-Dyr-36c6276fd47f81e18deaf35bc719f0ac?pvs=21)

## Overlevelsesmatrix

Se: [Overlevelsesmatrix — Prototype (3 habitater)](https://www.notion.so/Overlevelsesmatrix-Prototype-3-habitater-3396276fd47f81cf9c84db83148cbc1d?pvs=21)

**Bemærk:** kun skov-kolonnen er aktiv. Kør `node analyse/balance.js` ved ændringer i `HABITAT_SCORE` i `survival.js`.

## Start her (dispatch, juni 2026)

Spillet er **færdigbygget og live**. Start IKKE forfra, og gå IKKE i gang med pakke 01–05 — de er implementeret.

1. **Orientér dig:** `git log --oneline -10` viser hvad der sidst er lavet. Al kode er i `js/`.
2. **Ny kodeopgave?** Spørg Jeppe hvad der er aktuelt (ingen planlagte pakker pt.). Foreslå plan → vent på ok → implementér → test → vent på ok → PR.
3. **Blender-opgave?** Se Assets-sektionen + `assets/blender/LAG-RENDER-GUIDE.md`. Det er brugerens offline-arbejde.
4. **Fejl eller tuning?** Kig på `js/habitat.js` (konstanter øverst) og `js/survival.js` (HABITAT_SCORE-matrix). Kør `node analyse/balance.js` ved matrix-ændringer.
5. Kommentér på dansk. Hold `survival.js`/`oekonomi.js` adskilt fra visuals.
6. **Pas på gamle egenskaber:** Fra pakke 06 er skemaet ændret. De KORREKTE nøgler er `stofskifte` (varm/kold), `kropsform`, `hudtype` (pels/skael/fjer), `foedevalg` (planteaeder/koedaeder/altaeder), `forsvar` (camouflage/mimicry/pigge/hastighed/gift). Brug IKKE `kost`, `storrelse`, `aktivitet`, `alleaeder`, `giftig`, `flugt`, `hojt`, `lavt`, `glat`.
