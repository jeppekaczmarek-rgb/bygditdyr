// ============================================================
// survival.js — Overlevelsesmatrix og score-beregning
// Ren logik, ingen UI. Bruges af både station og habitat.
// ============================================================

// --- Konstanter ---
const MAX_ENERGI = 12;
const BASIS_TID = 60;          // sekunder basistid
const SCORE_MULTIPLIKATOR = 8; // sekunder per scorepoint
const MIN_LEVETID = 20;        // minimum levetid i sekunder

// --- Overlevelsesmatrix: score per egenskab (lysåben dansk skov, istidskontekst) ---
// Værdier fra -2 (stor ulempe) til +2 (stor fordel)
const HABITAT_SCORE = {
  skov: {
    stofskifte: { varm: 1, kold: 0 },
    kropsform: {
      lille_slank:    0,   // hermelin/væsel — generalist
      stor_slank:     1,   // ulv/los — aktiv jæger
      lille_kraftig:  0,   // grævling/pindsvin — lav, robust
      stor_kraftig:   0,   // bjørn/urhund — neutral allround
      mega_kraftig:  -1,   // mammut/uldhåret næsehorn — for stor til tæt skov
      kold_lille:     1,   // firben/salamander — skjuler sig let i skovbunden
      kold_langstrakt: 0   // snog/hugorm — neutral
    },
    hudtype: { pels: 1, fjer: 1, skael: 0 },
    foedevalg: { planteaeder: 1, koedaeder: 0, altaeder: 1 },
    forsvar: {
      pigge:      1,
      gift:       1,
      mimicry:    0,   // narrer ikke alle rovdyr
      camouflage: 2,   // perfekt skovdækning
      hastighed:  1
    }
  }
};

// --- Energiomkostning per egenskab ---
const ENERGI_OMKOSTNING = {
  stofskifte: { varm: 3, kold: 1 },
  kropsform: {
    lille_slank: 1, stor_slank: 3, lille_kraftig: 2,
    stor_kraftig: 3, mega_kraftig: 5,
    kold_lille: 1, kold_langstrakt: 2
  },
  hudtype:   { pels: 2, fjer: 2, skael: 1 },
  foedevalg: { planteaeder: 1, koedaeder: 3, altaeder: 2 },
  forsvar:   { camouflage: 1, mimicry: 1, pigge: 2, hastighed: 2, gift: 3 }
};

// --- Funktioner ---

