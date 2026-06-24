// ============================================================
// names.js — Linneansk navnegenerator
// Genererer binominaltnavn baseret på dyrets egenskaber.
// Ren logik, ingen UI.
// ============================================================

// --- Genus: størrelse × stofskifte ---
const GENUS = {
  lille:  { hojt: 'Parvocalor',  lavt: 'Parvofrigo' },
  mellem: { hojt: 'Mediocalor',  lavt: 'Mediofrigo' },
  stor:   { hojt: 'Magnocalor',  lavt: 'Magnofrigo' }
};

// --- Artsepitet-komponenter ---

// Forsvar-præfiks (tomt ved intet forsvar)
const FORSVAR_PRAEFIKS = {
  giftig: 'venenatus',
  pigge:  'spinosus',
  flugt:  'fugax',
  ingen:  ''
};

// Hudtype-rod
const HUDTYPE_ROD = {
  pels:  'pilus',
  skael: 'squama',
  fjer:  'pluma',
  glat:  'levis'
};

// Kost-suffiks (kombineres med hudtype-rod + "us" til sidst)
const KOST_SUFFIKS = {
  planteaeder: 'herbivor',
  koedaeder:   'carnivor',
  alleaeder:   'omnivor'
};

// --- Navnegenerator ---

// Generer fuldt Linneansk binomialt navn ud fra egenskaber
// Eksempel: { storrelse: 'stor', stofskifte: 'hojt', hudtype: 'pels',
//             kost: 'koedaeder', forsvar: 'giftig' }
//         → "Magnocalor venenatus piluscarnivorus"
function genererArtsnavn(egenskaber) {
  const genus = GENUS[egenskaber.storrelse][egenskaber.stofskifte];
  const forsvar = FORSVAR_PRAEFIKS[egenskaber.forsvar];
  const artsepitet = HUDTYPE_ROD[egenskaber.hudtype] + KOST_SUFFIKS[egenskaber.kost] + 'us';

  return forsvar
    ? `${genus} ${forsvar} ${artsepitet}`
    : `${genus} ${artsepitet}`;
}

// ============================================================
// Dansk folkenavn-generator
// Beskrivende navne der matcher dyrets VISUELLE udseende.
// Struktur: [Adjektiv] + [Dyrenavn], max 3 ord.
// ============================================================

// Dyrenavn baseret på kost × hudtype — matcher de 12 visuelle modeller
const DYRENAVN = {
  koedaeder: {
    pels:  ['Rovpels', 'Lynkrop', 'Jægerpels'],
    skael: ['Jægerøgle', 'Lynøgle', 'Glideøgle'],
    fjer:  ['Rovfugl', 'Strejfrap', 'Jægerfugl'],
    glat:  ['Giftglider', 'Snoedyr', 'Giftdyr']
  },
  planteaeder: {
    pels:  ['Uldkrop', 'Buskkæmpe', 'Pelsokse'],
    skael: ['Panserkrop', 'Skjolddyr', 'Panserdyr'],
    fjer:  ['Fjerkæmpe', 'Dunokse', 'Fjerdyr'],
    glat:  ['Sumpkrop', 'Bredkrop', 'Bulderdyr']
  },
  alleaeder: {
    pels:  ['Graver', 'Kratbid', 'Stribekrop'],
    skael: ['Bånddyr', 'Kratøgle', 'Vandrer'],
    fjer:  ['Jordfugl', 'Kratfugl', 'Jordfjer'],
    glat:  ['Mudderkrop', 'Lerdyr', 'Kratglidder']
  }
};

// Adjektiv baseret på størrelse × aktivitet
const ADJEKTIV = {
  lille:  { dagaktiv: ['Lille', 'Spæd', 'Kvik'],   nataktiv: ['Dværg', 'Sky', 'Natlig'] },
  mellem: { dagaktiv: ['Hurtig', 'Snu', 'Vaks'],   nataktiv: ['Grå', 'Stille', 'Mørk'] },
  stor:   { dagaktiv: ['Kæmpe', 'Vild', 'Stor'],   nataktiv: ['Tung', 'Mørk', 'Dyster'] }
};

// Simpel hash fra egenskaber (så samme dyr altid får samme navn)
function egenskabsHash(e) {
  const str = (e.stofskifte || '') + (e.hudtype || '') + (e.kost || '') +
              (e.storrelse || '') + (e.aktivitet || '') + (e.forsvar || '');
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

  // Dyrenavn fra kost × hudtype — matcher det visuelle
  const navneListe = DYRENAVN[e.kost]?.[e.hudtype] || DYRENAVN.alleaeder.pels;
  const dyr = navneListe[hash % navneListe.length];

  // Adjektiv fra størrelse × aktivitet
  const adjListe = ADJEKTIV[e.storrelse]?.[e.aktivitet] || ADJEKTIV.mellem.dagaktiv;
  const adj = adjListe[(hash >> 3) % adjListe.length];

  return `${adj} ${dyr}`;
}

