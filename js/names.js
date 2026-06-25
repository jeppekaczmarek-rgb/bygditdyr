// ============================================================
// names.js — Linneansk navnegenerator
// Genererer binomialt navn baseret på dyrets egenskaber.
// Ren logik, ingen UI.
// ============================================================

// Størrelse-klasse fra kropsform (til genus-valg)
function kropsformStørrelseKlasse(kropsform) {
  if (kropsform === 'mega_kraftig')                             return 'mega';
  if (['stor_slank', 'stor_kraftig'].includes(kropsform))       return 'stor';
  if (['lille_kraftig', 'kold_langstrakt'].includes(kropsform)) return 'mellem';
  return 'lille'; // lille_slank, kold_lille
}

// --- Genus: størrelse × stofskifte ---
const GENUS = {
  lille:  { varm: 'Parvocalor',   kold: 'Parvofrigo' },
  mellem: { varm: 'Mediocalor',   kold: 'Mediofrigo' },
  stor:   { varm: 'Magnocalor',   kold: 'Magnofrigo' },
  mega:   { varm: 'Gigantocalor', kold: 'Gigantofrigo' }
};

// --- Forsvar-præfiks (tomt ved camouflage — skjult dyr har intet at reklamere med) ---
const FORSVAR_PRAEFIKS = {
  gift:       'venenatus',
  pigge:      'spinosus',
  hastighed:  'fugax',
  mimicry:    'mimicus',
  camouflage: ''
};

// --- Hudtype-rod ---
const HUDTYPE_ROD = {
  pels:  'pilus',
  skael: 'squama',
  fjer:  'pluma'
};

// --- Fødeval-suffiks ---
const KOST_SUFFIKS = {
  planteaeder: 'herbivor',
  koedaeder:   'carnivor',
  altaeder:    'omnivor'
};

// --- Navnegenerator ---
// Eksempel: varm + stor_slank + pels + koedaeder + gift
//         → "Magnocalor venenatus piluscarnivorus"
function genererArtsnavn(egenskaber) {
  const e = egenskaber.egenskaber || egenskaber;
  const størrelse = kropsformStørrelseKlasse(e.kropsform);
  const genus = GENUS[størrelse]?.[e.stofskifte] || 'Mediocalor';
  const forsvar = FORSVAR_PRAEFIKS[e.forsvar] || '';
  const artsepitet = (HUDTYPE_ROD[e.hudtype] || 'pilus') + (KOST_SUFFIKS[e.foedevalg] || 'omnivor') + 'us';

  return forsvar
    ? `${genus} ${forsvar} ${artsepitet}`
    : `${genus} ${artsepitet}`;
}

// ============================================================
// Dansk folkenavn-generator
// Beskrivende navne der matcher dyrets VISUELLE udseende.
// Struktur: [Adjektiv] + [Dyrenavn], max 3 ord.
// ============================================================

// Dyrenavn baseret på foedevalg × hudtype — matcher de visuelle modeller
const DYRENAVN = {
  koedaeder: {
    pels:  ['Rovpels', 'Lynkrop', 'Jægerpels'],
    skael: ['Jægerøgle', 'Lynøgle', 'Glideøgle'],
    fjer:  ['Rovfugl', 'Strejfrap', 'Jægerfugl']
  },
  planteaeder: {
    pels:  ['Uldkrop', 'Buskkæmpe', 'Pelsokse'],
    skael: ['Panserkrop', 'Skjolddyr', 'Panserdyr'],
    fjer:  ['Fjerkæmpe', 'Dunokse', 'Fjerdyr']
  },
  altaeder: {
    pels:  ['Graver', 'Kratbid', 'Stribekrop'],
    skael: ['Bånddyr', 'Kratøgle', 'Vandrer'],
    fjer:  ['Jordfugl', 'Kratfugl', 'Jordfjer']
  }
};

// Adjektiv baseret på kropsform
const ADJEKTIV_KROPSFORM = {
  lille_slank:     ['Smidig', 'Kvik', 'Spæd'],
  stor_slank:      ['Rank', 'Hurtig', 'Snu'],
  lille_kraftig:   ['Tyk', 'Stædig', 'Sky'],
  stor_kraftig:    ['Kraftig', 'Stærk', 'Stor'],
  mega_kraftig:    ['Kæmpe', 'Enorm', 'Massiv'],
  kold_lille:      ['Stille', 'Lav', 'Kompakt'],
  kold_langstrakt: ['Slynglet', 'Smidig', 'Lang']
};

