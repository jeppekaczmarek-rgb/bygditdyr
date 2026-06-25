// ============================================================
// station.js — Byggeflow, energimåler, navigation
// 5 sekventielle trin: stofskifte → kropsform → hudtype → foedevalg → forsvar
// Trin 2 og 3 er betingede (afhænger af stofskiftevalg).
// ============================================================

// --- Kropsformer: afhænger af stofskifte ---
const KROPSFORM_VARM = [
  { vaerdi: 'lille_slank',   navn: 'Lille og slank',       beskrivelse: 'Hermelin eller væsel — hurtigt og smidig jæger i skovbunden' },
  { vaerdi: 'stor_slank',    navn: 'Stor og slank',        beskrivelse: 'Ulv eller los — skabt til at jage i åbne skovninger' },
  { vaerdi: 'lille_kraftig', navn: 'Lille og kraftig',     beskrivelse: 'Grævling eller pindsvin — lav, robust og sej' },
  { vaerdi: 'stor_kraftig',  navn: 'Stor og kraftig',      beskrivelse: 'Bjørn eller urhund — imponerende og stærk allround-dyr' },
  { vaerdi: 'mega_kraftig',  navn: 'Kæmpestor og kraftig', beskrivelse: 'Mammut eller uldhåret næsehorn — istidskolosser fra forhistorien' }
];

const KROPSFORM_KOLD = [
  { vaerdi: 'kold_lille',      navn: 'Lille og kompakt',  beskrivelse: 'Firben eller salamander — lav profil på skovbunden' },
  { vaerdi: 'kold_langstrakt', navn: 'Lang og smidig',    beskrivelse: 'Snog eller hugorm — glider lydløst gennem skovbunden' }
];

// --- Hudtyper: afhænger af stofskifte ---
const HUDTYPE_VARM = [
  { vaerdi: 'pels', navn: 'Pels',  beskrivelse: 'Naturens bedste isolering — ulvens vinterfrakke mod skovens kolde nætter' },
  { vaerdi: 'fjer', navn: 'Fjer',  beskrivelse: 'Let og isolerende — giver mobilitet i skovens lag fra jord til krone' }
];

const HUDTYPE_KOLD = [
  { vaerdi: 'skael', navn: 'Skæl', beskrivelse: 'Tæt og vandtæt — krybdyrenes rustning mod skovbundens fugt og sten' }
];

