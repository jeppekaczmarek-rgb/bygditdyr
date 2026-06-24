# Visuelt liv — verdenen skal ånde

En død skærm er den hurtigste måde at miste et barn på. Et menneske scanner
ubevidst efter bevægelse; en stillestående skærm læses som "slukket" og forbigås.
Omvendt: en verden, hvor noget altid rører på sig, trækker blikket til sig og
holder på det. Det meste af dette koster **ingen ny grafik** — det er procedurel
bevægelse lagt oven på de sprites, du allerede har.

Den vigtige balance op front: liv betyder **rolig, baggrunds-bevægelse hele tiden**
— ikke kaos. Idle-livet skal ligge under de få store øjeblikke, ikke konkurrere med
dem. Aflæselighed først (se `museum-craft.md`), liv ovenpå.

**Indhold**
1. Grundreglen: aldrig en død skærm
2. Idle-liv: få sprites til at ånde
3. Fase-forskydning: ingen to dyr i takt
4. Bevægelse med liv: gang-bob og sekundær bevægelse
5. Dybde: lag, parallax og kamera
6. Levende baggrunde pr. habitat
7. Mikro-variation: ingen to dyr ens
8. Levende byggestation
9. Balance: liv ≠ støj
10. Anti-mønstre + tjekliste

Snippets bygger videre på `dt`-løkken og `tweenTo` fra `game-feel.md`. Antag en
global `tid` (sekunder), der tælles op: `tid += dt`.

---

## 1. Grundreglen: aldrig en død skærm

Hvis du tager et screenshot på et tilfældigt tidspunkt og intet ser ud til at
bevæge sig, er der et problem. Der skal altid være mindst:
- dyrene, der trækker vejret og småbevæger sig (idle-liv),
- noget ambient i baggrunden (svajende planter, drivende partikler, skiftende lys),
- en ganske let kamera-drift.

---

## 2. Idle-liv: få sprites til at ånde

Et sprite, der står helt stille, ser dødt ud. Læg en lille procedurel "vejrtrækning"
ovenpå. Hver entitet får en **fast fase** ved fødsel, så ingen er i takt:

```js
// ved fødsel:
dyr.fase  = Math.random() * Math.PI * 2;
dyr.tempo = 0.8 + Math.random() * 0.4;   // lidt forskellig rytme pr. dyr
dyr.baseY = dyr.y;

// hver frame (når dyret står stille):
const ånde = Math.sin(tid * dyr.tempo + dyr.fase);
dyr.y      = dyr.baseY - Math.abs(ånde) * 1.5;  // let løft/sænk
dyr.skalaY = 1 + ånde * 0.03;                   // trækker vejret
dyr.skalaX = 1 - ånde * 0.02;                   // volumenbevarende
```

Sjældne, tilfældige mikro-handlinger giver liv uden et loop-look:
```js
// blink
if (dyr.blink <= 0 && Math.random() < 0.004) dyr.blink = 0.12;
dyr.blink -= dt;
// kig dig omkring: skift sigteretning en sjælden gang
if (Math.random() < 0.002) dyr.kigRetning = (Math.random() < 0.5 ? -1 : 1);
```

**Pixel-art-håndværk:** kontinuerlig skalering kan få 64×64-sprites til at "flimre",
fordi de snapper mellem heltals-størrelser med smoothing slået fra. Foretræk derfor
**lodret bob (position)** og lejlighedsvise **frame-skift** frem for konstant skalering.
Brug skala småt og kun hvor det tæller. Tegn altid på `Math.round`-koordinater.

---

## 3. Fase-forskydning: ingen to dyr i takt

Dette er det billigste, mest virkningsfulde greb i hele filen. Når flere dyr deler
samme animation, og du **ikke** forskyder dem, ser verdenen ud som kopier af ét loop
— det dræber illusionen øjeblikkeligt. Løsningen er allerede i snippet'en ovenfor:
en tilfældig `fase` + lidt varieret `tempo` pr. entitet. Brug samme princip på
**alt** der gentager sig — planter der svajer, ambient-partikler, blink. Aldrig en
delt, global timer til gentaget bevægelse.

---

## 4. Bevægelse med liv: gang-bob og sekundær bevægelse

Et dyr, der glider hen over jorden uden at vugge, ser ud til at svæve. Læg et lille
bob og en hældning på, mens det går — skaleret med farten:

```js
dyr.gangFase += fart * dt * 8;
const bob = Math.abs(Math.sin(dyr.gangFase)) * 2;   // op/ned pr. skridt
const hæld = Math.sin(dyr.gangFase) * 0.06;         // let vug (radianer)
// tegn dyret ved (dyr.x, dyr.y - bob) med rotation hæld
```

Sekundær bevægelse = dele, der følger efter med forsinkelse (hale, ører, en lang
hals). Lad dem ease mod kroppens position i stedet for at sidde stift fast:
```js
dyr.haleX += (dyr.x - dyr.haleX) * Math.min(1, dt * 6);  // halen "slæber" blødt efter
```

---

## 5. Dybde: lag, parallax og kamera

En flad canvas bliver til en verden, når den får lag, der bevæger sig i forskellig
takt. Tegn fra fjern til nær:

