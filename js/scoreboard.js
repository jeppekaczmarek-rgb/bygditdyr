// ============================================================
// scoreboard.js — Top-5 scoreboard med session + livstids-lister
// Gemmer i sessionStorage (dagens) og localStorage (livstid).
// ============================================================

const SCOREBOARD_MAX = 5;
const STORAGE_KEY_DAGENS  = 'bygditdyr_dagens_top';
const STORAGE_KEY_LIVSTID = 'bygditdyr_livstid_top';
const REKORD_VARIGHED = 3000; // ms for rekord-overlay

// Habitat-ikoner til visning
const SB_HABITAT_IKON = {
  skov:   '🌲',
  arktis: '🏔️',
  oerken: '🏜️'
};

// Kort dødsårsag → hvad der i sidste ende udryddede arten.
// Vises kun når arten er uddød (sidste individ er dødt).
const SB_AARSAG_KORT = {
  frys:          'Frøs ihjel i kulden',
  toerke:        'Tørstede ihjel i heden',
  jaget:         'Jaget ned af rovdyr',
  sult:          'Sultede — manglede føde',
  udmattelse:    'Udmattet — brugte mere energi end den fik',
  udkonkurreret: 'Udkonkurreret af bedre tilpassede',
  sygdom:        'Sygdom slog hele flokken ud'
};

// Forklaringstekster: egenskab → værdi → habitat → sætning
// Kun for score ≥ 2 (stærke fordele). Fallback for score 1.
const SB_FORKLARINGER = {
  stofskifte: {
    hojt: {
      arktis: 'Varmt blod holder kroppen i gang i kulden.',
      _:      'Varmt blod giver masser af energi.'
    },
    lavt: {
      oerken: 'Sparer energi ved at bruge solens varme.',
      _:      'Bruger næsten ingen energi — smart.'
    }
  },
  hudtype: {
    pels: {
      arktis: 'Tyk pels holder på varmen i kulden.',
      skov:   'Pelsen beskytter mod kulde om natten.',
      _:      'Pelsen holder kroppen varm.'
    },
    fjer: {
      _: 'Fjer isolerer godt i både varme og kulde.'
    },
    skael: {
      oerken: 'Skæl holder på vandet i den tørre varme.',
      _:      'Skæl beskytter kroppen godt.'
    },
    glat: {
      _: 'Glat hud gør det let at gemme sig.'
    }
  },
  kost: {
    alleaeder: {
      skov:   'Spiser alt — finder altid mad i skoven.',
      oerken: 'Spiser alt der findes i ørkenen.',
      _:      'Kan spise alt — finder altid noget.'
    },
    koedaeder: {
      arktis: 'Masser af kød at jage i det kolde.',
      _:      'Kødæder med masser af energi fra byttet.'
    },
    planteaeder: {
      skov:   'Planter overalt — sulter aldrig i skoven.',
      oerken: 'Finder de få planter der gror her.',
      _:      'Lever af planter — stille og roligt.'
    }
  },
  storrelse: {
    stor: {
      arktis: 'Stor krop holder bedre på varmen.',
      _:      'Stor krop er svær at angribe.'
    },
    mellem: {
      _: 'God størrelse — ikke for stor, ikke for lille.'
    },
    lille: {
      oerken: 'Lille krop kræver mindre vand og mad.',
      _:      'Lille og let at gemme sig.'
    }
  },
  aktivitet: {
    nataktiv: {
      oerken: 'Aktiv om natten — undgår den værste varme.',
      _:      'Undgår mange farer ved at leve om natten.'
    },
    dagaktiv: {
      arktis: 'Udnytter solens varme om dagen.',
      skov:   'Finder mad i dagslyset mellem træerne.',
      _:      'Aktiv når der er mest lys og varme.'
    }
  },
  forsvar: {
    giftig: {
      oerken: 'Giften skræmmer alle rovdyr væk.',
      _:      'Gift holder fjenderne på afstand.'
    },
    flugt: {
      skov:   'Hurtige ben redder livet mellem træerne.',
      _:      'Hurtig nok til at stikke af.'
    },
    pigge: {
      _: 'Pigge gør det farligt at angribe.'
    },
    ingen: {
      _: 'Klarer sig uden forsvar — imponerende.'
    }
  }
};

// Find bedste egenskab og generer forklaring
function genererOverlevelsesForklaring(dyr, habitat) {
  const egenskaber = dyr.egenskaber || dyr;
  const matrix = Survival.HABITAT_SCORE[habitat];
  if (!matrix) return '';

  // Find egenskaben med højest score
  let bedsteKat = null;
  let bedsteScore = -Infinity;
  for (const [kat, vaerdi] of Object.entries(egenskaber)) {
    const score = matrix[kat]?.[vaerdi] ?? 0;
    if (score > bedsteScore) {
      bedsteScore = score;
      bedsteKat = kat;
    }
  }

  if (!bedsteKat) return '';

  const vaerdi = egenskaber[bedsteKat];
  const tekster = SB_FORKLARINGER[bedsteKat]?.[vaerdi];
  if (!tekster) return '';

  // Habitat-specifik tekst eller fallback
  return tekster[habitat] || tekster._ || '';
}

class Scoreboard {
  constructor(containerEl) {
    this.container = containerEl;
    this.dagens  = this._hent(sessionStorage, STORAGE_KEY_DAGENS);
    this.livstid = this._hent(localStorage,   STORAGE_KEY_LIVSTID);
    this.render();
  }

  // --- Offentlig API ---

