// ============================================================
// oekonomi.js — Ressource-økonomi: ren logik, ingen UI.
// Hvert dyr fører et lille regnskab: spist mad tæller op,
// flugtforsøg og mislykkede angreb tæller ned. Bruges af
// både habitat (optælling + tavle) og station (elevens art).
// ============================================================

// Vægte til netto-beregningen. planter/bytte lægges til,
// flugt/angreb trækkes fra (se beregnNetto).
const RESSOURCE_VAEGT = {
  planter: 1,   // hver spist plante
  bytte:   3,   // hvert nedlagt byttedyr (kød er næringsrigt)
  flugt:   1,   // hvert flugtforsøg koster energi
  angreb:  2    // hvert mislykket angreb (spildt jagt)
};

// Ikoner til visning af de fire ressource-typer
const RESSOURCE_IKON = {
  planter: '🌿',
  bytte:   '🥩',
  flugt:   '💨',
  angreb:  '✖'
};

// Tomt regnskab til et nyt dyr
function nytRegnskab() {
  return { planter: 0, bytte: 0, flugt: 0, angreb: 0 };
}

// Netto-ressourcer: mad op, flugt + mislykket jagt ned
function beregnNetto(r) {
  if (!r) return 0;
  return r.planter * RESSOURCE_VAEGT.planter
       + r.bytte   * RESSOURCE_VAEGT.bytte
       - r.flugt   * RESSOURCE_VAEGT.flugt
       - r.angreb  * RESSOURCE_VAEGT.angreb;
}

// Læg to regnskaber sammen (til art-totaler på tværs af individer)
function laegSammen(a, b) {
  return {
    planter: a.planter + b.planter,
    bytte:   a.bytte   + b.bytte,
    flugt:   a.flugt   + b.flugt,
    angreb:  a.angreb  + b.angreb
  };
}

// --- Eksporter til browser ---
window.Oekonomi = {
  RESSOURCE_VAEGT,
  RESSOURCE_IKON,
  nytRegnskab,
  beregnNetto,
  laegSammen
};

// --- Test ---
(function() {
  console.log('=== oekonomi.js test ===');
  const r = nytRegnskab();
  r.planter = 4; r.bytte = 2; r.flugt = 3; r.angreb = 1;
  // 4*1 + 2*3 - 3*1 - 1*2 = 4 + 6 - 3 - 2 = 5
  console.log('Netto (4🌿 2🥩 3💨 1✖):', beregnNetto(r), '(forventet: 5)');
  console.log('Tomt regnskab netto:', beregnNetto(nytRegnskab()), '(forventet: 0)');
  const sum = laegSammen({planter:1,bytte:0,flugt:2,angreb:0}, {planter:3,bytte:1,flugt:0,angreb:1});
  console.log('Sammenlagt:', JSON.stringify(sum), '(forventet: planter 4, bytte 1, flugt 2, angreb 1)');
})();