```js
const lag = [
  { fart: 0.2, tegn: tegnHimmel },        // længst væk — bevæger sig mindst
  { fart: 0.5, tegn: tegnFjernTerræn },
  { fart: 1.0, tegn: tegnVerden },        // hvor dyrene lever
  { fart: 1.3, tegn: tegnForgrund },      // tæt på, foran dyrene
];
for (const l of lag) {
  ctx.save();
  ctx.translate(-kamera.x * l.fart, 0);
  l.tegn(ctx);
  ctx.restore();
}
```

Kameraet skal aldrig stå helt stille, og det skal blødt kunne pege på dramaet:
```js
// rolig idle-drift, så billedet lever selv uden hændelser
kamera.mål = centrum + Math.sin(tid * 0.1) * 12;
// når noget stort sker, skub blødt mod det (fx et drab):
function kig(x) { kamera.mål = x; }
kamera.x += (kamera.mål - kamera.x) * Math.min(1, dt * 2.5);  // ease, aldrig spring
```
Hold det **subtilt** — på en museumsskærm må kameraet ikke gøre aflæsning svær.

---

## 6. Levende baggrunde pr. habitat

Hvert habitat skal have sit eget ambient-system — det er her, stedet får karakter.
Et generisk "drifter"-mønster dækker det meste:

```js
const ambient = [];
function frøAmbient(antal, lav) { for (let i = 0; i < antal; i++) ambient.push(lav()); }
function opdaterAmbient(dt, H) {
  for (const a of ambient) {
    a.x += a.vx * dt; a.y += a.vy * dt; a.sving += dt;
    a.x += Math.sin(a.sving) * a.svaj * dt;     // blød sidelæns vandren
    if (a.y > H + 10) { a.y = -10; a.x = Math.random() * BREDDE; }  // genbrug
  }
}
```
Pr. habitat:
- **Skov:** langsomt faldende blade (grønne/okker), spredte lysstråler der pulserer svagt, et fjernt fugletræk en sjælden gang.
- **Arktis:** drivende sne (hurtigere, hvid), en svag nordlys-glød der ånder hen over himlen, damp fra dyrenes ånde.
- **Ørken:** opadstigende varmeflimmer (let bølge på forgrunden), støvhvirvler der trækker forbi, en gribende fugl højt oppe.

Disse skal være **rolige og få** — de skaber stemning, ikke støj.

---

## 7. Mikro-variation: ingen to dyr ens

Samme sprite gentaget uden variation ser "stemplet" ud. Giv hvert individ en lille
tilfældig signatur ved fødsel:
```js
dyr.spejl      = Math.random() < 0.5 ? -1 : 1;     // vend nogle vandret
dyr.skalaBasis = 0.94 + Math.random() * 0.12;      // små størrelsesforskelle
dyr.tone       = 0.92 + Math.random() * 0.16;      // svag lysstyrke-variation
```
Lysstyrke på pixel art uden ny grafik: tegn spritet, og læg evt. et halvgennemsigtigt
farve-rektangel over med `globalCompositeOperation = 'multiply'` (brug sparsomt — det
koster). Spejling og størrelse er gratis og rækker langt.

---

## 8. Levende byggestation

Byggeskærmen må heller ikke være død. Preview-dyret skal **ånde** (samme idle-system,
selv som lille canvas), og det skal **reagere synligt** på hvert valg — et lille hop
eller squash, mens den nye egenskab toner ind. Et statisk preview-billede er en
forspildt chance for at sige "det her er DIT dyr, og det lever".

Selv ren CSS hjælper, hvis preview er DOM:
```css
.preview { animation: ånde 3.2s ease-in-out infinite; }
@keyframes ånde { 0%,100% {transform:translateY(0) scaleY(1)} 50% {transform:translateY(-3px) scaleY(1.03)} }
```

---

## 9. Balance: liv ≠ støj

Mere bevægelse er ikke altid bedre. På en museumsskærm konkurrerer alt med de få
store øjeblikke, der bærer formidlingen. Hold derfor ambient-liv **roligt, langsomt
og i baggrunden**, så blikket stadig fanger dramaet (et drab, en fødsel) når det sker.
Tommelfinger: hvis du er i tvivl om en effekt gør skærmen mere læsbar eller mindre —
dæmp den.

---

## 10. Anti-mønstre + tjekliste

Anti-mønstre:
- **Synkron bevægelse** — alle dyr ånder/vugger i takt. Forskyd faserne.
- **Død skærm** — intet bevæger sig på et tilfældigt screenshot.
- **Svævende dyr** — bevægelse uden bob/vug.
- **Travlhed der skader aflæsning** — så meget ambient at man ikke ser dramaet.
- **Slørede sprites** — skalering med smoothing til, eller ikke-heltals-koordinater.

Tjekliste (supplerer kvalitetsbaren i SKILL.md):
- [ ] Bevæger der sig altid noget på et tilfældigt screenshot?
- [ ] Er ingen to dyr i takt (fase-forskydning brugt)?
- [ ] Har dyrene idle-liv (ånde, blink, kig) når de står stille?
- [ ] Vugger/bobber dyrene, mens de går — svæver de ikke?
- [ ] Har scenen dybde (lag/parallax) og en let kamera-drift?
- [ ] Har hvert habitat sit eget rolige ambient-system?
- [ ] Lever byggeskærmens preview (ånder + reagerer på valg)?
- [ ] Er livet roligt nok til, at de store øjeblikke stadig er læsbare?
