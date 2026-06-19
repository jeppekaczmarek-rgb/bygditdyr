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

// --- Tekstbank: kort forklaring pr. habitat × egenskab × vaerdi ---
// Bruges i egenskabs-checklisten på bekræftelses- og live-skærmen
const EGENSKAB_FORKLARING = {
  skov: {
    stofskifte: {
      hojt:  'Varmblodige dyr holder sig aktive selv på kolde nætter i skoven.',
      lavt:  'Koldblodige dyr bliver træge i skovens kolde perioder.'
    },
    hudtype: {
      pels:  'Pels isolerer godt mod skovens vekselvise vejr.',
      fjer:  'Fjer giver både varme og lethed til at komme rundt i skoven.',
      skael: 'Skæl er neutralt — hverken til fordel eller ulempe i skoven.',
      glat:  'Glat hud mister varme let — en svaghed i den fugtige skov.'
    },
    kost: {
      planteaeder: 'Skoven bugner af planter — let at finde mad hele året.',
      koedaeder:   'Bytte findes i skoven, men det kræver energi at jage.',
      alleaeder:   'Alleædere klarer sig godt i skoven — de kan spise alt.'
    },
    storrelse: {
      lille: 'Lille størrelse er hverken fordel eller ulempe i skoven.',
      mellem: 'Mellemstor er den bedste balance i skovens miljø.',
      stor:  'Store dyr har svært ved at gemme sig i skovens undervegetation.'
    },
    aktivitet: {
      dagaktiv: 'Lyset i skoven bruges godt af dagaktive dyr.',
      nataktiv: 'Nataktive dyr klarer sig fint, men mister lyset som fordel.'
    },
    forsvar: {
      giftig: 'Gift holder fjender på afstand — en god strategi i skoven.',
      pigge:  'Pigge beskytter godt mod skovens rovdyr.',
      flugt:  'Hurtige ben og masser af træer at gemme sig bag — perfekt.',
      ingen:  'Ingen forsvar i en skov fuld af rovdyr er risikabelt.'
    }
  },
  arktis: {
    stofskifte: {
      hojt:  'Varmblodige dyr producerer selv varme — afgørende i den bitre kulde.',
      lavt:  'Koldblodig i frost: kroppen kan ikke lave sin egen varme. Livsfarligt.'
    },
    hudtype: {
      pels:  'Pels isolerer mod den bitre kulde — isbjørnens hemmelighed.',
      fjer:  'Fjer holder godt på varmen i arktis.',
      skael: 'Skæl isolerer slet ikke — kroppen fryser hurtigt i arktis.',
      glat:  'Glat hud holder ikke på varmen — farligt i den ekstreme kulde.'
    },
    kost: {
      planteaeder: 'Der er meget lidt planteføde i arktis — svært at overleve.',
      koedaeder:   'Kød giver den energi der skal til for at holde varmen i arktis.',
      alleaeder:   'Alleædere klarer sig — de kan spise det lille der er.'
    },
    storrelse: {
      lille: 'Lille krop mister varme hurtigt — en stor ulempe i arktis.',
      mellem: 'Mellemstor giver god balance mellem varme og bevægelighed.',
      stor:  'Store dyr bevarer varmen bedst i den arktiske kulde.'
    },
    aktivitet: {
      dagaktiv: 'Arktis har lys om sommeren — dagaktive dyr udnytter det.',
      nataktiv: 'Lange, mørke vinternætter gør nataktiv til en klar ulempe i arktis.'
    },
    forsvar: {
      giftig: 'Gift er neutralt i arktis — rovdyr angriber alligevel.',
      pigge:  'Pigge er neutrale i arktis — rovdyrene angriber alligevel.',
      flugt:  'Hurtig flugt hjælper en smule i det åbne arktiske landskab.',
      ingen:  'Uden forsvar i arktis er dyret let bytte for de få rovdyr der lever her.'
    }
  },
  oerken: {
    stofskifte: {
      hojt:  'Varmblodigt i ørkenen: kroppen spilder energi på at køle sig ned.',
      lavt:  'Koldblodig i ørkenen: gratis varme fra solen — og dyret sparer vand.'
    },
    hudtype: {
      pels:  'Pelsen koger dyret indefra i ørkenheden. En katastrofe.',
      fjer:  'Fjer isolerer og afskærmer mod solens stråler — et smart ørken-trick.',
      skael: 'Skæl låser fugten inde og tåler stegende sol — krybdyrenes ørken-trick.',
      glat:  'Glat hud tørrer ud hurtigt i ørkenens tørke.'
    },
    kost: {
      planteaeder: 'Ørkenen har lidt planteføde — men nok til specialister.',
      koedaeder:   'Kød indeholder vand — en overraskende fordel i ørkenen.',
      alleaeder:   'Alleædere er bedst i ørkenen — de kan spise alt de finder.'
    },
    storrelse: {
      lille: 'Lille krop overheder ikke så let og er let at skjule i ørkenen.',
      mellem: 'Mellemstor er hverken godt eller skidt i ørkenen.',
      stor:  'Store dyr overopheder let i den ekstreme ørkenvarme.'
    },
    aktivitet: {
      dagaktiv: 'Ude i den værste middagshede — farligt for de fleste ørken-dyr.',
      nataktiv: 'Nataktive dyr undgår varmen og jager i køligheden — perfekt i ørkenen.'
    },
    forsvar: {
      giftig: 'Gift er meget effektivt i ørkenen — klapperslangens strategi.',
      pigge:  'Pigge skræmmer rovdyr væk i det åbne ørken-landskab.',
      flugt:  'Flugt i åbent ørken-terrain — ingen steder at gemme sig.',
      ingen:  'Ingen forsvar i en ørken fuld af farlige rovdyr er risikabelt.'
    }
  }
};

// Returnér hver egenskabs bidrag i et givet habitat, sorteret dårligst→bedst
function forklarEgenskaber(dyr, habitat) {
  const matrix = HABITAT_SCORE[habitat];
  const forklaringer = EGENSKAB_FORKLARING[habitat] || {};
  return Object.entries(dyr.egenskaber).map(([kat, vaerdi]) => {
    const score = matrix[kat]?.[vaerdi] ?? 0;
    return {
      kategori: kat,
      vaerdi,
      score,
      tegn: score > 0 ? 'god' : score < 0 ? 'daarlig' : 'neutral',
      forklaring: forklaringer[kat]?.[vaerdi] || ''
    };
  }).sort((a, b) => a.score - b.score);
}

// --- Eksporter til browser ---
window.Survival = {
  HABITAT_SCORE,
  EGENSKAB_FORKLARING,
  ENERGI_OMKOSTNING,
  MAX_ENERGI,
  beregnHabitatScore,
  beregnOverlevelsestid,
  beregnEnergiOmkostning,
  validerEnergi,
  forklarEgenskaber
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
