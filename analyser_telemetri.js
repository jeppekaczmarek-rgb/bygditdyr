#!/usr/bin/env node
// ============================================================
// analyser_telemetri.js — Læser telemetri-sessioner og giver
// konkrete tuning-anbefalinger til habitat.js.
//
// Brug:
//   node analyser_telemetri.js                # læser alle telemetri/*.json
//   node analyser_telemetri.js fil1.json ...  # specifikke filer
//
// Hensigten: Claude (eller du) kører dette og får et overblik over
// OM mekanikkerne udløses og OM der er flow nok — uden manuelt at
// grave i rådata.
// ============================================================

const fs = require('fs');
const path = require('path');

// --- Find filer ---
let filer = process.argv.slice(2);
if (filer.length === 0) {
  const dir = path.join(__dirname, 'telemetri');
  if (fs.existsSync(dir)) {
    filer = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => path.join(dir, f));
  }
}
if (filer.length === 0) {
  console.error('Ingen telemetri-filer fundet. Læg .json-eksporter i mappen  telemetri/  eller angiv stier.');
  process.exit(1);
}

// --- Aggreger ---
const agg = {
  sessioner: 0, habitater: {},
  wallSek: 0, dyrTidSek: 0, kaskadeSek: 0,
  tilstandSek: { HVILER: 0, FOURAGER: 0, FLUGTER: 0, JAGER: 0 },
  taeller: { ankomst: 0, foedsel: 0, doed: 0, panik: 0, ambush_spring: 0, konkurrence: 0,
             fangst_draebt: 0, fangst_undslap: 0, fangst_gift: 0, fangst_pigge: 0 },
  doedsaarsager: {}, levetider: [], levetidPerEgenskab: {}, population: {}
};

function flet(maal, kilde) { for (const [k, v] of Object.entries(kilde || {})) maal[k] = (maal[k] || 0) + v; }

