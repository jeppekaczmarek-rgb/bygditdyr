// ============================================================
// survival.js — Overlevelsesmatrix og score-beregning
// Ren logik, ingen UI. Bruges af både station og habitat.
// ============================================================

// --- Konstanter ---
const MAX_ENERGI = 10;
const BASIS_TID = 60;          // sekunder basistid
const SCORE_MULTIPLIKATOR = 8; // sekunder per scorepoint
const MIN_LEVETID = 10;        // minimum overlevelsestid i sekunder

// --- Overlevelsesmatrix: score per egenskab per habitat ---
// Værdier fra -2 (stor ulempe) til +2 (stor fordel)
const HABITAT_SCORE = {
  skov: {
    stofskifte: { hojt: 1, lavt: -1 },
    hudtype:    { pels: 1, fjer: 1, skael: 0, glat: -1 },
    kost:       { planteaeder: 1, koedaeder: 0, alleaeder: 2 },
    storrelse:  { lille: 0, mellem: 1, stor: -1 },
    aktivitet:  { dagaktiv: 1, nataktiv: 0 },
    forsvar:    { giftig: 1, pigge: 1, flugt: 2, ingen: -1 }
  },
  arktis: {
    stofskifte: { hojt: 2, lavt: -2 },
    hudtype:    { pels: 2, fjer: 1, skael: -2, glat: -2 },
    kost:       { planteaeder: -1, koedaeder: 2, alleaeder: 1 },
    storrelse:  { lille: -1, mellem: 1, stor: 2 },
    aktivitet:  { dagaktiv: 1, nataktiv: -2 },
    forsvar:    { giftig: 0, pigge: 0, flugt: 1, ingen: -1 }
  },
  oerken: {
    stofskifte: { hojt: -1, lavt: 2 },
    hudtype:    { pels: -2, fjer: 1, skael: 2, glat: -1 },
    kost:       { planteaeder: 1, koedaeder: 1, alleaeder: 2 },
    storrelse:  { lille: 1, mellem: 0, stor: -1 },
    aktivitet:  { dagaktiv: -1, nataktiv: 2 },
    forsvar:    { giftig: 2, pigge: 1, flugt: 0, ingen: -1 }
  }
};

// --- Energiomkostning per egenskab ---
const ENERGI_OMKOSTNING = {
  stofskifte: { hojt: 3, lavt: 1 },
  hudtype:    { pels: 2, fjer: 2, skael: 1, glat: 1 },
  kost:       { planteaeder: 1, koedaeder: 3, alleaeder: 2 },
  storrelse:  { lille: 1, mellem: 2, stor: 3 },
  aktivitet:  { dagaktiv: 1, nataktiv: 2 },
  forsvar:    { giftig: 3, pigge: 2, flugt: 2, ingen: 0 }
};

// --- Funktioner ---

// Beregn samlet habitatscore for et dyr i et givet habitat
function beregnHabitatScore(dyr, habitat) {
  const matrix = HABITAT_SCORE[habitat];
  return Object.entries(dyr.egenskaber).reduce(
    (sum, [egenskab, vaerdi]) => sum + (matrix[egenskab]?.[vaerdi] ?? 0), 0
  );
}

// Omregn score til overlevelsestid i sekunder
function beregnOverlevelsestid(score) {
  return Math.max(MIN_LEVETID, BASIS_TID + score * SCORE_MULTIPLIKATOR);
}

// Beregn samlet energiomkostning for et sæt egenskaber
function beregnEnergiOmkostning(egenskaber) {
  return Object.entries(egenskaber).reduce(
    (sum, [egenskab, vaerdi]) => sum + (ENERGI_OMKOSTNING[egenskab]?.[vaerdi] ?? 0), 0
  );
}

// Tjek om egenskaberne er inden for energibudgettet
function validerEnergi(egenskaber) {
  return beregnEnergiOmkostning(egenskaber) <= MAX_ENERGI;
}

// --- Eksporter til browser ---
window.Survival = {
  HABITAT_SCORE,
  ENERGI_OMKOSTNING,
  MAX_ENERGI,
  beregnHabitatScore,
  beregnOverlevelsestid,
  beregnEnergiOmkostning,
  validerEnergi
};

// --- Test ---
(function() {
  console.log('=== survival.js test ===');

  // Testdyr 1: overpowered dyr (over energibudget)
  const testDyr1 = {
    egenskaber: {
      stofskifte: 'hojt', hudtype: 'pels', kost: 'koedaeder',
      storrelse: 'stor', aktivitet: 'dagaktiv', forsvar: 'giftig'
    }
  };

  console.log('Testdyr 1: stor/hojt/pels/koedaeder/dagaktiv/giftig');
  console.log('  Skov score:', beregnHabitatScore(testDyr1, 'skov'), '(forventet: 3)');
  console.log('  Arktis score:', beregnHabitatScore(testDyr1, 'arktis'), '(forventet: 9)');
  console.log('  Ørken score:', beregnHabitatScore(testDyr1, 'oerken'), '(forventet: -2)');
  console.log('  Energi:', beregnEnergiOmkostning(testDyr1.egenskaber), '(forventet: 15)');
  console.log('  Gyldig energi:', validerEnergi(testDyr1.egenskaber), '(forventet: false)');

  // Testdyr 2: gyldigt dyr (præcis 10 energi)
  const testDyr2 = {
    egenskaber: {
      stofskifte: 'lavt', hudtype: 'skael', kost: 'alleaeder',
      storrelse: 'lille', aktivitet: 'nataktiv', forsvar: 'giftig'
    }
  };

  console.log('Testdyr 2: lille/lavt/skael/alleaeder/nataktiv/giftig');
  console.log('  Energi:', beregnEnergiOmkostning(testDyr2.egenskaber), '(forventet: 10)');
  console.log('  Gyldig energi:', validerEnergi(testDyr2.egenskaber), '(forventet: true)');
  console.log('  Skov score:', beregnHabitatScore(testDyr2, 'skov'), '(forventet: 2)');
  console.log('  Ørken score:', beregnHabitatScore(testDyr2, 'oerken'), '(forventet: 11)');

  // Test overlevelsestider
  console.log('Overlevelsestid (score 3):', beregnOverlevelsestid(3), 'sek (forventet: 84)');
  console.log('Overlevelsestid (score 9):', beregnOverlevelsestid(9), 'sek (forventet: 132)');
  console.log('Overlevelsestid (score -2):', beregnOverlevelsestid(-2), 'sek (forventet: 44)');
  console.log('Overlevelsestid (score -7):', beregnOverlevelsestid(-7), 'sek (forventet: 10, minimum)');
})();
