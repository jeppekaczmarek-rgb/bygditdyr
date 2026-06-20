// ============================================================
// station.js — Byggeflow, energimåler, navigation
// Styrer hele byggestationens UI og sender dyr via BroadcastChannel.
// ============================================================

// --- Byggetrin-data ---
// Hvert trin: kategori-nøgle, visningstitel, og mulige valg
const BYGGETRIN = [
  {
    kategori: 'stofskifte',
    titel: 'Stofskifte',
    valg: [
      { vaerdi: 'hojt', emoji: '🔥', navn: 'Højt stofskifte', beskrivelse: 'Holder selv varmen — som en ulv. Energikrævende, men aktiv i frost.' },
      { vaerdi: 'lavt', emoji: '🧊', navn: 'Lavt stofskifte', beskrivelse: 'Bruger solens varme gratis — som en firben. Hjælpeløs i kulde.' }
    ]
  },
  {
    kategori: 'hudtype',
    titel: 'Hudtype',
    valg: [
      { vaerdi: 'pels',  emoji: '🧥', navn: 'Pels',     beskrivelse: 'Holder på kropsvarmen. Perfekt i kulde — en katastrofe i ørken.' },
      { vaerdi: 'skael', emoji: '🐟', navn: 'Skæl',     beskrivelse: 'Låser fugten inde og tåler stegende sol. Krybdyrenes ørken-trick.' },
      { vaerdi: 'fjer',  emoji: '🪶', navn: 'Fjer',     beskrivelse: 'Isolerer og vejer næsten ingenting. God i mange habitater.' },
      { vaerdi: 'glat',  emoji: '🦎', navn: 'Glat hud', beskrivelse: 'Smidig og hurtig. Klarer sig i fugtige miljøer — kæmper i ekstremerne.' }
    ]
  },
  {
    kategori: 'kost',
    titel: 'Kost',
    valg: [
      { vaerdi: 'planteaeder', emoji: '🌿', navn: 'Planteæder', beskrivelse: 'Planter er let tilgængelige — men næringsfattige. Du bruger meget tid på at spise.' },
      { vaerdi: 'koedaeder',   emoji: '🥩', navn: 'Kødæder',   beskrivelse: 'Kød giver masser af energi — men hver jagt kan slå fejl.' },
      { vaerdi: 'alleaeder',   emoji: '🍽️', navn: 'Alleæder',   beskrivelse: 'Fleksibel som en krage. Ikke specialiseret — men aldrig uden mad.' }
    ]
  },
  {
    kategori: 'storrelse',
    titel: 'Størrelse',
    valg: [
      { vaerdi: 'lille',  emoji: '🐭', navn: 'Lille',  beskrivelse: 'Let at gemme sig. Taber varme hurtigt — men hurtig og sparsommelig.' },
      { vaerdi: 'mellem', emoji: '🐺', navn: 'Mellem', beskrivelse: 'God balance mellem varme, fart og fødebehov.' },
      { vaerdi: 'stor',   emoji: '🦣', navn: 'Stor',   beskrivelse: 'Bevarer varmen bedst. Men kræver enorm mængde mad — svær at skjule.' }
    ]
  },
  {
    kategori: 'aktivitet',
    titel: 'Aktivitetstid',
    valg: [
      { vaerdi: 'dagaktiv', emoji: '☀️', navn: 'Dagaktiv', beskrivelse: 'Udnytter lyset og varmen. Synlig for rovdyr — men produktiv.' },
      { vaerdi: 'nataktiv', emoji: '🌙', navn: 'Nataktiv', beskrivelse: 'Undgår varme og mange rovdyr. Svagt i arktis mørketid.' }
    ]
  },
  {
    kategori: 'forsvar',
    titel: 'Forsvar',
    valg: [
      { vaerdi: 'giftig', emoji: '☠️',  navn: 'Giftig',       beskrivelse: 'Rovdyr lærer at holde sig væk. Men gift er biologisk dyrt at producere.' },
      { vaerdi: 'pigge',  emoji: '🦔', navn: 'Pigge',        beskrivelse: 'Solid fysisk beskyttelse. Som en pindsvin — virker i næsten alle habitater.' },
      { vaerdi: 'flugt',  emoji: '🏃', navn: 'Hurtig flugt', beskrivelse: 'Undviger angreb med fart. Kræver energi — og et sted at løbe hen.' },
      { vaerdi: 'ingen',  emoji: '🚫', navn: 'Intet forsvar', beskrivelse: 'Sparer energi — men ethvert rovdyr er en dødelig trussel.' }
    ]
  }
];

