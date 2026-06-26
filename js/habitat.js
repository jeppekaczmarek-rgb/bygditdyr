// ============================================================
// habitat.js — Simulationsloop, tidslinje, jagt
// Styrer habitatskærmen: dyr bevæger sig, jager, dør.
// ============================================================

// --- Konstanter ---
const JAGT_COOLDOWN = 2500;    // ms mellem jagtinteraktioner (sænket 5000→2500: mere action)
const FART_BASIS = 40;         // px/sek basisfartsvariation
const FART_LILLE = 85;         // hævet 50→85: dyr er synlige fra 3 meter
const FART_MELLEM = 65;        // hævet 35→65
const FART_STOR = 45;          // hævet 25→45
const RETNINGSSKIFT_CHANCE = 0.3; // pr. sekund
const TIDSLINJE_VINDUE = 600;  // sekunder synligt i grafen (10 min — passer til den store skærms tempo)
const POP_SAMPLE_INTERVAL = 5000; // ms mellem population-snapshots
const FADE_DOEDSTID = 8000;    // ms for dødsbesked-animation (individ + sygdom)
const FADE_UDDOED = 14000;     // ms for udslettelses-besked — holdes længere så man kan nå at læse den

// Størrelser brugt til kollisionsberegning
const DYR_RADIUS = { lille: 10, mellem: 15, stor: 20, mega: 28 };

// Formering
// Tuning 26/6 2026: rater hævet markant — mål er 5–10 dyr fra ét stamdyr inden 30s.
// Logistisk dæmpning (K≈13 for 1 art) begrænser population naturligt; rater er sat ud fra
// simulation: HURTIG giver 8 dyr ved t≈22s, 10+ ved t≈30s (4× generationsdobling).
const FORMERING_FART_HURTIG  = 100 / 6;   // %/sek (score ≥ 6) — 1. afkom efter ~6.5s
const FORMERING_FART_MIDDEL  = 100 / 12;  // %/sek (score 3-5) — 1. afkom efter ~13s → 4 dyr ved 30s
const FORMERING_FART_LANGSOM = 100 / 18;  // %/sek (score < 3) — 1. afkom efter ~16s (inden MIN_LEVETID=20s)

// Mutation — sandsynlighed for at ét træk muterer ved formering (sæt 0 for at slå fra)
const MUTATION_RATE = 0.08;

// Sygdom — tærskel beregnes nu dynamisk (se sygdomsTaerskel())
const SYGDOM_THRESHOLD_FAST = 20; // kun brugt som fallback
const SMITTE_RADIUS = 150;      // px
const SMITTE_FASE_VARIGHED = 4000;  // ms
const SYGDOM_DOEDS_INTERVAL = 500;  // ms mellem dødsfald

// Planter — dynamisk bærekapacitet skalerer med antal levende arter (enkelt habitat: skov)
// Hævet 25/6 2026: habitatet skal vise populationer (20–100 dyr), ikke enkeltindivider.
// planteMaal(skov, 5) = min(80, 18+40) = 58 → K≈29/art → sygdomstærskel 87 total.
const PLANTE_BASIS  = { skov: 18 };
const PLANTE_PR_ART = { skov: 8 };
const PLANTE_LOFT   = { skov: 80 };
const PLANTE_SPISE_RADIUS = 15;    // px
const PLANTE_FADE_TID = 1.5;       // sekunder for opacity-fade
const PLANTE_RESPAWN_MIN = 4000;    // ms (sænket 10000→4000: hurtigere respawn → dyr kan spise tilstrækkeligt)
const PLANTE_RESPAWN_MAX = 7000;    // ms (sænket 15000→7000)

// --- v2: Biologisk interaktionsdesign ---
// Sanseradiuser (px)
const DETEKT_BASE = 150;            // basis detektionsradius (trusler)
const FOURAGER_BASE = 120;          // basis fourageringsradius (mad)
// Energi (0–1)
const ENERGI_START_MIN = 0.7;       // dyr ankommer med 70–100% energi
const ENERGI_DEPLETION = 0.05;      // basis energitab pr. sek (hævet 0,04→0,05: HVILE var 86,8% → for lavt flow)
const PLANTE_ENERGI = 0.25;         // genvundet ved at spise plante (hævet 0.15→0.25: energibalancen er ellers negativ)
const KOED_ENERGI = 0.25;           // genvundet ved at fange byttedyr
const FOURAGER_TAERSKEL_HOJT = 0.75; // højt stofskifte fouragerer tidligt (hævet 0,7→0,75: mere fouragerings-flow)
const FOURAGER_TAERSKEL_LAVT = 0.5; // lavt stofskifte venter længere (hævet 0,4→0,5: fouragering var kun 1,3%)
const JAGER_TAERSKEL = 0.85;        // rovdyr jager når energi under dette
// Karikaturmomenter
const PANIK_VARIGHED = 1500;        // ms blind panikflugt
const PANIK_COOLDOWN = 6000;        // ms mellem panikudbrud
const AMBUSH_AFSTAND = 110;         // px — afstand hvor baghold fryser (hævet 80→110: ambush udløstes næsten aldrig)
const PIGGE_UNDGAA = 12000;         // ms — rovdyr undgår et pigge-bytte (hævet 8000→12000: pigge afviste 230/241 jagter)
const PIGGE_GENNEMBRUD = 0.25;      // chance for at en sulten rovdyr alligevel fælder et pigge-bytte (fangstrate var kun 2,9%)
const FLUGT_UNDVIGELSE = 0.35;      // chance for at flugt-bytte undslipper en fangst (sænket 0,5→0,35)
const AMBUSH_FRYS_MIN = 2000;       // ms minimum frys før spring
const AMBUSH_FRYS_VAR = 1000;       // ms ekstra tilfældig frys
const KONKURRENCE_RADIUS = 90;      // px — to fouragerere konkurrerer (hævet 50→90: konkurrence udløstes 0 gange)
const KONKURRENCE_FLUGT = 2000;     // ms taberen bliver bortjaget
const KONKURRENCE_COOLDOWN = 5000;  // ms mellem konkurrence-events pr. dyr
const KASKADE_RADIUS = 250;         // px — trofisk kaskade-effektzone
const KASKADE_DETEKT_BONUS = 40;    // px ekstra vagtsomhed nær store rovdyr
const FANGST_RADIUS = 30;           // px — afstand for fangst

const STORRELSE_RANG = { lille: 1, mellem: 2, stor: 3, mega: 4 };

// --- Økonomi → overlevelse (modifier-lag oven på grundlevetiden) ---
// Netto-ressourcer justerer hvor længe et dyr lever: overskud (meget mad,
// lidt flugt/fejlangreb) forlænger livet, underskud forkorter det.
const RES_LEVETID_SEK = 3;        // sekunder levetid pr. netto-ressourcepoint
const RES_LEVETID_MAKS = 0.8;     // justering må højst være ±80% af grundlevetiden
const RES_LEVETID_GULV = 8;       // absolut minimum effektiv levetid (sek)
const RES_UNDERSKUD = -3;         // netto under dette = arten døde af ressourcemangel
const FORM_ENERGI_MIN = 0.15;     // energi krævet for at bygge mod afkom (sænket 0.3→0.15: varmblodigede kan nu reproducere)
const FORM_NETTO_MIN = -3;        // netto-ressourcer krævet for at formere (sænket 0→-3: kødædere med lidt uheld kan stadig reproducere)

// Habitat-data (enkelt habitat: lysåben dansk skov, istidskontekst)
const HABITAT_DATA = {
  skov: { navn: 'Lysåben Dansk Skov', ikon: '🌲' }
};

// Dødsårsag-ikoner per habitat
const DOEDS_IKON = {
  frys:           '🔥',
  toerke:         '💧',
  jaget:          '🦊',
  udkonkurreret:  '💀',
  sult:           '🦴',
  udmattelse:     '💨',
  sygdom:         '🤢'
};

// --- Tilstand ---
let aktivtHabitat = null;
let dyrListe = [];             // Alle dyr (levende + nyligt døde)
let simStart = performance.now();
let sidsteFrame = simStart;
let scoreboard = null;         // Initialiseres i init()

// Sæsontilstand — personalets indstilling fra indstillinger.html
// 'stille' | 'auto' | 'myldretid' — gemmes i localStorage['saeson']
let sæsonTilstand = localStorage.getItem('saeson') || 'auto';
let sidsteSæsonLæs = 0;

// Live-feedback til stationerne
let fodselTael = {};           // artsnavn → samlet antal fødsler
let artEventTid = {};          // artsnavn → { event: tidspunkt } (throttling)
let sidsteStatusTid = 0;       // sidste ARTER_STATUS-broadcast
let sidsteOekonomiTid = 0;     // sidste opdatering af ressource-tavlen
const EVENT_COOLDOWN = 3500;   // ms mellem samme event-type pr. art
const STATUS_INTERVAL = 1500;  // ms mellem live-status-broadcasts
const OEKONOMI_INTERVAL = 500; // ms mellem opdateringer af ressource-tavlen
const OEKONOMI_MAX = 8;        // antal dyr vist på ressource-tavlen
let tidslinjeSidste = 0;       // ms timestamp — graf gentegnes kun hvert TIDSLINJE_INTERVAL
const TIDSLINJE_INTERVAL = 500; // ms — grafens data ændrer sig ikke hurtigere
const popGrafData = [];        // population-snapshots: [{ tid, artsData: { artsnavn: antal } }]
let popSampleSidste = 0;       // ms — sidst taget snapshot
let aktivSygdom = null;        // Aktiv sygdoms-event
let planter = [];              // Plante-objekter
let trofiskKaskade = false;    // v2: sandt når et stort rovdyr er på skærmen
let sidsteNpcTjek = 0;         // throttling af NPC-spawn-tjek

// --- Online telemetri ---
const sessionId = crypto.randomUUID();   // unik id for denne habitatsession
const sessionStartMs = Date.now();       // vægur-starttidspunkt (til ts-beregning)
window.habitatSessionId = sessionId;     // deles med telemetri.js
let popUploadIdx = 0;                    // antal population_samples der er uploadet
let popUploadSat = false;                // guard: kun ét upload-interval

// --- DOM-referencer ---
const habitatVerden = document.getElementById('habitat-verden');
const dyrContainer = document.getElementById('dyr-container');
const doedContainer = document.getElementById('doed-container');
const habitatIkon = document.getElementById('habitat-ikon');
const habitatTitel = document.getElementById('habitat-titel');
const planteCanvas = document.getElementById('plante-canvas');
const planteCtx = planteCanvas.getContext('2d');
const oekonomiTavle = document.getElementById('oekonomi-tavle');
const tidslinjeCanvas = document.getElementById('tidslinje-canvas');
const ctx = tidslinjeCanvas.getContext('2d');

// ============================================================
// HABITAT-VALG
// ============================================================
function vaelgHabitat(habitat) {
  aktivtHabitat = habitat;
  const data = HABITAT_DATA[habitat];
  habitatIkon.textContent = data.ikon;
  habitatTitel.textContent = data.navn;

  // Skift baggrund via CSS-klasse
  habitatVerden.className = '';
  habitatVerden.id = 'habitat-verden';
  habitatVerden.classList.add(habitat);

  console.log('Habitat valgt:', data.navn);

  // Initialiser planter
  initPlanter();

  // Start ambient lyd for dette habitat
  if (window.Audio) Audio.startAmbient(habitat);

  // Fortæl stationerne hvilket habitat der kører
  Broadcast.send({ type: 'HABITAT_INFO', habitat: habitat });

  // Start telemetri for denne session
  if (window.Telemetri) Telemetri.init(habitat);

  // Sæt periodisk population-upload i gang (kun én gang uanset habitatskift)
  if (!popUploadSat) {
    popUploadSat = true;
    setInterval(flushPopSamples, 120_000);
    window.addEventListener('beforeunload', () => { flushPopSamples(); });
  }
}

// ============================================================
// DYR-HÅNDTERING
// ============================================================

