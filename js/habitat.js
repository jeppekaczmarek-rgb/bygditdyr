// ============================================================
// habitat.js — Simulationsloop, tidslinje, jagt
// Styrer habitatskærmen: dyr bevæger sig, jager, dør.
// ============================================================

// --- Konstanter ---
const JAGT_COOLDOWN = 5000;    // ms mellem jagtinteraktioner
const FART_BASIS = 40;         // px/sek basisfartsvariation
const FART_LILLE = 50;
const FART_MELLEM = 35;
const FART_STOR = 25;
const RETNINGSSKIFT_CHANCE = 0.3; // pr. sekund
const TIDSLINJE_VINDUE = 180;  // sekunder synligt i tidslinjen
const FADE_DOEDSTID = 8000;    // ms for dødsbesked-animation

// Størrelser brugt til kollisionsberegning
const DYR_RADIUS = { lille: 20, mellem: 30, stor: 40 };

// Formering
// Tuning 1/6 2026: halveret formeringstempo — overbefolkning udløste
// gentagne sygdomscrash der overdøvede rovdyr/byttedyr-dynamikken.
const FORMERING_FART_HURTIG = 100 / 50;    // %/sek (score ≥ 6)
const FORMERING_FART_MIDDEL = 100 / 120;   // %/sek (score 3-5)
const FORMERING_FART_LANGSOM = 100 / 240;  // %/sek (score < 3)

// Mutation — sandsynlighed for at ét træk muterer ved formering (sæt 0 for at slå fra)
const MUTATION_RATE = 0.08;

// Sygdom — tærskel beregnes nu dynamisk (se sygdomsTaerskel())
const SYGDOM_THRESHOLD_FAST = 20; // kun brugt som fallback
const SMITTE_RADIUS = 150;      // px
const SMITTE_FASE_VARIGHED = 4000;  // ms
const SYGDOM_DOEDS_INTERVAL = 500;  // ms mellem dødsfald

// Planter — dynamisk bærekapacitet skalerer med antal levende arter
const PLANTE_BASIS  = { skov: 6, arktis: 4, oerken: 3 };
const PLANTE_PR_ART = { skov: 3, arktis: 2, oerken: 1.5 };
const PLANTE_LOFT   = { skov: 26, arktis: 16, oerken: 10 };
const PLANTE_SPISE_RADIUS = 15;    // px
const PLANTE_FADE_TID = 1.5;       // sekunder for opacity-fade
const PLANTE_RESPAWN_MIN = 10000;   // ms
const PLANTE_RESPAWN_MAX = 15000;   // ms

// --- v2: Biologisk interaktionsdesign ---
// Sanseradiuser (px)
const DETEKT_BASE = 150;            // basis detektionsradius (trusler)
const FOURAGER_BASE = 120;          // basis fourageringsradius (mad)
// Energi (0–1)
const ENERGI_START_MIN = 0.7;       // dyr ankommer med 70–100% energi
const ENERGI_DEPLETION = 0.05;      // basis energitab pr. sek (hævet 0,04→0,05: HVILE var 86,8% → for lavt flow)
const PLANTE_ENERGI = 0.15;         // genvundet ved at spise plante
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

const STORRELSE_RANG = { lille: 1, mellem: 2, stor: 3 };

// --- Økonomi → overlevelse (modifier-lag oven på grundlevetiden) ---
// Netto-ressourcer justerer hvor længe et dyr lever: overskud (meget mad,
// lidt flugt/fejlangreb) forlænger livet, underskud forkorter det.
const RES_LEVETID_SEK = 3;        // sekunder levetid pr. netto-ressourcepoint
const RES_LEVETID_MAKS = 0.8;     // justering må højst være ±80% af grundlevetiden
const RES_LEVETID_GULV = 8;       // absolut minimum effektiv levetid (sek)
const RES_UNDERSKUD = -3;         // netto under dette = arten døde af ressourcemangel
const FORM_ENERGI_MIN = 0.5;      // energi krævet for at bygge mod afkom
const FORM_NETTO_MIN = 0;         // netto-ressourcer krævet for at formere (overskud)

