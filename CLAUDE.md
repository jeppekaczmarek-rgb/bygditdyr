Dette dokument beskriver projektet til Claude Code. Læs det før du skriver en eneste linje kode.

---

## Hvad er dette?

Et interaktivt museumsoplevelse-spil til Naturama i Svendborg. Elever i 4.-6. klasse bygger et dyr med biologiske egenskaber og sender det ud i et habitat på en stor fælles skærm.

## Aktuel status (25. juni 2026)

**Spillet er live:** https://jeppekaczmarek-rgb.github.io/bygditdyr/ (forside · /station.html · /habitat.html)

Kerne-spiludviklingen er **færdig**. Alle 5 forbedringspakker fra den kritiske analyse (18. juni) er implementeret:

| Pakke | Indhold | Status |
|---|---|---|
| 01 | Egenskabs-checklist, individ-dødsbeskeder, stamdyr-markør (★), habitat-match-måler | ✅ |
| 02 | Dynamisk skalering: NPC-dyr i lavsæson, bærekapacitet, logistisk sygdom/formering | ✅ |
| 03 | Cross-player: jagt-attribution, puls-panel, niche-markering, trofiske afhæng. | ✅ |
| 04 | Biologiske byggekort, Linné-nedbrydning, event-forklaringer, fortæller-stribe | ✅ |
| 05 | Balance (MIN_LEVETID→20s, allæder, arktis, glat hud) + mutation 8 % ved formering | ✅ |
| 06 | Byggestruktur redesign: 5-trins betinget flow, nyt egenskabs-skema, enkelt habitat | ✅ |

**Derudover bygget:** statistik/personaledashboard (`indstillinger.html`), dag/nat-cyklus (60s dag / 30s nat), fangst-flash ved drab, formeringsanimation (✨), sæsonfarvetone pr. habitat, levende baggrundspuls.

**Næste arbejde:**

1. **Forhåndsgenererede billeder** (Googles image API): `assets/dyrbygger/{noegle}.webp` — ét billede pr. egenskabs-kombination (nøgle = `{stofskifte}_{kropsform}_{hudtype}_{foedevalg}_{forsvar}`). Stationen viser placeholder indtil disse genereres. Se Assets-sektionen.
2. **`deathtext.js` opdatering** (separat PR): refererer stadig til de gamle egenskaber (`stofskifte='lavt'`, `storrelse`, `aktivitet`). Falder igennem til generiske fallbacks — crasher ikke, men tekster er unøjagtige.
3. **`sprites.js` opdatering** (separat PR): muligvis referencer til gamle egenskabs-nøgler.
4. **Blender-pipeline** (brugerens offline-opgave): `base1_generalist` er omformet fra katte-krop til grævling/mustelid — kræver re-rigging og re-animation i Blender. Kun `side`-turnarounds er regenereret; trekvart/front/bag for base1 udestår. `base2_slank` og `base3_kraftig` er urørte. Detaljer: Assets-sektionen + `assets/blender/LAG-RENDER-GUIDE.md`.
5. **Real-world test:** test med rigtige elever ved Naturama; tune kode baseret på observationer.

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
├── index.html             # Startside — vælg: station eller habitat
├── station.html           # Byggestation (5 stk i produktion)
├── habitat.html           # Habitatskærm (1 stk i produktion)
├── indstillinger.html     # Personalemenu: statistik, sæsonindstilling, Supabase-log
├── css/
│   ├── station.css
│   └── habitat.css
├── js/
│   ├── station.js         # Byggeflow, energimåler, egenskabs-checklist, match-måler
│   ├── habitat.js         # Simulationsloop, tilstandsmaskine, NPC-dyr, dag/nat-cyklus
│   ├── broadcast.js       # Kommunikation: Supabase Realtime ELLER BroadcastChannel (samme API)
│   ├── config.js          # Runtime-config: Supabase-endpoint + kanalnavn
│   ├── names.js           # Linneansk navnegenerator + forklarArtsnavn() (Linné-nedbrydning)
│   ├── render.js          # Lag-compositing + bake-ved-spawn (ImageBitmap-cache)
│   ├── survival.js        # Overlevelsesmatrix, score-beregning, forklarEgenskaber()
│   ├── oekonomi.js        # Ressource-regnskab (planter/bytte/flugt/angreb)
│   ├── deathtext.js       # Biologiske dødsforklaringer (individ OG art)
│   ├── scoreboard.js      # Rekordliste
│   ├── audio.js           # Syntetiseret lyd via Web Audio: ambient loops + event-effekter
│   ├── sprites.js         # PNG sprite integration
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
7. `MAX_ENERGI = 12` i `survival.js` — energibudgettet tvinger biologiske tradeoffs. Ændr ikke uden at rebalancere ENERGI_OMKOSTNING-matricen.
8. Størrelse afledes altid af kropsform via `Survival.kropsformTilStorrelse(kropsform)` — der er ikke et selvstændigt `storrelse`-felt på dyr.
9. Enkelt habitat: kun `'skov'` (lysåben dansk skov, istidskontekst). Ingen arktis/ørken i kode eller logik.

