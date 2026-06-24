# Game feel — håndværket bag engagement & polish

"Feel" er ikke pynt. Det er forskellen på en skærm et barn går forbi, og en skærm
et barn forelsker sig i. Feel opstår, når enhver handling besvares med **lagdelt,
eased og veltimet** feedback. Denne fil giver dig de konkrete greb — skrevet til
spillets stak: vanilla JS, canvas-rendering, 64×64 pixel art, `requestAnimationFrame`
og Web Audio.

**Indhold**
1. Easing er dit vigtigste håndtag
2. Timing — i millisekunder + frame-rate-uafhængighed
3. De tre slag: optakt, handling, efterdøn
4. Juice-stakken: ét event, mange svar (opskrifter til spillets øjeblikke)
5. Byggeklodser (kopiér ind)
6. Performance — så det forbliver jævnt
7. Anti-mønstre
8. Feel-tjekliste

---

## 1. Easing er dit vigtigste håndtag

Intet i et levende spil flytter sig lineært. Lineær bevægelse er den enkeltfejl,
der får alt til at føles billigt. Brug altid en kurve.

```js
const easing = {
  outQuad:    t => 1 - (1 - t) * (1 - t),
  inOutQuad:  t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2,
  outCubic:   t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2,
  outBack:    t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); },
  outElastic: t => { const c4 = 2*Math.PI/3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2,-10*t)*Math.sin((t*10 - .75)*c4) + 1; },
};
```

Hvilken kurve til hvad:
- **outCubic / outQuad** — standard for det meste: noget der glider på plads og standser blødt.
- **inOutCubic** — kamerabevægelser og overgange, der både starter og slutter blødt.
- **outBack** — knapper, valg, ting der "popper" ind. Det lille overshoot føles levende og tilfredsstillende.
- **outElastic** — sjældent, til ét stort, legende øjeblik (fx et nyfødt afkom). For meget bliver gummiagtigt.

På byggestationen (DOM) gælder det samme i CSS:
```css
.knap        { transition: transform .12s cubic-bezier(.34, 1.56, .64, 1); } /* outBack */
.knap:active { transform: scale(.94); }
.valgt       { animation: pop .18s cubic-bezier(.34, 1.56, .64, 1); }
@keyframes pop { 0% {transform:scale(1)} 45% {transform:scale(1.14)} 100% {transform:scale(1)} }
```

---

## 2. Timing — i millisekunder

Mennesker aflæser tid i snævre vinduer. Ram dem:
- **< 100 ms** — føles øjeblikkeligt (knap-respons, klik-feedback).
- **120–250 ms** — den søde plet for de fleste pops, fades og småskift.
- **300–600 ms** — store, betydningsfulde bevægelser (et dyr der fødes ind i habitatet).
- **Optakt: 60–150 ms** — nok til at varsle en handling uden at føles langsom.

**Variation slår uniformitet.** Hvis alt tager 200 ms, læser hjernen "billigt".
Forskyd varigheder og start-tidspunkter en smule, så det føles organisk.

**Gør al bevægelse frame-rate-uafhængig** med delta-tid (sekunder pr. frame),
ellers kører spillet hurtigere på en stærk PC end på en kiosk-mini-PC:
```js
let sidst = performance.now();
function løkke(nu) {
  let dt = (nu - sidst) / 1000; sidst = nu;
  dt = Math.min(dt, 0.05);           // clamp: undgå et spring efter en lag-spike
  opdaterTweens(dt);
  opdaterPartikler(dt);
  opdaterVerden(dt);                 // brug dt: x += hastighed * dt
  tegn();
  requestAnimationFrame(løkke);
}
requestAnimationFrame(løkke);
```

---

## 3. De tre slag: optakt, handling, efterdøn

Animationsprincippet, der gør en hændelse læsbar og tilfredsstillende. En handling
der bare "popper" føles billig; en handling med optakt og efterdøn føles vægtig.

- **Optakt (anticipation):** et lille modsat-ryk før handlingen. Et rovdyr dukker
  sig, før det springer. 60–120 ms.
- **Handling:** selve bevægelsen, gerne med lidt **stræk** (squash & stretch) i
  bevægelsesretningen.
- **Efterdøn (follow-through):** et lille overshoot og en sætten-sig bagefter. Brug
  `outBack` eller `outElastic`.

Billig squash på spawn (gør et statisk sprite levende):
```js
// skala starter sammenpresset, popper ud til 1 via outBack
dyr.skalaY = 0.6; dyr.skalaX = 1.3;
tweenTo(dyr, 'skalaY', 1, 0.32, 'outBack');
tweenTo(dyr, 'skalaX', 1, 0.32, 'outBack');
```

---

## 4. Juice-stakken: ét event, mange svar

Den vigtigste regel. Et øjeblik føles fladt, når det kun har én reaktion. Stak
flere samtidige svar oven på hinanden — bevægelse + skala + glimt + partikler +
lyd. Det er det, der adskiller "der skete noget" fra "WOW".

Opskrifter til spillets nøgle-øjeblikke (de få store, der gør forskellen):

| Øjeblik | Juice-stak |
|---|---|
| **Vælg egenskab** (byg) | knap-pop (`outBack`) · stigende klik-blip · preview-dyret laver en lille squash |
| **Send til habitat** (fødsel) | dyret zoomer ind med overshoot · støvsky-partikler ved landing · "pop"-lyd · kort lysglimt |
| **Græsning** | planten skrumper (`outQuad`) · få grønne partikler · blød "nam"-blip · dyret squasher let |
| **Jagt → drab** (det store cross-player-øjeblik) | optakt: rovdyret dukker sig · lunge med stræk · træf: kort screen shake + rød partikel-burst + dyb "thud" · offeret blinker og fader · **tilskriv på skærmen**: "Plettet Løve nedlagde din Brune Grævling" |
| **Formering** | glimt mellem forældrene · blødt opadgående blip · afkom popper ind med `outElastic` |
| **Død (individ)** | dyret tipper · fader til gråtone · lille nedadgående blip |
| **Sygdomscrash** | langsom optakt (skærmen toner "syg") · så ÉN stor, men læsbar bølge — aldrig kaos |