for (const f of filer) {
  let s;
  try { s = JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { console.error('Springer over (ugyldig JSON):', f); continue; }
  agg.sessioner++;
  const hab = s.meta?.habitat || '?';
  agg.habitater[hab] = (agg.habitater[hab] || 0) + 1;

  const r = s._raw || {};
  agg.wallSek += r.wallSek || s.meta?.varighedSek || 0;
  agg.dyrTidSek += r.dyrTidSek || 0;
  agg.kaskadeSek += r.kaskadeSek || 0;
  for (const st of Object.keys(agg.tilstandSek)) agg.tilstandSek[st] += (r.tilstandSek?.[st] || 0);

  flet(agg.taeller, s.haendelser);
  flet(agg.doedsaarsager, s.doedsaarsager);
  if (Array.isArray(r.levetider)) agg.levetider.push(...r.levetider);

  for (const [k, vals] of Object.entries(r.levetidPerEgenskab || {})) {
    agg.levetidPerEgenskab[k] = agg.levetidPerEgenskab[k] || {};
    for (const [v, arr] of Object.entries(vals)) {
      (agg.levetidPerEgenskab[k][v] = agg.levetidPerEgenskab[k][v] || []).push(...arr);
    }
  }
  for (const grp of ['kost', 'forsvar', 'storrelse', 'stofskifte']) {
    agg.population[grp] = agg.population[grp] || {};
    flet(agg.population[grp], s.population?.[grp]);
  }
}

// --- Hjælpere ---
const pct = (del, helhed) => helhed > 0 ? +(del / helhed * 100).toFixed(1) : 0;
const gns = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
const jagtForsoeg = () => agg.taeller.fangst_draebt + agg.taeller.fangst_undslap +
  agg.taeller.fangst_gift + agg.taeller.fangst_pigge;
function bar(p, bredde = 24) { const n = Math.round(p / 100 * bredde); return '█'.repeat(n) + '·'.repeat(bredde - n); }

// --- Rapport ---
const L = [];
L.push('═'.repeat(60));
L.push(`  TELEMETRI-ANALYSE  ·  ${agg.sessioner} session(er)  ·  ${Math.round(agg.wallSek)}s total`);
L.push(`  Habitater: ${Object.entries(agg.habitater).map(([h, n]) => `${h}×${n}`).join(', ')}`);
L.push(`  Dyr ankommet: ${agg.taeller.ankomst}  ·  fødsler: ${agg.taeller.foedsel}  ·  døde: ${agg.taeller.doed}`);
L.push('═'.repeat(60));

L.push('\nTILSTANDSFORDELING (andel af dyre-tid)');
for (const st of ['HVILER', 'FOURAGER', 'FLUGTER', 'JAGER']) {
  const p = pct(agg.tilstandSek[st], agg.dyrTidSek);
  L.push(`  ${st.padEnd(9)} ${bar(p)} ${p}%`);
}

L.push('\nMEKANIK-TÆLLERE (udløses de overhovedet?)');
L.push(`  Panikflugt ........ ${agg.taeller.panik}`);
L.push(`  Ambush-spring ..... ${agg.taeller.ambush_spring}`);
L.push(`  Konkurrence ....... ${agg.taeller.konkurrence}`);
L.push(`  Kaskade aktiv ..... ${pct(agg.kaskadeSek, agg.wallSek)}% af tiden`);

const forsoeg = jagtForsoeg();
L.push('\nJAGTBALANCE');
L.push(`  Forsøg ............ ${forsoeg}`);
L.push(`  Dræbt ............. ${agg.taeller.fangst_draebt}  (rate ${pct(agg.taeller.fangst_draebt, forsoeg)}%)`);
L.push(`  Undslap (flugt) ... ${agg.taeller.fangst_undslap}`);
L.push(`  Afvist gift ....... ${agg.taeller.fangst_gift}`);
L.push(`  Afvist pigge ...... ${agg.taeller.fangst_pigge}`);

L.push('\nLEVETID');
L.push(`  Gennemsnit ........ ${gns(agg.levetider)}s  (n=${agg.levetider.length})`);
const dod = Object.entries(agg.doedsaarsager).sort((a, b) => b[1] - a[1]);
if (dod.length) L.push('  Dødsårsager: ' + dod.map(([a, n]) => `${a} ${n}`).join(' · '));

// Levetid pr. egenskab — afslører balance-skævheder mod overlevelsesmatrixen
L.push('\nLEVETID PR. EGENSKAB (n ≥ 3)');
for (const [k, vals] of Object.entries(agg.levetidPerEgenskab)) {
  const rk = Object.entries(vals)
    .filter(([, arr]) => arr.length >= 3)
    .map(([v, arr]) => `${v}:${gns(arr)}s(${arr.length})`);
  if (rk.length) L.push(`  ${k.padEnd(11)} ${rk.join('  ')}`);
}

// --- Anbefalinger ---
const anbef = [];
const tHvile = pct(agg.tilstandSek.HVILER, agg.dyrTidSek);
const tJagt = pct(agg.tilstandSek.JAGER, agg.dyrTidSek);
const tFlugt = pct(agg.tilstandSek.FLUGTER, agg.dyrTidSek);

if (agg.wallSek < 60) anbef.push('⓪ Kort datagrundlag (<60s). Kør længere sessioner for sikrere konklusioner.');
if (tHvile > 70) anbef.push(`① For meget HVILE (${tHvile}%) → lavt flow. Hæv FOURAGER-tærsklerne (FOURAGER_TAERSKEL_LAVT/HOJT) eller energitabet ENERGI_DEPLETION, så dyrene oftere søger mad.`);
if (agg.taeller.ambush_spring === 0 && agg.wallSek > 30) anbef.push('② Ambush-spring udløses ALDRIG → mellem/små rovdyr når ikke 80px. Hæv AMBUSH_AFSTAND, eller test scenariet "Ambush-baghold" med bytte tæt på.');
if (forsoeg === 0 && agg.wallSek > 30) anbef.push('③ Ingen jagter overhovedet → mangler rovdyr/bytte i passende størrelser, eller JAGER_TAERSKEL er for lav. Tjek population.kost.');
if (forsoeg > 0 && pct(agg.taeller.fangst_draebt, forsoeg) < 15) anbef.push(`④ Meget lav fangstrate (${pct(agg.taeller.fangst_draebt, forsoeg)}%) → byttet undslipper næsten altid. Overvej at sænke flugt-undvigelseschancen (0.5) eller pursuit-farten.`);
if (forsoeg > 0 && pct(agg.taeller.fangst_draebt, forsoeg) > 85) anbef.push(`④ Meget høj fangstrate (${pct(agg.taeller.fangst_draebt, forsoeg)}%) → byttet har ingen chance. Hæv flugt-undvigelse eller detektionsradius for bytte.`);
if (agg.taeller.panik === 0 && agg.population.forsvar?.flugt > 0 && agg.wallSek > 30) anbef.push('⑤ Flugt-dyr findes, men panik udløses aldrig → de møder aldrig rovdyr. Tjek population-balancen.');
if (agg.taeller.konkurrence === 0 && (agg.population.kost?.planteaeder || 0) >= 3) anbef.push('⑥ Flere planteædere, men ingen konkurrence → de samles ikke om planter. Overvej færre planter (PLANTE_ANTAL) eller større KONKURRENCE_RADIUS.');
if (tFlugt > 45) anbef.push(`⑦ Meget høj FLUGT-andel (${tFlugt}%) → habitatet er rovdyr-tungt; byttet nærmest aldrig fouragerer. Skru ned for rovdyr-andelen.`);
if (tJagt > 0 && tJagt < 3 && forsoeg > 0) anbef.push(`⑧ JAGER-andel er lav (${tJagt}%) men der ER fangster — jagterne er korte/effektive; sandsynligvis fint.`);

L.push('\n' + '─'.repeat(60));
L.push('ANBEFALINGER');
if (anbef.length === 0) L.push('  ✓ Ingen røde flag. Mekanikkerne udløses og flowet ser balanceret ud.');
else anbef.forEach(a => L.push('  ' + a));
L.push('─'.repeat(60));

console.log(L.join('\n'));