// Tilføj nyt dyr til simulationen
function tilfoejDyr(dyr) {
  // Genberegn score for dette habitat (station kan have brugt et andet)
  const score = Survival.beregnHabitatScore(dyr, aktivtHabitat);
  const levetid = Survival.beregnOverlevelsestid(score);

  // Beregn startfart baseret på størrelse (afledt fra kropsform)
  const fartMap = { lille: FART_LILLE, mellem: FART_MELLEM, stor: FART_STOR, mega: Math.round(FART_STOR * 0.7) };
  const storrelse = Survival.kropsformTilStorrelse(dyr.egenskaber.kropsform);
  const basisFart = fartMap[storrelse] || FART_BASIS;

  // Tilfældig startretning
  const vinkel = Math.random() * Math.PI * 2;

  // Stamdyr = første individ af arten (ikke afkom)
  const erStamdyr = !dyr._afkom && !dyrListe.some(d => d.artsnavn === dyr.artsnavn);

  // Habitat-dimensioner
  const bredde = habitatVerden.clientWidth;
  const hoejde = habitatVerden.clientHeight;

  // Formeringshastighed baseret på score
  const formFart = score >= 6 ? FORMERING_FART_HURTIG
                 : score >= 3 ? FORMERING_FART_MIDDEL
                 : FORMERING_FART_LANGSOM;

  const simDyr = {
    ...dyr,
    overlevelsesScore: score,
    levetid: levetid,
    erStamdyr: erStamdyr,
    // Position (kan overskrives af _startX/_startY for afkom)
    x: dyr._startX ?? (Math.random() * (bredde - 100) + 50),
    y: dyr._startY ?? (Math.random() * (hoejde - 100) + 50),
    // Hastighed i px/sek
    vx: Math.cos(vinkel) * basisFart,
    vy: Math.sin(vinkel) * basisFart,
    basisFart: basisFart,
    // v2: Biologisk AI
    tilstand: 'HVILER',         // FOURAGER | FLUGTER | HVILER | JAGER
    sidsteTilstand: 'HVILER',
    energi: ENERGI_START_MIN + Math.random() * (1 - ENERGI_START_MIN),
    detektionsRadius: beregnDetektionsRadius(dyr),
    fourageringsRadius: beregnFourageringsRadius(dyr),
    kaskadeBonus: 0,
    flugtMaal: null,            // { x, y } flugtdestination
    jagtMaal: null,             // id på byttedyr
    fouragerMaal: null,         // plante-reference
    panikSlut: 0,
    panikCooldown: 0,
    panikRetning: 0,
    ambushFase: 'naermer',      // naermer | frys | spring
    ambushFrysSlut: 0,
    tvungetFlugtSlut: 0,        // fx konkurrence eller undvigelse
    konkurrenceCooldown: 0,
    undgaaId: null,             // pigge-bytte der midlertidigt ignoreres
    undgaaTil: 0,
    spiserSlut: 0,
    // Tidspunkter
    ankomstTid: performance.now(),
    doedsTid: null,
    doedsAarsag: null,
    doedsIkon: null,
    // Jagt-tracking
    jagtSkadet: false,
    sidsteJagt: 0,
    // Økonomi: spist mad tæller op, flugt/mislykket angreb tæller ned
    ressourcer: Oekonomi.nytRegnskab(),
    // Formering
    formeringPct: 0,
    formeringFart: formFart,
    // Sygdom
    smittet: false,
    immun: false,
    // Farve til tidslinje (baseret på hudtype)
    farve: Sprites.hentDyrFarve(dyr),
    // Sprite-animation
    spriteBase: Sprites.hentSpriteBase(dyr),
    animState: 'walk',   // 'walk' | 'eat' | 'flee'
    animFrame: 0,
    animTid: 0,
    // DOM-element (oprettes nedenfor)
    el: null
  };

  // Generer dansk navn hvis det ikke allerede findes
  if (!dyr.danskNavn) {
    dyr.danskNavn = Names.genererDanskNavn(dyr);
  }

  // Opret DOM-element med SVG-sprite
  const el = document.createElement('div');
  el.className = 'habitat-dyr';
  if (dyr.egenskaber.foedevalg === 'koedaeder') el.classList.add('koedaeder');
  el.dataset.id = dyr.id;
  // Generationsmærke (gen 2+ vises) og mutatations-spark
  const genMaerke = (dyr._generation && dyr._generation > 1)
    ? ` <span class="gen-maerke">gen ${dyr._generation}${dyr._muteret ? ' ✨' : ''}</span>`
    : '';
  el.innerHTML = `
    <span class="tilstand-indikator cue-skjult"></span>
    <span class="res-badge"></span>
    <div class="dyr-sprite">${Sprites.genererSprite(dyr)}</div>
    <div class="formering-bar"><div class="formering-fyld"></div></div>
    <span class="dyr-label">${dyr.danskNavn}${genMaerke}</span>
  `;
  // Stamdyr-markering: synlig ring så barnet kan følge sit eget første dyr
  if (erStamdyr) el.classList.add('stamdyr');

  dyrContainer.appendChild(el);
  simDyr.el = el;
  // Cache sub-elementer én gang ved spawn — undgår querySelector hvert frame
  simDyr._elSprite    = el.querySelector('.dyr-sprite');
  simDyr._elBadge     = el.querySelector('.res-badge');
  simDyr._elInd       = el.querySelector('.tilstand-indikator');
  simDyr._elFormering = el.querySelector('.formering-fyld');
  simDyr._elImg       = el.querySelector('.dyr-sprite img');

  dyrListe.push(simDyr);
  if (window.Telemetri) Telemetri.registrer('ankomst', { egenskaber: simDyr.egenskaber, score });
  logSpawn(simDyr);

  // Send "ankom"-event til stationerne (kun for nyligt byggede dyr, ikke afkom)
  if (!dyr._afkom) sendDyrEvent(simDyr, 'ankom', simDyr.ankomstTid);

  // Spawn-fanfare: ring + navnebanner + lyd for spillerdyr
  if (!dyr._npc && !dyr._afkom) visSpawnFanfare(simDyr);

  console.log(`Nyt dyr: ${dyr.artsnavn} (score: ${score}, levetid: ${levetid}s)`);
}

// ============================================================
// SKALERING: DYNAMISK BÆREKAPACITET
// ============================================================

// Mål antal levende individer + distinkte arter (proxy for aktive spillere)
function maalBelastning() {
  let individer = 0;
  const arter = new Set();
  for (const d of dyrListe) {
    if (d.doedsTid) continue;
    individer++;
    if (!d._npc) arter.add(d.artsnavn);
  }
  return { individer, arter: Math.max(1, arter.size) };
}

// Dynamisk plantmål: vokser med antal arter, men aftagende (loft)
function planteMaal(habitat, arterAntal) {
  return Math.round(Math.min(
    PLANTE_LOFT[habitat] || 16,
    (PLANTE_BASIS[habitat] || 6) + (PLANTE_PR_ART[habitat] || 2) * arterAntal
  ));
}

// Sygdomstærskel: andel af bærekapaciteten (ikke fast tal)
function sygdomsTaerskel(habitat, arterAntal) {
  return Math.max(8, Math.round(planteMaal(habitat, arterAntal) * 1.5));
}

// Formerings-dæmpning: logistisk vækst mod artens kapacitet
function formeringsDaempning(artensAntal, habitat, arterAntal) {
  const K = Math.max(4, planteMaal(habitat, arterAntal) / 2);
  return Math.max(0, 1 - artensAntal / K);
}

// Juster antal planter løbende mod dynamisk mål
function justerPlanteAntal(habitat, arterAntal) {
  const maal = planteMaal(habitat, arterAntal);
  const aktive = planter.filter(p => !p.spises && p.opacity > 0).length;
  if (aktive < maal) {
    // Tilføj én ny plante
    const bredde = habitatVerden.clientWidth;
    const hoejde = habitatVerden.clientHeight;
    const margin = 60;
    planter.push({
      x: margin + Math.random() * (bredde - margin * 2),
      y: margin + Math.random() * (hoejde - margin * 2),
      opacity: 1, spises: false, respawnTid: 0
    });
  }
}

// --- NPC-dyr i lavsæson (< 2 distinkte spillere) — lysåben dansk skov, istidsdyr ---
const NPC_DEFS = {
  skov: [
    { danskNavn: 'Skovræv',   egenskaber: { stofskifte: 'varm', kropsform: 'lille_slank',   hudtype: 'pels', foedevalg: 'koedaeder',  forsvar: 'hastighed' } },
    { danskNavn: 'Skovhare',  egenskaber: { stofskifte: 'varm', kropsform: 'lille_kraftig',  hudtype: 'pels', foedevalg: 'planteaeder', forsvar: 'hastighed' } }
  ]
};

let npcSpawnet = false;
const NPC_COOLDOWN = 8000; // ms mellem NPC-tjek (sænket 20000→8000: habitatet holder sig befolket)

function tjekNpcSpawn(nu) {
  if (nu - sidsteNpcTjek < NPC_COOLDOWN) return;
  sidsteNpcTjek = nu;

  const { individer } = maalBelastning();
  const defs = NPC_DEFS[aktivtHabitat] || [];
  if (!defs.length) return;

  // Maks NPCer afhænger af sæsontilstand + antal levende spillerdyr
  let maksNpc;
  if (sæsonTilstand === 'myldretid') {
    maksNpc = 0; // nok dyr i forvejen
  } else if (sæsonTilstand === 'stille') {
    maksNpc = individer <= 5 ? 2 : 0;
  } else {
    // auto: 10 NPCer baseline — habitatet skal aldrig se tomt ud
    maksNpc = individer <= 8 ? 10 : individer <= 20 ? 4 : 0;
  }

  const aktiveNpc = dyrListe.filter(d => d._npc && !d.doedsTid);
  if (aktiveNpc.length >= maksNpc) return;

  // Vælg NPC-type aktivt: sørg for én kødæder + én planteæder ved 2 NPCer
  const harKoeNpc = aktiveNpc.some(d => d.egenskaber.foedevalg === 'koedaeder');
  const oensketFoedevalg = harKoeNpc ? 'planteaeder' : 'koedaeder';
  const def = defs.find(d => d.egenskaber.foedevalg === oensketFoedevalg)
           || defs[Math.floor(Math.random() * defs.length)];

  const npcEgenskaber = { ...def.egenskaber };
  const npc = {
    id: crypto.randomUUID(),
    artsnavn: Names.genererArtsnavn({ egenskaber: npcEgenskaber }),
    danskNavn: Names.genererDanskNavn(npcEgenskaber),
    egenskaber: npcEgenskaber,
    _npc: true
  };
  tilfoejDyr(npc);
  console.log(`NPC spawnet: ${npc.danskNavn} (sæson: ${sæsonTilstand}, individer: ${individer})`);
}