// Habitat-data
const HABITAT_DATA = {
  skov:   { navn: 'Tempereret Skov', ikon: '🌲' },
  arktis: { navn: 'Arktis / Tundra', ikon: '🏔️' },
  oerken: { navn: 'Ørken',           ikon: '🏜️' }
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
let aktivSygdom = null;        // Aktiv sygdoms-event
let planter = [];              // Plante-objekter
let trofiskKaskade = false;    // v2: sandt når et stort rovdyr er på skærmen
let sidsteNpcTjek = 0;         // throttling af NPC-spawn-tjek

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
}

// ============================================================
// DYR-HÅNDTERING
// ============================================================

// Tilføj nyt dyr til simulationen
function tilfoejDyr(dyr) {
  // Genberegn score for dette habitat (station kan have brugt et andet)
  const score = Survival.beregnHabitatScore(dyr, aktivtHabitat);
  const levetid = Survival.beregnOverlevelsestid(score);

  // Beregn startfart baseret på størrelse; glat hud giver fartbonus
  const fartMap = { lille: FART_LILLE, mellem: FART_MELLEM, stor: FART_STOR };
  const GLAT_FART_MOD = 1.25; // glat hud: smidig krop = 25% hurtigere
  const basisFart = (fartMap[dyr.egenskaber.storrelse] || FART_BASIS)
    * (dyr.egenskaber.hudtype === 'glat' ? GLAT_FART_MOD : 1);

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
  if (dyr.egenskaber.kost === 'koedaeder') el.classList.add('koedaeder');
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

  dyrListe.push(simDyr);
  if (window.Telemetri) Telemetri.registrer('ankomst', { egenskaber: simDyr.egenskaber, score });

  // Send "ankom"-event til stationerne (kun for nyligt byggede dyr, ikke afkom)
  if (!dyr._afkom) sendDyrEvent(simDyr, 'ankom', simDyr.ankomstTid);

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

// --- NPC-dyr i lavsæson (< 2 distinkte spillere) ---
const NPC_DEFS = {
  skov: [
    { danskNavn: 'Skovræv', egenskaber: { stofskifte: 'hojt', hudtype: 'pels', kost: 'koedaeder', storrelse: 'lille', aktivitet: 'nataktiv', forsvar: 'flugt' } },
    { danskNavn: 'Skovhare', egenskaber: { stofskifte: 'hojt', hudtype: 'pels', kost: 'planteaeder', storrelse: 'lille', aktivitet: 'dagaktiv', forsvar: 'flugt' } }
  ],
  arktis: [
    { danskNavn: 'Polarræv', egenskaber: { stofskifte: 'hojt', hudtype: 'pels', kost: 'koedaeder', storrelse: 'lille', aktivitet: 'dagaktiv', forsvar: 'flugt' } },
    { danskNavn: 'Læming', egenskaber: { stofskifte: 'hojt', hudtype: 'pels', kost: 'planteaeder', storrelse: 'lille', aktivitet: 'dagaktiv', forsvar: 'ingen' } }
  ],
  oerken: [
    { danskNavn: 'Ørkenvaran', egenskaber: { stofskifte: 'lavt', hudtype: 'skael', kost: 'koedaeder', storrelse: 'lille', aktivitet: 'dagaktiv', forsvar: 'flugt' } },
    { danskNavn: 'Ørkengerbil', egenskaber: { stofskifte: 'lavt', hudtype: 'glat', kost: 'planteaeder', storrelse: 'lille', aktivitet: 'nataktiv', forsvar: 'flugt' } }
  ]
};

let npcSpawnet = false;
const NPC_COOLDOWN = 20000; // ms mellem NPC-tjek

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
    // auto: 2 NPCer ved meget lav belastning, 1 ved lav
    maksNpc = individer <= 1 ? 2 : individer <= 3 ? 1 : 0;
  }

  const aktiveNpc = dyrListe.filter(d => d._npc && !d.doedsTid);
  if (aktiveNpc.length >= maksNpc) return;

  // Vælg NPC-type aktivt: sørg for én kødæder + én planteæder ved 2 NPCer
  const harKoeNpc = aktiveNpc.some(d => d.egenskaber.kost === 'koedaeder');
  const oensketKost = harKoeNpc ? 'planteaeder' : 'koedaeder';
  const def = defs.find(d => d.egenskaber.kost === oensketKost)
           || defs[Math.floor(Math.random() * defs.length)];

  const npc = {
    id: crypto.randomUUID(),
    artsnavn: `NPC_${def.danskNavn.replace(/ /g, '_')}`,
    danskNavn: def.danskNavn,
    egenskaber: { ...def.egenskaber },
    _npc: true
  };
  tilfoejDyr(npc);
  console.log(`NPC spawnet: ${npc.danskNavn} (sæson: ${sæsonTilstand}, individer: ${individer})`);
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