// Beregn samlet habitatscore for et dyr
function beregnHabitatScore(dyr, habitat) {
  const matrix = HABITAT_SCORE[habitat] || HABITAT_SCORE.skov;
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

// Hjælpefunktion: kropsform → størrelseskategori (bruges i habitat.js til fart og kollision)
function kropsformTilStorrelse(kropsform) {
  if (kropsform === 'mega_kraftig')                             return 'mega';
  if (['stor_slank', 'stor_kraftig'].includes(kropsform))       return 'stor';
  if (['lille_kraftig', 'kold_langstrakt'].includes(kropsform)) return 'mellem';
  return 'lille'; // lille_slank, kold_lille
}

// --- Tekstbank: forklaring pr. egenskab × vaerdi (lysåben dansk skov) ---
const EGENSKAB_FORKLARING = {
  skov: {
    stofskifte: {
      varm: 'Varmblodige dyr holder sig aktive selv på kolde nætter i skoven.',
      kold: 'Koldblodige dyr bliver træge i skovens kolde perioder.'
    },
    kropsform: {
      lille_slank:     'Lille og slank er nem at skjule i undervegetationen — god i skov.',
      stor_slank:      'Stor og slank er perfekt til at jage i skovens åbninger.',
      lille_kraftig:   'Lille og kraftig — hverken særlig fordel eller ulempe her.',
      stor_kraftig:    'Stor og kraftig er neutral i skoven — god til det meste.',
      mega_kraftig:    'Kæmpestørrelse er svær at skjule i skovens tætte undervegetation.',
      kold_lille:      'Lille koldblodet krop gemmer sig let i skovbunden.',
      kold_langstrakt: 'Langstrakt krop glider gennem skovbunden — neutral her.'
    },
    hudtype: {
      pels:  'Pels isolerer godt mod skovens vekselvise vejr.',
      fjer:  'Fjer giver både varme og lethed til at komme rundt i skoven.',
      skael: 'Skæl er neutralt — hverken til fordel eller ulempe i skoven.'
    },
    foedevalg: {
      planteaeder: 'Skoven bugner af planter — planteædere finder altid mad her.',
      koedaeder:   'Bytte er der nok af i skoven — men jagten kræver energi.',
      altaeder:    'Altædere er fleksible, men specialister kan slå dem i netop deres niche.'
    },
    forsvar: {
      pigge:      'Pigge beskytter godt mod skovens rovdyr.',
      gift:       'Gift holder fjender på afstand — en god strategi i skoven.',
      mimicry:    'Advarselsfarver narrer mange rovdyr — men erfarne gennemskuer det.',
      camouflage: 'Kamuflagefarver der smelter ind i skovens løv — næsten usynlig.',
      hastighed:  'Hurtige ben og masser af træer at gemme sig bag — effektivt.'
    }
  }
};

// Returnér hver egenskabs bidrag i habitatet, sorteret dårligst→bedst
function forklarEgenskaber(dyr, habitat) {
  const matrix = HABITAT_SCORE[habitat] || HABITAT_SCORE.skov;
  const forklaringer = EGENSKAB_FORKLARING[habitat] || EGENSKAB_FORKLARING.skov;
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
  forklarEgenskaber,
  kropsformTilStorrelse
};

// --- Test ---
(function() {
  console.log('=== survival.js test ===');

  // Mammut: præcis budget (12), neutral i skoven
  const mammut = { egenskaber: { stofskifte: 'varm', kropsform: 'mega_kraftig', hudtype: 'pels', foedevalg: 'planteaeder', forsvar: 'camouflage' } };
  console.log('Mammut: varm+mega_kraftig+pels+planteaeder+camouflage');
  console.log('  Energi:', beregnEnergiOmkostning(mammut.egenskaber), '(forventet: 12)');
  console.log('  Skov score:', beregnHabitatScore(mammut, 'skov'), '(forventet: 3)');
  console.log('  Levetid:', beregnOverlevelsestid(3), 'sek (forventet: 84)');

  // Ulv: god jæger, lidt under budget
  const ulv = { egenskaber: { stofskifte: 'varm', kropsform: 'stor_slank', hudtype: 'pels', foedevalg: 'koedaeder', forsvar: 'hastighed' } };
  console.log('Ulv: varm+stor_slank+pels+koedaeder+hastighed');
  console.log('  Energi:', beregnEnergiOmkostning(ulv.egenskaber), '(forventet: 11)');
  console.log('  Skov score:', beregnHabitatScore(ulv, 'skov'), '(forventet: 4)');

  // Firben: billigst mulig (5), god i skov
  const firben = { egenskaber: { stofskifte: 'kold', kropsform: 'kold_lille', hudtype: 'skael', foedevalg: 'planteaeder', forsvar: 'camouflage' } };
  console.log('Firben: kold+kold_lille+skael+planteaeder+camouflage');
  console.log('  Energi:', beregnEnergiOmkostning(firben.egenskaber), '(forventet: 5)');
  console.log('  Skov score:', beregnHabitatScore(firben, 'skov'), '(forventet: 3)');

  console.log('  kropsformTilStorrelse(mega_kraftig):', kropsformTilStorrelse('mega_kraftig'), '(forventet: mega)');
  console.log('  kropsformTilStorrelse(stor_slank):', kropsformTilStorrelse('stor_slank'), '(forventet: stor)');
  console.log('  kropsformTilStorrelse(lille_slank):', kropsformTilStorrelse('lille_slank'), '(forventet: lille)');
})();