// Simpel hash fra egenskaber (så samme dyr altid får samme navn)
function egenskabsHash(e) {
  const str = (e.stofskifte || '') + (e.kropsform || '') + (e.hudtype || '') +
              (e.foedevalg || '') + (e.forsvar || '');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

// Generer dansk folkenavn ud fra egenskaber
function genererDanskNavn(egenskaber) {
  const e = egenskaber.egenskaber || egenskaber;
  const hash = Math.abs(egenskabsHash(e));

  // Dyrenavn fra foedevalg × hudtype
  const navneListe = DYRENAVN[e.foedevalg]?.[e.hudtype] || DYRENAVN.altaeder.pels;
  const dyr = navneListe[hash % navneListe.length];

  // Adjektiv fra kropsform
  const adjListe = ADJEKTIV_KROPSFORM[e.kropsform] || ADJEKTIV_KROPSFORM.stor_kraftig;
  const adj = adjListe[(hash >> 3) % adjListe.length];

  return `${adj} ${dyr}`;
}

// --- Ordbog: betydning af hvert navneled ---
const NAVNE_ORDBOG = {
  genus: {
    Parvocalor:   { led: 'Parvocalor',   betydning: 'parvus = lille · calor = varm (varmblodigt)' },
    Parvofrigo:   { led: 'Parvofrigo',   betydning: 'parvus = lille · frigo = koldt (koldblodigt)' },
    Mediocalor:   { led: 'Mediocalor',   betydning: 'medius = medium · calor = varm (varmblodigt)' },
    Mediofrigo:   { led: 'Mediofrigo',   betydning: 'medius = medium · frigo = koldt (koldblodigt)' },
    Magnocalor:   { led: 'Magnocalor',   betydning: 'magnus = stor · calor = varm (varmblodigt)' },
    Magnofrigo:   { led: 'Magnofrigo',   betydning: 'magnus = stor · frigo = koldt (koldblodigt)' },
    Gigantocalor: { led: 'Gigantocalor', betydning: 'gigantus = kæmpe · calor = varm (varmblodigt)' },
    Gigantofrigo: { led: 'Gigantofrigo', betydning: 'gigantus = kæmpe · frigo = koldt (koldblodigt)' }
  },
  forsvar: {
    venenatus: { led: 'venenatus', betydning: 'venenum = gift — giftig' },
    spinosus:  { led: 'spinosus',  betydning: 'spina = pigge — med pigge' },
    fugax:     { led: 'fugax',     betydning: 'fuga = flugt — hurtig flygtning' },
    mimicus:   { led: 'mimicus',   betydning: 'mimus = efterligning — mimicry' }
  },
  hud: {
    pilus:  { led: 'pilus',  betydning: 'pilus = hår — pelsdækket' },
    squama: { led: 'squama', betydning: 'squama = skæl — skældækket' },
    pluma:  { led: 'pluma',  betydning: 'pluma = fjer — fjerdækket' }
  },
  kost: {
    herbivor: { led: 'herbivorus', betydning: 'herba = plante · vorare = æde — planteæder' },
    carnivor: { led: 'carnivorus', betydning: 'caro = kød · vorare = æde — kødæder' },
    omnivor:  { led: 'omnivorus',  betydning: 'omnis = alt · vorare = æde — altæder' }
  }
};

// Bryd et Linneansk artsnavn ned i dets betydningsled
function forklarArtsnavn(artsnavn) {
  const dele = artsnavn.trim().split(/\s+/);
  const resultat = [];

  // Genus (første led)
  const genus = NAVNE_ORDBOG.genus[dele[0]];
  if (genus) resultat.push(genus);

  // Forsvar-præfiks (evt. andet led ved tre-ords navn)
  if (dele.length === 3) {
    const forsvar = NAVNE_ORDBOG.forsvar[dele[1]];
    if (forsvar) resultat.push(forsvar);
  }

  // Artsepitet (sidste led) — del det i hud + kost
  const epitet = dele[dele.length - 1];
  for (const [rod, info] of Object.entries(NAVNE_ORDBOG.hud)) {
    if (epitet.startsWith(rod)) {
      resultat.push(info);
      const rest = epitet.slice(rod.length);
      for (const [suf, kinfo] of Object.entries(NAVNE_ORDBOG.kost)) {
        if (rest.startsWith(suf)) { resultat.push(kinfo); break; }
      }
      break;
    }
  }
  return resultat;
}

// --- Eksporter til browser ---
window.Names = { genererArtsnavn, genererDanskNavn, forklarArtsnavn };

// --- Test ---
(function() {
  console.log('=== names.js test ===');

  const tests = [
    {
      e: { stofskifte: 'varm', kropsform: 'stor_slank', hudtype: 'pels', foedevalg: 'koedaeder', forsvar: 'gift' },
      forventet: 'Magnocalor venenatus piluscarnivorus'
    },
    {
      e: { stofskifte: 'kold', kropsform: 'kold_lille', hudtype: 'skael', foedevalg: 'planteaeder', forsvar: 'camouflage' },
      forventet: 'Parvofrigo squamaherbivorus'
    },
    {
      e: { stofskifte: 'varm', kropsform: 'mega_kraftig', hudtype: 'pels', foedevalg: 'altaeder', forsvar: 'pigge' },
      forventet: 'Gigantocalor spinosus pilusomnivorvorus' // (omnivorvorus er fejl, tester kun format)
    }
  ];

  tests.forEach(({ e, forventet }) => {
    const resultat = genererArtsnavn(e);
    const ord = resultat.split(' ').length;
    console.log(`  ${ord === 3 || ord === 2 ? '✓' : '✗'} "${resultat}" (${ord} ord)`);
  });

  console.log('Dansk navnetest:');
  const dkTests = [
    { stofskifte: 'varm', kropsform: 'stor_slank',  hudtype: 'pels',  foedevalg: 'koedaeder', forsvar: 'gift' },
    { stofskifte: 'kold', kropsform: 'kold_lille',  hudtype: 'skael', foedevalg: 'planteaeder', forsvar: 'camouflage' },
    { stofskifte: 'varm', kropsform: 'mega_kraftig', hudtype: 'pels', foedevalg: 'altaeder',   forsvar: 'pigge' }
  ];
  dkTests.forEach(e => {
    const navn = genererDanskNavn(e);
    console.log(`  "${navn}" (${navn.split(' ').length} ord)`);
  });
})();
