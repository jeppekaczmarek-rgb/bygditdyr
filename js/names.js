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
// Realistiske navne i stil med rigtige danske dyrenavne.
// Struktur: [Adjektiv] + [Dyrenavn], max 3 ord.
// ============================================================

// Dyrenavn baseret på kost × størrelse
const DYRENAVN = {
  planteaeder: {
    lille:  ['Mus', 'Hare', 'Pindsvin'],
    mellem: ['Rådyr', 'Bæver', 'Skildpadde'],
    stor:   ['Bison', 'Elefant', 'Flodhest']
  },
  koedaeder: {
    lille:  ['Væsel', 'Hugorm', 'Gecko'],
    mellem: ['Ræv', 'Ulv', 'Ørn'],
    stor:   ['Bjørn', 'Løve', 'Krokodille']
  },
  alleaeder: {
    lille:  ['Grævling', 'Vaskebjørn', 'Vildsvin'],
    mellem: ['Grævling', 'Vaskebjørn', 'Vildsvin'],
    stor:   ['Grævling', 'Vaskebjørn', 'Vildsvin']
  }
};

// Adjektiv baseret på hudtype + aktivitet
const ADJEKTIV = {
  pels:  { dagaktiv: ['Nordlig', 'Almindelig', 'Brun'],  nataktiv: ['Mørk', 'Grå', 'Natlig'] },
  skael: { dagaktiv: ['Plettet', 'Stribet', 'Glinsende'], nataktiv: ['Sort', 'Skjult', 'Mørk'] },
  fjer:  { dagaktiv: ['Hvid', 'Broget', 'Gul'],          nataktiv: ['Grå', 'Mørk', 'Nat-'] },
  glat:  { dagaktiv: ['Blå', 'Grøn', 'Spættet'],         nataktiv: ['Sort', 'Bleg', 'Mørk'] }
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

  // Dyrenavn fra kost × størrelse
  const navneListe = DYRENAVN[e.kost]?.[e.storrelse] || DYRENAVN.alleaeder.mellem;
  const dyr = navneListe[hash % navneListe.length];

  // Adjektiv fra hudtype × aktivitet
  const adjListe = ADJEKTIV[e.hudtype]?.[e.aktivitet] || ADJEKTIV.glat.dagaktiv;
  const adj = adjListe[(hash >> 3) % adjListe.length];

  return `${adj} ${dyr}`;
}

// --- Eksporter til browser ---
window.Names = { genererArtsnavn, genererDanskNavn };

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

  console.log('=== Danske navne test ===');
  const dkTests = [
    { storrelse: 'stor', stofskifte: 'hojt', hudtype: 'pels', kost: 'koedaeder', forsvar: 'giftig', aktivitet: 'dagaktiv' },
    { storrelse: 'lille', stofskifte: 'lavt', hudtype: 'skael', kost: 'planteaeder', forsvar: 'ingen', aktivitet: 'nataktiv' },
    { storrelse: 'mellem', stofskifte: 'hojt', hudtype: 'fjer', kost: 'alleaeder', forsvar: 'flugt', aktivitet: 'dagaktiv' },
    { storrelse: 'mellem', stofskifte: 'lavt', hudtype: 'glat', kost: 'planteaeder', forsvar: 'pigge', aktivitet: 'nataktiv' },
    { storrelse: 'lille', stofskifte: 'hojt', hudtype: 'pels', kost: 'planteaeder', forsvar: 'ingen', aktivitet: 'dagaktiv' },
    { storrelse: 'stor', stofskifte: 'lavt', hudtype: 'skael', kost: 'koedaeder', forsvar: 'flugt', aktivitet: 'nataktiv' },
  ];
  dkTests.forEach(e => {
    const dansk = genererDanskNavn(e);
    const ord = dansk.split(' ').length;
    const status = ord <= 3 ? '✓' : '✗';
    console.log(`  ${status} "${dansk}" (${ord} ord)`);
  });
})();