// Pæne navne til bekræftelsesskærmen
const KATEGORI_NAVNE = {
  stofskifte: 'Stofskifte',
  hudtype: 'Hudtype',
  kost: 'Kost',
  storrelse: 'Størrelse',
  aktivitet: 'Aktivitetstid',
  forsvar: 'Forsvar'
};

const VAERDI_NAVNE = {
  hojt: 'Højt (varmblodigt)', lavt: 'Lavt (koldblodigt)',
  pels: 'Pels', skael: 'Skæl', fjer: 'Fjer', glat: 'Glat hud',
  planteaeder: 'Planteæder', koedaeder: 'Kødæder', alleaeder: 'Alleæder',
  lille: 'Lille', mellem: 'Mellem', stor: 'Stor',
  dagaktiv: 'Dagaktiv', nataktiv: 'Nataktiv',
  giftig: 'Giftig', pigge: 'Pigge', flugt: 'Hurtig flugt', ingen: 'Ingen'
};

// Habitat-data (bruges til velkomstskærmen)
const HABITAT_DATA = {
  skov:   { navn: 'Tempereret Skov', ikon: '🌲' },
  arktis: { navn: 'Arktis / Tundra', ikon: '🏔️' },
  oerken: { navn: 'Ørken',           ikon: '🏜️' }
};

// --- Tilstand ---
let aktivtTrin = 0;
let valg = {};                // { stofskifte: 'hojt', hudtype: 'pels', ... }
let aktivtHabitat = 'skov';   // standard, kan opdateres via BroadcastChannel
let sidsteSendtId = null;     // ID på seneste afsendte dyr

// --- DOM-referencer ---
const skaerme = {
  velkomst:    document.getElementById('velkomst'),
  byggeflow:   document.getElementById('byggeflow'),
  bekraeftelse: document.getElementById('bekraeftelse'),
  afsendt:     document.getElementById('afsendt')
};

