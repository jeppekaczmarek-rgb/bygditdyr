# Playtest-løkken — "SE før du siger færdig"

`playtest.js` er motoren bag skillens vigtigste regel: du må ikke kalde en
visuel- eller feel-opgave færdig, før du har set det kørende spil.

## Opsætning (én gang)
```bash
npm i -D playwright && npx playwright install chromium
```

## Sådan kører du
```bash
# 1) start en server i repo-roden (egen terminal)
python3 -m http.server 8000

# 2) kør playtesten
node .claude/skills/byg-dit-dyr-craft/scripts/playtest.js
```
Mod live i stedet: `BDD_URL=https://jeppekaczmarek-rgb.github.io/bygditdyr/ node ...`

Output (screenshots, video, `summary.json`, `log.txt`) lander i
`playtest-output/<tidsstempel>/`.

## Rutinen — hver gang du laver noget visuelt/feel
1. Implementér ændringen.
2. Kør playtesten.
3. Åbn screenshots + videoen. Se på dem som en 10-årig på 2 meters afstand.
4. Tjek `summary.json`: er fps stabil? Er der konsolfejl?
5. Gå kvalitetsbaren i `SKILL.md` igennem. Find det svageste punkt.
6. Ret det. Kør igen. Gentag til baren er grøn.

## Første kørsel = opdagelse
Scriptet kender ikke spillets knapper endnu. Første gang:
1. Kør det som det er — det gemmer `interactables-byg.json` + start-screenshots.
2. Brug dem til at finde spillets rigtige knaptekster.
3. Udfyld "TILPAS HER"-blokken i `playtest.js`, så den spiller et helt flow
   igennem (byg dyr → send til habitat). Brug `getByText` / `getByRole` — de er
   robuste mod layout-ændringer.

## Værd at vide
- Begge skærme åbnes i **samme** browser-context, ellers virker BroadcastChannel
  ikke mellem byggestation og habitat.
- Justér længden med `BDD_SECONDS=40 node ...` hvis du vil se en længere session
  (fx for at fange en formering eller et sygdomscrash).
