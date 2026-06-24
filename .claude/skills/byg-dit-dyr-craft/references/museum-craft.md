# Museums-håndværk — fra skærm til oplevelse

Et museumsspil lever under barske vilkår, et almindeligt spil aldrig møder: gæsten
har ingen vejledning, ingen tålmodighed, står op, er midt i larm og en flok, og er
væk om 30 sekunder, hvis intet fanger dem. Spillet skal kunne klare sig selv. Denne
fil handler om at bygge til netop dén virkelighed.

Konteksten for Byg Dit Dyr: 5 byggestationer + 1 stor fælles habitatskærm, ~10 min
pr. session, kontinuerligt flow, 4.–6. klasse (10–12 år), Naturama. De tre andre
filer (`game-feel`, `visual-life`, `museum-craft`) tjener alle ét fælles mål her:
**aflæselighed > fuldstændighed**.

**Indhold**
1. Opmærksomhedsmodellen: tiltræk → fang → uddyb
2. Attract-mode: træk barnet hen til skærmen
3. Walk-up-and-play: nul vejledning
4. Aflæselighed på 2 meters afstand
5. Få men store øjeblikke
6. Den fælles skærm som socialt omdrejningspunkt
7. Sessionens rytme (~10 min)
8. Robusthed: en kiosk passer sig selv
9. Personalelaget
10. Anti-mønstre + tjekliste

---

## 1. Opmærksomhedsmodellen: tiltræk → fang → uddyb

Museumsforskning beskriver tre trin, en udstilling skal igennem — og de er din
designramme:
- **Tiltræk** (0–3 sek): får gæsten til at standse og kigge. Bevægelse, farve, et løfte.
- **Fang** (3–30 sek): får dem til at røre og prøve. Det første valg skal være sjovt og indlysende.
- **Uddyb** (30 sek+): belønner dem, der bliver — dybden, dramaet, deres eget dyrs skæbne.

Hvert trin er en si. Taber du dem i "tiltræk", når de aldrig dybden, motoren kan tilbyde.

---

## 2. Attract-mode: træk barnet hen til skærmen

Når ingen spiller, må skærmen ikke stå tom og vente — den skal **aktivt invitere**.
En attract-mode er en lille selvkørende demo: et dyr bliver bygget, sendt ud, lever,
jager, dør — med en tydelig invitation ("Byg dit eget dyr — rør skærmen"). Det viser
det sjove i stedet for at beskrive det, og det holder habitatskærmen levende for de
forbipasserende.

```js
let sidstInput = performance.now();
function registrérInput() { sidstInput = performance.now(); skjulAttract(); }
// bind registrérInput til alle touch/klik

// i løkken:
const stille = performance.now() - sidstInput;
if (stille > 30000) visAttract();        // 30 s uden input → invitér
if (stille > 120000) nulstilTilNyGæst(); // 2 min → ryd op, frisk start
```

---

## 3. Walk-up-and-play: nul vejledning

Ingen læser en manual ved en museumsskærm. Det første, der skal ske, er, at barnet
**forstår sit første træk på under 3 sekunder** — uden tekst.
- Det første valg skal være stort, åbenlyst og indbydende at trykke på.
- Lær ved at gøre: før blødt gennem den første egenskab i stedet for at forklare alle seks på forhånd.
- Hver berøring skal svare igen med det samme (se juice-stakken i `game-feel.md`), så barnet ved, at det virker.
- Ingen blindgyder: der må aldrig være en skærm, hvor det er uklart, hvad man gør nu.

---

## 4. Aflæselighed på 2 meters afstand

Gæsten ser ofte skærmen — særligt den fælles — på afstand og fra siden. Design til
det værste tilfælde, ikke til et skrivebord:
- **Store elementer, høj kontrast.** Tydelige silhuetter, klare farveflader.
- **Tekststørrelser til afstand.** Korpstekst stor nok til 2–3 m (vejledende ≥ 40 px
  på en 1080p-skærm), overskrifter markant større. Undgå tynde skrifttyper i småt.
- **Touch-mål til børnefingre.** Mindst ~80 px; hellere større. Aldrig små, tætsiddende knapper.
- **Begræns samtidig information.** Få ting ad gangen. Et barn kan ikke parse en tæt HUD på afstand.
- **Konsekvent farvekodning.** Lad en egenskab/et habitat have samme farve overalt, så betydning kan aflæses uden at læse.
- **Typografi (projektets stil "Naturhistorisk Punk"):** Playfair Display (serif)
  til artsnavne og videnskabelig tekst; Inter (sans-serif) til UI. Palette: okker,
  mosgrøn, dyb blå. Hold linjen.

