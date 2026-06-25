// ============================================================
// deathtext.js — Biologiske dødsforklaringer
// Returnerer en kort, dramatisk, biologisk præcis sætning
// der forklarer hvorfor dyret døde — skrevet til 10-12-årige.
// Egenskaber: stofskifte (varm/kold), kropsform, hudtype,
//             foedevalg (planteaeder/koedaeder/altaeder), forsvar
// ============================================================

// Hjælper: afled størrelse fra kropsform via Survival
function hentStorrelseKlasse(e) {
  if (window.Survival && Survival.kropsformTilStorrelse) {
    return Survival.kropsformTilStorrelse(e.kropsform || 'lille_slank');
  }
  return 'lille';
}

// Tekstregler per dødsårsag.
// Hver årsag har en liste af { match, tekster } objekter.
// Sidste element i listen er altid en generisk fallback.
const DOEDSTEKSTER = {

  // ── JAGET (rovdyr nedlagde byttet) ─────────────────────────
  jaget: [
    {
      match: e => e.forsvar === 'hastighed',
      tekster: [
        'Forsøgte at flygte, men jægeren var hurtigere denne gang.',
        'Hurtig flugt reddede livet mange gange — men ikke denne gang.',
        'Løb alt hvad den kunne. Jægeren var tættere end forventet.'
      ]
    },
    {
      match: e => e.forsvar === 'gift',
      tekster: [
        'Giften slog til — men jægeren var sulten nok til at bide igennem.',
        'Giftig, men ikke giftig nok. Rovdyret tog chancen og vandt.',
        'Giften var ikke stærk nok til at stoppe en desperat jæger.'
      ]
    },
    {
      match: e => e.forsvar === 'camouflage',
      tekster: [
        'Camouflagen slog fejl. En skarp jæger fandt det alligevel.',
        'Gemte sig godt — men et sultet rovdyr søgte grundigt nok.',
        'Camouflagen holdt i lang tid, men til sidst blev det opdaget.'
      ]
    },
    {
      match: e => e.forsvar === 'mimicry',
      tekster: [
        'Efterligningen narrede ikke denne erfarne jæger.',
        'Forklædningen virkede ikke. Rovdyret kendte tricket.',
        'Mimicry er et spil med odds. Denne gang tabte byttet.'
      ]
    },
    {
      match: e => e.forsvar === 'pigge',
      tekster: [
        'Piggene afskrækkede normalt angribere — men en sulten jæger tog chancen.',
        'Piggene sårede jægeren, men stoppede det ikke. Et dyrt offer.',
        'Forsøgte at stikke sig vej fri. Jægeren var for sulten til at give slip.'
      ]
    },
    {
      match: e => e.foedevalg === 'planteaeder',
      tekster: [
        'Planteæder fanget af en hurtigere kødæder. Fødekæden slog til.',
        'Fredelig planteæder i en verden med skarpe tænder og klør.',
        'Som planteæder var den altid et potentielt bytte. Denne gang endte det fatalt.'
      ]
    },
    {
      match: () => true,
      tekster: [
        'Fanget af et hurtigere rovdyr. Fødekæden er brutal.',
        'Jægeren var stærkere og hurtigere. Sådan er naturens orden.',
        'Rovdyret slog til med dødbringende præcision.'
      ]
    }
  ],

  // ── UDKONKURRERET (ressourcemangel, niche-overlap) ──────────
  udkonkurreret: [
    {
      match: e => e.foedevalg === 'planteaeder' && ['stor', 'mega'].includes(hentStorrelseKlasse(e)),
      tekster: [
        'Stor planteæder — krævede enorme mængder vegetation. Der var ikke nok til alle.',
        'For mange munde om for lidt grønt. Størrelsen blev en ulempe.',
        'Stor krop, stort fødebehov. De mindre var bedre til at klare sig med lidt.'
      ]
    },
    {
      match: e => e.foedevalg === 'planteaeder',
      tekster: [
        'For mange planteædere, for lidt vegetation. Konkurrencen var dødelig.',
        'Andre planteædere var hurtigere til de bedste fødekilder.',
        'Planteæder i hård konkurrence. De bedst tilpassede overlevede — denne gang uden den.'
      ]
    },
    {
      match: e => e.foedevalg === 'altaeder',
      tekster: [
        'Altæder, men ikke specialist nok. Tabte til de bedre tilpassede.',
        'Kunne spise alt, men ikke bedre end specialisterne i dette habitat.',
        'Fleksibel kost var ikke nok mod dem der var perfekt tilpasset.'
      ]
    },
    {
      match: e => ['stor', 'mega'].includes(hentStorrelseKlasse(e)),
      tekster: [
        'Stor krop kræver enorm mængde føde. Habitatet kunne ikke levere nok.',
        'For stor til at gemme sig, for sulten til at klare sig med lidt.',
        'Størrelsen var en ulempe — behøvede mere end de andre og fandt mindre.'
      ]
    },
    {
      match: () => true,
      tekster: [
        'Habitatet var for barskt. De bedre tilpassede overlevede.',
        'Konkurrencen om ressourcerne var nådesløs.',
        'Ikke stærk nok, ikke hurtig nok, ikke tilpasset nok. Habitatet vandt.'
      ]
    }
  ],

  // ── SULT ───────────────────────────────────────────────────
  sult: [
    {
      match: e => e.foedevalg === 'koedaeder' && ['stor', 'mega'].includes(hentStorrelseKlasse(e)),
      tekster: [
        'Stor kødæder uden nok byttedyr. Jagtens energi oversteg udbyttet.',
        'Kæmpe rovdyr i et habitat med for få byttedyr. Sultede langsomt.',
        'Enorm appetit og for få bytter. Energiregnskabet gik ikke op.'
      ]
    },
    {
      match: e => e.foedevalg === 'koedaeder',
      tekster: [
        'Kødæder uden nok byttedyr. Sultede langsomt og desperat.',
        'Jagtinstinktet var skarpt, men byttedyrene var for få og for hurtige.',
        'En kødæder uden bytte er dømt til at sulte. Fødekæden brød sammen.'
      ]
    },
    {
      match: e => e.foedevalg === 'planteaeder',
      tekster: [
        'Planterne i dette habitat var for få eller utilgængelige.',
        'Planteæder i et fattigt habitat — vegetationen rakte simpelthen ikke.',
        'Ledte desperat efter spiselige planter. Fandt for få til at overleve.'
      ]
    },
    {
      match: e => ['stor', 'mega'].includes(hentStorrelseKlasse(e)),
      tekster: [
        'En stor krop kræver enorme mængder energi. Føden slap op.',
        'For stor og for sulten — habitatet kunne simpelthen ikke mætte den.',
        'Stor krop, enormt energibehov. Føderessourcerne rakte ikke.'
      ]
    },
    {
      match: () => true,
      tekster: [
        'Føden slap op. Sultens langsomme død er den mest grusomme.',
        'Ikke nok mad i dette habitat. Energien sivede langsomt ud af kroppen.',
        'Desperat søgen efter føde i et fattigt habitat. Forgæves.'
      ]
    }
  ],

  // ── UDMATTELSE (ressource-underskud: flugt + fejlangreb) ───
  udmattelse: [
    {
      match: e => e.foedevalg === 'koedaeder' || e.foedevalg === 'altaeder',
      tekster: [
        'Jagt efter jagt slog fejl. Energien fra de få bytter dækkede ikke forsøgene.',
        'Brugte mere kraft på mislykkede angreb end byttet nogensinde gav igen.',
        'En jæger der rammer for sjældent sulter mellem forsøgene. Kroppen gav op.'
      ]
    },
    {
      match: e => e.forsvar === 'hastighed',
      tekster: [
        'Flygtede igen og igen. Til sidst var der ingen kræfter tilbage.',
        'Hurtige ben reddede livet mange gange — men hver flugt tærede på energien.',
        'Konstant på flugt fra rovdyr. Udmattelsen blev til sidst dødelig.'
      ]
    },
    {
      match: () => true,
      tekster: [
        'Brugte mere energi på flugt og mislykkede jagter end den fik fra mad.',
        'Energiregnskabet gik i minus. Kroppen havde ikke mere at give af.',
        'Mere kamp og flugt end føde. Til sidst slap kræfterne op.'
      ]
    }
  ],

  // ── SYGDOM (populationscrash) ──────────────────────────────
  sygdom: [
    {
      match: () => true,
      tekster: [
        'For mange af samme slags på ét sted. Sygdommen sprang som ild.',
        'Tæt population, én sygdom — hele flokken smittet.',
        'Ingen variation, ingen modstandskraft. Sygdommen tog dem alle.'
      ]
    }
  ]
};