## Vigtige datastrukturer

### Dyr-objekt

```js
{
  id: "uuid",
  artsnavn: "Magnocalor venenatus piluscarnivorus",
  danskNavn: "Rank Rovpels",
  egenskaber: {
    stofskifte: "varm",      // 'varm' | 'kold'
    kropsform:  "stor_slank", // 'lille_slank' | 'stor_slank' | 'lille_kraftig' |
                              // 'stor_kraftig' | 'mega_kraftig' | 'kold_lille' | 'kold_langstrakt'
    hudtype:    "pels",       // 'pels' | 'fjer' | 'skael'  (kold → altid 'skael')
    foedevalg:  "koedaeder",  // 'planteaeder' | 'koedaeder' | 'altaeder'
    forsvar:    "gift"        // 'camouflage' | 'mimicry' | 'pigge' | 'hastighed' | 'gift'
  },
  energiBrugt: 9,            // sum af ENERGI_OMKOSTNING — maks 12
  overlevelsesScore: 0,
  levetid: 0,                // sekunder (fra survival.js)
  generation: 1,             // generationsnummer; muterede afkom viser ✨
  stationId: "station-1",    // oprindelse — bruges til cross-player attribution
  _npc: false                // true = NPC-dyr (tæller ikke i scoreboard)
}
```

Størrelse afledes dynamisk: `Survival.kropsformTilStorrelse(dyr.egenskaber.kropsform)` → `'lille' | 'mellem' | 'stor' | 'mega'`

### Broadcast-beskeder

```js
// Station → Habitat
{ type: 'NYT_DYR', dyr: {...} }

// Habitat → Station
{ type: 'HABITAT_INFO', habitat: 'skov' }
{ type: 'DYR_DOEDE', id, artsnavn, danskNavn, aarsag, levetid, doedsTekst }
{ type: 'DYR_DOEDE_INDIVID', artsnavn, danskNavn, aarsag, levetid, erStamdyr, kortTekst }
{ type: 'DYR_JAGES', bytte_id, jaeger_id, bytte_artsnavn, jaeger_artsnavn, bytte_stationId, jaeger_stationId }
{ type: 'DYR_EVENT', artsnavn, danskNavn, event, tekst }
{ type: 'ARTER_STATUS', arter: {...} }  // live-status pr. art
{ type: 'SCOREBOARD', dagens, livstid } // opdateret rekordliste
```

## Assets & rendering

Mål: markant højere visuel finish end flade SVG'er, performant i ren HTML5, uden 576 fulde billeder.

### Strategi: forhåndsgenererede billeder pr. egenskabs-kombination