// Detektionsradius: hvor langt dyret ser/lugter trusler (rovdyr)
function beregnDetektionsRadius(dyr) {
  let r = DETEKT_BASE;                              // 150px basis
  const e = dyr.egenskaber;
  if (e.aktivitet === 'dagaktiv') r += 50;          // ser bedre i dagslys
  if (e.forsvar === 'flugt') r += 40;               // sky, holder altid udkig
  if (e.storrelse === 'lille') r += 30;             // byttevilkår → ekstra vagtsom
  if (e.forsvar === 'giftig' || e.forsvar === 'pigge') r -= 20; // konfident
  return r;
}

// Fourageringsradius: hvor langt dyret sanser mad
function beregnFourageringsRadius(dyr) {
  let r = FOURAGER_BASE;                            // 120px basis
  const e = dyr.egenskaber;
  if (e.stofskifte === 'hojt') r += 50;             // sulten, leder aktivt
  if (e.kost === 'planteaeder') r += 30;            // planter er statiske, nemme
  if (e.storrelse === 'stor') r += 40;              // skal spise mere
  return r;
}

function storrelseRang(dyr) { return STORRELSE_RANG[dyr.egenskaber.storrelse] || 2; }
function hentDyr(id) { return dyrListe.find(d => d.id === id && !d.doedsTid) || null; }

// ============================================================
// v2 — DETEKTION (trusler, bytte, planter)
// ============================================================