// ============================================================
// STATISTIK-LOGGING — anonyme gameplay-data til Supabase
// Bruges af personaledashboardet på indstillinger.html.
// ============================================================
async function logTilSupabase(payload) {
  const cfg = window.BYGDITDYR_CONFIG;
  if (!cfg?.supabaseUrl) return;
  try {
    await fetch(`${cfg.supabaseUrl}/rest/v1/dyr_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.supabaseAnonKey,
        'Authorization': `Bearer ${cfg.supabaseAnonKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  } catch (_) {} // logging er ikke kritisk for spillet
}

function logSpawn(dyr) {
  if (dyr._npc) return;
  logTilSupabase({
    type: 'spawn',
    dyr_id: dyr.id,
    habitat: aktivtHabitat,
    egenskaber: dyr.egenskaber,
    score: dyr.overlevelsesScore,
    station_id: dyr.stationId || null,
    er_afkom: dyr._afkom || false
  });
}

function logDoed(dyr, levetidSek, aarsag) {
  if (dyr._npc) return;
  logTilSupabase({
    type: 'doed',
    dyr_id: dyr.id,
    habitat: aktivtHabitat,
    egenskaber: dyr.egenskaber,
    score: dyr.overlevelsesScore,
    levetid_sek: levetidSek,
    doeds_aarsag: aarsag,
    station_id: dyr.stationId || null,
    er_afkom: dyr._afkom || false
  });
}

// Batch-upload population-samples til Supabase
async function flushPopSamples() {
  const cfg = window.BYGDITDYR_CONFIG;
  if (!cfg?.supabaseUrl || !aktivtHabitat) return;
  const pending = popGrafData.slice(popUploadIdx);
  if (pending.length === 0) return;
  const rows = [];
  for (const s of pending) {
    for (const [artsnavn, antal] of Object.entries(s.artsData)) {
      rows.push({
        session_id: sessionId,
        habitat: aktivtHabitat,
        artsnavn, antal,
        sim_tid_sek: Math.round(s.tid),
        ts: new Date(sessionStartMs + s.tid * 1000).toISOString()
      });
    }
  }
  popUploadIdx = popGrafData.length;
  if (rows.length === 0) return;
  try {
    await fetch(`${cfg.supabaseUrl}/rest/v1/population_samples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.supabaseAnonKey,
        'Authorization': `Bearer ${cfg.supabaseAnonKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(rows)
    });
  } catch (_) {}
}

// ============================================================
// PLANTER
// ============================================================

function initPlanter() {
  planter = [];
  const antal = planteMaal(aktivtHabitat, 1); // start med ét arts-ækvivalent
  const bredde = habitatVerden.clientWidth;
  const hoejde = habitatVerden.clientHeight;
  const margin = 60;

  for (let i = 0; i < antal; i++) {
    planter.push({
      x: margin + Math.random() * (bredde - margin * 2),
      y: margin + Math.random() * (hoejde - margin * 2),
      opacity: 1,
      spises: false,
      respawnTid: 0
    });
  }
  tilpasPlanteCanvas();
}

function tilpasPlanteCanvas() {
  const dpr = window.devicePixelRatio || 1;
  planteCanvas.width = habitatVerden.clientWidth * dpr;
  planteCanvas.height = habitatVerden.clientHeight * dpr;
  planteCanvas.style.width = habitatVerden.clientWidth + 'px';
  planteCanvas.style.height = habitatVerden.clientHeight + 'px';
  planteCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function tegnPlante(x, y, opacity) {
  planteCtx.globalAlpha = opacity;
  switch (aktivtHabitat) {
    case 'skov':
      // 3 overlappende cirkler — grøn busk
      planteCtx.fillStyle = '#3A6A1A';
      planteCtx.beginPath(); planteCtx.arc(x, y, 6, 0, Math.PI * 2); planteCtx.fill();
      planteCtx.fillStyle = '#4A7A2A';
      planteCtx.beginPath(); planteCtx.arc(x - 4, y + 3, 5, 0, Math.PI * 2); planteCtx.fill();
      planteCtx.fillStyle = '#6AAA3A';
      planteCtx.beginPath(); planteCtx.arc(x + 4, y + 3, 5, 0, Math.PI * 2); planteCtx.fill();
      break;
    case 'arktis':
      // Kryds-form — sparse lav plante
      planteCtx.strokeStyle = '#8AAA6A';
      planteCtx.lineWidth = 2;
      planteCtx.beginPath(); planteCtx.moveTo(x, y - 4); planteCtx.lineTo(x, y + 4); planteCtx.stroke();
      planteCtx.beginPath(); planteCtx.moveTo(x - 5, y - 1); planteCtx.lineTo(x + 5, y - 1); planteCtx.stroke();
      planteCtx.beginPath(); planteCtx.moveTo(x - 3, y - 3); planteCtx.lineTo(x + 3, y + 3); planteCtx.stroke();
      break;
    case 'oerken':
      // Kaktus — lodret krop med to arme
      planteCtx.fillStyle = '#5A8A3A';
      planteCtx.fillRect(x - 2, y - 9, 5, 18);
      planteCtx.fillRect(x - 7, y - 4, 5, 3);
      planteCtx.fillRect(x - 7, y - 7, 3, 3);
      planteCtx.fillRect(x + 3, y - 1, 5, 3);
      planteCtx.fillRect(x + 5, y - 4, 3, 3);
      break;
  }
  planteCtx.globalAlpha = 1;
}

function opdaterPlanter(nu, dt) {
  const bredde = habitatVerden.clientWidth;
  const hoejde = habitatVerden.clientHeight;
  const margin = 60;

  for (const p of planter) {
    // Plante der spises: fade opacity
    if (p.spises) {
      p.opacity -= dt / PLANTE_FADE_TID;
      if (p.opacity <= 0) {
        p.opacity = 0;
        p.spises = false;
        // v2: under trofisk kaskade vokser planterne 20% hurtigere
        const kaskadeFaktor = trofiskKaskade ? 0.8 : 1;
        p.respawnTid = nu + (PLANTE_RESPAWN_MIN + Math.random() * (PLANTE_RESPAWN_MAX - PLANTE_RESPAWN_MIN)) * kaskadeFaktor;
      }
      continue;
    }

    // Respawn
    if (p.opacity <= 0 && nu >= p.respawnTid) {
      p.x = margin + Math.random() * (bredde - margin * 2);
      p.y = margin + Math.random() * (hoejde - margin * 2);
      p.opacity = 1;
    }
  }
}

function renderPlanter() {
  const w = habitatVerden.clientWidth;
  const h = habitatVerden.clientHeight;
  planteCtx.clearRect(0, 0, w, h);

  for (const p of planter) {
    if (p.opacity <= 0) continue;
    tegnPlante(p.x, p.y, p.opacity);
  }
}

// ============================================================
// v2 — SANSERADIUSER ("sansekredsene")
// ============================================================

// Hjælper: afled størrelseskategori fra kropsform
function hentStorrelse(dyr) {
  return Survival.kropsformTilStorrelse(dyr.egenskaber.kropsform);
}

// Detektionsradius: hvor langt dyret ser/lugter trusler (rovdyr)
function beregnDetektionsRadius(dyr) {
  let r = DETEKT_BASE;                              // 150px basis
  const e = dyr.egenskaber;
  if (e.forsvar === 'hastighed') r += 40;           // sky, holder altid udkig
  const storrelse = hentStorrelse(dyr);
  if (storrelse === 'lille') r += 30;               // byttevilkår → ekstra vagtsom
  if (e.forsvar === 'gift' || e.forsvar === 'pigge') r -= 20; // konfident
  return r;
}

// Fourageringsradius: hvor langt dyret sanser mad
function beregnFourageringsRadius(dyr) {
  let r = FOURAGER_BASE;                            // 120px basis
  const e = dyr.egenskaber;
  if (e.stofskifte === 'varm') r += 50;             // høj stofskifte: sulten, leder aktivt
  if (e.foedevalg === 'planteaeder') r += 30;       // planter er statiske, nemme
  const storrelse = hentStorrelse(dyr);
  if (storrelse === 'stor' || storrelse === 'mega') r += 40; // skal spise mere
  return r;
}

function storrelseRang(dyr) { return STORRELSE_RANG[hentStorrelse(dyr)] || 2; }
function hentDyr(id) { return dyrListe.find(d => d.id === id && !d.doedsTid) || null; }

// ============================================================
// v2 — DETEKTION (trusler, bytte, planter)
// ============================================================

// Find rovdyr inden for detektionsradius som kan true dette dyr
function findTrusler(dyr) {
  // Giftige og piggede dyr flygter ikke — de er selvsikre
  if (dyr.egenskaber.forsvar === 'gift' || dyr.egenskaber.forsvar === 'pigge') return [];
  const radius = dyr.detektionsRadius + dyr.kaskadeBonus;
  const r2 = radius * radius;
  const minRang = storrelseRang(dyr);
  const trusler = [];
  for (const d of dyrListe) {
    if (d.doedsTid || d === dyr) continue;
    if (d.egenskaber.foedevalg !== 'koedaeder' && d.egenskaber.foedevalg !== 'altaeder') continue;
    if (d.artsnavn === dyr.artsnavn) continue;       // egen art er ikke en trussel
    if (storrelseRang(d) < minRang) continue;        // for lille til at true
    const dx = d.x - dyr.x, dy = d.y - dyr.y;
    if (dx * dx + dy * dy < r2) trusler.push(d);
  }
  return trusler;
}

// Find nærmeste byttedyr et rovdyr kan jage
function findByttedyr(dyr) {
  const r2 = dyr.detektionsRadius * dyr.detektionsRadius;
  let naermeste = null, naermesteAfst = r2;
  const jaegerRang = storrelseRang(dyr);
  for (const d of dyrListe) {
    if (d.doedsTid || d === dyr) continue;
    if (d.artsnavn === dyr.artsnavn) continue;        // ikke kannibalisme på egen art
    if (d.egenskaber.forsvar === 'gift') continue;    // rovdyr undgår gift aktivt
    if (d.id === dyr.undgaaId && performance.now() < dyr.undgaaTil) continue; // undgå nyligt pigge-bytte
    const byttRang = storrelseRang(d);
    // Kan jages hvis mindre — eller lige stor men ikke selv et rovdyr
    const kanJages = byttRang < jaegerRang
      || (d.egenskaber.foedevalg !== 'koedaeder' && byttRang <= jaegerRang);
    if (!kanJages) continue;
    const dx = d.x - dyr.x, dy = d.y - dyr.y;
    const a2 = dx * dx + dy * dy;
    if (a2 < naermesteAfst) { naermesteAfst = a2; naermeste = d; }
  }
  return naermeste;
}

// Find nærmeste tilgængelige plante inden for fourageringsradius
function findNaermestePlante(dyr) {
  const r2 = dyr.fourageringsRadius * dyr.fourageringsRadius;
  let naermeste = null, naermesteAfst = r2;
  for (const p of planter) {
    if (p.opacity <= 0 || p.spises) continue;
    const dx = p.x - dyr.x, dy = p.y - dyr.y;
    const a2 = dx * dx + dy * dy;
    if (a2 < naermesteAfst) { naermesteAfst = a2; naermeste = p; }
  }
  return naermeste;
}

// ============================================================
// v2 — TILSTANDSMASKINE
// Hvert dyr balancerer to drifter: find mad + undgå at blive spist.
// ============================================================
function opdaterDyrTilstand(dyr, nu) {
  dyr.sidsteTilstand = dyr.tilstand;
  const e = dyr.egenskaber;

  // Tvungen flugt (fx konkurrence/undvigelse) har forrang i sit tidsvindue
  if (nu < dyr.tvungetFlugtSlut) { dyr.tilstand = 'FLUGTER'; return; }

  // Prioritet 1: Flugt fra rovdyr (altid øverst)
  const trusler = findTrusler(dyr);
  if (trusler.length > 0) {
    dyr.tilstand = 'FLUGTER';
    dyr.flugtMaal = beregnFlugtRetning(dyr, trusler);
    return;
  }

  // Prioritet 2: Jagt (kødædere/altædere, når ikke helt mætte)
  if ((e.foedevalg === 'koedaeder' || e.foedevalg === 'altaeder') && dyr.energi < JAGER_TAERSKEL) {
    const bytte = findByttedyr(dyr);
    if (bytte) {
      if (dyr.jagtMaal !== bytte.id) dyr.ambushFase = 'naermer'; // nyt mål → reset baghold
      dyr.tilstand = 'JAGER';
      dyr.jagtMaal = bytte.id;
      return;
    }
  }

  // Prioritet 3: Fouragering på planter (når energi under tærskel)
  const taerskel = e.stofskifte === 'varm' ? FOURAGER_TAERSKEL_HOJT : FOURAGER_TAERSKEL_LAVT;
  if (dyr.energi < taerskel && (e.foedevalg === 'planteaeder' || e.foedevalg === 'altaeder')) {
    const plante = findNaermestePlante(dyr);
    if (plante) {
      dyr.tilstand = 'FOURAGER';
      dyr.fouragerMaal = plante;
      return;
    }
  }

  // Prioritet 4: Hvile
  dyr.tilstand = 'HVILER';
  dyr.jagtMaal = null;
  dyr.fouragerMaal = null;
}

// Flugtretning: bort fra truslernes tyngdepunkt
function beregnFlugtRetning(dyr, trusler) {
  let sx = 0, sy = 0;
  for (const t of trusler) { sx += t.x; sy += t.y; }
  sx /= trusler.length; sy /= trusler.length;
  let vx = dyr.x - sx, vy = dyr.y - sy;
  const len = Math.hypot(vx, vy) || 1;
  return { x: dyr.x + (vx / len) * 300, y: dyr.y + (vy / len) * 300 };
}

// ============================================================
// v2 — BEVÆGELSE OG FYSIK (styret af tilstandsmaskinen)
// ============================================================

// Sæt hastighedsvektor mod et punkt med given fart
function sætFartMod(dyr, tx, ty, fart) {
  const dx = tx - dyr.x, dy = ty - dyr.y;
  const len = Math.hypot(dx, dy) || 1;
  dyr.vx = (dx / len) * fart;
  dyr.vy = (dy / len) * fart;
}

function opdaterBevægelse(nu, dt) {
  const bredde = habitatVerden.clientWidth;
  const hoejde = habitatVerden.clientHeight;
  const margin = 30;

  for (const dyr of dyrListe) {
    if (dyr.doedsTid) continue;

    // Energi falder over tid — hurtigere ved varm stofskifte
    const stofFaktor = dyr.egenskaber.stofskifte === 'varm' ? 1.6
                     : dyr.egenskaber.stofskifte === 'kold' ? 0.6 : 1;
    dyr.energi = Math.max(0, dyr.energi - ENERGI_DEPLETION * stofFaktor * dt);

    // Sundhed aftager mod slutningen af levetiden → langsommere
    const levetPct = (nu - dyr.ankomstTid) / (dyr.levetid * 1000);
    const sundhed = Math.max(0.2, 1 - levetPct * 0.7);
    const fart = dyr.basisFart * sundhed;

    let nyAnim = 'walk';
    switch (dyr.tilstand) {
      case 'FLUGTER':  nyAnim = 'flee'; bevægFlugt(dyr, nu, fart); break;
      case 'JAGER':    bevægJagt(dyr, nu, fart); break;
      case 'FOURAGER': bevægFourager(dyr, nu, fart); break;
      default:         bevægHvile(dyr, dt, fart); // HVILER
    }

    // Igangværende spise-animation har forrang
    if (nu < dyr.spiserSlut) nyAnim = 'eat';
    dyr.animState = nyAnim;

    // Integrér position
    dyr.x += dyr.vx * dt;
    dyr.y += dyr.vy * dt;

    // Vend retning ved kanten
    if (dyr.x < margin)          { dyr.x = margin; dyr.vx = Math.abs(dyr.vx); }
    if (dyr.x > bredde - margin) { dyr.x = bredde - margin; dyr.vx = -Math.abs(dyr.vx); }
    if (dyr.y < margin)          { dyr.y = margin; dyr.vy = Math.abs(dyr.vy); }
    if (dyr.y > hoejde - margin) { dyr.y = hoejde - margin; dyr.vy = -Math.abs(dyr.vy); }

    // Svaghedsindikatorer (uændret fra v1)
    dyr.el.classList.toggle('svagt', levetPct > 0.6);
    const opacity = levetPct > 0.5 ? Math.max(0.3, 1 - (levetPct - 0.5) * 1.4) : 1;
    dyr.el.style.opacity = opacity;
  }
}

// FLUGTER: panikflugt (blind, 2x fart) → derefter målrettet flugt
function bevægFlugt(dyr, nu, fart) {
  // Udløs panik ved frisk flugt fra rovdyr (ikke ved tvungen konkurrence-flugt)
  if (dyr.sidsteTilstand !== 'FLUGTER' && nu > dyr.panikCooldown && nu >= dyr.tvungetFlugtSlut) {
    dyr.panikSlut = nu + PANIK_VARIGHED;
    dyr.panikCooldown = nu + PANIK_COOLDOWN;
    dyr.panikRetning = Math.random() * Math.PI * 2;
    if (window.Telemetri) Telemetri.registrer('panik');
  }

  if (nu < dyr.panikSlut) {
    // Panik: dobbelt fart, "blind" retning der vakler
    dyr.panikRetning += (Math.random() - 0.5) * 0.6;
    dyr.vx = Math.cos(dyr.panikRetning) * fart * 2;
    dyr.vy = Math.sin(dyr.panikRetning) * fart * 2;
    return;
  }

  // Korrekt flugt — hastigheds-forsvar er hurtigere; pigge gør langsommere
  let faktor = 1.3;
  if (dyr.egenskaber.forsvar === 'hastighed') faktor = 1.4;
  else if (dyr.egenskaber.forsvar === 'pigge') faktor = 0.8;
  if (dyr.flugtMaal) sætFartMod(dyr, dyr.flugtMaal.x, dyr.flugtMaal.y, fart * faktor);

  // Lille/lille_slank zigzagger (±30° afvigelse)
  if (hentStorrelse(dyr) === 'lille') {
    const v = Math.sin(nu / 120) * (Math.PI / 6);
    const cos = Math.cos(v), sin = Math.sin(v);
    const nx = dyr.vx * cos - dyr.vy * sin;
    const ny = dyr.vx * sin + dyr.vy * cos;
    dyr.vx = nx; dyr.vy = ny;
  }
}

// JAGER: pursuit (store) vs. ambush/baghold (mellem/lille)
function bevægJagt(dyr, nu, fart) {
  const maal = hentDyr(dyr.jagtMaal);
  if (!maal) { dyr.tilstand = 'HVILER'; dyr.jagtMaal = null; return; }

  const jaegerStorrelse = hentStorrelse(dyr);
  if (jaegerStorrelse === 'stor' || jaegerStorrelse === 'mega') {
    sætFartMod(dyr, maal.x, maal.y, fart * 1.2);     // pursuit: direkte, hurtig
    return;
  }

  // Ambush: nærmer sig → fryser → springer
  const afst = Math.hypot(maal.x - dyr.x, maal.y - dyr.y);
  switch (dyr.ambushFase) {
    case 'naermer':
      if (afst <= AMBUSH_AFSTAND) {
        dyr.ambushFase = 'frys';
        dyr.ambushFrysSlut = nu + AMBUSH_FRYS_MIN + Math.random() * AMBUSH_FRYS_VAR;
        dyr.vx = 0; dyr.vy = 0;
      } else {
        sætFartMod(dyr, maal.x, maal.y, fart * 0.6);  // langsom, snigende
      }
      break;
    case 'frys':
      dyr.vx = 0; dyr.vy = 0;                          // sidder helt stille
      if (nu >= dyr.ambushFrysSlut) {
        dyr.ambushFase = 'spring';
        if (window.Telemetri) Telemetri.registrer('ambush_spring');
      }
      break;
    case 'spring':
      sætFartMod(dyr, maal.x, maal.y, fart * 1.6);     // eksplosivt spring
      break;
  }
}

// FOURAGER: mod plante, spis når tæt nok → energiboost
function bevægFourager(dyr, nu, fart) {
  const p = dyr.fouragerMaal;
  if (!p || p.opacity <= 0 || p.spises) { dyr.tilstand = 'HVILER'; dyr.fouragerMaal = null; return; }
  const afst = Math.hypot(p.x - dyr.x, p.y - dyr.y);
  if (afst < PLANTE_SPISE_RADIUS) {
    p.spises = true;
    dyr.energi = Math.min(1, dyr.energi + PLANTE_ENERGI);
    dyr.ressourcer.planter++;                          // økonomi: +1 plante
    dyr.spiserSlut = nu + 600;
    dyr.fouragerMaal = null;
    dyr.vx = 0; dyr.vy = 0;
  } else {
    sætFartMod(dyr, p.x, p.y, fart * 0.7);             // moderat fart mod mad
  }
}

// HVILER: langsom tilfældig drift (koldt stofskifte = næsten stille)
function bevægHvile(dyr, dt, fart) {
  const driftFaktor = dyr.egenskaber.stofskifte === 'kold' ? 0.1 : 0.3;
  if (Math.random() < RETNINGSSKIFT_CHANCE * dt) {
    const vinkel = Math.random() * Math.PI * 2;
    dyr.vx = Math.cos(vinkel) * fart * driftFaktor;
    dyr.vy = Math.sin(vinkel) * fart * driftFaktor;
  } else {
    const len = Math.hypot(dyr.vx, dyr.vy) || 1;
    const driftFart = fart * driftFaktor;
    dyr.vx = (dyr.vx / len) * driftFart;
    dyr.vy = (dyr.vy / len) * driftFart;
  }
}

// ============================================================
// JAGT — fangst-resolution (bevægelse styres af tilstandsmaskinen)
// ============================================================

// ============================================================
// SPEKTAKEL-EFFEKTER — store synlige øjeblikke
// ============================================================

// Hvid flash på hele habitatskærmen ved fangst
function visFangstFlash() {
  const el = document.createElement('div');
  el.className = 'fangst-flash-overlay';
  habitatVerden.appendChild(el);
  setTimeout(() => el.remove(), 250);
}

// Spawn-fanfare: ekspanderende ring + navnebanner + lyd for spillerdyr
function visSpawnFanfare(dyr) {
  if (!dyr.el) return;

  const ring = document.createElement('div');
  ring.className = 'spawn-ring';
  dyr.el.appendChild(ring);
  setTimeout(() => ring.remove(), 1000);

  const navn = document.createElement('div');
  navn.className = 'spawn-navn';
  navn.textContent = dyr.danskNavn;
  dyr.el.appendChild(navn);
  setTimeout(() => navn.remove(), 1400);

  if (window.Audio) Audio.spawnDyr();
}

// Flyvende hjerter ved ny generation (pop-up-tekst fjernet — forstyrrede skærmen)
let formeringCelebrationSidste = 0;
function visFormeringsCelebration(dyr) {
  const nu = performance.now();
  if (nu - formeringCelebrationSidste < 4000) return;
  formeringCelebrationSidste = nu;

  // 6 hjerter der flyver ud i alle retninger
  for (let i = 0; i < 6; i++) {
    const hjerte = document.createElement('div');
    hjerte.className = 'celebration-hjerte';
    hjerte.textContent = '♥';
    const vinkel = (i / 6) * Math.PI * 2;
    hjerte.style.left = dyr.x + 'px';
    hjerte.style.top  = dyr.y + 'px';
    hjerte.style.setProperty('--vx', Math.round(Math.cos(vinkel) * 90) + 'px');
    hjerte.style.setProperty('--vy', Math.round(Math.sin(vinkel) * 90) + 'px');
    dyrContainer.appendChild(hjerte);
    setTimeout(() => hjerte.remove(), 1500);
  }
}

// Sort-mørkning ved artsudslettelse — "universet mister en art"
function visSortFade() {
  const el = document.createElement('div');
  el.className = 'sort-fade-overlay';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// Milepæl: første gang en art rammer 5 individer
const milepaelesRamt = new Set();
function tjekMilepael(dyr) {
  const noegle = `${dyr.artsnavn}-5`;
  if (milepaelesRamt.has(noegle)) return;
  const antalAfArt = dyrListe.filter(d => !d.doedsTid && d.artsnavn === dyr.artsnavn).length;
  if (antalAfArt < 5) return;
  milepaelesRamt.add(noegle);
  const el = document.createElement('div');
  el.className = 'milepael-overlay';
  el.textContent = `🎉 ${dyr.danskNavn} blomstrer! 5 individer`;
  habitatVerden.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// Dag/nat-cyklus: 60s dag → 30s nat → gentag (90s total)
let dagNatSidste = 0;
function opdaterDagNat(nu) {
  if (nu - dagNatSidste < 5000) return;
  dagNatSidste = nu;
  const cyklusSek = (Date.now() / 1000) % 90;
  habitatVerden.classList.toggle('er-nat', cyklusSek >= 60);
}

// Synlig fangst-label midt på skærmen — ét ad gangen, kun cross-player
let jagtOverlayAktiv = false;
function visJagtOverlay(jaeger, bytte) {
  if (jagtOverlayAktiv) return;
  // NPC-mod-NPC jagter er ikke sociale og behøver ikke at larme
  if (jaeger._npc && bytte._npc) return;
  jagtOverlayAktiv = true;
  const el = document.createElement('div');
  el.className = 'jagt-overlay';
  el.textContent = `${jaeger.danskNavn} → ${bytte.danskNavn}`;
  el.style.left = Math.round((jaeger.x + bytte.x) / 2) + 'px';
  el.style.top  = Math.round((jaeger.y + bytte.y) / 2) + 'px';
  dyrContainer.appendChild(el);
  setTimeout(() => { el.remove(); jagtOverlayAktiv = false; }, 1600);
}

function opdaterJagt(nu) {
  // Dynamisk jagt-takt: skalerer opad med antal rovdyr for at undgå jagt-kaos
  const rovdyrAntal = dyrListe.filter(d => !d.doedsTid && d.egenskaber.foedevalg === 'koedaeder').length;
  const sæsonMult = sæsonTilstand === 'stille' ? 0.7 : sæsonTilstand === 'myldretid' ? 2.0 : 1.0;
  const jagtCooldown = JAGT_COOLDOWN * Math.max(1, rovdyrAntal / 3) * sæsonMult;
  // Maks simultane fangster pr. frame: én pr. 3 rovdyr (undgår jagt-storm)
  const maksJagterPerFrame = Math.max(1, Math.ceil(rovdyrAntal / 3));
  let jagtTael = 0;

  for (const jaeger of dyrListe) {
    if (jaeger.doedsTid) continue;
    if (jaeger.tilstand !== 'JAGER' || !jaeger.jagtMaal) continue;
    if (nu - jaeger.sidsteJagt < jagtCooldown) continue;
    if (jagtTael >= maksJagterPerFrame) continue; // global begrænsning pr. frame
    jagtTael++;

    const bytte = hentDyr(jaeger.jagtMaal);
    if (!bytte) continue;

    const dist = Math.hypot(bytte.x - jaeger.x, bytte.y - jaeger.y);
    if (dist >= FANGST_RADIUS) continue;

    // Fangst!
    jaeger.sidsteJagt = nu;
    bytte.sidsteJagt = nu;
    jaeger.ambushFase = 'naermer';

    if (window.Audio) Audio.jagt();
    Broadcast.send({
      type: 'DYR_JAGES',
      bytte_id: bytte.id,
      jaeger_id: jaeger.id,
      bytte_artsnavn: bytte.artsnavn,
      bytte_danskNavn: bytte.danskNavn,
      jaeger_artsnavn: jaeger.artsnavn,
      jaeger_danskNavn: jaeger.danskNavn,
      jaeger_stationId: jaeger.stationId || null,
      bytte_stationId: bytte.stationId || null
    });

    // Forsvar afgør udfaldet
    let udfald;
    switch (bytte.egenskaber.forsvar) {
      case 'gift':
        // Karnivoren taber energi, byttet overlever
        jaeger.levetid = Math.max(5, jaeger.levetid - 5);
        jaeger.vx *= -1; jaeger.vy *= -1;
        jaeger.ressourcer.angreb++;            // økonomi: mislykket angreb
        udfald = 'gift';
        break;
      case 'mimicry':
        // Mimicry narrer rovdyret til at tøve — byttet slipper 50% af gangene
        if (Math.random() < 0.5) {
          bytte.tvungetFlugtSlut = nu + 1200;
          jaeger.ressourcer.angreb++;
          udfald = 'undslap';
        } else {
          bytte.levetid = Math.max(3, bytte.levetid - 8);
          bytte.jagtSkadet = true;
          jaeger.energi = Math.min(1, jaeger.energi + KOED_ENERGI);
          jaeger.ressourcer.bytte++;
          udfald = 'draebt';
        }
        break;
      case 'camouflage':
        // Kamuflage: byttet gemmer sig og undslipper oftere
        if (Math.random() < 0.6) {
          bytte.tvungetFlugtSlut = nu + 600;
          jaeger.ressourcer.angreb++;
          udfald = 'undslap';
        } else {
          bytte.levetid = Math.max(3, bytte.levetid - 8);
          bytte.jagtSkadet = true;
          jaeger.energi = Math.min(1, jaeger.energi + KOED_ENERGI);
          jaeger.ressourcer.bytte++;
          udfald = 'draebt';
        }
        break;
      case 'pigge':
        if (Math.random() < PIGGE_GENNEMBRUD) {
          // Gennembrud: rovdyret fælder pigge-byttet trods skade
          bytte.levetid = Math.max(3, bytte.levetid - 8);
          bytte.jagtSkadet = true;
          jaeger.levetid = Math.max(5, jaeger.levetid - 2); // tager stadig skade
          jaeger.energi = Math.min(1, jaeger.energi + KOED_ENERGI);
          jaeger.ressourcer.bytte++;
          udfald = 'draebt';
        } else {
          // Karnivoren skadet og afvist
          jaeger.levetid = Math.max(5, jaeger.levetid - 3);
          jaeger.vx *= -1; jaeger.vy *= -1;
          jaeger.undgaaId = bytte.id;            // husk og undgå dette pigge-bytte
          jaeger.undgaaTil = nu + PIGGE_UNDGAA;
          jaeger.ressourcer.angreb++;            // økonomi: mislykket angreb
          udfald = 'pigge';
        }
        break;
      case 'hastighed':
        if (Math.random() < FLUGT_UNDVIGELSE) {
          // Byttet undslipper til ny position
          bytte.x = Math.random() * (habitatVerden.clientWidth - 100) + 50;
          bytte.y = Math.random() * (habitatVerden.clientHeight - 100) + 50;
          bytte.tvungetFlugtSlut = nu + 800;
          jaeger.ressourcer.angreb++;          // økonomi: byttet slap væk
          udfald = 'undslap';
        } else {
          bytte.levetid = Math.max(3, bytte.levetid - 8);
          bytte.jagtSkadet = true;
          jaeger.energi = Math.min(1, jaeger.energi + KOED_ENERGI); // kød giver energi
          jaeger.ressourcer.bytte++;           // økonomi: +1 byttedyr spist
          udfald = 'draebt';
        }
        break;
      default: // ingen egentligt forsvar
        bytte.levetid = Math.max(3, bytte.levetid - 10);
        bytte.jagtSkadet = true;
        jaeger.energi = Math.min(1, jaeger.energi + KOED_ENERGI);
        jaeger.ressourcer.bytte++;             // økonomi: +1 byttedyr spist
        udfald = 'draebt';
    }
    if (window.Telemetri) Telemetri.registrer('fangst', { udfald, forsvar: bytte.egenskaber.forsvar });

    // Send "jaget"-event til stationerne når byttet rent faktisk bliver fanget
    if (udfald === 'draebt') {
      sendDyrEvent(bytte, 'jaget', nu);
      visJagtOverlay(jaeger, bytte);
      visFangstFlash();
    }

    jaeger.jagtMaal = null;
  }
}

// ============================================================
// v2 — KONKURRENCE (Gause): to fouragerere om samme plante
// ============================================================
function opdaterKonkurrence(nu) {
  const fouragerere = dyrListe.filter(d =>
    !d.doedsTid && d.tilstand === 'FOURAGER' && nu > d.konkurrenceCooldown);

  for (let i = 0; i < fouragerere.length; i++) {
    for (let j = i + 1; j < fouragerere.length; j++) {
      const a = fouragerere[i], b = fouragerere[j];
      if (nu <= a.konkurrenceCooldown || nu <= b.konkurrenceCooldown) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx * dx + dy * dy > KONKURRENCE_RADIUS * KONKURRENCE_RADIUS) continue;

      // Taberen er den med lavest energi → bliver bortjaget
      const taber = a.energi <= b.energi ? a : b;
      const vinder = taber === a ? b : a;
      taber.tilstand = 'FLUGTER';
      taber.flugtMaal = { x: taber.x - (vinder.x - taber.x), y: taber.y - (vinder.y - taber.y) };
      taber.tvungetFlugtSlut = nu + KONKURRENCE_FLUGT;
      taber.konkurrenceCooldown = nu + KONKURRENCE_COOLDOWN;
      visKonkurrenceMaerke(taber);
    }
  }
}

function visKonkurrenceMaerke(dyr) {
  if (!dyr.el) return;
  const maerke = document.createElement('span');
  maerke.className = 'konkurrence-maerke';
  maerke.textContent = '✦ Bortjaget!';
  dyr.el.appendChild(maerke);
  if (window.Telemetri) Telemetri.registrer('konkurrence');
  setTimeout(() => maerke.remove(), 2000);
}

// ============================================================
// v2 — TROFISK KASKADE: store rovdyr ændrer hele habitatet
// ============================================================
function opdaterKaskade() {
  const storeRovdyr = dyrListe.filter(d => {
    if (d.doedsTid) return false;
    if (d.egenskaber.foedevalg !== 'koedaeder' && d.egenskaber.foedevalg !== 'altaeder') return false;
    const s = hentStorrelse(d);
    return s === 'stor' || s === 'mega';
  });
  trofiskKaskade = storeRovdyr.length > 0;
  // Stemningsændring: rødlig kant på habitatskærmen ved aktiv kaskade
  habitatVerden.classList.toggle('kaskade-aktiv', trofiskKaskade);

  const r2 = KASKADE_RADIUS * KASKADE_RADIUS;
  for (const dyr of dyrListe) {
    if (dyr.doedsTid) continue;
    if (dyr.egenskaber.foedevalg === 'koedaeder') { dyr.kaskadeBonus = 0; continue; }
    let bonus = 0;
    for (const r of storeRovdyr) {
      if (r === dyr) continue;
      const dx = r.x - dyr.x, dy = r.y - dyr.y;
      if (dx * dx + dy * dy < r2) { bonus = KASKADE_DETEKT_BONUS; break; }
    }
    dyr.kaskadeBonus = bonus;
  }
}

// ============================================================
// FORMERING
// ============================================================
function opdaterFormering(dt) {
  const bredde = habitatVerden.clientWidth;
  const hoejde = habitatVerden.clientHeight;
  const { arter } = maalBelastning();

  // Tæl individer pr. art til logistisk dæmpning
  const artsTael = {};
  for (const d of dyrListe) {
    if (!d.doedsTid) artsTael[d.artsnavn] = (artsTael[d.artsnavn] || 0) + 1;
  }

  // Juster plantemængden løbende mod dynamisk mål
  justerPlanteAntal(aktivtHabitat, arter);

  for (const dyr of dyrListe) {
    if (dyr.doedsTid || dyr.smittet) continue;

    // Trives-gate: kun dyr med overskud (mad-energi + ikke i ressourceunderskud)
    // bygger mod afkom. Dyr i underskud formerer sig ikke → arten svinder.
    const trives = dyr.energi >= FORM_ENERGI_MIN &&
                   Oekonomi.beregnNetto(dyr.ressourcer) >= FORM_NETTO_MIN;
    // Logistisk dæmpning: formering bremser når arten nærmer sig kapaciteten
    const daempning = formeringsDaempning(artsTael[dyr.artsnavn] || 1, aktivtHabitat, arter);
    if (trives) dyr.formeringPct += dyr.formeringFart * dt * daempning;

    // Opdater visuel bar
    if (dyr._elFormering) dyr._elFormering.style.width = Math.min(100, dyr.formeringPct) + '%';

    if (dyr.formeringPct >= 100) {
      dyr.formeringPct = 0;
      spawnAfkom(dyr, bredde, hoejde);
    }
  }
}

function spawnAfkom(foraeldrer, bredde, hoejde) {
  // Tilfældig position inden for 80px fra forælderen
  const vinkel = Math.random() * Math.PI * 2;
  const afstand = 30 + Math.random() * 50;
  const nx = Math.max(30, Math.min(bredde - 30, foraeldrer.x + Math.cos(vinkel) * afstand));
  const ny = Math.max(30, Math.min(hoejde - 30, foraeldrer.y + Math.sin(vinkel) * afstand));

  // Arv egenskaber; lille chance for ét tilfældigt muteret træk
  const egenskaber = { ...foraeldrer.egenskaber };
  let muteret = false;
  if (Math.random() < MUTATION_RATE) {
    const kategorier = Object.keys(Survival.ENERGI_OMKOSTNING);
    const kat = kategorier[Math.floor(Math.random() * kategorier.length)];
    const muligeVaerdier = Object.keys(Survival.ENERGI_OMKOSTNING[kat]);
    const nyVaerdi = muligeVaerdier[Math.floor(Math.random() * muligeVaerdier.length)];
    if (nyVaerdi !== egenskaber[kat]) {
      egenskaber[kat] = nyVaerdi;
      muteret = true;
    }
  }

  const generation = (foraeldrer._generation || 1) + 1;

  const barn = {
    id: crypto.randomUUID(),
    artsnavn: foraeldrer.artsnavn,
    danskNavn: foraeldrer.danskNavn,
    egenskaber,
    _startX: nx,
    _startY: ny,
    _afkom: true,
    _generation: generation,
    _muteret: muteret
  };

  tilfoejDyr(barn);
  if (window.Telemetri) Telemetri.registrer('foedsel', { muteret });

  // Tæl fødsler + send "foedsel"-event til stationerne
  fodselTael[foraeldrer.artsnavn] = (fodselTael[foraeldrer.artsnavn] || 0) + 1;
  sendDyrEvent(foraeldrer, 'foedsel', performance.now());

  // Vis hjerte over forælderen (✨ ved mutation)
  const hjerte = document.createElement('span');
  hjerte.className = 'formering-hjerte';
  hjerte.textContent = muteret ? '✨' : '♥';
  foraeldrer.el.appendChild(hjerte);
  setTimeout(() => hjerte.remove(), muteret ? 1800 : 1000);

  // Stor celebration fra 2. fødsel og frem
  if ((fodselTael[foraeldrer.artsnavn] || 0) >= 2) {
    visFormeringsCelebration(foraeldrer);
  }
  // Milepæl: første gang arten rammer 5 individer
  tjekMilepael(foraeldrer);
}

// ============================================================
// SYGDOM
// ============================================================
function opdaterSygdom(nu) {
  // Tjek om en aktiv sygdom kører
  if (aktivSygdom) {
    opdaterAktivSygdom(nu);
    return;
  }

  // Tæl levende individer per artsnavn
  const tael = {};
  for (const d of dyrListe) {
    if (d.doedsTid) continue;
    tael[d.artsnavn] = (tael[d.artsnavn] || 0) + 1;
  }

  // Tjek om nogen art rammer den dynamiske tærskel
  const { arter } = maalBelastning();
  const taerskel = sygdomsTaerskel(aktivtHabitat, arter);
  for (const [art, antal] of Object.entries(tael)) {
    if (antal >= taerskel) {
      startSygdomsCrash(art, nu);
      return;
    }
  }
}

function startSygdomsCrash(artsnavn, nu) {
  const artsDyr = dyrListe.filter(d => !d.doedsTid && d.artsnavn === artsnavn);
  if (artsDyr.length === 0) return;

  // Vælg patient zero
  const patientZero = artsDyr[Math.floor(Math.random() * artsDyr.length)];
  patientZero.smittet = true;
  patientZero.el.classList.add('smittet');

  // Vælg 1-2 tilfældige immune
  const antalImmune = 1 + Math.floor(Math.random() * 2);
  const immuneSet = new Set();
  const mulige = artsDyr.filter(d => d !== patientZero);
  for (let i = 0; i < antalImmune && mulige.length > 0; i++) {
    const idx = Math.floor(Math.random() * mulige.length);
    const immunDyr = mulige.splice(idx, 1)[0];
    immunDyr.immun = true;
    immuneSet.add(immunDyr.id);
  }

  aktivSygdom = {
    artsnavn: artsnavn,
    danskNavn: patientZero.danskNavn,
    startTid: nu,
    smittede: new Set([patientZero.id]),
    immune: immuneSet,
    doedskoe: [],
    naesteDoed: 0
  };

  // Vis sygdomsoverlay
  const overlay = document.createElement('div');
  overlay.className = 'sygdom-overlay';
  overlay.innerHTML = `<span class="sygdom-overlay-tekst">🤢 ${aktivSygdom.danskNavn}: Populationen blev for tæt. Sygdom brød ud.</span>`;
  doedContainer.appendChild(overlay);
  setTimeout(() => overlay.remove(), FADE_DOEDSTID);

  console.log(`Sygdomscrash! ${artsnavn} (${artsDyr.length} individer)`);
}

function opdaterAktivSygdom(nu) {
  const forloeben = nu - aktivSygdom.startTid;

  if (forloeben < SMITTE_FASE_VARIGHED) {
    // Fase 1: Smittespredning
    const smittede = dyrListe.filter(d => !d.doedsTid && aktivSygdom.smittede.has(d.id));
    const kandidater = dyrListe.filter(d =>
      !d.doedsTid && !d.smittet && !d.immun &&
      d.artsnavn === aktivSygdom.artsnavn
    );

    for (const smittet of smittede) {
      for (const k of kandidater) {
        const dx = k.x - smittet.x;
        const dy = k.y - smittet.y;
        if (dx * dx + dy * dy < SMITTE_RADIUS * SMITTE_RADIUS) {
          k.smittet = true;
          k.el.classList.add('smittet');
          aktivSygdom.smittede.add(k.id);
        }
      }
    }
  } else {
    // Fase 2: Dødsfald — fyld dødskøen én gang
    if (aktivSygdom.doedskoe.length === 0) {
      const skalDoe = dyrListe.filter(d =>
        !d.doedsTid && aktivSygdom.smittede.has(d.id)
      );
      aktivSygdom.doedskoe = skalDoe;
      aktivSygdom.naesteDoed = nu;
    }

    // Dræb næste i køen
    if (nu >= aktivSygdom.naesteDoed && aktivSygdom.doedskoe.length > 0) {
      const offer = aktivSygdom.doedskoe.shift();
      if (!offer.doedsTid) {
        draebDyr(offer, nu, 'sygdom');
      }
      aktivSygdom.naesteDoed = nu + SYGDOM_DOEDS_INTERVAL;
    }

    // Sygdom færdig når køen er tom
    if (aktivSygdom.doedskoe.length === 0) {
      aktivSygdom = null;
    }
  }
}

// Tjek om der stadig er levende individer af samme art
function erSidsteAfArt(dyr) {
  return !dyrListe.some(d => d !== dyr && !d.doedsTid && d.artsnavn === dyr.artsnavn);
}

// Effektiv levetid = grundlevetid justeret af netto-ressourcer.
// Overskud forlænger livet, underskud forkorter det (inden for grænser).
function beregnEffektivLevetid(dyr) {
  const netto = Oekonomi.beregnNetto(dyr.ressourcer);
  const maks = dyr.levetid * RES_LEVETID_MAKS;                  // ± grænse i sek
  const just = Math.max(-maks, Math.min(maks, netto * RES_LEVETID_SEK));
  return Math.max(RES_LEVETID_GULV, dyr.levetid + just);
}

// Dræb et specifikt dyr med given årsag
function draebDyr(dyr, nu, aarsag) {
  const levetMs = nu - dyr.ankomstTid;
  const levetidSek = Math.round(levetMs / 1000);
  const ikon = DOEDS_IKON[aarsag] || '💀';

  dyr.doedsTid = nu;
  dyr.doedsAarsag = aarsag;
  dyr.doedsIkon = ikon;

  dyr.el.classList.remove('smittet');
  dyr.el.classList.add('doer');
  setTimeout(() => dyr.el.remove(), 2500);

  const sidsteAfArt = erSidsteAfArt(dyr);

  // Dramatisk overlay + dødstekst KUN ved artsudslettelse (sidste individ)
  let doedsTekst = null;
  if (sidsteAfArt) {
    doedsTekst = DeathText.genererDoedsTekst(dyr, aktivtHabitat, aarsag);
  }

  // Scoreboard opdateres altid; dødsårsag gemmes kun når arten uddør
  if (scoreboard) {
    scoreboard.tilfoejDyr(dyr, levetidSek, aktivtHabitat,
      sidsteAfArt ? { uddoed: true, aarsag, doedsTekst } : null);
    sendScoreboard();
  }
  if (window.Telemetri) Telemetri.registrer('doed', { aarsag, levetid: levetidSek, egenskaber: dyr.egenskaber });
  logDoed(dyr, levetidSek, aarsag);

  if (sidsteAfArt) {
    if (window.Audio) Audio.dyrDoer();
    visSortFade();
    visArtsudslettelse(dyr, levetidSek, doedsTekst);

    Broadcast.send({
      type: 'DYR_DOEDE',
      id: dyr.id,
      artsnavn: dyr.artsnavn,
      danskNavn: dyr.danskNavn,
      aarsag: aarsag,
      levetid: levetidSek,
      doedsTekst: doedsTekst
    });
  } else {
    // Individuel død: send kort besked til stationen (bruges i event-feed)
    const kortTekst = DeathText.genererKortDoedsTekst(dyr, aktivtHabitat, aarsag);
    Broadcast.send({
      type: 'DYR_DOEDE_INDIVID',
      artsnavn: dyr.artsnavn,
      danskNavn: dyr.danskNavn,
      aarsag: aarsag,
      levetid: levetidSek,
      erStamdyr: dyr.erStamdyr || false,
      kortTekst: kortTekst
    });
  }
  // Individuel død: tidslinjen markerer med × (sker automatisk via doedsTid)
}

// ============================================================
// DØD OG DØDSÅRSAG
// ============================================================

// Bestem dødsårsag baseret på laveste scorekat i habitatet
function bestemDoedsaarsag(dyr) {
  // Blev dyret dræbt af et rovdyr?
  if (dyr.jagtSkadet) return { aarsag: 'jaget', ikon: DOEDS_IKON.jaget };

  // Økonomi: døde dyret i klart ressource-underskud, afspejl hvorfor.
  // Brugte det mest energi på flugt/fejlangreb → udmattelse; manglede mad → sult.
  const r = dyr.ressourcer;
  if (Oekonomi.beregnNetto(r) <= RES_UNDERSKUD) {
    const spildt = r.flugt + r.angreb;     // energi brugt på flugt + mislykkede angreb
    const indsamlet = r.planter + r.bytte; // mad faktisk skaffet
    if (spildt > indsamlet) return { aarsag: 'udmattelse', ikon: DOEDS_IKON.udmattelse };
    return { aarsag: 'sult', ikon: DOEDS_IKON.sult };
  }

  const matrix = Survival.HABITAT_SCORE[aktivtHabitat];
  let vaesteKat = null;
  let vaesteScore = Infinity;

  for (const [kat, vaerdi] of Object.entries(dyr.egenskaber)) {
    const score = matrix[kat]?.[vaerdi] ?? 0;
    if (score < vaesteScore) {
      vaesteScore = score;
      vaesteKat = kat;
    }
  }

  // Fødeval-relateret → sult
  if (vaesteKat === 'foedevalg') return { aarsag: 'sult', ikon: DOEDS_IKON.sult };

  // Temperatur/krop-relateret i skov → udkonkurreret
  if (vaesteKat === 'stofskifte' || vaesteKat === 'hudtype' || vaesteKat === 'kropsform') {
    return { aarsag: 'udkonkurreret', ikon: DOEDS_IKON.udkonkurreret };
  }

  return { aarsag: 'udkonkurreret', ikon: DOEDS_IKON.udkonkurreret };
}

function tjekDoed(nu) {
  for (const dyr of dyrListe) {
    if (dyr.doedsTid) continue;

    const levetMs = nu - dyr.ankomstTid;
    // Effektiv levetid: ressource-overskud forlænger, underskud forkorter
    if (levetMs < beregnEffektivLevetid(dyr) * 1000) continue;

    // Dyret dør
    const levetidSek = Math.round(levetMs / 1000);
    const aarsag = bestemDoedsaarsag(dyr);

    // 03E: Trofisk afhængighed — berig dødsbeskeden når rovdyr sulter pga. byttedyr-kollaps
    let afhængighedKontekst = '';
    if (aarsag.aarsag === 'sult' && dyr.egenskaber.foedevalg === 'koedaeder') {
      const levende = dyrListe.filter(d => !d.doedsTid);
      const harBytte = levende.some(d =>
        d.egenskaber.foedevalg === 'planteaeder' || d.egenskaber.foedevalg === 'altaeder'
      );
      if (!harBytte) {
        afhængighedKontekst = ' — alle planteædere forsvandt, og fødekæden kollapsede';
        visFortaeller('Et rovdyr sultede fordi alle planteædere forsvandt. Fødekæden kan ikke overleve uden byttet i bunden.');
      }
    }

    // Tjek artsudslettelse FØR vi markerer dyret som dødt
    const sidsteAfArt = erSidsteAfArt(dyr);

    dyr.doedsTid = nu;
    dyr.doedsAarsag = aarsag.aarsag;
    dyr.doedsIkon = aarsag.ikon;

    // Fade-out animation
    dyr.el.classList.add('doer');
    setTimeout(() => dyr.el.remove(), 2500);

    // Dødstekst genereres kun ved artsudslettelse
    const doedsTekst = sidsteAfArt
      ? DeathText.genererDoedsTekst(dyr, aktivtHabitat, aarsag.aarsag)
      : null;

    // Scoreboard opdateres altid; dødsårsag gemmes kun når arten uddør
    if (scoreboard) {
      scoreboard.tilfoejDyr(dyr, levetidSek, aktivtHabitat,
        sidsteAfArt ? { uddoed: true, aarsag: aarsag.aarsag, doedsTekst } : null);
      sendScoreboard();
    }
    if (window.Telemetri) Telemetri.registrer('doed', { aarsag: aarsag.aarsag, levetid: levetidSek, egenskaber: dyr.egenskaber });
    logDoed(dyr, levetidSek, aarsag.aarsag);

    // Dramatisk overlay + broadcast KUN ved artsudslettelse
    if (sidsteAfArt) {
      if (window.Audio) Audio.dyrDoer();
      visSortFade();
      visArtsudslettelse(dyr, levetidSek, doedsTekst);

      Broadcast.send({
        type: 'DYR_DOEDE',
        id: dyr.id,
        artsnavn: dyr.artsnavn,
        danskNavn: dyr.danskNavn,
        aarsag: aarsag.aarsag,
        levetid: levetidSek,
        doedsTekst: doedsTekst
      });

      console.log(`ART UDDØD: ${dyr.danskNavn} (${dyr.artsnavn}) — ${doedsTekst}`);
    } else {
      // Individuel død: send kort besked til stationen (bruges i event-feed)
      const kortTekst = DeathText.genererKortDoedsTekst(dyr, aktivtHabitat, aarsag.aarsag);
      Broadcast.send({
        type: 'DYR_DOEDE_INDIVID',
        artsnavn: dyr.artsnavn,
        danskNavn: dyr.danskNavn,
        aarsag: aarsag.aarsag,
        levetid: levetidSek,
        erStamdyr: dyr.erStamdyr || false,
        kortTekst: kortTekst + afhængighedKontekst
      });
    }
  }

  // Ryd op i gamle døde dyr (mere end 10 sek siden)
  dyrListe = dyrListe.filter(d => !d.doedsTid || nu - d.doedsTid < 10000);
}

// Dramatisk overlay ved artsudslettelse
function visArtsudslettelse(dyr, levetidSek, doedsTekst) {
  const el = document.createElement('div');
  el.className = 'doed-besked uddoed';   // 'uddoed' giver længere fade (se habitat.css)
  el.style.left = dyr.x + 'px';
  el.style.top = dyr.y + 'px';
  el.innerHTML = `
    <span class="doed-besked-navn">${dyr.doedsIkon} ${dyr.danskNavn} er uddød i dette habitat.</span>
    <span class="doed-besked-latin">${dyr.artsnavn}</span>
    <span class="doed-besked-tekst">${doedsTekst}</span>
    <span class="doed-besked-tid">Overlevede ${levetidSek} sekunder</span>
  `;
  doedContainer.appendChild(el);
  setTimeout(() => el.remove(), FADE_UDDOED);
}

// ============================================================
// FORTÆLLER-STRIBE
// Viser ét stort øjeblik ad gangen — throttlet, biologisk sprog
// ============================================================
let fortaellerEl = null;
let fortaellerTid = 0;
const FORTAELLER_VARIGHED = 5000; // ms synlig
const FORTAELLER_COOLDOWN = 8000; // ms mellem fortæller-beskeder (sænket 12000→8000)

function visFortaeller(tekst) {
  if (!fortaellerEl) fortaellerEl = document.getElementById('fortaeller-stribe');
  if (!fortaellerEl) return;
  const nu = performance.now();
  if (nu - fortaellerTid < FORTAELLER_COOLDOWN) return;
  fortaellerTid = nu;

  fortaellerEl.textContent = tekst;
  fortaellerEl.classList.remove('fortaeller-skjult');
  clearTimeout(fortaellerEl._timer);
  fortaellerEl._timer = setTimeout(() => {
    if (fortaellerEl) fortaellerEl.classList.add('fortaeller-skjult');
  }, FORTAELLER_VARIGHED);
}

// Kaldes fra simulationsloopet ved nøglebegivenheder
function tjekFortaellerBegivenheder(nu) {
  const levende = dyrListe.filter(d => !d.doedsTid);
  const antalArter = new Set(levende.map(d => d.artsnavn)).size;
  const antalIndivider = levende.length;

  // Første kødæder ankommer
  if (!fortaellerFlags.foersteKoedaeder && levende.some(d => d.egenskaber.foedevalg === 'koedaeder')) {
    fortaellerFlags.foersteKoedaeder = true;
    visFortaeller('Et rovdyr er ankommet. Nu er planteæderne ikke længere alene.');
  }

  // Mange ens dyr tæt sammen (monokultur-advarsel)
  const tael = {};
  for (const d of levende) tael[d.artsnavn] = (tael[d.artsnavn] || 0) + 1;
  const storsteArt = Math.max(...Object.values(tael), 0);
  if (storsteArt >= 8 && !fortaellerFlags.monokuluturAdvaret) {
    fortaellerFlags.monokuluturAdvaret = true;
    visFortaeller('Mange ens dyr tæt sammen. I naturen er det farligt — sygdom spreder sig let.');
  }
  if (storsteArt < 5) fortaellerFlags.monokuluturAdvaret = false; // nulstil når arten falder

  // Trofisk kaskade aktiveret
  if (trofiskKaskade && !fortaellerFlags.kaskadeVist) {
    fortaellerFlags.kaskadeVist = true;
    visFortaeller('Et stort rovdyr dominerer habitatet — alle planteædere er på vagt. Planterne vokser tilbage.');
  }
  if (!trofiskKaskade) fortaellerFlags.kaskadeVist = false;

  // Intens niche-konkurrence (3+ dyr på same niche = kost + størrelse + aktivitet)
  const nicheTaelF = {};
  for (const d of levende) {
    const nk = beregnNicheNoegle(d.egenskaber);
    nicheTaelF[nk] = (nicheTaelF[nk] || 0) + 1;
  }
  const storsteNiche = Math.max(...Object.values(nicheTaelF), 0);
  if (storsteNiche >= 3 && !fortaellerFlags.nicheKonkurrence) {
    fortaellerFlags.nicheKonkurrence = true;
    visFortaeller('Mange dyr konkurrerer om den samme fødekilde. I naturen presses de svageste ud.');
  }
  if (storsteNiche < 2) fortaellerFlags.nicheKonkurrence = false;
}

// ============================================================
// PULS-PANEL — per-art populationsoverblik
// ============================================================
let pulsPanelEl = null;
let pulsPanelSidste = 0;
const popHistorie = {}; // artsnavn → sidsteAntal (forrige opdatering)

function opdaterPulsPanel() {
  const nu = performance.now();
  if (nu - pulsPanelSidste < 2000) return;
  pulsPanelSidste = nu;

  if (!pulsPanelEl) pulsPanelEl = document.getElementById('puls-panel');
  if (!pulsPanelEl) return;

  // Grupper levende ikke-NPC-dyr per art
  const artData = {}; // artsnavn → { antal, danskNavn, farve }
  for (const d of dyrListe) {
    if (d.doedsTid || d._npc) continue;
    if (!artData[d.artsnavn]) {
      artData[d.artsnavn] = { antal: 0, danskNavn: d.danskNavn || d.artsnavn, farve: d.farve || '#d4a843' };
    }
    artData[d.artsnavn].antal++;
  }

  const rækker = Object.entries(artData).map(([navn, data]) => {
    const forrige = popHistorie[navn];
    const trend = forrige === undefined ? '→' : data.antal > forrige ? '↑' : data.antal < forrige ? '↓' : '→';
    const trendKlasse = trend === '↑' ? 'trend-op' : trend === '↓' ? 'trend-ned' : 'trend-stabil';
    popHistorie[navn] = data.antal;
    return `
      <div class="puls-art-raekke">
        <span class="puls-art-dot" style="background:${data.farve}"></span>
        <span class="puls-art-navn">${data.danskNavn}</span>
        <span class="puls-art-tal">${data.antal}</span>
        <span class="puls-art-trend ${trendKlasse}">${trend}</span>
      </div>`;
  });

  // Tæl NPC'er samlet (ikke per art)
  const npcAntal = dyrListe.filter(d => !d.doedsTid && d._npc).length;
  const npcRaekke = npcAntal > 0
    ? `<div class="puls-npc-raekke">${npcAntal} NPC-dyr</div>`
    : '';

  // Ustabilitetssignal
  const levende = dyrListe.filter(d => !d.doedsTid);
  const planteaedere = levende.filter(d => d.egenskaber.foedevalg === 'planteaeder').length;
  const koedaedere   = levende.filter(d => d.egenskaber.foedevalg === 'koedaeder').length;
  const ustabil = (planteaedere === 0 && koedaedere > 0) || (levende.length > 3 && Object.keys(artData).length === 1);

  pulsPanelEl.innerHTML = (rækker.length > 0
    ? `<div class="puls-overskrift">Populationer</div>${rækker.join('')}`
    : '<div class="puls-npc-raekke">Ingen spillerdyr endnu</div>'
  ) + npcRaekke + (ustabil ? '<div class="puls-advarsel">⚠️ Ustabilt fødenet</div>' : '');
}

// ============================================================
// NICHE-MARKERING — farvet prik på dyr der deler same niche
// Niche = kost × størrelse × aktivitet (de tre kompetitive egenskaber)
// ============================================================
const NICHE_KLASSER = ['niche-a', 'niche-b', 'niche-c', 'niche-d'];
const nicheKlasseMap = new Map(); // nicheNoegle → CSS-klasse
const nicheKlasseBrug = new Set(); // klasser der er i brug
let nicheOpdaterSidste = 0;

function beregnNicheNoegle(egenskaber) {
  return `${egenskaber.foedevalg}-${egenskaber.kropsform}`;
}

function opdaterNicheMarkering(nu) {
  if (nu - nicheOpdaterSidste < 3000) return;
  nicheOpdaterSidste = nu;

  // Tæl levende dyr per niche
  const nicheTael = new Map();
  for (const d of dyrListe) {
    if (d.doedsTid) continue;
    const noegle = beregnNicheNoegle(d.egenskaber);
    nicheTael.set(noegle, (nicheTael.get(noegle) || 0) + 1);
  }

  // Frigiv klasser for niches der er faldet til < 2 dyr
  for (const [noegle, klasse] of nicheKlasseMap) {
    if ((nicheTael.get(noegle) || 0) < 2) {
      nicheKlasseMap.delete(noegle);
      nicheKlasseBrug.delete(klasse);
    }
  }

  // Tildel stabile klasser til nye niches med >= 2 dyr
  for (const [noegle, antal] of nicheTael) {
    if (antal >= 2 && !nicheKlasseMap.has(noegle)) {
      const ledigKlasse = NICHE_KLASSER.find(k => !nicheKlasseBrug.has(k));
      if (ledigKlasse) {
        nicheKlasseMap.set(noegle, ledigKlasse);
        nicheKlasseBrug.add(ledigKlasse);
      }
    }
  }

  // Opdater DOM-elementer (fjern gamle klasser, tilføj aktuelle)
  for (const d of dyrListe) {
    if (!d.el) continue;
    for (const kl of NICHE_KLASSER) d.el.classList.remove(kl);
    if (d.doedsTid) continue;
    const klasse = nicheKlasseMap.get(beregnNicheNoegle(d.egenskaber));
    if (klasse) d.el.classList.add(klasse);
  }
}

// State-flags til fortæller-throttling
const fortaellerFlags = {
  foersteKoedaeder: false,
  monokuluturAdvaret: false,
  kaskadeVist: false,
  nicheKonkurrence: false
};

// ============================================================
// SPRITE-ANIMATION (frame cycling)
// ============================================================
function opdaterAnimation(nu) {
  for (const dyr of dyrListe) {
    if (dyr.doedsTid) continue;

    // Frame-interval afhænger af tilstand
    let interval = 150; // walk
    if (dyr.animState === 'flee') interval = 80;
    else if (dyr.animState === 'eat') interval = 300;
    else if (dyr.el.classList.contains('jager')) interval = 100;

    // Stillestående dyr animeres ikke (fryser på idle) — sparer arbejde
    const bevaeger = Math.hypot(dyr.vx || 0, dyr.vy || 0) > 0.05;
    if (dyr.animState !== 'eat' && !bevaeger) continue;

    if (nu - dyr.animTid < interval) continue;
    dyr.animTid = nu;

    // Vælg framesæt fra de procedurelle sprites (data-URLs, cachet pr. art)
    const sæt = dyr._frames || (dyr._frames = Sprites.genererFrames(dyr));
    const frames = dyr.animState === 'eat'  ? sæt.eat
                 : dyr.animState === 'flee' ? sæt.flee
                 :                            sæt.walk;
    dyr.animFrame = (dyr.animFrame + 1) % frames.length;

    if (dyr._elImg) dyr._elImg.src = frames[dyr.animFrame];
  }
}

// ============================================================
// RENDERING — ZONE 1 (DOM-baseret)
// ============================================================
function renderDyr() {
  for (const dyr of dyrListe) {
    if (!dyr.el || dyr.doedsTid) continue;
    // Flip sprite når dyret bevæger sig mod venstre
    const flip = dyr.vx < 0 ? ' scaleX(-1)' : '';
    dyr.el.style.transform = `translate(${dyr.x}px, ${dyr.y}px)`;
    if (dyr._elSprite) dyr._elSprite.style.transform = flip;

    // v2 — visuelle cues: jagt-glød + tilstandsindikator
    dyr.el.classList.toggle('jager', dyr.tilstand === 'JAGER');

    // Økonomi-badge: lille netto-tal over dyret
    const badge = dyr._elBadge;
    if (badge) {
      const netto = Oekonomi.beregnNetto(dyr.ressourcer);
      if (netto === 0) {
        badge.textContent = '';
        badge.className = 'res-badge';
      } else {
        badge.textContent = (netto > 0 ? '+' : '') + netto;
        badge.className = 'res-badge ' + (netto > 0 ? 'positiv' : 'negativ');
      }
    }
    const ind = dyr._elInd;
    if (ind) {
      const cue = dyr.tilstand === 'FLUGTER'  ? 'cue-flugt'
                : dyr.tilstand === 'FOURAGER' ? 'cue-fourager'
                : dyr.tilstand === 'JAGER'    ? 'cue-jagt'
                :                               'cue-skjult';
      ind.className = 'tilstand-indikator ' + cue;
    }
  }
}

// ============================================================
// RESSOURCE-TAVLE — levende dyrs økonomi (sorteret efter netto)
// ============================================================
function renderOekonomi(nu) {
  if (nu - sidsteOekonomiTid < OEKONOMI_INTERVAL) return;  // throttle
  sidsteOekonomiTid = nu;
  if (!oekonomiTavle) return;

  // Levende dyr sorteret efter netto-ressourcer (højest først)
  const levende = dyrListe
    .filter(d => !d.doedsTid)
    .map(d => ({ dyr: d, netto: Oekonomi.beregnNetto(d.ressourcer) }))
    .sort((a, b) => b.netto - a.netto)
    .slice(0, OEKONOMI_MAX);

  const I = Oekonomi.RESSOURCE_IKON;

  if (levende.length === 0) {
    oekonomiTavle.innerHTML =
      `<div class="oek-titel">📊 Ressourcer</div>` +
      `<div class="oek-tom">Ingen levende dyr endnu</div>`;
    return;
  }

  const raekker = levende.map(({ dyr, netto }) => {
    const r = dyr.ressourcer;
    const klasse = netto > 0 ? 'positiv' : netto < 0 ? 'negativ' : '';
    return `
      <div class="oek-raekke">
        <span class="oek-navn">${dyr.danskNavn}</span>
        <span class="oek-stats">${I.planter}${r.planter} ${I.bytte}${r.bytte} ${I.flugt}${r.flugt} ${I.angreb}${r.angreb}</span>
        <span class="oek-netto ${klasse}">${netto > 0 ? '+' : ''}${netto}</span>
      </div>`;
  }).join('');

  oekonomiTavle.innerHTML =
    `<div class="oek-titel">📊 Ressourcer — levende dyr</div>` +
    `<div class="oek-legende">${I.planter} spist · ${I.bytte} jaget · ${I.flugt} flugt · ${I.angreb} fejlangreb</div>` +
    raekker;
}

// ============================================================
// RENDERING — ZONE 2 (Tidslinje via Canvas)
// ============================================================

// Tilpas canvas-opløsning til container
function tilpasTidslinje() {
  const container = document.getElementById('tidslinje');
  const dpr = window.devicePixelRatio || 1;
  tidslinjeCanvas.width = container.clientWidth * dpr;
  tidslinjeCanvas.height = container.clientHeight * dpr;
  ctx.scale(dpr, dpr);
}

// Tag et population-snapshot (antal levende spillerdyr pr. art)
function tagPopulationSnapshot(nu) {
  if (nu - popSampleSidste < POP_SAMPLE_INTERVAL) return;
  popSampleSidste = nu;
  const tid = (nu - simStart) / 1000;
  const artsData = {};
  for (const d of dyrListe) {
    if (d.doedsTid) continue;
    // NPC-dyr samles i én fælles linje (__npc__) — ellers bliver grafen forvirrende
    const noegle = d._npc ? '__npc__' : d.artsnavn;
    artsData[noegle] = (artsData[noegle] || 0) + 1;
  }
  popGrafData.push({ tid, artsData });
  if (popGrafData.length > 500) popGrafData.shift(); // max ~41 minutter
}

// Populationsgraf: kurvediagram med én linje pr. art over tid
function renderTidslinje() {
  const tsNu = performance.now();
  if (tsNu - tidslinjeSidste < TIDSLINJE_INTERVAL) return;
  tidslinjeSidste = tsNu;

  const container = document.getElementById('tidslinje');
  const w = container.clientWidth;
  const h = container.clientHeight;
  const nu = (performance.now() - simStart) / 1000;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#111109';
  ctx.fillRect(0, 0, w, h);

  if (popGrafData.length < 2) {
    ctx.fillStyle = '#a09a82';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Venter på dyr fra stationerne...', w / 2, h / 2);
    return;
  }

  const tidsStart = Math.max(0, nu - TIDSLINJE_VINDUE);
  const synlige = popGrafData.filter(s => s.tid >= tidsStart);
  if (synlige.length < 2) return;

  // Find max antal til Y-akse-skalering (min 5 — undgår voldsom zoom ved få dyr)
  let maxAntal = 5;
  for (const s of synlige) {
    for (const n of Object.values(s.artsData)) if (n > maxAntal) maxAntal = n;
  }

  // Margins — bred højre side giver plads til labels uden overlap med grafen
  const ml = 32, mr = 100, mt = 12, mb = 22;
  const gw = w - ml - mr;
  const gh = h - mt - mb;

  const tx = t => ml + ((t - tidsStart) / TIDSLINJE_VINDUE) * gw;
  const ty = n => mt + gh - (n / maxAntal) * gh;

  // Y-akse grid + labels
  ctx.strokeStyle = '#2e2e26';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#7a7466';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  const yTrin = maxAntal <= 5 ? 1 : maxAntal <= 15 ? 2 : maxAntal <= 40 ? 5 : 10;
  for (let n = 0; n <= maxAntal; n += yTrin) {
    const y = ty(n);
    ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + gw, y); ctx.stroke();
    ctx.fillText(n, ml - 4, y + 4);
  }

  // X-akse tidsmarkører — i minutter (markør hvert 2. minut)
  ctx.fillStyle = '#7a7466';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  const xInterval = 120; // 2 minutter
  const foerste = Math.ceil(tidsStart / xInterval) * xInterval;
  for (let t = foerste; t <= nu; t += xInterval) {
    const x = tx(t);
    ctx.strokeStyle = '#2e2e26';
    ctx.beginPath(); ctx.moveTo(x, mt); ctx.lineTo(x, mt + gh); ctx.stroke();
    ctx.fillText(`${Math.round(t / 60)} min`, x, h - 5);
  }

  // Saml alle arter med farve og navn (__npc__ = fælles vildtlevende-linje)
  const artsInfo = {};
  for (const s of synlige) {
    for (const artsnavn of Object.keys(s.artsData)) {
      if (artsInfo[artsnavn]) continue;
      if (artsnavn === '__npc__') {
        artsInfo[artsnavn] = { farve: '#9a9486', danskNavn: 'Vildtlevende', npc: true };
      } else {
        const dyr = dyrListe.find(d => d.artsnavn === artsnavn);
        if (dyr) artsInfo[artsnavn] = { farve: dyr.farve, danskNavn: dyr.danskNavn };
      }
    }
  }

  // Tegn én kurve pr. art (NPC stiplet, så den tydeligt skiller sig fra spillerdyr)
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const labelPunkter = [];
  for (const [artsnavn, info] of Object.entries(artsInfo)) {
    ctx.strokeStyle = info.farve;
    ctx.lineWidth = info.npc ? 2 : 2.5;
    ctx.setLineDash(info.npc ? [6, 5] : []);
    ctx.beginPath();
    let first = true;
    for (const s of synlige) {
      const antal = s.artsData[artsnavn] || 0;
      const x = tx(s.tid);
      const y = ty(antal);
      first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      first = false;
    }
    ctx.stroke();

    // Saml label-position (løses for overlap efterfølgende)
    const sidst = synlige[synlige.length - 1];
    const sidstAntal = sidst.artsData[artsnavn] || 0;
    if (sidstAntal > 0) {
      labelPunkter.push({ navn: info.danskNavn, farve: info.farve, y: ty(sidstAntal) });
    }
  }
  ctx.setLineDash([]);

  // Resolver label-overlap: sorter efter y, skub overlappende ned (min 15px afstand)
  labelPunkter.sort((a, b) => a.y - b.y);
  const MIN_LABEL_AFSTAND = 15;
  for (let i = 1; i < labelPunkter.length; i++) {
    if (labelPunkter[i].y - labelPunkter[i - 1].y < MIN_LABEL_AFSTAND) {
      labelPunkter[i].y = labelPunkter[i - 1].y + MIN_LABEL_AFSTAND;
    }
  }

  // Tegn labels med farvet baggrund til højre for grafen
  const labelX = ml + gw + 6;
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'left';
  for (const lbl of labelPunkter) {
    const labelY = Math.min(lbl.y + 4, mt + gh);
    // Farvet dot + navn
    ctx.fillStyle = lbl.farve;
    ctx.beginPath(); ctx.arc(labelX + 5, labelY - 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lbl.farve;
    ctx.fillText(lbl.navn, labelX + 12, labelY);
  }

  // Start/slut-adskillelse: på den cirkulære museumsskærm ligger grafens venstre
  // (ældste) og højre (NU) kant lige op ad hinanden. Venstre kant fades blødt ud
  // over ca. 1/8 af bredden, så start og slut ikke flyder sammen visuelt.
  const fadeBredde = w / 8;
  const grad = ctx.createLinearGradient(ml, 0, ml + fadeBredde, 0);
  grad.addColorStop(0, 'rgba(17,17,9,1)');   // fuldt dækkende ved start-kanten
  grad.addColorStop(1, 'rgba(17,17,9,0)');   // gennemsigtig → grafen toner frem
  ctx.fillStyle = grad;
  ctx.fillRect(ml, mt, fadeBredde, gh);

  // "NU"-markør ved højre kant (nyeste)
  const nuX = ml + gw;
  ctx.strokeStyle = '#e8c46a';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(nuX, mt); ctx.lineTo(nuX, mt + gh); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#e8c46a';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('NU', nuX - 4, mt + 11);
}

// ============================================================
// HOVEDLOOP
// ============================================================
// Læs sæsontilstand fra localStorage hvert 10. sekund
function opdaterSæsonTilstand(nu) {
  if (nu - sidsteSæsonLæs < 10000) return;
  sidsteSæsonLæs = nu;
  sæsonTilstand = localStorage.getItem('saeson') || 'auto';
}

function simulationsLoop(timestamp) {
  const dt = Math.min((timestamp - sidsteFrame) / 1000, 0.1); // max 100ms step
  sidsteFrame = timestamp;

  opdaterSæsonTilstand(timestamp);

  // v2: opdater kaskade-bonus → tilstandsmaskine → konkurrence før bevægelse
  opdaterKaskade();
  for (const dyr of dyrListe) {
    if (!dyr.doedsTid) {
      opdaterDyrTilstand(dyr, timestamp);
      tjekTilstandEvent(dyr, timestamp);
    }
  }
  opdaterKonkurrence(timestamp);

  opdaterPlanter(timestamp, dt);
  opdaterBevægelse(timestamp, dt);
  opdaterJagt(timestamp);
  opdaterFormering(dt);
  opdaterSygdom(timestamp);
  tjekDoed(timestamp);
  sendArterStatus(timestamp);
  tjekFortaellerBegivenheder(timestamp);
  tjekNpcSpawn(timestamp);
  opdaterPulsPanel();
  opdaterNicheMarkering(timestamp);
  opdaterDagNat(timestamp);
  if (window.Telemetri) Telemetri.tik(dyrListe, dt, timestamp, trofiskKaskade);
  opdaterAnimation(timestamp);
  renderPlanter();
  renderDyr();
  tagPopulationSnapshot(timestamp);
  renderTidslinje();
  renderOekonomi(timestamp);

  requestAnimationFrame(simulationsLoop);
}

// ============================================================
// LIVE-FEEDBACK TIL STATIONERNE
// Stationen matcher på artsnavn og viser status/events/scoreboard.
// ============================================================

// Event-tekster: fortæller HVORFOR, ikke kun hvad der sker
const EVENT_TEKST = {
  ankom:   d => `🐾 ${d.danskNavn} er sendt ud i habitatet — nu afgør naturen om den slags klarer sig`,
  spiser:  d => d.egenskaber.foedevalg === 'planteaeder'
    ? `🌿 ${d.danskNavn} æder planter — planteædere bruger meget tid på at samle nok energi`
    : d.egenskaber.foedevalg === 'koedaeder'
      ? `🎯 ${d.danskNavn} jager — kød giver masser af energi, men hver jagt kan slå fejl`
      : `🍽️ ${d.danskNavn} leder efter mad — altædere finder altid noget at spise`,
  jager:   d => `🎯 ${d.danskNavn} er på jagt — kød giver energi til at få unger`,
  flygter: d => `💨 ${d.danskNavn} flygter — hver flugt brænder energi den ellers skulle bruge på afkom`,
  foedsel: d => `💕 ${d.danskNavn} fik en unge — den klarede sig godt nok til at føre arten videre`,
  jaget:   d => `⚠️ ${d.danskNavn} blev fanget — den slags dyr får færre unger her`
};

// Send et event for en art (throttlet pr. art + event-type)
function sendDyrEvent(dyr, event, nu) {
  const sidste = (artEventTid[dyr.artsnavn] ||= {});
  if (nu - (sidste[event] ?? -Infinity) < EVENT_COOLDOWN) return;
  sidste[event] = nu;
  Broadcast.send({
    type: 'DYR_EVENT',
    artsnavn: dyr.artsnavn,
    danskNavn: dyr.danskNavn,
    event: event,
    tekst: EVENT_TEKST[event] ? EVENT_TEKST[event](dyr) : ''
  });
}

// Detektér tilstandsskift og send relevante events
function tjekTilstandEvent(dyr, nu) {
  if (dyr.tilstand === dyr.sidsteTilstand) return;
  if (dyr.tilstand === 'JAGER')        sendDyrEvent(dyr, 'jager', nu);
  else if (dyr.tilstand === 'FLUGTER') { dyr.ressourcer.flugt++; sendDyrEvent(dyr, 'flygter', nu); }  // økonomi: flugtforsøg
  else if (dyr.tilstand === 'FOURAGER') sendDyrEvent(dyr, 'spiser', nu);
}

// Send et øjebliksbillede af alle levende arter (throttlet)
function sendArterStatus(nu) {
  if (nu - sidsteStatusTid < STATUS_INTERVAL) return;
  sidsteStatusTid = nu;

  const arter = {};
  for (const d of dyrListe) {
    if (d.doedsTid) continue;
    const a = (arter[d.artsnavn] ||= {
      danskNavn: d.danskNavn,
      antal: 0,
      aeldsteSek: 0,
      afkom: fodselTael[d.artsnavn] || 0,
      res: Oekonomi.nytRegnskab(),      // samlet ressource-regnskab for arten
      egenskaber: d.egenskaber          // egenskaber til checklist på stationen
    });
    a.antal++;
    a.res = Oekonomi.laegSammen(a.res, d.ressourcer);
    const alder = Math.round((nu - d.ankomstTid) / 1000);
    if (alder > a.aeldsteSek) a.aeldsteSek = alder;
  }
  Broadcast.send({ type: 'ARTER_STATUS', arter: arter });
}

// Send aktuel rekordliste til stationerne (mini-scoreboard)
function sendScoreboard() {
  if (!scoreboard) return;
  Broadcast.send({
    type: 'SCOREBOARD',
    dagens: scoreboard.hentDagens(),
    livstid: scoreboard.hentLivstid()
  });
}

// ============================================================
// BROADCASTCHANNEL-INTEGRATION
// ============================================================
Broadcast.lyt((besked) => {
  switch (besked.type) {
    case 'NYT_DYR':
      tilfoejDyr(besked.dyr);
      break;
    case 'HABITAT_REQUEST':
      // Station beder om at vide hvilket habitat der kører
      Broadcast.send({ type: 'HABITAT_INFO', habitat: aktivtHabitat });
      break;
  }
});

// ============================================================
// INIT
// ============================================================
function init() {
  // Enkelt habitat: lysåben dansk skov (istidskontekst)
  vaelgHabitat('skov');

  // Opsæt scoreboard
  scoreboard = new Scoreboard(document.getElementById('scoreboard'));

  // Opsæt tidslinje-canvas og plante-canvas
  tilpasTidslinje();
  tilpasPlanteCanvas();
  window.addEventListener('resize', () => {
    tilpasTidslinje();
    tilpasPlanteCanvas();
  });

  // Start simulationsloop
  requestAnimationFrame(simulationsLoop);

  console.log('Habitat klar. Venter på dyr...');
}

init();

// ============================================================
// Biologisk Interaktionsdesign v2 + telemetri er aktivt.
// Tast 'D' i habitatet for live telemetri-overlay.
// ============================================================