---

## 5. Få men store øjeblikke

Dette er kerneprincippet fra din egen kritiske analyse — og den enkeltrettelse, der
betyder mest for oplevelsen. Motoren kan producere snesevis af samtidige hændelser;
en skærm set på afstand kan kun aflæses, hvis du **vælger få og gør dem store**.
- Iscenesæt 3–4 store cross-player-øjeblikke pr. session (et drab, en fødsel, et crash) og giv dem plads, optakt og efterdøn.
- **Tilskriv dem.** "Plettet Løve fra station 3 nedlagde din Brune Grævling" gør en anonym mekanik til et personligt, mindeværdigt drama.
- Lad de mange små hændelser være stille baggrund — de skaber liv (`visual-life.md`), men skal ikke kæmpe om blikket med dramaet.

---

## 6. Den fælles skærm som socialt omdrejningspunkt

Den store skærm er ikke bare en visning — den er **scenen**, hvor børnenes dyr mødes.
Det er her, det sociale opstår: spænding, drilleri, heppen.
- Gør det let at se, hvis dyr er hvis. Markér og navngiv elevens eget dyr tydeligt.
- Når et stort øjeblik sker, så **dirigér blikket** derhen med bevægelse og lyd (let kamera-skub mod hændelsen, se `visual-life.md`).
- Tænk på tilskueren: et barn, der venter eller kigger med, skal også kunne følge med og blive fanget.

---

## 7. Sessionens rytme (~10 min)

Selv et kontinuerligt flow uden runder skal have en **følt rytme**, ellers bliver det
en jævn grød:
- **Hurtig sejr tidligt:** barnets første dyr skal hurtigt opleve noget (overleve lidt, spise, blive set).
- **Voksende indsats:** byg investering — flere dyr, arten breder sig, generationer.
- **Klimaks:** et stort øjeblik (et crash, et episk drab, en art der dominerer).
- **Tilfredsstillende udtoning:** en lille opsamling/anerkendelse, så det føles afsluttet — ikke bare at skærmen rydder.

---

## 8. Robusthed: en kiosk passer sig selv

Spillet kører uden opsyn med børn, der trykker hårdt og hurtigt. Det skal tilgive alt:
- **Auto-nulstil** efter inaktivitet (se attract-snippet'en) — frisk start til næste gæst.
- **Ingen fastlåste tilstande.** Et barn må aldrig kunne ende et sted, det ikke kan komme videre fra.
- **Tål mashing.** Hurtige, gentagne tryk må ikke kunne ødelægge en tilstand.
- **Tål 0 og mange spillere.** Tom skærm i lavsæson og crash-spiral i højsæson er begge fejl
  (din skaleringspakke 02: gør plantemængde, sygdomstærskel og formering til funktioner af
  belastningstallet; NPC-dyr udfylder lavsæson).
- **Fejl må aldrig vises for barnet.** Fang dem, log dem, kom videre.

---

## 9. Personalelaget

Lærere og personale skal kunne styre oplevelsen uden at være i koden:
- Sæson-knap (stille / auto / myldretid) der justerer belastningen.
- Habitat-override, så en lærer kan vælge habitatet til en klasse.
- Alt skjult bag en diskret adgang, så børn ikke falder over det.

---

## 10. Anti-mønstre + tjekliste

Anti-mønstre:
- **Tom ventende skærm** — ingen attract-mode.
- **Tekst-tutorial** — hvis du forklarer med ord, har du tabt. Lær ved at gøre.
- **For meget på én gang** — tæt HUD, mange samtidige hændelser, små knapper.
- **Anonyme hændelser** — drama uden at vide hvis dyr det er.
- **Antagelse om "normal" spillerantal** — bryder i både lav- og højsæson.

Tjekliste (supplerer kvalitetsbaren i SKILL.md):
- [ ] Inviterer skærmen aktivt, når ingen spiller (attract-mode)?
- [ ] Forstår en fremmed sit første træk på under 3 sekunder uden tekst?
- [ ] Kan alt aflæses på 2 meters afstand (størrelse, kontrast, få elementer)?
- [ ] Er der 3–4 store, tilskrevne øjeblikke pr. session — ikke konstant mikro-støj?
- [ ] Er elevens eget dyr tydeligt markeret på den fælles skærm?
- [ ] Har sessionen en følt rytme (hurtig sejr → indsats → klimaks → udtoning)?
- [ ] Nulstiller spillet sig selv og tåler 0, få og mange spillere?
- [ ] Kan personalet styre belastning og habitat uden at røre koden?