const dom = {
  habitatLabel:    document.getElementById('habitat-label'),
  habitatIkon:     document.querySelector('.habitat-ikon'),
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
let minArtsnavn = null;        // artsnavn på elevens seneste dyr
let minDanskNavn = null;       // dansk navn på samme
let artUddoed = false;         // sat når elevens art er uddød
const MAX_EVENTS = 6;          // antal events vist i feed
const SB_HABITAT_IKON = { skov: '🌲', arktis: '🏔️', oerken: '🏜️' };

// --- Skærmskift ---
function visSkaerm(navn) {
  Object.values(skaerme).forEach(s => s.classList.remove('aktiv'));
  skaerme[navn].classList.add('aktiv');
}

// --- Generer trin-HTML ---
function opretTrin() {
  dom.trinContainer.innerHTML = '';
  BYGGETRIN.forEach((trin, i) => {
    const div = document.createElement('div');
    div.className = 'trin' + (i === 0 ? ' aktiv' : '');
    div.dataset.index = i;

    div.innerHTML = `
      <h2 class="trin-titel">${trin.titel}</h2>
      <div class="kort-grid">
        ${trin.valg.map(v => `
          <div class="valgkort" data-kategori="${trin.kategori}" data-vaerdi="${v.vaerdi}">
            <span class="kort-emoji">${v.emoji}</span>
            <span class="kort-navn">${v.navn}</span>
            <span class="kort-beskrivelse">${v.beskrivelse}</span>
            <span class="kort-energi">⚡ ${Survival.ENERGI_OMKOSTNING[trin.kategori][v.vaerdi]}</span>
          </div>
        `).join('')}
      </div>
    `;

    dom.trinContainer.appendChild(div);
  });

  // Klik-handler på valgkort (delegation)
  dom.trinContainer.addEventListener('click', haandterValgKlik);
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

  // Opdater energi og UI
  opdaterEnergi();
  opdaterNavigation();
  opdaterSpritePreview();
}

// --- Energimåler ---
function beregnBrugtEnergi() {
  // Beregn energi fra alle hidtidige valg
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

  // Farveindikator
  dom.energiFyld.classList.remove('lav', 'kritisk');
  if (rest <= 2) dom.energiFyld.classList.add('kritisk');
  else if (rest <= 4) dom.energiFyld.classList.add('lav');

  // Marker kort der er for dyre på kommende trin
  opdaterForDyreKort(rest);

  // Opdater habitat-match-måler (kvalitativ — ikke et råt tal eleven kan min-maxe)
  opdaterMatchMaaler();
}

// Habitat-match: vis "svag/middel/god/rigtig god" afhængig af score
// Vises kun når mindst ét valg er truffet
function opdaterMatchMaaler() {
  const antalValg = Object.keys(valg).length;
  if (!dom.matchSektion) return;
  if (antalValg === 0) {
    dom.matchSektion.style.display = 'none';
    return;
  }
  dom.matchSektion.style.display = '';

  const score = Survival.beregnHabitatScore({ egenskaber: valg }, aktivtHabitat);
  // Score-spænd ca. -8 til +11; vi normaliserer til 0–100%
  const MIN_SCORE = -8, MAX_SCORE = 11;
  const pct = Math.round(Math.max(0, Math.min(100,
    (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE) * 100)));

  dom.matchFyld.style.width = pct + '%';
  dom.matchFyld.className = 'match-fyld ' + (
    pct < 35 ? 'match-svag' : pct < 55 ? 'match-middel' : pct < 75 ? 'match-god' : 'match-super'
  );
  dom.matchOrd.textContent = pct < 35 ? 'Svag' : pct < 55 ? 'Middel' : pct < 75 ? 'God' : 'Rigtig god';
}

function opdaterForDyreKort(restEnergi) {
  // Tjek hvert kort i fremtidige trin
  BYGGETRIN.forEach((trin, trinIndex) => {
    if (trinIndex < aktivtTrin) return; // Spring overstået trin over

    const trinDiv = dom.trinContainer.children[trinIndex];
    if (!trinDiv) return;

    trinDiv.querySelectorAll('.valgkort').forEach(kort => {
      const kat = kort.dataset.kategori;
      const vaerdi = kort.dataset.vaerdi;
      const pris = Survival.ENERGI_OMKOSTNING[kat][vaerdi];

      // Energi tilgængelig for dette kort = rest + evt. allerede valgt i denne kategori
      let tilgaengelig = restEnergi;
      if (valg[kat]) {
        tilgaengelig += Survival.ENERGI_OMKOSTNING[kat][valg[kat]];
      }

      if (pris > tilgaengelig) {
        kort.classList.add('for-dyrt');
      } else {
        kort.classList.remove('for-dyrt');
      }
    });
  });
}

// --- Navigation ---
function opdaterNavigation() {
  const harValg = valg[BYGGETRIN[aktivtTrin].kategori] !== undefined;

  dom.btnTilbage.disabled = aktivtTrin === 0;
  dom.btnNaeste.disabled = !harValg;

  dom.trinLabel.textContent = `Trin ${aktivtTrin + 1} af ${BYGGETRIN.length}`;
  dom.fremgangFyld.style.width = ((aktivtTrin + 1) / BYGGETRIN.length * 100) + '%';

  // Opdater knaptekst på sidste trin
  dom.btnNaeste.textContent = aktivtTrin === BYGGETRIN.length - 1 ? 'Se dit dyr →' : 'Næste →';
}

function visTrin(index) {
  aktivtTrin = index;
  dom.trinContainer.querySelectorAll('.trin').forEach((t, i) => {
    t.classList.toggle('aktiv', i === index);
  });

  // Gendan evt. tidligere valg visuelt
  const trin = BYGGETRIN[index];
  if (valg[trin.kategori]) {
    const trinDiv = dom.trinContainer.children[index];
    const kort = trinDiv.querySelector(`[data-vaerdi="${valg[trin.kategori]}"]`);
    if (kort) kort.classList.add('valgt');
  }

  opdaterNavigation();
  opdaterEnergi();
}

function gaaNaeste() {
  if (aktivtTrin < BYGGETRIN.length - 1) {
    visTrin(aktivtTrin + 1);
  } else {
    // Alle trin gennemført — vis bekræftelse
    visBekraeftelse();
  }
}

function gaaTilbage() {
  if (aktivtTrin > 0) {
    visTrin(aktivtTrin - 1);
  }
}

// --- Sprite-preview ---
function opdaterSpritePreview() {
  const antalValg = Object.keys(valg).length;
  if (antalValg === 0) {
    dom.spritePreview.innerHTML = '';
    dom.spritePreview.classList.remove('har-valg');
    return;
  }
  dom.spritePreview.classList.add('har-valg');
  // Generer sprite med standarder for manglende egenskaber
  dom.spritePreview.innerHTML = Sprites.genererSprite(valg);
}

// Tegn-ikon og CSS-klasse for et checklistepunkt
function checklisteTegn(tegn) {
  if (tegn === 'god')     return { ikon: '✅', klasse: 'check-god' };
  if (tegn === 'daarlig') return { ikon: '❌', klasse: 'check-daarlig' };
  return                         { ikon: '➖', klasse: 'check-neutral' };
}

// Generer HTML til egenskabs-checklisten (bekræftelse + live-status)
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

  // Linné-navn med nedbrydning af hvert led
  const navneLed = Names.forklarArtsnavn(artsnavn);
  const navneForklaring = navneLed.map(l =>
    `<span class="linne-led"><em>${l.led}</em> = <span class="linne-bety">${l.betydning}</span></span>`
  ).join(' &nbsp;·&nbsp; ');

  dom.artsnavnDisplay.innerHTML = `
    <span class="artsnavn-latin">${artsnavn}</span>
    <span class="dansk-navn">${danskNavn}</span>
    <span class="linne-forklaring">${navneForklaring}</span>
  `;

  // Egenskabs-checklist med habitat-match (erstatter simpel valg-oversigt)
  const score = Survival.beregnHabitatScore({ egenskaber: valg }, aktivtHabitat);
  const levetidSek = Survival.beregnOverlevelsestid(score);
  const habitatNavn = HABITAT_DATA[aktivtHabitat]?.navn || aktivtHabitat;
  dom.valgOversigt.innerHTML = `
    <p class="check-overskrift">DIT DYR I ${habitatNavn.toUpperCase()}</p>
    ${genererChecklisteHTML(valg, aktivtHabitat)}
    <p class="check-bundlinje">Samlet: din art starter på <strong>${levetidSek} sekunder</strong></p>
  `;

  dom.energiBrugt.textContent = beregnBrugtEnergi();
  visSkaerm('bekraeftelse');
}