Stationen viser ét billede der svarer til dyrets fulde egenskabs-sæt. Billeder ligger i `assets/dyrbygger/` med filnavnet `{stofskifte}_{kropsform}_{hudtype}_{foedevalg}_{forsvar}.webp`. Genereres offline med Googles image API og placeres manuelt. Stationen viser en farvet placeholder-div hvis billedet mangler.

#### 3D-model pipeline (habitat-sprites)

`foedevalg` bestemmer **kropsbygning**; `hudtype` bages ind i modellen. Størrelse skaleres i render.js via `kropsformTilStorrelse`.

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

**Aktuel stand (25. juni):**
- `base1_generalist`: omformet til grævling-krop; **kræver re-rigging + re-animation** i Blender. Kun `side`-turnarounds regenereret; trekvart/front/bag udestår.
- `base2_slank`, `base3_kraftig`: uændrede og klar til Blender-rig.
- `base1_generalist_pels` pilot: gennemført på gammel katte-krop — skal redo på ny krop.
- Detaljer og trin-for-trin guide: `assets/blender/LAG-RENDER-GUIDE.md`.

```
assets/
├── dyrbygger/              # Forhåndsgenererede billeder til byggestationen
│   └── {stofskifte}_{kropsform}_{hudtype}_{foedevalg}_{forsvar}.webp
├── dyr/<basekrop>[_<hud>]/
│   ├── turnaround/         # side, trekvart, front, bag
│   ├── Walk/Base/          # rå Blender-frames 1920×1080 (urørte originaler)
│   └── walk/
│       ├── crop-info.json  # FÆLLES crop — SKAL genbruges på alle lag-passes
│       ├── base/           # 720px WebP frames
│       └── forsvar_pigge/  # lag-pass (samme crop)
├── _backup_turnarounds_15jun/  # sikkerhedskopier af gamle versioner
└── blender/                # .blend + LAG-RENDER-GUIDE.md
```

Note: produktionsskærm er 15.360×1200 (8 projektorer, 360°) — separat arkitektur-opgave der ikke er startet.

## Fuldt GDD

Se: [Game Design Document — Byg Dit Dyr](https://www.notion.so/Game-Design-Document-Byg-Dit-Dyr-36c6276fd47f81e18deaf35bc719f0ac?pvs=21)

## Overlevelsesmatrix

Se: [Overlevelsesmatrix — Prototype (skov)](https://www.notion.so/Overlevelsesmatrix-Prototype-3-habitater-3396276fd47f81cf9c84db83148cbc1d?pvs=21)

Kun skov-matricen er aktiv. Matrix og energiomkostninger ligger i `js/survival.js` (HABITAT_SCORE + ENERGI_OMKOSTNING). Kør `node analyse/balance.js` ved ændringer.

## Start her (dispatch, juni 2026)

Spillet er **færdigbygget og live**. Start IKKE forfra.

1. **Orientér dig:** `git log --oneline -10` viser hvad der sidst er lavet. Al kode er i `js/`.
2. **Ny kodeopgave?** Spørg Jeppe hvad der er aktuelt. Foreslå plan → vent på ok → implementér → test → vent på ok → PR → `/sync-projekt`.
3. **Billeder til byggestationen?** Se Assets-sektionen. `assets/dyrbygger/{noegle}.webp` — genereres med Googles image API. Stationen viser placeholder hvis filen mangler.
4. **Blender-opgave?** Se Assets-sektionen + `assets/blender/LAG-RENDER-GUIDE.md`. Det er brugerens offline-arbejde.
5. **Fejl eller tuning?** Kig på `js/habitat.js` (konstanter øverst) og `js/survival.js` (HABITAT_SCORE-matrix). Kør `node analyse/balance.js` ved matrix-ændringer.
6. **Egenskaber:** Det nye skema er `stofskifte/kropsform/hudtype/foedevalg/forsvar`. `kost`, `storrelse`, `aktivitet` eksisterer IKKE længere. Størrelse afledes via `Survival.kropsformTilStorrelse()`.
7. Kommentér på dansk. Hold `survival.js`/`oekonomi.js` adskilt fra visuals.