// --- Statiske trin ---
const BYGGETRIN = [
  {
    kategori: 'stofskifte',
    titel: 'Stofskifte',
    fagord: 'Stofskiftet er kroppens motor. Varmblodige dyr (pattedyr, fugle) producerer selv varme — dyrt i energi, men uafhængigt af vejret. Koldblodige dyr (krybdyr, firben) låner solens varme — gratis, men hjælpeløse i kulde.',
    spoergsmaal: 'Laver din krop selv varme — eller låner du solens?',
    valg: [
      { vaerdi: 'varm', emoji: '🔥', navn: 'Varmblodet', beskrivelse: 'Holder selv varmen — som en ulv. Energikrævende, men aktiv selv i frost.' },
      { vaerdi: 'kold', emoji: '🧊', navn: 'Koldblodet', beskrivelse: 'Bruger solens varme gratis — som et firben. Billigt, men sårbart over for kulde.' }
    ]
  },
  {
    kategori: 'kropsform',
    titel: 'Kropsform',
    fagord: 'Kropsformen bestemmer hvem du kan jage, hvem der kan jage dig, og hvad du er i stand til. Dine kroppe er formet af millioner af generationer i istidernes nordiske landskaber.',
    spoergsmaal: 'Hvilken krop passer til din strategi i skoven?',
    valgFn: (state) => state.stofskifte === 'kold' ? KROPSFORM_KOLD : KROPSFORM_VARM
  },
  {
    kategori: 'hudtype',
    titel: 'Hudtype',
    fagord: 'Det ydre lag der dækker kroppen. Pels, fjer og skæl er alle evolutionære løsninger på samme problem: beskyt kroppen mod vejr, tørke og fjender.',
    spoergsmaal: 'Hvad dækker din krop? Det første lag mod skovens vejr og rovdyr.',
    valgFn: (state) => state.stofskifte === 'kold' ? HUDTYPE_KOLD : HUDTYPE_VARM,
    autoVaelgEen: true  // koldblodige har kun skæl — springes over automatisk
  },
  {
    kategori: 'foedevalg',
    titel: 'Føde',
    fagord: 'Hvad et dyr spiser bestemmer dets plads i fødekæden. Planteædere er grundlaget — uden dem kollapser alt ovenover. Kødædere regulerer planteædernes bestand. Altædere fylder de pladser andre efterlader.',
    spoergsmaal: 'Hvad spiser du? Det bestemmer hvem du konkurrerer med — og hvem der jager dig.',
    valg: [
      { vaerdi: 'planteaeder', emoji: '🌿', navn: 'Planteæder', beskrivelse: 'Skoven bugner af planter — men næringsfattige. Som en rentyr: lang tid på at samle nok.' },
      { vaerdi: 'koedaeder',   emoji: '🥩', navn: 'Kødæder',   beskrivelse: 'Kød giver masser af energi på én gang. Som en los — men hver jagt kan slå fejl.' },
      { vaerdi: 'altaeder',    emoji: '🍽️', navn: 'Altæder',   beskrivelse: 'Fleksibel som en grævling. Ikke specialiseret — men aldrig helt uden mad.' }
    ]
  },
  {
    kategori: 'forsvar',
    titel: 'Forsvar',
    fagord: 'Alle dyr møder rovdyr — spørgsmålet er hvad der sker derefter. Gift, pigge, mimicry, camouflage og fart er fem vidt forskellige biologiske strategier.',
    spoergsmaal: 'Hvad sker der, når et rovdyr finder dig?',
    valg: [
      { vaerdi: 'camouflage', emoji: '🌿', navn: 'Camouflage',  beskrivelse: 'Farver der smelter ind i skoven — du er næsten usynlig for fjender.' },
      { vaerdi: 'hastighed',  emoji: '🏃', navn: 'Hastighed',   beskrivelse: 'Fart er dit eneste forsvar. Som en hare — hurtig, men altid på flugt.' },
      { vaerdi: 'pigge',      emoji: '🦔', navn: 'Pigge',       beskrivelse: 'Solid fysisk beskyttelse. Som et pindsvin — de fleste rovdyr tænker sig om to gange.' },
      { vaerdi: 'mimicry',    emoji: '⚠️', navn: 'Mimicry',     beskrivelse: 'Advarselsfarver der ligner giftigt dyr — narrer mange, men ikke alle rovdyr.' },
      { vaerdi: 'gift',       emoji: '☠️', navn: 'Gift',        beskrivelse: 'Rovdyr lærer hurtigt at holde sig væk. Men gift er biologisk dyrt at producere.' }
    ]
  }
];

// Pæne navne til bekræftelsesskærmen
const KATEGORI_NAVNE = {
  stofskifte: 'Stofskifte',
  kropsform:  'Kropsform',
  hudtype:    'Hudtype',
  foedevalg:  'Fødevalg',
  forsvar:    'Forsvar'
};

const VAERDI_NAVNE = {
  // Stofskifte
  varm: 'Varmblodet', kold: 'Koldblodet',
  // Kropsform
  lille_slank: 'Lille og slank', stor_slank: 'Stor og slank',
  lille_kraftig: 'Lille og kraftig', stor_kraftig: 'Stor og kraftig',
  mega_kraftig: 'Kæmpestor og kraftig',
  kold_lille: 'Lille og kompakt', kold_langstrakt: 'Lang og smidig',
  // Hudtype
  pels: 'Pels', fjer: 'Fjer', skael: 'Skæl',
  // Foedevalg
  planteaeder: 'Planteæder', koedaeder: 'Kødæder', altaeder: 'Altæder',
  // Forsvar
  camouflage: 'Camouflage', hastighed: 'Hastighed',
  pigge: 'Pigge', mimicry: 'Mimicry', gift: 'Gift'
};

// --- Tilstand ---
let aktivtTrin = 0;
let valg = {};                // { stofskifte: 'varm', kropsform: 'stor_slank', ... }
const AKTIVT_HABITAT = 'skov'; // enkelt habitat: lysåben dansk skov
let sidsteSendtId = null;

