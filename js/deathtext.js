// ============================================================
// deathtext.js — Biologiske dødsforklaringer
// Returnerer en kort, dramatisk, biologisk præcis sætning
// der forklarer hvorfor dyret døde — skrevet til 10-12-årige.
// ============================================================

// Tekstregler per dødsårsag.
// Hver årsag har en liste af { match, tekster } objekter.
// Sidste element i hver liste er altid en generisk fallback.
const DOEDSTEKSTER = {

  // ── FRYS (arktis) ──────────────────────────────────────────
  frys: [
    {
      match: e => e.stofskifte === 'lavt' && e.storrelse === 'lille',
      tekster: [
        'Lille og koldblodigt i polarvinteren. Varmen forsvandt på få minutter.',
        'Lille krop uden eget stofskifte i arktisk kulde — en dødelig kombination.',
        'Koldblodigt og lille. Kroppen frøs hurtigere end den kunne reagere.'
      ]
    },
    {
      match: e => e.stofskifte === 'lavt',
      tekster: [
        'Lavt stofskifte i arktisk kulde. Kroppen kunne ikke producere varme nok.',
        'Koldblodigt i polarvinteren — kropstemperaturen faldt til det var for sent.',
        'Uden eget stofskifte til varmeproduktion frøs blodet langsomt til is.'
      ]
    },
    {
      match: e => e.hudtype === 'skael',
      tekster: [
        'Skæl giver ingen isolering mod arktisk frost. Varmen slap ud på minutter.',
        'Skælhud i minus 40 grader. Ingen beskyttelse mod den bidende kulde.',
        'Skæl holder vand ude — men ikke kulde. Frøs langsomt ihjel.'
      ]
    },
    {
      match: e => e.hudtype === 'glat',
      tekster: [
        'Glat hud uden isolering i arktisk vinter. Kroppen mistede al varme.',
        'Bar hud i iskoldt klima — varmen forsvandt næsten øjeblikkeligt.',
        'Ingen pels, ingen fjer. Bare bar hud i snestormen. Ingen chance.'
      ]
    },
    {
      match: e => e.storrelse === 'lille',
      tekster: [
        'Lille krop, stort varmetab. Overflade-til-volumen-forholdet var fatalt.',
        'For lille til at holde på varmen — kulden vandt hurtigt.',
        'Små dyr taber varme hurtigere end store. Bergmanns regel slog til.'
      ]
    },
    {
      match: e => e.aktivitet === 'nataktiv',
      tekster: [
        'Nataktiv under arktisk mørketid. Den koldeste del af døgnet blev dødelig.',
        'Aktiv om natten når temperaturen styrtdykker. Kulden var ubarmhjertig.',
        'Polarnattens kulde var for meget for et nataktivt dyr.'
      ]
    },
    {
      match: () => true,
      tekster: [
        'Arktisk kulde er nådesløs. Kroppen overgav sig til frosten.',
        'Polarvinteren vinder altid mod de dårligt tilpassede.',
        'Kulden krøb ind i kroppen. Langsomt stoppede hjertet.'
      ]
    }
  ],

  // ── TØRKE (ørken) ──────────────────────────────────────────
  toerke: [
    {
      match: e => e.stofskifte === 'hojt' && e.hudtype === 'pels',
      tekster: [
        'Varmblodigt og pelsbeklædt i ørkenvarme. Dobbelt dødsdom.',
        'Højt stofskifte plus tyk pels — kroppen brændte op indefra i heden.',
        'Pels og varmt blod i 50 grader. Den værst tænkelige kombination.'
      ]
    },
    {
      match: e => e.stofskifte === 'hojt',
      tekster: [
        'Højt stofskifte i ørkenvarme — kroppen brændte igennem sit vandlager.',
        'Varmblodigt i 50 graders hede. Energiforbruget var uholdbart.',
        'Højt stofskifte kræver vand til køling. I ørkenen var der ingen.'
      ]
    },
    {
      match: e => e.hudtype === 'pels',
      tekster: [
        'Tyk pels i brændende ørkenvarme. Kroppen overophedede og udtørrede.',
        'Pels der isolerer — også mod den varme man vil af med. Fatal i ørkenen.',
        'Pelsbeklædt under brændende sol. Kroppen kogte indefra.'
      ]
    },
    {
      match: e => e.hudtype === 'glat',
      tekster: [
        'Glat hud i ørkensolen. Vandet fordampede direkte fra kroppen.',
        'Bar hud i ørkenen — fugten sivede ud og forsvandt i den tørre luft.',
        'Uden skæl eller fjer fordampede vandet uhindret fra huden.'
      ]
    },
    {
      match: e => e.storrelse === 'stor',
      tekster: [
        'Stor krop i ørkenen — for meget masse at køle ned, for meget vand krævet.',
        'En stor krop kræver enorme mængder vand. Ørkenen havde for lidt.',
        'Stor og tørstig i det tørreste habitat. Vandbalancen kollapsede.'
      ]
    },
    {
      match: e => e.aktivitet === 'dagaktiv',
      tekster: [
        'Dagaktiv under ørkensolen. Aktiv i de varmeste timer var en dødsdom.',
        'Ude i middagsheden i stedet for at søge skygge. Overophedet.',
        'Dagaktiv i ørkenen — solen udtørrede kroppen time for time.'
      ]
    },
    {
      match: () => true,
      tekster: [
        'Ørkenen tilgiver ikke de dårligt tilpassede. Tørsten vandt.',
        'Vandmangel i ubarmhjertig hede. Kroppen tørrede langsomt ud.',
        'Ørkensolen brændte nådesløst. Vandet slap op.'
      ]
    }
  ],

  // ── JAGET (rovdyr) ─────────────────────────────────────────
  jaget: [
    {
      match: e => e.forsvar === 'ingen' && e.storrelse === 'lille',
      tekster: [
        'Lille og forsvarsløs. Det perfekte bytte for en sulten jæger.',
        'Uden forsvar og for lille til at kæmpe imod. Naturen er brutal.',
        'Lille krop, intet forsvar — jægeren behøvede kun ét forsøg.'
      ]
    },
    {
      match: e => e.forsvar === 'ingen',
      tekster: [
        'Uden forsvar mod en sulten jæger. Havde ingen chance.',
        'Hverken gift, pigge eller hurtighed — et let bytte for rovdyret.',
        'Forsvarsløst da jægeren slog til. Naturen er nådesløs.'
      ]
    },
    {
      match: e => e.forsvar === 'flugt',
      tekster: [
        'Forsøgte at flygte, men jægeren var hurtigere denne gang.',
        'Hurtig flugt reddede livet mange gange — men ikke denne gang.',
        'Løb alt hvad den kunne. Jægeren var tættere end forventet.'
      ]
    },
    {
      match: e => e.storrelse === 'lille',
      tekster: [
        'For lille til at forsvare sig mod en større jæger.',
        'Lille og sårbar — den perfekte størrelse for et sultent rovdyr.',
        'Størrelsen afgjorde det. Jægeren var simpelthen for stor og stærk.'
      ]
    },
    {
      match: e => e.kost === 'planteaeder',
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

  // ── UDKONKURRERET ──────────────────────────────────────────
  udkonkurreret: [
    {
      match: e => e.kost === 'planteaeder' && e.storrelse === 'stor',
      tekster: [
        'Stor planteæder — krævede enorme mængder vegetation. Der var ikke nok til alle.',
        'For mange munde om for lidt grønt. Størrelsen blev en ulempe.',
        'Stor krop, stort fødebehov. De mindre var bedre til at klare sig med lidt.'
      ]
    },
    {
      match: e => e.kost === 'planteaeder',
      tekster: [
        'For mange planteædere, for lidt vegetation. Konkurrencen var dødelig.',
        'Andre planteædere var hurtigere til de bedste fødekilder.',
        'Planteæder i hård konkurrence. De bedst tilpassede overlevede — denne gang uden den.'
      ]
    },
    {
      match: e => e.kost === 'alleaeder',
      tekster: [
        'Alleæder, men ikke specialist nok. Tabte til de bedre tilpassede.',
        'Kunne spise alt, men ikke bedre end specialisterne i dette habitat.',
        'Fleksibel kost var ikke nok mod dem der var perfekt tilpasset.'
      ]
    },
    {
      match: e => e.forsvar === 'ingen',
      tekster: [
        'Uden forsvar i et barskt habitat. Presset fra konkurrenterne blev for stort.',
        'Intet forsvar og for svag til at konkurrere. En dødelig kombination.',
        'Forsvarsløs og udkonkurreret — de stærkere tog alle ressourcerne.'
      ]
    },
    {
      match: e => e.storrelse === 'stor',
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
      match: e => e.kost === 'koedaeder' && e.storrelse === 'stor',
      tekster: [
        'Stor kødæder uden nok byttedyr. Jagtens energi oversteg udbyttet.',
        'Kæmpe rovdyr i et habitat med for få byttedyr. Sultede langsomt.',
        'Enorm appetit og for få bytter. Energiregnskabet gik ikke op.'
      ]
    },
    {
      match: e => e.kost === 'koedaeder',
      tekster: [
        'Kødæder uden nok byttedyr. Sultede langsomt og desperat.',
        'Jagtinstinktet var skarpt, men byttedyrene var for få og for hurtige.',
        'En kødæder uden bytte er dømt til at sulte. Fødekæden brød sammen.'
      ]
    },
    {
      match: e => e.kost === 'planteaeder',
      tekster: [
        'Planterne i dette habitat var for få eller utilgængelige.',
        'Planteæder i et fattigt habitat — vegetationen rakte simpelthen ikke.',
        'Ledte desperat efter spiselige planter. Fandt for få til at overleve.'
      ]
    },
    {
      match: e => e.storrelse === 'stor',
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
      match: e => e.kost === 'koedaeder' || e.kost === 'alleaeder',
      tekster: [
        'Jagt efter jagt slog fejl. Energien fra de få bytter dækkede ikke forsøgene.',
        'Brugte mere kraft på mislykkede angreb end byttet nogensinde gav igen.',
        'En jæger der rammer for sjældent sulter mellem forsøgene. Kroppen gav op.'
      ]
    },
    {
      match: e => e.forsvar === 'flugt',
      tekster: [
        'Flygtede igen og igen. Til sidst var der ingen kræfter tilbage.',
        'Hurtige ben reddede livet mange gange — men hver flugt tærede på energien.',
        'Konstant på flugt fra rovdyr. Udmattelsen blev til sidst dødelig.'
      ]
    },
    {
      match: e => e.forsvar === 'ingen' || e.storrelse === 'lille',
      tekster: [
        'Måtte flygte fra alt og alle. Energiregnskabet løb tør.',
        'For mange faretruende situationer, for lidt ro til at spise. Kroppen sled op.',
        'Brugte alt på at undslippe — der var intet tilbage til at leve af.'
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
  frys: e => e.stofskifte === 'lavt'
    ? 'Koldblodigt i frost — frøs ihjel.'
    : e.hudtype === 'glat' || e.hudtype === 'skael'
      ? 'Ingen varmeisolering — frøs ihjel.'
      : 'Kulden var for hård.',
  toerke: e => e.hudtype === 'pels'
    ? 'Pelsen kogte dyret indefra i heden.'
    : e.stofskifte === 'hojt'
      ? 'Varmblodigt i ørkenen — overophedede.'
      : 'Tørken vandt.',
  jaget: e => e.forsvar === 'ingen'
    ? 'Intet forsvar — let bytte for et rovdyr.'
    : e.forsvar === 'flugt'
      ? 'Flugtforsøget slog fejl — fanget.'
      : 'Fanget af et rovdyr.',
  sult: e => e.kost === 'koedaeder'
    ? 'Kødæder — jagten gav ikke nok mad.'
    : 'Fandt ikke nok føde.',
  udmattelse: () => 'Brugte al energi på at flygte — udmattet.',
  sygdom: () => 'Smittet — for mange ens dyr tæt sammen.',
  udkonkurreret: e => e.storrelse === 'stor'
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
    { e: { stofskifte: 'lavt', hudtype: 'skael', kost: 'planteaeder', storrelse: 'lille', aktivitet: 'nataktiv', forsvar: 'ingen' }, habitat: 'arktis', aarsag: 'frys' },
    { e: { stofskifte: 'hojt', hudtype: 'pels', kost: 'koedaeder', storrelse: 'stor', aktivitet: 'dagaktiv', forsvar: 'giftig' }, habitat: 'oerken', aarsag: 'toerke' },
    { e: { stofskifte: 'lavt', hudtype: 'glat', kost: 'planteaeder', storrelse: 'lille', aktivitet: 'dagaktiv', forsvar: 'ingen' }, habitat: 'skov', aarsag: 'jaget' },
    { e: { stofskifte: 'hojt', hudtype: 'fjer', kost: 'alleaeder', storrelse: 'mellem', aktivitet: 'dagaktiv', forsvar: 'flugt' }, habitat: 'skov', aarsag: 'udkonkurreret' },
    { e: { stofskifte: 'hojt', hudtype: 'pels', kost: 'koedaeder', storrelse: 'stor', aktivitet: 'dagaktiv', forsvar: 'pigge' }, habitat: 'arktis', aarsag: 'sult' }
  ];

  tests.forEach(({ e, habitat, aarsag }) => {
    const tekst = genererDoedsTekst({ egenskaber: e }, habitat, aarsag);
    console.log(`  [${aarsag}] ${tekst}`);
  });
})();