// Find rovdyr inden for detektionsradius som kan true dette dyr
function findTrusler(dyr) {
  // Giftige og piggede dyr flygter ikke — de er selvsikre
  if (dyr.egenskaber.forsvar === 'giftig' || dyr.egenskaber.forsvar === 'pigge') return [];
  const radius = dyr.detektionsRadius + dyr.kaskadeBonus;
  const r2 = radius * radius;
  const minRang = storrelseRang(dyr);
  const trusler = [];
  for (const d of dyrListe) {
    if (d.doedsTid || d === dyr) continue;
    if (d.egenskaber.kost !== 'koedaeder' && d.egenskaber.kost !== 'alleaeder') continue;
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
    if (d.egenskaber.forsvar === 'giftig') continue;  // rovdyr undgår gift aktivt
    if (d.id === dyr.undgaaId && performance.now() < dyr.undgaaTil) continue; // undgå nyligt pigge-bytte
    const byttRang = storrelseRang(d);
    // Kan jages hvis mindre — eller lige stor men ikke selv et rovdyr
    const kanJages = byttRang < jaegerRang
      || (d.egenskaber.kost !== 'koedaeder' && byttRang <= jaegerRang);
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

  // Prioritet 2: Jagt (kødædere/alleædere, når ikke helt mætte)
  if ((e.kost === 'koedaeder' || e.kost === 'alleaeder') && dyr.energi < JAGER_TAERSKEL) {
    const bytte = findByttedyr(dyr);
    if (bytte) {
      if (dyr.jagtMaal !== bytte.id) dyr.ambushFase = 'naermer'; // nyt mål → reset baghold
      dyr.tilstand = 'JAGER';
      dyr.jagtMaal = bytte.id;
      return;
    }
  }

  // Prioritet 3: Fouragering på planter (når energi under tærskel)
  const taerskel = e.stofskifte === 'hojt' ? FOURAGER_TAERSKEL_HOJT : FOURAGER_TAERSKEL_LAVT;
  if (dyr.energi < taerskel && (e.kost === 'planteaeder' || e.kost === 'alleaeder')) {
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

    // Energi falder over tid — hurtigere ved højt stofskifte
    const stofFaktor = dyr.egenskaber.stofskifte === 'hojt' ? 1.6
                     : dyr.egenskaber.stofskifte === 'lavt' ? 0.6 : 1;
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

  // Korrekt flugt — flugt-forsvar er hurtigere; pigge gør langsommere
  let faktor = 1.3;
  if (dyr.egenskaber.forsvar === 'flugt') faktor = 1.4;
  else if (dyr.egenskaber.forsvar === 'pigge') faktor = 0.8;
  if (dyr.flugtMaal) sætFartMod(dyr, dyr.flugtMaal.x, dyr.flugtMaal.y, fart * faktor);

  // Små dyr zigzagger (±30° afvigelse)
  if (dyr.egenskaber.storrelse === 'lille') {
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

  if (dyr.egenskaber.storrelse === 'stor') {
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

// HVILER: langsom tilfældig drift (lavt stofskifte = næsten stille)
function bevægHvile(dyr, dt, fart) {
  const driftFaktor = dyr.egenskaber.stofskifte === 'lavt' ? 0.1 : 0.3;
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
function opdaterJagt(nu) {
  // Dynamisk jagt-takt: skalerer opad med antal rovdyr for at undgå jagt-kaos
  const rovdyrAntal = dyrListe.filter(d => !d.doedsTid && d.egenskaber.kost === 'koedaeder').length;
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
      case 'giftig':
        // Karnivoren taber energi, byttet overlever
        jaeger.levetid = Math.max(5, jaeger.levetid - 8);
        jaeger.vx *= -1; jaeger.vy *= -1;
        jaeger.ressourcer.angreb++;            // økonomi: mislykket angreb
        udfald = 'gift';
        break;
      case 'pigge':
        if (Math.random() < PIGGE_GENNEMBRUD) {
          // Gennembrud: rovdyret fælder pigge-byttet trods skade
          bytte.levetid = Math.max(3, bytte.levetid - 12);
          bytte.jagtSkadet = true;
          jaeger.levetid = Math.max(5, jaeger.levetid - 5); // tager stadig skade
          jaeger.energi = Math.min(1, jaeger.energi + KOED_ENERGI);
          jaeger.ressourcer.bytte++;
          udfald = 'draebt';
        } else {
          // Karnivoren skadet og afvist
          jaeger.levetid = Math.max(5, jaeger.levetid - 5);
          jaeger.vx *= -1; jaeger.vy *= -1;
          jaeger.undgaaId = bytte.id;            // husk og undgå dette pigge-bytte
          jaeger.undgaaTil = nu + PIGGE_UNDGAA;
          jaeger.ressourcer.angreb++;            // økonomi: mislykket angreb
          udfald = 'pigge';
        }
        break;
      case 'flugt':
        if (Math.random() < FLUGT_UNDVIGELSE) {
          // Byttet undslipper til ny position
          bytte.x = Math.random() * (habitatVerden.clientWidth - 100) + 50;
          bytte.y = Math.random() * (habitatVerden.clientHeight - 100) + 50;
          bytte.tvungetFlugtSlut = nu + 800;
          jaeger.ressourcer.angreb++;          // økonomi: byttet slap væk
          udfald = 'undslap';
        } else {
          bytte.levetid = Math.max(3, bytte.levetid - 12);
          bytte.jagtSkadet = true;
          jaeger.energi = Math.min(1, jaeger.energi + KOED_ENERGI); // kød giver energi
          jaeger.ressourcer.bytte++;           // økonomi: +1 byttedyr spist
          udfald = 'draebt';
        }
        break;
      default: // 'ingen' forsvar
        bytte.levetid = Math.max(3, bytte.levetid - 15);
        bytte.jagtSkadet = true;
        jaeger.energi = Math.min(1, jaeger.energi + KOED_ENERGI);
        jaeger.ressourcer.bytte++;             // økonomi: +1 byttedyr spist
        udfald = 'draebt';
    }
    if (window.Telemetri) Telemetri.registrer('fangst', { udfald, forsvar: bytte.egenskaber.forsvar });

    // Send "jaget"-event til stationerne når byttet rent faktisk bliver fanget
    if (udfald === 'draebt') sendDyrEvent(bytte, 'jaget', nu);

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
  const storeRovdyr = dyrListe.filter(d =>
    !d.doedsTid && d.egenskaber.storrelse === 'stor'
    && (d.egenskaber.kost === 'koedaeder' || d.egenskaber.kost === 'alleaeder'));
  trofiskKaskade = storeRovdyr.length > 0;

  const r2 = KASKADE_RADIUS * KASKADE_RADIUS;
  for (const dyr of dyrListe) {
    if (dyr.doedsTid) continue;
    if (dyr.egenskaber.kost === 'koedaeder') { dyr.kaskadeBonus = 0; continue; }
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
    const fyld = dyr.el.querySelector('.formering-fyld');
    if (fyld) fyld.style.width = Math.min(100, dyr.formeringPct) + '%';

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

  if (sidsteAfArt) {
    if (window.Audio) Audio.dyrDoer();
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

  // Kost-relateret → sult
  if (vaesteKat === 'kost') return { aarsag: 'sult', ikon: DOEDS_IKON.sult };

  // Temperatur-relateret (stofskifte/hudtype) → habitat-specifik årsag
  if (vaesteKat === 'stofskifte' || vaesteKat === 'hudtype') {
    if (aktivtHabitat === 'arktis') return { aarsag: 'frys', ikon: DOEDS_IKON.frys };
    if (aktivtHabitat === 'oerken') return { aarsag: 'toerke', ikon: DOEDS_IKON.toerke };
  }

  // Standardårsag per habitat
  if (aktivtHabitat === 'arktis') return { aarsag: 'frys', ikon: DOEDS_IKON.frys };
  if (aktivtHabitat === 'oerken') return { aarsag: 'toerke', ikon: DOEDS_IKON.toerke };
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

    // Dramatisk overlay + broadcast KUN ved artsudslettelse
    if (sidsteAfArt) {
      if (window.Audio) Audio.dyrDoer();
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
        kortTekst: kortTekst
      });
    }
  }

  // Ryd op i gamle døde dyr (mere end 10 sek siden)
  dyrListe = dyrListe.filter(d => !d.doedsTid || nu - d.doedsTid < 10000);
}

// Dramatisk overlay ved artsudslettelse
function visArtsudslettelse(dyr, levetidSek, doedsTekst) {
  const el = document.createElement('div');
  el.className = 'doed-besked';
  el.style.left = dyr.x + 'px';
  el.style.top = dyr.y + 'px';
  el.innerHTML = `
    <span class="doed-besked-navn">${dyr.doedsIkon} ${dyr.danskNavn} er uddød i dette habitat.</span>
    <span class="doed-besked-latin">${dyr.artsnavn}</span>
    <span class="doed-besked-tekst">${doedsTekst}</span>
    <span class="doed-besked-tid">Overlevede ${levetidSek} sekunder</span>
  `;
  doedContainer.appendChild(el);
  setTimeout(() => el.remove(), FADE_DOEDSTID);
}

// ============================================================
// FORTÆLLER-STRIBE
// Viser ét stort øjeblik ad gangen — throttlet, biologisk sprog
// ============================================================
let fortaellerEl = null;
let fortaellerTid = 0;
const FORTAELLER_VARIGHED = 5000; // ms synlig
const FORTAELLER_COOLDOWN = 12000; // ms mellem fortæller-beskeder

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
  if (!fortaellerFlags.foersteKoedaeder && levende.some(d => d.egenskaber.kost === 'koedaeder')) {
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
}

// ============================================================
// PULS-PANEL — live-overblik over økosystemets tilstand
// ============================================================
let pulsPanelEl = null;
let pulsPanelSidste = 0; // opdateres maks. hvert 2. sekund

function opdaterPulsPanel() {
  const nu = performance.now();
  if (nu - pulsPanelSidste < 2000) return;
  pulsPanelSidste = nu;

  if (!pulsPanelEl) pulsPanelEl = document.getElementById('puls-panel');
  if (!pulsPanelEl) return;

  const levende = dyrListe.filter(d => !d.doedsTid);
  const arter = new Set(levende.map(d => d.artsnavn));
  const planteaedere = levende.filter(d => d.egenskaber.kost === 'planteaeder').length;
  const koedaedere  = levende.filter(d => d.egenskaber.kost === 'koedaeder').length;
  const alleaedere  = levende.filter(d => d.egenskaber.kost === 'alleaeder').length;

  // Ustabilitetssignal: ingen planteædere + rovdyr til stede, eller kun 1 art
  const ustabil = (planteaedere === 0 && koedaedere > 0) || (levende.length > 3 && arter.size === 1);

  pulsPanelEl.innerHTML = `
    <div class="puls-linje"><span>Individer</span><span class="puls-tal">${levende.length}</span></div>
    <div class="puls-linje"><span>Arter</span><span class="puls-tal">${arter.size}</span></div>
    <div class="puls-linje"><span>🌿 Planteæd.</span><span class="puls-tal">${planteaedere}</span></div>
    <div class="puls-linje"><span>🥩 Kødæd.</span><span class="puls-tal">${koedaedere}</span></div>
    <div class="puls-linje"><span>🍽️ Alleæd.</span><span class="puls-tal">${alleaedere}</span></div>
    ${ustabil ? '<div class="puls-advarsel">⚠️ Ustabilt fødenet</div>' : ''}
  `;
}

// State-flags til fortæller-throttling
const fortaellerFlags = {
  foersteKoedaeder: false,
  monokuluturAdvaret: false,
  kaskadeVist: false
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

    if (nu - dyr.animTid < interval) continue;
    dyr.animTid = nu;

    // Antal frames og filnavns-suffiks
    let maxFrames, suffix;
    switch (dyr.animState) {
      case 'eat':
        maxFrames = 2;
        dyr.animFrame = (dyr.animFrame + 1) % maxFrames;
        suffix = `-eat-${dyr.animFrame + 1}`;
        break;
      case 'flee':
        maxFrames = 2;
        dyr.animFrame = (dyr.animFrame + 1) % maxFrames;
        suffix = `-flee-${dyr.animFrame + 1}`;
        break;
      default: // walk
        maxFrames = 4;
        dyr.animFrame = (dyr.animFrame + 1) % maxFrames;
        suffix = `-walk-${dyr.animFrame + 1}`;
    }

    const img = dyr.el.querySelector('.dyr-sprite img');
    if (img) img.src = `assets/sprites/${dyr.spriteBase}${suffix}.png`;
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
    const spriteEl = dyr.el.querySelector('.dyr-sprite');
    if (spriteEl) spriteEl.style.transform = flip;

    // v2 — visuelle cues: jagt-glød + tilstandsindikator
    dyr.el.classList.toggle('jager', dyr.tilstand === 'JAGER');

    // Økonomi-badge: lille netto-tal over dyret (kun når det er sket noget)
    const badge = dyr.el.querySelector('.res-badge');
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
    const ind = dyr.el.querySelector('.tilstand-indikator');
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

function renderTidslinje() {
  const container = document.getElementById('tidslinje');
  const w = container.clientWidth;
  const h = container.clientHeight;
  const nu = (performance.now() - simStart) / 1000;

  ctx.clearRect(0, 0, w, h);

  // Baggrund
  ctx.fillStyle = '#111109';
  ctx.fillRect(0, 0, w, h);

  // Samle alle dyr der har tidslinje-data (levende + døde inden for vinduet)
  const tidsStart = Math.max(0, nu - TIDSLINJE_VINDUE);
  const alleDyr = dyrListe.filter(d => {
    const ankomst = (d.ankomstTid - simStart) / 1000;
    const doed = d.doedsTid ? (d.doedsTid - simStart) / 1000 : nu;
    return doed >= tidsStart; // kun vis dyr der stadig er synlige i vinduet
  });

  if (alleDyr.length === 0) {
    // Vis "venter på dyr" tekst
    ctx.fillStyle = '#a09a82';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Venter på dyr fra stationerne...', w / 2, h / 2);
    return;
  }

  // Tidsakse-markører
  ctx.strokeStyle = '#333328';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#666658';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';

  const interval = 30; // markør hvert 30. sekund
  const foersteMarkør = Math.ceil(tidsStart / interval) * interval;
  for (let t = foersteMarkør; t <= nu; t += interval) {
    const x = ((t - tidsStart) / TIDSLINJE_VINDUE) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.fillText(`${Math.round(t)}s`, x, h - 4);
  }

  // Række-højde og padding
  const padding = 12;
  const maxRaekker = Math.floor((h - padding * 2) / 30);
  const synlige = alleDyr.slice(-maxRaekker);
  const raekkeHoejde = Math.min(30, (h - padding * 2) / synlige.length);

  // Tegn hvert dyr
  synlige.forEach((dyr, i) => {
    const y = padding + i * raekkeHoejde + raekkeHoejde / 2;
    const ankomst = (dyr.ankomstTid - simStart) / 1000;
    const slut = dyr.doedsTid ? (dyr.doedsTid - simStart) / 1000 : nu;

    const x1 = Math.max(0, ((ankomst - tidsStart) / TIDSLINJE_VINDUE) * w);
    const x2 = ((slut - tidsStart) / TIDSLINJE_VINDUE) * w;

    // Linje
    ctx.strokeStyle = dyr.farve;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();

    // Cirkel-ikon ved start
    ctx.fillStyle = dyr.farve;
    ctx.beginPath();
    ctx.arc(x1, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Kun dansk navn på tidslinjen (latin lever videre i scoreboardet)
    ctx.fillStyle = '#f0ead6';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'left';
    const navnX = Math.max(x1 + 10, 5);
    ctx.fillText(dyr.danskNavn || dyr.artsnavn, navnX, y - 4);

    if (dyr.doedsTid) {
      // Død: × + ikon ved enden
      ctx.fillStyle = '#c0392b';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('×', x2, y + 1);
      ctx.font = '11px sans-serif';
      ctx.fillText(dyr.doedsIkon, x2 + 14, y + 1);
    } else {
      // Levende: pulserende cirkel
      const puls = Math.sin(nu * 4) * 0.3 + 0.7;
      ctx.fillStyle = dyr.farve;
      ctx.globalAlpha = puls;
      ctx.beginPath();
      ctx.arc(x2, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });
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
  if (window.Telemetri) Telemetri.tik(dyrListe, dt, timestamp, trofiskKaskade);
  opdaterAnimation(timestamp);
  renderPlanter();
  renderDyr();
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
  spiser:  d => d.egenskaber.kost === 'planteaeder'
    ? `🌿 ${d.danskNavn} æder planter — planteædere bruger meget tid på at samle nok energi`
    : d.egenskaber.kost === 'koedaeder'
      ? `🎯 ${d.danskNavn} jager — kød giver masser af energi, men hver jagt kan slå fejl`
      : `🍽️ ${d.danskNavn} leder efter mad — alleædere finder altid noget at spise`,
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
  // Vælg habitat: URL-param eller tilfældigt
  const urlHabitat = new URLSearchParams(window.location.search).get('habitat');
  const habitater = ['skov', 'arktis', 'oerken'];

  if (urlHabitat && HABITAT_DATA[urlHabitat]) {
    vaelgHabitat(urlHabitat);
  } else {
    vaelgHabitat(habitater[Math.floor(Math.random() * habitater.length)]);
  }

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