// --- Afsendelse ---
function sendDyr() {
  const energiBrugt = beregnBrugtEnergi();
  const score = Survival.beregnHabitatScore({ egenskaber: valg }, aktivtHabitat);
  const levetid = Survival.beregnOverlevelsestid(score);

  // Station-ID: brug URL-param ?station=X eller generer lokalt ID
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

  // Gem ID + artsnavn til at tracke live-feedback (arten = elevens dyr + afkom)
  sidsteSendtId = dyr.id;
  minArtsnavn = dyr.artsnavn;
  minDanskNavn = dyr.danskNavn;
  artUddoed = false;
  nulstilDashboard();

  // Afsendelses-lyd
  if (window.Audio) Audio.sendDyr();

  // Send via BroadcastChannel (hvis broadcast.js er loaded)
  if (window.Broadcast && window.Broadcast.send) {
    window.Broadcast.send({ type: 'NYT_DYR', dyr: dyr });
  } else {
    // Fallback: log til konsol
    console.log('NYT_DYR sendt (ingen BroadcastChannel):', dyr);
  }

  // Vis afsendt-skærm
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
  opdaterSpritePreview();
  visSkaerm('byggeflow');
}

// --- Habitat-opdatering ---
function opdaterHabitat(habitat) {
  aktivtHabitat = habitat;
  const data = HABITAT_DATA[habitat];
  if (data) {
    dom.habitatLabel.textContent = data.navn;
    dom.habitatIkon.textContent = data.ikon;
  }
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
  if (e.key === 'ArrowRight' || e.key === 'Enter') {
    if (!dom.btnNaeste.disabled && skaerme.byggeflow.classList.contains('aktiv')) {
      gaaNaeste();
    }
  }
  if (e.key === 'ArrowLeft') {
    if (!dom.btnTilbage.disabled && skaerme.byggeflow.classList.contains('aktiv')) {
      gaaTilbage();
    }
  }
});

