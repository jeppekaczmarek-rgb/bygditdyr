// Balance-analyse af overlevelsesmodellen (replikerer survival.js)
const HABITAT_SCORE = {
  skov: { stofskifte:{hojt:1,lavt:-1}, hudtype:{pels:1,fjer:1,skael:0,glat:-1}, kost:{planteaeder:1,koedaeder:0,alleaeder:2}, storrelse:{lille:0,mellem:1,stor:-1}, aktivitet:{dagaktiv:1,nataktiv:0}, forsvar:{giftig:1,pigge:1,flugt:2,ingen:-1} },
  arktis:{ stofskifte:{hojt:2,lavt:-2}, hudtype:{pels:2,fjer:1,skael:-2,glat:-2}, kost:{planteaeder:-1,koedaeder:2,alleaeder:1}, storrelse:{lille:-1,mellem:1,stor:2}, aktivitet:{dagaktiv:1,nataktiv:-2}, forsvar:{giftig:0,pigge:0,flugt:1,ingen:-1} },
  oerken:{ stofskifte:{hojt:-1,lavt:2}, hudtype:{pels:-2,fjer:1,skael:2,glat:-1}, kost:{planteaeder:1,koedaeder:1,alleaeder:2}, storrelse:{lille:1,mellem:0,stor:-1}, aktivitet:{dagaktiv:-1,nataktiv:2}, forsvar:{giftig:2,pigge:1,flugt:0,ingen:-1} }
};
const ENERGI = {
  stofskifte:{hojt:3,lavt:1}, hudtype:{pels:2,fjer:2,skael:1,glat:1}, kost:{planteaeder:1,koedaeder:3,alleaeder:2}, storrelse:{lille:1,mellem:2,stor:3}, aktivitet:{dagaktiv:1,nataktiv:2}, forsvar:{giftig:3,pigge:2,flugt:2,ingen:0}
};
const MAX=10, BASIS=60, MULT=8, MINTID=10;
const cats=Object.keys(HABITAT_SCORE.skov);
const vals=Object.fromEntries(cats.map(c=>[c,Object.keys(HABITAT_SCORE.skov[c])]));
function energi(b){return cats.reduce((s,c)=>s+ENERGI[c][b[c]],0);}
function score(b,h){return cats.reduce((s,c)=>s+HABITAT_SCORE[h][c][b[c]],0);}
function tid(s){return Math.max(MINTID,BASIS+s*MULT);}
// generer alle
let all=[];
(function rec(i,b){ if(i===cats.length){all.push({...b});return;} for(const v of vals[cats[i]]){b[cats[i]]=v;rec(i+1,b);} })(0,{});
const valid=all.filter(b=>energi(b)<=MAX);
console.log(`=== OMFANG ===`);
console.log(`Alle kombinationer: ${all.length}`);
console.log(`Gyldige (energi <=10): ${valid.length} (${(100*valid.length/all.length).toFixed(0)}%)`);
console.log(`Energi-fordeling (alle): min ${Math.min(...all.map(energi))}, max ${Math.max(...all.map(energi))}`);

for(const h of Object.keys(HABITAT_SCORE)){
  console.log(`\n=== ${h.toUpperCase()} ===`);
  // teoretisk max uden energigrænse
  let theoMax=cats.reduce((s,c)=>s+Math.max(...vals[c].map(v=>HABITAT_SCORE[h][c][v])),0);
  const withScore=valid.map(b=>({b,s:score(b,h),e:energi(b)}));
  const maxValid=Math.max(...withScore.map(x=>x.s));
  const minValid=Math.min(...withScore.map(x=>x.s));
  console.log(`Teoretisk max-score (uden energigrænse): ${theoMax}  | bedste GYLDIGE score: ${maxValid}  | værste gyldige: ${minValid}`);
  console.log(`Overlevelsestid-spænd (gyldige): ${tid(minValid)}s – ${tid(maxValid)}s  (forskel ${tid(maxValid)-tid(minValid)}s)`);
  // bedste gyldige builds
  const best=withScore.filter(x=>x.s===maxValid).sort((a,b)=>a.e-b.e);
  console.log(`Antal gyldige builds med top-score (${maxValid}): ${best.length}`);
  best.slice(0,6).forEach(x=>console.log(`   [e${x.e}] ${cats.map(c=>x.b[c]).join('/')}`));
  // trait-frekvens i top 20 gyldige builds
  const top=withScore.sort((a,b)=>b.s-a.s).slice(0,20);
  const freq={};
  for(const c of cats){freq[c]={};for(const x of top){freq[c][x.b[c]]=(freq[c][x.b[c]]||0)+1;}}
  console.log(`Trait-frekvens i top-20 gyldige builds:`);
  for(const c of cats){
    const parts=Object.entries(freq[c]).sort((a,b)=>b[1]-a[1]).map(([v,n])=>`${v}:${n}`).join('  ');
    console.log(`   ${c.padEnd(11)} ${parts}`);
  }
}

// Dominans på tværs: hvilke trait-værdier optræder ALDRIG i en top-10 build i NOGET habitat?
console.log(`\n=== "DØDE" VALG (aldrig i top-10 gyldige builds i noget habitat) ===`);
const everTop=new Set();
for(const h of Object.keys(HABITAT_SCORE)){
  valid.map(b=>({b,s:score(b,h)})).sort((a,b)=>b.s-a.s).slice(0,10)
    .forEach(x=>cats.forEach(c=>everTop.add(c+':'+x.b[c])));
}
for(const c of cats){for(const v of vals[c]){ if(!everTop.has(c+':'+v)) console.log(`   ${c}: ${v}`);}}

// Allæder-dominans tjek
console.log(`\n=== ALLÆDER-TJEK (er allæder altid bedst/lige-bedst på kost?) ===`);
for(const h of Object.keys(HABITAT_SCORE)){
  const k=HABITAT_SCORE[h].kost;
  console.log(`   ${h}: plante ${k.planteaeder}, kød ${k.koedaeder}, alle ${k.alleaeder}  (alle koster 2, plante 1, kød 3)`);
}

// Universel build: findes en enkelt build der er gyldig OG scorer >=middel i alle 3?
console.log(`\n=== GENERALIST-BUILD (bedste gennemsnit over 3 habitater, gyldig) ===`);
const gen=valid.map(b=>({b,avg:(score(b,'skov')+score(b,'arktis')+score(b,'oerken'))/3,e:energi(b),
  s:[score(b,'skov'),score(b,'arktis'),score(b,'oerken')]})).sort((a,b)=>b.avg-a.avg);
gen.slice(0,5).forEach(x=>console.log(`   avg ${x.avg.toFixed(2)} [e${x.e}] skov/ark/ørk = ${x.s.join('/')}  :: ${cats.map(c=>x.b[c]).join('/')}`));