// --- Ordbog: betydning af hvert navneled ---
// Bruges til at bryde Linné-navnet ned på bekræftelsesskærmen
const NAVNE_ORDBOG = {
  genus: {
    Parvocalor:  { led: 'Parvocalor',  betydning: 'parvus = lille · calor = varm (varmblodigt)' },
    Parvofrigo:  { led: 'Parvofrigo',  betydning: 'parvus = lille · frigo = koldt (koldblodigt)' },
    Mediocalor:  { led: 'Mediocalor',  betydning: 'medius = medium · calor = varm (varmblodigt)' },
    Mediofrigo:  { led: 'Mediofrigo',  betydning: 'medius = medium · frigo = koldt (koldblodigt)' },
    Magnocalor:  { led: 'Magnocalor',  betydning: 'magnus = stor · calor = varm (varmblodigt)' },
    Magnofrigo:  { led: 'Magnofrigo',  betydning: 'magnus = stor · frigo = koldt (koldblodigt)' }
  },
  forsvar: {
    venenatus: { led: 'venenatus', betydning: 'venenum = gift — giftig' },
    spinosus:  { led: 'spinosus',  betydning: 'spina = pigge — med pigge' },
    fugax:     { led: 'fugax',     betydning: 'fuga = flugt — hurtig flygtning' }
  },
  hud: {
    pilus:  { led: 'pilus',  betydning: 'pilus = hår — pelsdækket' },
    squama: { led: 'squama', betydning: 'squama = skæl — skældækket' },
    pluma:  { led: 'pluma',  betydning: 'pluma = fjer — fjerdækket' },
    levis:  { led: 'levis',  betydning: 'levis = glat — glat hud' }
  },
  kost: {
    herbivor: { led: 'herbivorus', betydning: 'herba = plante · vorare = æde — planteæder' },
    carnivor: { led: 'carnivorus', betydning: 'caro = kød · vorare = æde — kødæder' },
    omnivor:  { led: 'omnivorus',  betydning: 'omnis = alt · vorare = æde — alleæder' }
  }
};

// Bryd et Linneansk artsnavn ned i dets betydningsled
// Returnerer [{ led, betydning }, ...]
function forklarArtsnavn(artsnavn) {
  const dele = artsnavn.trim().split(/\s+/);
  const resultat = [];

  // Genus (første led)
  const genus = NAVNE_ORDBOG.genus[dele[0]];
  if (genus) resultat.push(genus);

  // Forsvar-præfiks (evt. andet led)
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
      // rest = herbivorus / carnivorus / omnivorus
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
      egenskaber: { storrelse: 'stor', stofskifte: 'hojt', hudtype: 'pels', kost: 'koedaeder', forsvar: 'giftig', aktivitet: 'dagaktiv' },
      forventet: 'Magnocalor venenatus piluscarnivorus'
    },
    {
      egenskaber: { storrelse: 'lille', stofskifte: 'lavt', hudtype: 'skael', kost: 'planteaeder', forsvar: 'ingen', aktivitet: 'nataktiv' },
      forventet: 'Parvofrigo squamaherbivorus'
    },
    {
      egenskaber: { storrelse: 'mellem', stofskifte: 'hojt', hudtype: 'fjer', kost: 'alleaeder', forsvar: 'flugt', aktivitet: 'dagaktiv' },
      forventet: 'Mediocalor fugax plumaomnivorus'
    }
  ];

  tests.forEach(({ egenskaber, forventet }) => {
    const resultat = genererArtsnavn(egenskaber);
    const status = resultat === forventet ? '✓' : '✗';
    console.log(`  ${status} ${resultat} (forventet: ${forventet})`);
  });

  console.log('=== Danske navne test (kost × hudtype → visuelt korrekt) ===');
  const dkTests = [
    { storrelse: 'stor',  stofskifte: 'hojt', hudtype: 'pels',  kost: 'koedaeder',  forsvar: 'giftig', aktivitet: 'dagaktiv' }, // → Kæmpe Rovpels/Lynkrop/Jægerpels
    { storrelse: 'lille', stofskifte: 'lavt', hudtype: 'skael', kost: 'planteaeder', forsvar: 'ingen',  aktivitet: 'nataktiv' }, // → Dværg Panserkrop/Skjolddyr/Panserdyr
    { storrelse: 'mellem',stofskifte: 'hojt', hudtype: 'fjer',  kost: 'alleaeder',  forsvar: 'flugt',  aktivitet: 'dagaktiv' }, // → Hurtig Jordfugl/Kratfugl/Jordfjer
    { storrelse: 'mellem',stofskifte: 'lavt', hudtype: 'glat',  kost: 'planteaeder', forsvar: 'pigge',  aktivitet: 'nataktiv' }, // → Grå Sumpkrop/Bredkrop/Bulderdyr
    { storrelse: 'lille', stofskifte: 'hojt', hudtype: 'pels',  kost: 'planteaeder', forsvar: 'ingen',  aktivitet: 'dagaktiv' }, // → Lille Uldkrop/Buskkæmpe/Pelsokse
    { storrelse: 'stor',  stofskifte: 'lavt', hudtype: 'skael', kost: 'koedaeder',  forsvar: 'flugt',  aktivitet: 'nataktiv' }, // → Dyster Jægerøgle/Lynøgle/Glideøgle
  ];
  dkTests.forEach(e => {
    const dansk = genererDanskNavn(e);
    const ord = dansk.split(' ').length;
    const status = ord <= 3 ? '✓' : '✗';
    console.log(`  ${status} "${dansk}" (${ord} ord)`);
  });
})();
