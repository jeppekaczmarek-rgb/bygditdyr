Dette dokument beskriver projektet til Claude Code. Læs det før du skriver en eneste linje kode.

---

## Hvad er dette?

Et interaktivt museumsoplevelse-spil til Naturama i Svendborg. Elever i 4.-6. klasse bygger et dyr med biologiske egenskaber og sender det ud i et habitat på en stor fælles skærm.

## Aktuel status (19. juni 2026)

**Spillet er bygget og LIVE:** https://jeppekaczmarek-rgb.github.io/bygditdyr/ (forside · /station.html · /habitat.html). Arbejdsgang: ret lokalt → dobbeltklik `udgiv.bat` → online ca. 1 min senere.

Survival-logik, simulation (v2 tilstandsmaskine + ressource-økonomi), navne, lyd og online-relay (Supabase Realtime) er færdige. Asset-sporet (fjer/glat/skæl-turnarounds + base1-rig i Blender) kører sideløbende — se Assets-sektionen.

**Næste arbejde = forbedrings-roadmap fra den kritiske analyse (18. juni).** Fulde specs i `analyse/` (`00-hovedanalyse-og-roadmap.md` + `01`–`05` + kørbar `balance.js`). Rækkefølge: **Sprint A = 01 (feedback-loop) + 05 (balance/data, inkl. mutation ved formering) → 04 → 02 → 03.** Afkrydselig opgaveliste + start-prompt ligger i Notion under projekt-hubben.

**Arbejdsgang i dispatch:** foreslå og vent på Jeppes ok ved HVERT trin — vis plan/diff, implementér efter ok, kør tests (`node analyse/balance.js` ved matrix-ændringer + `node --check js/*.js`), vent på ok før udgivelse (web/GitHub: åbn en PR som Jeppe merger → Pages udgiver automatisk · lokalt: `udgiv.bat`). Overlevelsesmatrixen har historisk været "bevidst urørt"; pakke 05 ÆNDRER den bevidst — behandl matrix-ændringer som eksplicitte beslutninger. Log beslutninger i Notion → Fremdrift & status; fejl i Fejl & bugs.

## Teknisk stack

- **Sprog:** Vanilla HTML + CSS + JavaScript. INGEN frameworks. INGEN build-tools.
- **Kommunikation:** Abstraktionslaget `window.Broadcast` (send/lyt). To transporter, samme API: Supabase Realtime Broadcast (online, på tværs af enheder) ELLER BroadcastChannel (lokalt, samme enhed) — vælges automatisk i `js/broadcast.js` ud fra `js/config.js`.
- **Lyd:** Web Audio API
- **Grafik:** Hybrid lag-rendering bagt til `ImageBitmap` ved spawn (se "Assets & rendering") + requestAnimationFrame
- **Deployment:** Lokalt: åbn index.html i Chrome (bruger BroadcastChannel-fallback). Online fler-enheds-test: statisk hosting (Netlify Drop / GitHub Pages) + Supabase Realtime relay. Deploy KUN runtime-filer (html/css/js + assets/sprites + assets/backgrounds ≈ 26 MB) — IKKE Blender-kilder eller rå frames. Vejledning: `VEJLEDNING-online-test.md`. **Bemærk:** Linux-hosts er case-sensitive — mappenavne i kode skal matche disken præcist (fx `walk/base`, ikke `Walk/Base`).

## Filstruktur

```
bygditdyr/
├── index.html          # Startside — vælg: station eller habitat
├── station.html        # Byggest  ation (5 stk i produktion)
├── habitat.html        # Habitatskærm (1 stk i produktion)
├── css/
│   ├── station.css
│   └── habitat.css
├── js/
│   ├── station.js      # Byggeflow, energimåler, navnegenerator
│   ├── habitat.js      # Simulationsloop, tidslinje, jagt
│   ├── broadcast.js    # Kommunikation: Supabase Realtime ELLER BroadcastChannel (samme API)
│   ├── config.js       # Runtime-config: Supabase-endpoint + kanalnavn (online relay)
│   ├── names.js        # Linneansk navnegenerator
│   ├── render.js       # Lag-compositing + bake-ved-spawn (ImageBitmap-cache)
│   ├── survival.js     # Overlevelsesmatrix og score-beregning
│   ├── oekonomi.js     # Ressource-regnskab (planter/bytte/flugt/angreb)
│   ├── deathtext.js    # Biologiske dødsforklaringer
│   └── scoreboard.js   # Rekordliste
├── assets/
│   ├── sprites/        # Dyrenes PNG/SVG-lag
│   ├── backgrounds/    # Habitatbaggrunde
│   └── sounds/         # Ambientelyde + effekter
├── analyse/            # Kritisk analyse + roadmap (00–05) + balance.js — NÆSTE ARBEJDE
└── CLAUDE.md
```

## Kerneregler