// --- DOM-referencer ---
const skaerme = {
  velkomst:    document.getElementById('velkomst'),
  byggeflow:   document.getElementById('byggeflow'),
  bekraeftelse: document.getElementById('bekraeftelse'),
  afsendt:     document.getElementById('afsendt')
};

const dom = {
  trinLabel:       document.getElementById('trin-label'),
  fremgangFyld:    document.getElementById('fremgang-fyld'),
  energiFyld:      document.getElementById('energi-fyld'),
  energiTal:       document.getElementById('energi-tal'),
  trinContainer:   document.getElementById('trin-container'),
  spritePreview:   document.getElementById('sprite-preview'),
  btnStart:        document.getElementById('btn-start'),
  btnTilbage:      document.getElementById('btn-tilbage'),
  btnNaeste:       document.getElementById('btn-naeste'),
  btnSend:         document.getElementById('btn-send'),
  btnTilbageByg:   document.getElementById('btn-tilbage-byg'),
  btnNytDyr:       document.getElementById('btn-nyt-dyr'),
  artsnavnDisplay: document.getElementById('artsnavn-display'),
  valgOversigt:    document.getElementById('valg-oversigt'),
  energiBrugt:     document.getElementById('energi-brugt-display'),
  afsendtArtsnavn: document.getElementById('afsendt-artsnavn'),
  liveStatus:      document.getElementById('live-status'),
  liveStatusTekst: document.getElementById('live-status-tekst'),
  eventFeed:       document.getElementById('event-feed'),
  miniScoreboard:  document.getElementById('mini-scoreboard'),
  matchSektion:    document.getElementById('match-sektion'),
  matchFyld:       document.getElementById('match-fyld'),
  matchOrd:        document.getElementById('match-ord')
};

// --- Live-feedback tilstand ---
let minArtsnavn = null;
let minDanskNavn = null;
let artUddoed = false;
let sidstePopAntal = null;
const MAX_EVENTS = 6;

// --- Hjælpefunktioner ---

// Returnér aktuelle valgmuligheder for et trin (håndterer betingede trin)
function hentAktuelleValg(trin) {
  if (trin.valgFn) return trin.valgFn(valg);
  return trin.valg || [];
}

// Returnér antal synlige trin (eksklusive auto-valgte trin)
function synligeTrinAntal() {
  return BYGGETRIN.filter(trin => {
    if (!trin.autoVaelgEen) return true;
    return hentAktuelleValg(trin).length > 1;
  }).length;
}

// --- Skærmskift ---
function visSkaerm(navn) {
  Object.values(skaerme).forEach(s => s.classList.remove('aktiv'));
  skaerme[navn].classList.add('aktiv');
}

// --- Trin-rendering ---
function opretTrin() {
  dom.trinContainer.innerHTML = '';
  BYGGETRIN.forEach((trin, i) => {
    const div = document.createElement('div');
    div.className = 'trin' + (i === 0 ? ' aktiv' : '');
    div.dataset.index = i;
    div.innerHTML = renderTrinIndhold(trin);
    dom.trinContainer.appendChild(div);
  });
  dom.trinContainer.addEventListener('click', haandterValgKlik);
}