// --- Hovedfunktion ---
// Generer en biologisk forklaring på et dyrs død.
// dyr: dyr-objekt (med .egenskaber), habitat: string, aarsag: string
function genererDoedsTekst(dyr, habitat, aarsag) {
  const e = dyr.egenskaber || dyr;
  const regler = DOEDSTEKSTER[aarsag];
  if (!regler) return 'Dyret overlevede ikke i dette habitat.';

  // Saml matchende tekster fra specifikke regler (alt undtagen sidste)
  const specifikke = [];
  for (let i = 0; i < regler.length - 1; i++) {
    if (regler[i].match(e)) {
      specifikke.push(...regler[i].tekster);
    }
  }

  // Brug specifikke tekster eller fald tilbage til generiske (sidste)
  const pool = specifikke.length > 0 ? specifikke : regler[regler.length - 1].tekster;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Korte individ-dødstekster til event-feedet på stationen
// Ét præcist led: årsag + koblet egenskab, maks 10 ord
const KORT_DOED = {
  jaget: e => e.forsvar === 'hastighed'
    ? 'Flugtforsøget slog fejl — fanget af rovdyr.'
    : e.forsvar === 'gift'
      ? 'Giften reddede det ikke denne gang.'
      : e.forsvar === 'camouflage'
        ? 'Camouflagen slog fejl — opdaget af rovdyr.'
        : 'Fanget af et rovdyr.',
  sult: e => e.foedevalg === 'koedaeder'
    ? 'Kødæder — jagten gav ikke nok mad.'
    : 'Fandt ikke nok føde.',
  udmattelse: () => 'Brugte al energi på at flygte — udmattet.',
  sygdom: () => 'Smittet — for mange ens dyr tæt sammen.',
  udkonkurreret: e => ['stor', 'mega'].includes(hentStorrelseKlasse(e))
    ? 'For stor krop, for lidt mad — udkonkurreret.'
    : 'Tabte ressourcekampen til bedre tilpassede dyr.'
};

// Generer en kort, feedvenlig dødstekst til individ-begivenheder
function genererKortDoedsTekst(dyr, habitat, aarsag) {
  const e = dyr.egenskaber || dyr;
  const fn = KORT_DOED[aarsag];
  return fn ? fn(e) : 'Overlevede ikke i dette habitat.';
}

// --- Eksporter til browser ---
window.DeathText = { genererDoedsTekst, genererKortDoedsTekst };

// --- Test ---
(function() {
  console.log('=== deathtext.js test ===');

  const tests = [
    { e: { stofskifte: 'kold', kropsform: 'kold_lille', hudtype: 'skael', foedevalg: 'planteaeder', forsvar: 'camouflage' }, habitat: 'skov', aarsag: 'jaget' },
    { e: { stofskifte: 'varm', kropsform: 'stor_slank', hudtype: 'pels', foedevalg: 'koedaeder', forsvar: 'hastighed' }, habitat: 'skov', aarsag: 'sult' },
    { e: { stofskifte: 'varm', kropsform: 'lille_kraftig', hudtype: 'fjer', foedevalg: 'altaeder', forsvar: 'mimicry' }, habitat: 'skov', aarsag: 'udkonkurreret' },
    { e: { stofskifte: 'varm', kropsform: 'mega_kraftig', hudtype: 'pels', foedevalg: 'planteaeder', forsvar: 'pigge' }, habitat: 'skov', aarsag: 'udmattelse' },
    { e: { stofskifte: 'varm', kropsform: 'stor_kraftig', hudtype: 'skael', foedevalg: 'koedaeder', forsvar: 'gift' }, habitat: 'skov', aarsag: 'sygdom' }
  ];

  tests.forEach(({ e, habitat, aarsag }) => {
    const tekst = genererDoedsTekst({ egenskaber: e }, habitat, aarsag);
    console.log(`  [${aarsag}] ${tekst}`);
  });
})();