1. Hold koden simpel. Hvis noget kan løses med 10 linjer, brug ikke 50.
2. Ingen eksterne biblioteker undtagen nødvendige lyde (Howler.js må bruges til lyd hvis Web Audio API er besværligt)
3. Al kommunikation mellem station og habitat går via `window.Broadcast` (send/lyt) — aldrig direkte BroadcastChannel eller Supabase i spil-koden. Transporten vælges ét sted: `broadcast.js`
4. Overlevelseslogikken er i survival.js — hold den adskilt fra visuals
5. Kom med kommentarer på dansk i koden

## Vigtige datastrukturer

### Dyr-objekt

```jsx
{
  id: "uuid",
  artsnavn: "Magnocalor venenatus piluscarnivorus",
  egenskaber: {
    stofskifte: "hojt",     // 'hojt' | 'lavt'
    hudtype: "pels",         // 'pels' | 'skael' | 'fjer' | 'glat'
    kost: "koedaeder",       // 'planteaeder' | 'koedaeder' | 'alleaeder'
    storrelse: "stor",       // 'lille' | 'mellem' | 'stor'
    aktivitet: "dagaktiv",   // 'dagaktiv' | 'nataktiv'
    forsvar: "giftig"        // 'giftig' | 'pigge' | 'flugt' | 'ingen'
  },
  energiBrugt: 9,
  overlevelsesScore: 0,     // beregnes ved afsendelse
  position: { x: 0, y: 0 },
  levetid: 0,               // sekunder
  levende: true
}
```

### BroadcastChannel beskeder

```jsx
// Station → Habitat
{ type: 'NYT_DYR', dyr: {...} }
{ type: 'HABITAT_REQUEST' }   // station beder om habitatinfo

// Habitat → Station
{ type: 'HABITAT_INFO', habitat: 'skov' }
{ type: 'DYR_DOEDE', id: '...', aarsag: 'frys', levetid: 45 }
{ type: 'DYR_JAGES', bytte_id: '...', jaeger_id: '...' }
```

## Assets & rendering

Besluttet 3. juni 2026, revideret 5. juni 2026, **revideret 10. juni 2026 efter bestået pilot** (base1 + pels end-to-end). Mål uændret: markant højere visuel finish end flade SVG'er, performant i ren HTML5, uden 576 fulde billeder.

### Valgt strategi (10. juni 2026): hudtype OG kost bages ind i kroppen — 12 krop×hud-modeller

To træk er svære/forkerte som lag og bages derfor ind i kroppen: **hudtype** (realistisk pels/fjer kan ikke laves manuelt i Blender — geometry-nodes-vejen droppet) og **kost** (revideret 10. juni: en ulve-agtig krop som planteæder er inkongruent — et hugtand-decal er for svagt et signal). Kost styrer i stedet hele **kropsbygningen**, som de 3 basekroppe netop repræsenterer:

| `kost` | basekrop | læsning |
| --- | --- | --- |
| `koedaeder` | `base2_slank` | spinkelt jagt-rovdyr (mynde/gepard) |
| `planteaeder` | `base3_kraftig` | stor planteæder (flodhest/næsehorn) |
| `alleaeder` | `base1_generalist` | lav, kompakt altæder-krop (grævling/jærv) |

Render-laget slår basekrop op via denne mapping (kost → basekrop); `storrelse` skalerer derefter uafhængigt, så en lille og en stor kødæder deler krop men ikke skala. Pipeline pr. model:

1. **Turnaround m. hud:** Nano Banana flash (image-til-image på eksisterende neutral-turnaround) tilføjer pels/skæl/fjer — samme pose/proportioner. 3 kroppe (= 3 kosttyper) × 4 hudtyper = **12 modeller** (ikke 500: generering+QA pr. model er flaskehalsen, ikke rigging).
2. **Meshy:** multi-view image-til-3D (alle 4 vinkler) + teksturering m. side.png som reference. **Kun mesh+tekstur** — download GLB uden rig.
3. **Blender — rig/animation genbruges:** animationen ligger på ARMATUREN, ikke mesh'et. base1 rigges+animeres ÉN gang; hud-varianter parentes til samme armatur med **Data Transfer-modifier** (Vertex Groups, Nearest Face Interpolated) fra det vægtede base-mesh — ikke Automatic Weights (fejler på løse pels-shells). base2/base3: duplikér armatur, flyt knogler i Edit Mode — samme knoglenavne = samme Action. Total: 1 walk, 3 armaturer, 12 weight-transfers.
4. **Lag-render:** `pigge` er nu det ENESTE lag-pass (hugtand-passet udgår — kost er bagt ind i kroppen). Pigge renderes som eget transparent pass med SAMME kamera + animation, pr. hud-model (vedhæftet samme skelet) så lagene altid flugter. Render-passes er maskintid, ikke manuelt arbejde.
5. **Efterbehandling:** frames beskæres til FÆLLES bounding box og nedskaleres til 720 px højde som WebP (1080p-originaler fylder ~200 MB dekodet pr. sæt). Crop-parametre gemmes i `walk/crop-info.json` — **samme crop skal bruges på alle lag-passes** for at bevare registrering. Frames skal vende MOD HØJRE (render.js-konvention).