// Generer HTML for ét trins kortgrid (gendannes ved navigation til betingede trin)
function renderTrinIndhold(trin) {
  const valgListe = hentAktuelleValg(trin);
  return `
    <h2 class="trin-titel">${trin.titel}</h2>
    ${trin.fagord ? `<details class="fagord-detaljer"><summary>Hvad er ${trin.titel.toLowerCase()}?</summary><p>${trin.fagord}</p></details>` : ''}
    ${trin.spoergsmaal ? `<p class="trin-spoergsmaal">${trin.spoergsmaal}</p>` : ''}
    <div class="kort-grid">
      ${valgListe.map(v => `
        <div class="valgkort" data-kategori="${trin.kategori}" data-vaerdi="${v.vaerdi}">
          ${v.emoji ? `<span class="kort-emoji">${v.emoji}</span>` : ''}
          <span class="kort-navn">${v.navn}</span>
          <span class="kort-beskrivelse">${v.beskrivelse}</span>
          <span class="kort-energi">⚡ ${Survival.ENERGI_OMKOSTNING[trin.kategori]?.[v.vaerdi] ?? 0}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// --- Valgkort klik ---
function haandterValgKlik(e) {
  const kort = e.target.closest('.valgkort');
  if (!kort || kort.classList.contains('for-dyrt')) return;

  const kategori = kort.dataset.kategori;
  const vaerdi = kort.dataset.vaerdi;

  // Fjern valgt-klasse fra søskende
  kort.parentElement.querySelectorAll('.valgkort').forEach(k => k.classList.remove('valgt'));
  kort.classList.add('valgt');

  // Gem valget
  valg[kategori] = vaerdi;

  // Stofskiftevalg ændrer hvad der er tilgængeligt i trin 2+3 → nulstil dem
  if (kategori === 'stofskifte') {
    delete valg.kropsform;
    delete valg.hudtype;
  }

  opdaterEnergi();
  opdaterNavigation();
  opdaterDyrPreview();
}

// --- Energimåler ---
function beregnBrugtEnergi() {
  let brugt = 0;
  for (const [kat, vaerdi] of Object.entries(valg)) {
    brugt += Survival.ENERGI_OMKOSTNING[kat]?.[vaerdi] ?? 0;
  }
  return brugt;
}

function opdaterEnergi() {
  const brugt = beregnBrugtEnergi();
  const rest = Survival.MAX_ENERGI - brugt;
  const procent = Math.max(0, (rest / Survival.MAX_ENERGI) * 100);

  dom.energiFyld.style.width = procent + '%';
  dom.energiTal.textContent = `${rest} / ${Survival.MAX_ENERGI}`;

  dom.energiFyld.classList.remove('lav', 'kritisk');
  if (rest <= 2) dom.energiFyld.classList.add('kritisk');
  else if (rest <= 4) dom.energiFyld.classList.add('lav');

  opdaterForDyreKort(rest);
  opdaterMatchMaaler();
}

// Habitat-match: kvalitativ indikator (ikke råt tal eleven kan min-maxe)
function opdaterMatchMaaler() {
  if (!dom.matchSektion) return;
  if (Object.keys(valg).length === 0) { dom.matchSektion.style.display = 'none'; return; }
  dom.matchSektion.style.display = '';

  const score = Survival.beregnHabitatScore({ egenskaber: valg }, AKTIVT_HABITAT);
  const MIN_SCORE = -4, MAX_SCORE = 8;
  const pct = Math.round(Math.max(0, Math.min(100,
    (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE) * 100)));

  dom.matchFyld.style.width = pct + '%';
  dom.matchFyld.className = 'match-fyld ' + (
    pct < 35 ? 'match-svag' : pct < 55 ? 'match-middel' : pct < 75 ? 'match-god' : 'match-super'
  );
  dom.matchOrd.textContent = pct < 35 ? 'Svag' : pct < 55 ? 'Middel' : pct < 75 ? 'God' : 'Rigtig god';
}

function opdaterForDyreKort(restEnergi) {
  BYGGETRIN.forEach((trin, trinIndex) => {
    if (trinIndex < aktivtTrin) return;
    const trinDiv = dom.trinContainer.children[trinIndex];
    if (!trinDiv) return;

    trinDiv.querySelectorAll('.valgkort').forEach(kort => {
      const kat = kort.dataset.kategori;
      const vaerdi = kort.dataset.vaerdi;
      const pris = Survival.ENERGI_OMKOSTNING[kat]?.[vaerdi] ?? 0;

      let tilgaengelig = restEnergi;
      if (valg[kat]) tilgaengelig += Survival.ENERGI_OMKOSTNING[kat]?.[valg[kat]] ?? 0;

      kort.classList.toggle('for-dyrt', pris > tilgaengelig);
    });
  });
}

// --- Navigation ---
function opdaterNavigation() {
  const harValg = valg[BYGGETRIN[aktivtTrin].kategori] !== undefined;
  const synligeTrin = synligeTrinAntal();
  // Synligt trin-nummer: spring auto-valgte trin over
  let synligtNr = 0;
  for (let i = 0; i <= aktivtTrin; i++) {
    const t = BYGGETRIN[i];
    if (!(t.autoVaelgEen && hentAktuelleValg(t).length === 1)) synligtNr++;
  }

  dom.btnTilbage.disabled = aktivtTrin === 0;
  dom.btnNaeste.disabled = !harValg;
  dom.trinLabel.textContent = `Trin ${synligtNr} af ${synligeTrin}`;
  dom.fremgangFyld.style.width = (synligtNr / synligeTrin * 100) + '%';
  dom.btnNaeste.textContent = aktivtTrin === BYGGETRIN.length - 1 ? 'Se dit dyr →' : 'Næste →';
}

// Vis et specifikt trin (re-render kortgrid for betingede trin)
function visTrin(index) {
  aktivtTrin = index;
  const trin = BYGGETRIN[index];

  // Re-render trin-indholdet (nødvendigt for betingede trin 2+3)
  const trinDiv = dom.trinContainer.children[index];
  if (trinDiv) {
    trinDiv.innerHTML = renderTrinIndhold(trin);
  }

  dom.trinContainer.querySelectorAll('.trin').forEach((t, i) => {
    t.classList.toggle('aktiv', i === index);
  });

  // Gendan evt. tidligere valg visuelt
  if (valg[trin.kategori]) {
    const div = dom.trinContainer.children[index];
    const kort = div?.querySelector(`[data-vaerdi="${valg[trin.kategori]}"]`);
    if (kort) kort.classList.add('valgt');
  }

  opdaterNavigation();
  opdaterEnergi();
}

function gaaNaeste() {
  if (aktivtTrin < BYGGETRIN.length - 1) {
    let naeste = aktivtTrin + 1;

    // Tjek om næste trin skal auto-springes (kun ét valg)
    const naesteTrin = BYGGETRIN[naeste];
    const valgListe = hentAktuelleValg(naesteTrin);
    if (naesteTrin.autoVaelgEen && valgListe.length === 1) {
      // Auto-vælg og vis kort autovelg-besked
      valg[naesteTrin.kategori] = valgListe[0].vaerdi;
      visAutoVaelgBesked(naesteTrin.titel, valgListe[0].navn);
      naeste++;
    }

    if (naeste < BYGGETRIN.length) {
      visTrin(naeste);
    } else {
      visBekraeftelse();
    }
  } else {
    visBekraeftelse();
  }
}

function gaaTilbage() {
  if (aktivtTrin > 0) {
    let forrige = aktivtTrin - 1;
    // Spring over auto-valgte trin ved tilbagenavigation
    const forrigeTrin = BYGGETRIN[forrige];
    const valgListe = hentAktuelleValg(forrigeTrin);
    if (forrigeTrin.autoVaelgEen && valgListe.length === 1) forrige--;
    if (forrige >= 0) visTrin(forrige);
  }
}

// Kort flash-besked når hudtype auto-vælges
function visAutoVaelgBesked(trinNavn, vaelgNavn) {
  const besked = document.createElement('div');
  besked.className = 'auto-vaelg-besked';
  besked.textContent = `${trinNavn}: ${vaelgNavn} (automatisk valgt)`;
  dom.trinContainer.appendChild(besked);
  setTimeout(() => besked.remove(), 1800);
}

// --- Dyr-preview (vises under byggeflowet) ---
function opdaterDyrPreview() {
  // Preview vises kun når mindst kropsform er valgt
  if (!valg.kropsform) {
    dom.spritePreview.innerHTML = '';
    dom.spritePreview.classList.remove('har-valg');
    return;
  }
  dom.spritePreview.classList.add('har-valg');

  // Forsøg at vise et forhåndsgenereret billede; fald tilbage til tekst-placeholder
  const noegle = [valg.stofskifte, valg.kropsform, valg.hudtype, valg.foedevalg, valg.forsvar]
    .filter(Boolean).join('_');
  const billedSti = `assets/dyrbygger/${noegle}.webp`;

  dom.spritePreview.innerHTML = `
    <img src="${billedSti}"
         alt="Dit dyr"
         class="dyr-byggerbillede"
         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
    />
    <div class="dyr-placeholder" style="display:none">
      <span class="placeholder-form">${valg.kropsform?.replace(/_/g, ' ')}</span>
      ${valg.hudtype ? `<span class="placeholder-hud">${VAERDI_NAVNE[valg.hudtype] || valg.hudtype}</span>` : ''}
    </div>
  `;
}

// Tegn-ikon og CSS-klasse for et checklistepunkt
function checklisteTegn(tegn) {
  if (tegn === 'god')     return { ikon: '✅', klasse: 'check-god' };
  if (tegn === 'daarlig') return { ikon: '❌', klasse: 'check-daarlig' };
  return                         { ikon: '➖', klasse: 'check-neutral' };
}

function genererChecklisteHTML(egenskaber, habitat) {
  const forklaringer = Survival.forklarEgenskaber({ egenskaber }, habitat);
  return forklaringer.map(f => {
    const { ikon, klasse } = checklisteTegn(f.tegn);
    const kategoriNavn = KATEGORI_NAVNE[f.kategori] || f.kategori;
    const vaerdiNavn   = VAERDI_NAVNE[f.vaerdi]     || f.vaerdi;
    const scoreLabel   = f.score !== 0 ? ` (${f.score > 0 ? '+' : ''}${f.score})` : '';
    return `
      <div class="check-linje ${klasse}">
        <span class="check-ikon">${ikon}</span>
        <span class="check-tekst">
          <strong>${kategoriNavn}: ${vaerdiNavn}</strong>${scoreLabel}
          ${f.forklaring ? `<br><span class="check-forklaring">${f.forklaring}</span>` : ''}
        </span>
      </div>
    `;
  }).join('');
}

// --- Bekræftelsesskærm ---
function visBekraeftelse() {
  const artsnavn = Names.genererArtsnavn(valg);
  const danskNavn = Names.genererDanskNavn(valg);

  const navneLed = Names.forklarArtsnavn(artsnavn);
  const navneForklaring = navneLed.map(l =>
    `<span class="linne-led"><em>${l.led}</em> = <span class="linne-bety">${l.betydning}</span></span>`
  ).join(' &nbsp;·&nbsp; ');

  dom.artsnavnDisplay.innerHTML = `
    <span class="artsnavn-latin">${artsnavn}</span>
    <span class="dansk-navn">${danskNavn}</span>
    <span class="linne-forklaring">${navneForklaring}</span>
  `;

  const score = Survival.beregnHabitatScore({ egenskaber: valg }, AKTIVT_HABITAT);
  const levetidSek = Survival.beregnOverlevelsestid(score);
  dom.valgOversigt.innerHTML = `
    <p class="check-overskrift">DIT DYR I LYSÅBEN SKOV</p>
    ${genererChecklisteHTML(valg, AKTIVT_HABITAT)}
    <p class="check-bundlinje">Din art starter på <strong>${levetidSek} sekunder</strong></p>
  `;

  dom.energiBrugt.textContent = beregnBrugtEnergi();
  visSkaerm('bekraeftelse');
}

// --- Afsendelse ---
function sendDyr() {
  const energiBrugt = beregnBrugtEnergi();
  const score = Survival.beregnHabitatScore({ egenskaber: valg }, AKTIVT_HABITAT);
  const levetid = Survival.beregnOverlevelsestid(score);

  const stationId = new URLSearchParams(window.location.search).get('station')
    || (sessionStorage.stationId ||= `S${Math.floor(Math.random() * 99) + 1}`);

  const dyr = {
    id: crypto.randomUUID(),
    artsnavn: Names.genererArtsnavn(valg),
    danskNavn: Names.genererDanskNavn(valg),
    egenskaber: { ...valg },
    energiBrugt: energiBrugt,
    overlevelsesScore: score,
    position: { x: Math.random() * 80 + 10, y: Math.random() * 60 + 20 },
    levetid: levetid,
    levende: true,
    stationId: stationId
  };

  sidsteSendtId = dyr.id;
  minArtsnavn = dyr.artsnavn;
  minDanskNavn = dyr.danskNavn;
  artUddoed = false;
  sidstePopAntal = null;
  nulstilDashboard();

  if (window.Audio) Audio.sendDyr();

  if (window.Broadcast && window.Broadcast.send) {
    window.Broadcast.send({ type: 'NYT_DYR', dyr: dyr });
  }

  dom.afsendtArtsnavn.innerHTML = `${dyr.artsnavn}<br><span class="dansk-navn">${dyr.danskNavn}</span>`;
  visSkaerm('afsendt');
}

// --- Reset til nyt dyr ---
function nulstil() {
  valg = {};
  aktivtTrin = 0;
  minArtsnavn = null;
  minDanskNavn = null;
  artUddoed = false;
  opretTrin();
  visTrin(0);
  opdaterDyrPreview();
  visSkaerm('byggeflow');
}

// --- Event listeners ---
dom.btnStart.addEventListener('click', () => {
  opretTrin();
  visTrin(0);
  visSkaerm('byggeflow');
});

dom.btnNaeste.addEventListener('click', gaaNaeste);
dom.btnTilbage.addEventListener('click', gaaTilbage);
dom.btnSend.addEventListener('click', sendDyr);
dom.btnTilbageByg.addEventListener('click', () => {
  visSkaerm('byggeflow');
  visTrin(BYGGETRIN.length - 1);
});
dom.btnNytDyr.addEventListener('click', nulstil);

// Tastatur-navigation
document.addEventListener('keydown', (e) => {
  if ((e.key === 'ArrowRight' || e.key === 'Enter') &&
      !dom.btnNaeste.disabled && skaerme.byggeflow.classList.contains('aktiv')) {
    gaaNaeste();
  }
  if (e.key === 'ArrowLeft' &&
      !dom.btnTilbage.disabled && skaerme.byggeflow.classList.contains('aktiv')) {
    gaaTilbage();
  }
});

// --- BroadcastChannel-integration ---
if (window.Broadcast && window.Broadcast.lyt) {
  Broadcast.lyt((besked) => {
    switch (besked.type) {
      case 'DYR_DOEDE':
        if (besked.artsnavn === minArtsnavn) visDyrDoede(besked);
        break;
      case 'DYR_DOEDE_INDIVID':
        if (besked.artsnavn === minArtsnavn) visIndividDoed(besked);
        break;
      case 'DYR_JAGES':
        if (besked.bytte_artsnavn === minArtsnavn) {
          const jagerFra = besked.jaeger_stationId ? ` (station ${besked.jaeger_stationId})` : '';
          tilfoejEvent(`🎯 Din ${besked.bytte_danskNavn} jages af ${besked.jaeger_danskNavn}${jagerFra}!`);
        } else if (besked.jaeger_artsnavn === minArtsnavn) {
          const bytteStation = besked.bytte_stationId ? ` (station ${besked.bytte_stationId})` : '';
          tilfoejEvent(`🥩 Din ${besked.jaeger_danskNavn} jagter ${besked.bytte_danskNavn}${bytteStation}.`);
        }
        break;
      case 'DYR_EVENT':
        if (besked.artsnavn === minArtsnavn) tilfoejEvent(besked.tekst);
        break;
      case 'ARTER_STATUS':
        opdaterLiveStatus(besked.arter);
        break;
      case 'SCOREBOARD':
        renderMiniScoreboard(besked.livstid);
        break;
    }
  });

  Broadcast.send({ type: 'HABITAT_REQUEST' });
}

// --- Live-feedback rendering ---

function nulstilDashboard() {
  dom.liveStatus.classList.remove('doed');
  dom.liveStatus.innerHTML = `
    <h3>Din art lige nu</h3>
    <p id="live-status-tekst">Venter på data fra habitatet...</p>
  `;
  dom.eventFeed.innerHTML = '<li class="event-tom">Venter på begivenheder...</li>';
}

function tilfoejEvent(tekst) {
  if (!tekst) return;
  const tom = dom.eventFeed.querySelector('.event-tom');
  if (tom) tom.remove();

  const li = document.createElement('li');
  li.className = 'event-linje';
  li.textContent = tekst;
  dom.eventFeed.prepend(li);

  while (dom.eventFeed.children.length > MAX_EVENTS) {
    dom.eventFeed.lastElementChild.remove();
  }
}

function opdaterLiveStatus(arter) {
  if (!minArtsnavn || artUddoed) return;
  const status = arter && arter[minArtsnavn];

  if (status && status.antal > 0) {
    const trend = sidstePopAntal === null ? '→'
                : status.antal > sidstePopAntal ? '↑'
                : status.antal < sidstePopAntal ? '↓' : '→';
    const trendKlasse = trend === '↑' ? 'trend-op' : trend === '↓' ? 'trend-ned' : 'trend-stabil';
    sidstePopAntal = status.antal;

    const r = status.res || Oekonomi.nytRegnskab();
    const netto = Oekonomi.beregnNetto(r);
    const I = Oekonomi.RESSOURCE_IKON;
    const nettoKlasse = netto > 0 ? 'positiv' : netto < 0 ? 'negativ' : '';
    const checkHTML = status.egenskaber
      ? genererChecklisteHTML(status.egenskaber, AKTIVT_HABITAT)
      : '';
    dom.liveStatus.classList.remove('doed');
    dom.liveStatus.innerHTML = `
      <h3>Din population</h3>
      <div class="pop-tael">
        <span class="pop-stor-tal">${status.antal}</span>
        <span class="pop-trend ${trendKlasse}">${trend}</span>
      </div>
      <p class="live-navn">${minDanskNavn}</p>
      <p class="live-detalje">Ældste: ${status.aeldsteSek} sek · Afkom: ${status.afkom}</p>
      <div class="live-res">
        <span class="live-res-stats">${I.planter} ${r.planter} &nbsp; ${I.bytte} ${r.bytte} &nbsp; ${I.flugt} ${r.flugt} &nbsp; ${I.angreb} ${r.angreb}</span>
        <span class="live-res-netto ${nettoKlasse}">Netto ${netto > 0 ? '+' : ''}${netto}</span>
      </div>
      ${checkHTML ? `<details class="live-checklist"><summary>Egenskaber i dette habitat</summary>${checkHTML}</details>` : ''}
    `;
  } else {
    dom.liveStatus.innerHTML = `
      <h3>Din population</h3>
      <p id="live-status-tekst">${minDanskNavn} er på vej ud i habitatet...</p>
    `;
  }
}

function renderMiniScoreboard(livstid) {
  if (!livstid || livstid.length === 0) {
    dom.miniScoreboard.innerHTML = '<li class="sb-tom">Ingen dyr endnu</li>';
    return;
  }
  dom.miniScoreboard.innerHTML = livstid.map(e => {
    const mig = e.artsnavn === minArtsnavn ? ' mig' : '';
    return `
      <li class="mini-sb-raekke${mig}">
        <span class="mini-sb-navn">${e.danskNavn}
          <span class="mini-sb-latin">(${e.artsnavn})</span>
        </span>
        <span class="mini-sb-tid">${formatTid(e.levetid)} 🌲</span>
      </li>
    `;
  }).join('');
}

function formatTid(sek) {
  const min = Math.floor(sek / 60);
  const rest = sek % 60;
  return min === 0 ? `${rest} sek` : `${min} min ${rest} sek`;
}

function visIndividDoed(besked) {
  if (artUddoed) return;
  const ikon = besked.erStamdyr ? '💀' : '⚠️';
  const hvem = besked.erStamdyr ? 'Dit første dyr' : `Et individ af ${besked.danskNavn}`;
  tilfoejEvent(`${ikon} ${hvem} døde efter ${besked.levetid} sek — ${besked.kortTekst}`);
}

function visDyrDoede(besked) {
  if (window.Audio) Audio.dyrDoer();
  artUddoed = true;
  dom.liveStatus.classList.add('doed');
  const navn = besked.danskNavn || besked.artsnavn || 'Ukendt';
  dom.liveStatus.innerHTML = `
    <h3>Din art er uddød</h3>
    <p class="doed-artsnavn">${navn}</p>
    <p class="doed-latin">${besked.artsnavn || ''}</p>
    <p class="doed-tekst">${besked.doedsTekst || ''}</p>
    <p class="doed-tid">Arten overlevede i ${besked.levetid} sekunder</p>
  `;
}

console.log('Station klar. Habitat: Lysåben skov (enkelt)');
