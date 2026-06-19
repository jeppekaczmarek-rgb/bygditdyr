# Analyse — Byg Dit Dyr (juni 2026)

Kritisk analyse af gameplay og læring, med konkrete forbedringsforslag delt i opgavepakker. Notion har en overbliksudgave; disse filer er de fulde specs.

| Fil | Indhold |
|---|---|
| [`00-hovedanalyse-og-roadmap.md`](00-hovedanalyse-og-roadmap.md) | Samlet vurdering, gap-analyse (intention → kode → krav), balance-fund, prioriteret roadmap |
| [`01-konsekvenser-og-feedback.md`](01-konsekvenser-og-feedback.md) | Den manglende egenskabs-checklist, individ-død-forklaring, stamdyr-markør |
| [`02-skalering-efter-spillerantal.md`](02-skalering-efter-spillerantal.md) | Dynamisk bærекapacitet, tæthedsafhængig sygdom/formering, NPC-dyr i lavsæson, sæson-knap |
| [`03-interaktion-mellem-spillernes-dyr.md`](03-interaktion-mellem-spillernes-dyr.md) | Tilskrivning af jagt/konkurrence, iscenesatte cross-player-øjeblikke, niche-aflæselighed |
| [`04-formidlingstekster.md`](04-formidlingstekster.md) | Tre tekstlag, fortæller på skærmen, ordliste/Linné-panel, tonebog, lamarckisme-vagt |
| [`05-biologisk-holdbarhed-og-balance.md`](05-biologisk-holdbarhed-og-balance.md) | Balance-kritik, dominansstrategier, fælder, mutation ved formering |
| [`balance.js`](balance.js) | Kørbar gennemregning af alle 576 builds: `node balance.js` |

## Kør balance-testen

```bash
cd analyse && node balance.js
```

Genkør efter hver ændring i `survival.js`-matricen for at se hvordan top-builds og dominansstrategier flytter sig.

## Kort sagt

Simulationsmotoren er rig og biologisk ambitiøs. Det der mangler er **aflæselighed** og **læringskobling**: spillet simulerer pt. mere biologi end det formidler. De fleste forbedringer handler om at gøre eksisterende tilstande synlige og forklare dem — ikke om ny simulering. Start med pakke 01 + 05.