  // Tilføj et dyr der netop er dødt.
  // doedInfo (valgfri): { uddoed: bool, aarsag: string, doedsTekst: string }
  // Dødsårsag gemmes kun når arten er uddød (sidste individ).
  tilfoejDyr(dyr, levetid, habitat, doedInfo) {
    const entry = {
      danskNavn:   dyr.danskNavn || dyr.artsnavn,
      artsnavn:    dyr.artsnavn,
      levetid:     levetid,
      habitat:     habitat,
      forklaring:  genererOverlevelsesForklaring(dyr, habitat),
      dato:        new Date().toISOString()
    };

    // Hvis arten er uddød: gem hvad der til sidst udryddede den
    if (doedInfo && doedInfo.uddoed) {
      entry.doedsAarsag = doedInfo.aarsag;
      entry.doedsKort   = SB_AARSAG_KORT[doedInfo.aarsag] || 'Forsvandt fra habitatet';
    }

    const nyDagens  = this._indsaet(this.dagens, entry);
    const nyLivstid = this._indsaet(this.livstid, entry);

    // Tjek om det er en ny livstidsrekord (#1 plads)
    const erNyRekord = nyLivstid[0].levetid === levetid &&
                       nyLivstid[0].danskNavn === entry.danskNavn &&
                       (this.livstid.length === 0 || this.livstid[0].levetid < levetid);

    this.dagens  = nyDagens;
    this.livstid = nyLivstid;
    this._gem(sessionStorage, STORAGE_KEY_DAGENS,  this.dagens);
    this._gem(localStorage,   STORAGE_KEY_LIVSTID, this.livstid);

    this.render();

    if (erNyRekord) {
      this._visRekord(entry.danskNavn);
    }
  }

  // Hent dagens top 5
  hentDagens() {
    return this.dagens.slice();
  }

  // Hent livstids top 5
  hentLivstid() {
    return this.livstid.slice();
  }

  // Render scoreboard HTML ind i containeren
  render() {
    this.container.innerHTML = this._renderListe('⏱ Dagens bedste', this.dagens) +
                               this._renderListe('🏆 Rekordlisten', this.livstid);
  }

  // --- Intern ---

  // Hent liste fra storage (med fejlhåndtering)
  _hent(storage, key) {
    try {
      return JSON.parse(storage.getItem(key)) || [];
    } catch { return []; }
  }

  // Gem liste til storage
  _gem(storage, key, liste) {
    try { storage.setItem(key, JSON.stringify(liste)); } catch {}
  }

  // Indsæt entry i sorteret liste, behold kun top 5.
  // Grupperet per art (artsnavn) — kun bedste levetid per art gemmes.
  _indsaet(liste, entry) {
    const ny = [...liste];
    const idx = ny.findIndex(e => e.artsnavn === entry.artsnavn);
    if (idx !== -1) {
      // Arten findes — opdater kun bedste levetid hvis ny er bedre
      if (entry.levetid > ny[idx].levetid) {
        // Bevar evt. allerede registreret dødsårsag hvis den nye mangler
        if (!entry.doedsKort && ny[idx].doedsKort) {
          entry.doedsAarsag = ny[idx].doedsAarsag;
          entry.doedsKort   = ny[idx].doedsKort;
        }
        ny[idx] = entry;
      } else if (entry.doedsKort) {
        // Behold bedste levetid, men registrér at arten nu er uddød
        ny[idx].doedsAarsag = entry.doedsAarsag;
        ny[idx].doedsKort   = entry.doedsKort;
      }
    } else {
      ny.push(entry);
    }
    ny.sort((a, b) => b.levetid - a.levetid);
    return ny.slice(0, SCOREBOARD_MAX);
  }

  // Formater sekunder til "X min Y sek"
  _formatTid(sek) {
    const min = Math.floor(sek / 60);
    const rest = sek % 60;
    if (min === 0) return `${rest} sek`;
    return `${min} min ${rest} sek`;
  }

  // Render én liste-sektion
  _renderListe(titel, liste) {
    const rækker = liste.length === 0
      ? '<div class="sb-tom">Ingen dyr endnu</div>'
      : liste.map((e, i) => `
          <div class="sb-raekke">
            <div class="sb-raekke-top">
              <span class="sb-placering">${i + 1}.</span>
              <span class="sb-navn">${e.danskNavn} <span class="sb-latin">(${e.artsnavn})</span></span>
              <span class="sb-tid">${this._formatTid(e.levetid)}</span>
              <span class="sb-habitat">${SB_HABITAT_IKON[e.habitat] || ''}</span>
            </div>
            ${e.forklaring ? `<div class="sb-forklaring">✅ Klarede sig: ${e.forklaring}</div>` : ''}
            ${e.doedsKort ? `<div class="sb-doedsaarsag">☠️ Uddøde: ${e.doedsKort}</div>` : ''}
          </div>
        `).join('');

    return `
      <div class="sb-sektion">
        <div class="sb-titel">${titel}</div>
        ${rækker}
      </div>
    `;
  }

  // Vis rekord-overlay i 3 sekunder
  _visRekord(navn) {
    if (window.Audio) Audio.nyRekord();
    const overlay = document.createElement('div');
    overlay.className = 'sb-rekord-overlay';
    overlay.innerHTML = `<span class="sb-rekord-tekst">🏆 Ny rekord!<br>${navn}</span>`;
    document.getElementById('habitat-verden').appendChild(overlay);
    setTimeout(() => overlay.remove(), REKORD_VARIGHED);
  }
}

// --- Eksporter til browser ---
window.Scoreboard = Scoreboard;
window.genererOverlevelsesForklaring = genererOverlevelsesForklaring;
