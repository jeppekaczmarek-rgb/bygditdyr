---
name: sync-projekt
description: Opdater CLAUDE.md og Notion efter implementeret kode. Brug dette ALTID når en PR er merget, eller når du er i tvivl om dokumentationen afspejler koden.
---

# Sync projekt-dokumentation

Du har netop implementeret noget. Nu skal dokumentationen opdateres, så en ny chat kan starte korrekt orienteret.

Gå trinene igennem i rækkefølge. Spring ingen over.

## Trin 1 — Forstå hvad der er sket

Kør:
```
git log --oneline -10
```

Læs commit-beskrivelserne og identificér:
- Hvad er implementeret siden CLAUDE.md sidst var opdateret?
- Hvilke filer er ændret?
- Er der nye JS-filer, HTML-sider eller konstanter der ikke er dokumenteret?

## Trin 2 — Opdater CLAUDE.md

Læs den nuværende CLAUDE.md og identificér hvad der er forældet. Opdater disse sektioner:

**"Aktuel status":**
- Opdater dato øverst
- Tilføj implementerede pakker/features til tabellen (✅)
- Opdater "Næste arbejde" så det afspejler det der faktisk mangler

**"Filstruktur":**
- Tilføj nye filer der er kommet til (JS, HTML, CSS)
- Opdater kommentarer på filer hvis deres funktion er udvidet

**"Kerneregler":**
- Tilføj nye konstanter eller regler der er introduceret (fx `MUTATION_RATE`)

**"Vigtige datastrukturer":**
- Opdater dyr-objektet hvis nye felter er tilføjet
- Opdater broadcast-beskederne hvis nye typer er tilføjet

**"Start her":**
- Sørg for at sektionen peger på det der faktisk er næste skridt nu

Commit CLAUDE.md alene med en beskrivende besked.

## Trin 3 — Opdater Notion "Fremdrift & status"

Hent siden:
- Side-ID: `3396276f-d47f-81b7-8041-db13e6443e76`

Opdater:
1. **"Status opdateret"** dato øverst
2. **"Nuværende fokus"** — beskriver den faktiske nuværende fase
3. **"Næste skridt"** — afkryds færdige punkter, tilføj nye hvis relevant
4. **Overblik-tabel** — opdater statusserne (🟡 → ✅ ved afsluttede faser)
5. **Beslutningslog** — tilføj en ny sektion nederst med dato og kort resumé af hvad der er implementeret og hvorfor

Format på ny beslutningslog-sektion:
```
### [DD]. [måned] 2026 — [Kort overskrift]
[Hvad der er implementeret, hvilke filer der er ændret, hvilke beslutninger der er truffet og begrundelsen.]
```

## Trin 4 — Opdater Notion "Opgaveliste" (hvis relevant)

Hent siden:
- Side-ID: `3846276f-d47f-8150-bba5-c383d535d179`

Afkryds færdige punkter (skift `- [ ]` til `- [x]`).
Tilføj nye punkter hvis der er kommet nye opgaver.

## Trin 5 — Bekræft

Fortæl Jeppe hvad der er opdateret:
- Hvilke sektioner i CLAUDE.md der er ændret
- Hvad der er tilføjet i Notion Fremdrift & status
- Om der er ting du var usikker på og lod stå

---

**Reglen:** Dokumentation og kode skal altid afspejle hinanden. En ny chat der kun læser CLAUDE.md skal have et præcist billede af projektets tilstand.