Bemærk: jagt-drabet er det øjeblik, hele "interaktion mellem spillernes dyr"-kravet
lever eller dør på. Giv det den fulde stak og gør det stort.

---

## 5. Byggeklodser (kopiér ind)

### Mikro-tween — ét lille system, ingen biblioteker
```js
const tweens = [];
function tweenTo(obj, prop, slut, varighed, ease = 'outCubic', onDone) {
  tweens.push({ obj, prop, start: obj[prop], slut, t: 0, varighed, ease, onDone });
}
function opdaterTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t = Math.min(1, tw.t + dt / tw.varighed);
    obj_sæt(tw, easing[tw.ease](tw.t));
    if (tw.t >= 1) { tweens.splice(i, 1); tw.onDone && tw.onDone(); }
  }
}
function obj_sæt(tw, k) { tw.obj[tw.prop] = tw.start + (tw.slut - tw.start) * k; }
```

### Partikler — billigt liv og taktil feedback
```js
const partikler = [];
function spray(x, y, antal, farve) {
  for (let i = 0; i < antal; i++) {
    const fart = 30 + Math.random() * 70, vinkel = Math.random() * Math.PI * 2;
    partikler.push({ x, y, vx: Math.cos(vinkel)*fart, vy: Math.sin(vinkel)*fart - 25,
                     liv: 0.5 + Math.random()*0.3, alder: 0, farve });
  }
}
function opdaterPartikler(dt) {
  for (let i = partikler.length - 1; i >= 0; i--) {
    const p = partikler[i];
    p.alder += dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 140*dt; // tyngdekraft
    if (p.alder >= p.liv) partikler.splice(i, 1);
  }
}
function tegnPartikler(ctx) {
  for (const p of partikler) {
    ctx.globalAlpha = 1 - p.alder / p.liv;
    ctx.fillStyle = p.farve;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
  }
  ctx.globalAlpha = 1;
}
```

### Screen shake — kun til træf, altid henfaldende
```js
let rystelse = 0;
const ryst = (styrke) => { rystelse = Math.max(rystelse, styrke); }; // fx ryst(6) ved et drab
// i render, FØR du tegner verdenen:
ctx.save();
if (rystelse > 0.1) {
  ctx.translate((Math.random()*2 - 1) * rystelse, (Math.random()*2 - 1) * rystelse);
  rystelse *= 0.86;
}
// ... tegn verdenen ...
ctx.restore();
```

### Lyd-feedback — Web Audio, med pitch-variation så det aldrig bliver træls
```js
const lyd = new (window.AudioContext || window.webkitAudioContext)();
function blip(frekvens = 440, varighed = 0.08, form = 'square') {
  const o = lyd.createOscillator(), g = lyd.createGain(), t = lyd.currentTime;
  o.type = form;
  o.frequency.value = frekvens * (0.97 + Math.random() * 0.06); // aldrig to helt ens
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.2, t + 0.008);      // hurtig attack
  g.gain.exponentialRampToValueAtTime(0.0001, t + varighed); // henfald
  o.connect(g).connect(lyd.destination);
  o.start(t); o.stop(t + varighed);
}
// valg: blip(stigende), drab: blip(90, .18, 'sawtooth'), nyt afkom: blip(660, .12, 'triangle')
```

---

## 6. Performance — så det forbliver jævnt

Jævnhed ER feel. En stutter ødelægger den bedste animation. På en kiosk-mini-PC:
- **Allokér ikke i løkken.** Ingen nye arrays/objekter pr. frame. Genbrug, eller pool.
- **Loft over partikler.** Cap fx på 300 levende; drop nye frem for at vokse uendeligt.
- **Pixel art skarp:** sæt `ctx.imageSmoothingEnabled = false` og tegn på heltals-
  koordinater (`Math.round`), ellers bliver dine 64×64-sprites slørede.
- **Cull det usynlige.** Spring tegning af dyr/partikler udenfor skærmen over.
- **Mål med playtesten.** `summary.json` rapporterer min-fps — falder den under ~50,
  så find synderen, før du tilføjer mere.

---

## 7. Anti-mønstre

- **Lineær bevægelse** — føles altid billigt. Brug en kurve.
- **Hårde spring** — noget der teleporterer i stedet for at glide. Tween det.
- **Uniform timing** — alt på 200 ms. Varier varigheder og start-tidspunkter.
- **Shake på alt** — reservér rystelse til reelle træf. Ellers mister den betydning.
- **Juice uden mening** — effekter der ikke svarer til en rigtig hændelse forvirrer
  barnet. Hver effekt skal sige noget sandt om spillet.
- **Lyd på hver frame** — ørerne bliver trætte. Rate-limit, og variér tonehøjden.

---

## 8. Feel-tjekliste (supplerer kvalitetsbaren i SKILL.md)

- [ ] Bruger hver bevægelse en easing-kurve (ingen lineær, ingen hårde spring)?
- [ ] Har de store øjeblikke den fulde juice-stak (bevægelse + glimt + partikler + lyd)?
- [ ] Har drab/fødsel/formering optakt og efterdøn — ikke bare et pop?
- [ ] Er timingen varieret, så det føles organisk og ikke mekanisk?
- [ ] Er min-fps i `summary.json` stabil (~60, aldrig under ~50)?
- [ ] Er pixel art stadig skarp (smoothing fra, heltals-koordinater)?