// --- BroadcastChannel-integration ---
if (window.Broadcast && window.Broadcast.lyt) {
  Broadcast.lyt((besked) => {
    switch (besked.type) {
      case 'HABITAT_INFO':
        opdaterHabitat(besked.habitat);
        break;
      case 'DYR_DOEDE':
        // Arten er uddød — vis det hvis det er elevens art
        if (besked.artsnavn === minArtsnavn) {
          visDyrDoede(besked);
        }
        break;
      case 'DYR_DOEDE_INDIVID':
        // Et enkelt individ af elevens art er dødt
        if (besked.artsnavn === minArtsnavn) {
          visIndividDoed(besked);
        }
        break;
      case 'DYR_JAGES':
        // Jagt — vis hvis elevens art er involveret (som bytte eller jæger)
        if (besked.bytte_artsnavn === minArtsnavn) {
          tilfoejEvent(`🎯 Din ${besked.bytte_danskNavn} jages af ${besked.jaeger_danskNavn}!`);
        } else if (besked.jaeger_artsnavn === minArtsnavn) {
          tilfoejEvent(`🥩 Din ${besked.jaeger_danskNavn} jagter ${besked.bytte_danskNavn}.`);
        }
        break;
      case 'DYR_EVENT':
        // Begivenhed i habitatet — vis kun events for elevens art
        if (besked.artsnavn === minArtsnavn) {
          tilfoejEvent(besked.tekst);
        }
        break;
      case 'ARTER_STATUS':
        // Live-status på elevens art
        opdaterLiveStatus(besked.arter);
        break;
      case 'SCOREBOARD':
        // Spejl habitatets rekordliste
        renderMiniScoreboard(besked.livstid);
        break;
    }
  });

  // Bed habitatet om at fortælle hvilket habitat der kører
  Broadcast.send({ type: 'HABITAT_REQUEST' });
}

// --- Live-feedback rendering ---

// Nulstil dashboardet til udgangspunktet (ved ny afsendelse)
function nulstilDashboard() {
  dom.liveStatus.classList.remove('doed');
  dom.liveStatus.innerHTML = `
    <h3>Din art lige nu</h3>
    <p id="live-status-tekst">Venter på data fra habitatet...</p>
  `;
  dom.eventFeed.innerHTML = '<li class="event-tom">Venter på begivenheder...</li>';
  // Mini-scoreboard bevares — det er fælles for alle arter
}