Egenskaberne fordeler sig:

| Egenskab | Hvordan i pipelinen |
| --- | --- |
| `kost` | **kropsbygning** bagt ind: koedaeder→slank, planteaeder→kraftig, alleaeder→generalist |
| `hudtype` | bagt ind i krop-modellen (12 krop×hud-modeller) |
| `storrelse` | `scale` i `render.js`, uafhængigt af kropsbygning (ingen render) |
| `forsvar` | pigge: eget (eneste) lag-pass pr. hud-model; giftig: advarselsfarve/decal |
| `aktivitet` | dag/nat-tone i `render.js` (ingen render) |
| `stofskifte` | kun mekanik: animationsfart/tone i `render.js` |

**Bake-ved-spawn (uændret princip):** ved `NYT_DYR` slår `js/render.js` basekrop op fra `kost`, vælger hud-varianten fra `hudtype`, stabler evt. `pigge`-lag ovenpå, skalerer efter `storrelse`, toner efter `aktivitet`, og baker pr. frame til `ImageBitmap`. Sim-loopet (`habitat.js`) blitter kun det færdige sprite. `render.js` understøtter fart-styret frame-afspilning + procedurel idle-bob; `survival.js`/`oekonomi.js` røres ikke. Max ~30 dyr (typisk 5-15) → rigeligt råderum.

### Asset-struktur (faktisk)

```
assets/
├── dyr/<basekrop>[_<hud>]/        # fx base1_generalist, base1_generalist_pels
│   ├── turnaround/                # side, trekvart, front, bag (input til Meshy multi-view)
│   ├── Walk/Base/                 # rå Blender-frames 1920×1080 (0001.png…, urørte originaler)
│   └── walk/                      # produktionsklar:
│       ├── crop-info.json         #   fælles crop+skala — SKAL genbruges på alle lag-passes
│       ├── base/                  #   beskårne 720px WebP-frames (0001.webp…)
│       └── forsvar_pigge/ m.fl.   #   lag-passes, samme crop (kommer)
├── dele/             # enkelt-elementer (pig/, fjer/) — kun til evt. pigge-scatter
├── blender/          # .blend + LAG-RENDER-GUIDE.md + animation-frames
└── backgrounds/      # skov.png (malet habitat-baggrund, Gemini)
```

Basekroppe p.t.: `base1_generalist`, `base2_slank`, `base3_kraftig`; første hud-variant: `base1_generalist_pels` (pilot, godkendt 10. juni — testes i `test-pels-walk.html`). Detaljeret fremgangsmåde: `assets/blender/LAG-RENDER-GUIDE.md` (også i Notion: "Blender lag-render guide").

**15. juni 2026 — base1 omformet:** `base1_generalist` (alleæder) er ændret fra en slank katte-krop til en lav, langstrakt grævling/mustelid-krop, fordi altæderen var visuelt umulig at skelne fra kødæderen (`base2_slank`). base1's hud-side-turnarounds (pels/fjer/glat/skæl) er regenereret på den nye krop med `genererHudTurnaround.py`. Gammel krop + katte-kroppede skins: `assets/dyr/_backup_turnarounds_15jun/`. **VIGTIGT:** pels-piloten og base1-armaturet skal rigges/animeres om i Blender på den nye krop (base2/base3 er urørt). P.t. er kun `side`-vinklen regenereret; de øvrige 3 neutrale vinkler for base1 (trekvart/front/bag) er stadig den gamle katte-krop og skal regenereres før Meshy.

Note: habitatskærm i produktion er 15.360×1200 (8 projektorer, 360°) — separat arkitektur-opgave.

## Fuldt GDD

Se: [Game Design Document — Byg Dit Dyr](https://www.notion.so/Game-Design-Document-Byg-Dit-Dyr-36c6276fd47f81e18deaf35bc719f0ac?pvs=21)

## Overlevelsesmatrix

Se: [Overlevelsesmatrix — Prototype (3 habitater)](https://www.notion.so/Overlevelsesmatrix-Prototype-3-habitater-3396276fd47f81cf9c84db83148cbc1d?pvs=21)

## Start her (dispatch, juni 2026)

Spillet er FÆRDIGBYGGET og live (se "Aktuel status" øverst). Start IKKE forfra.

1. Læs `analyse/00-hovedanalyse-og-roadmap.md` — overblik + roadmap.
2. Tag opgavepakkerne i rækkefølge: **01 → 05 (Sprint A) → 04 → 02 → 03**. Hver pakke (`analyse/01`–`05`) har problem, kodested, konkret forslag og "gjort-når".
3. Pr. trin: foreslå plan → vent på ok → implementér → test (`node analyse/balance.js`, `node --check js/*.js`) → vent på ok → `udgiv.bat`.
4. Hold `survival.js`/`oekonomi.js` adskilt fra visuals; kommentér på dansk.

*Oprindelig byggerækkefølge (historik, da spillet blev bygget forfra): survival.js → names.js → station → broadcast.js → habitat → lyd.*