// Tilføj en begivenhed øverst i feedet (nyeste først, max MAX_EVENTS)
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

// Opdater live-status på elevens art ud fra ARTER_STATUS-data
function opdaterLiveStatus(arter) {
  if (!minArtsnavn || artUddoed) return;     // død-status overskrives ikke
  const status = arter && arter[minArtsnavn];

  if (status && status.antal > 0) {
    const ind = status.antal === 1 ? '1 individ' : `${status.antal} individer`;
    // Ressource-regnskab for hele arten (sum af alle levende individer)
    const r = status.res || Oekonomi.nytRegnskab();
    const netto = Oekonomi.beregnNetto(r);
    const I = Oekonomi.RESSOURCE_IKON;
    const nettoKlasse = netto > 0 ? 'positiv' : netto < 0 ? 'negativ' : '';
    // Egenskabs-checklist (kompakt, kun ikon + vaerdinavn + forklaring)
    const checkHTML = status.egenskaber
      ? genererChecklisteHTML(status.egenskaber, aktivtHabitat)
      : '';
    dom.liveStatus.classList.remove('doed');
    dom.liveStatus.innerHTML = `
      <h3>Din art lige nu</h3>
      <p class="live-navn">🟢 ${minDanskNavn}</p>
      <p class="live-tal">${ind} i live</p>
      <p class="live-detalje">Ældste: ${status.aeldsteSek} sek · Afkom: ${status.afkom}</p>
      <div class="live-res">
        <span class="live-res-stats">${I.planter} ${r.planter} &nbsp; ${I.bytte} ${r.bytte} &nbsp; ${I.flugt} ${r.flugt} &nbsp; ${I.angreb} ${r.angreb}</span>
        <span class="live-res-netto ${nettoKlasse}">Netto ${netto > 0 ? '+' : ''}${netto}</span>
      </div>
      ${checkHTML ? `<details class="live-checklist"><summary>Egenskaber i dette habitat</summary>${checkHTML}</details>` : ''}
    `;
  } else {
    // Ingen levende endnu (eller lige forsvundet) — vis afventende status
    dom.liveStatus.innerHTML = `
      <h3>Din art lige nu</h3>
      <p id="live-status-tekst">${minDanskNavn} er på vej ud i habitatet...</p>
    `;
  }
}

// Spejl habitatets rekordliste (livstid) med elevens art fremhævet
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
        <span class="mini-sb-tid">${formatTid(e.levetid)} ${SB_HABITAT_IKON[e.habitat] || ''}</span>
      </li>
    `;
  }).join('');
}

// Formater sekunder til "X min Y sek"
function formatTid(sek) {
  const min = Math.floor(sek / 60);
  const rest = sek % 60;
  return min === 0 ? `${rest} sek` : `${min} min ${rest} sek`;
}

// Vis at et enkelt individ af elevens art er dødt (i event-feedet)
function visIndividDoed(besked) {
  if (artUddoed) return; // artsuddøen håndteres separat
  const ikon = besked.erStamdyr ? '💀' : '⚠️';
  const hvem = besked.erStamdyr ? 'Dit første dyr' : `Et individ af ${besked.danskNavn}`;
  const tekst = `${ikon} ${hvem} døde efter ${besked.levetid} sek — ${besked.kortTekst}`;
  tilfoejEvent(tekst);
}

// Vis at elevens art er uddød på stationens skærm
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

// --- Init ---
// Sæt standard-habitat (kan overskrives af BroadcastChannel eller URL-param)
const urlHabitat = new URLSearchParams(window.location.search).get('habitat');
if (urlHabitat && HABITAT_DATA[urlHabitat]) {
  opdaterHabitat(urlHabitat);
}

console.log('Station klar. Habitat:', aktivtHabitat);
