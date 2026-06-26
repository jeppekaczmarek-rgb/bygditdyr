// ============================================================
// sprites.js — PROCEDURELLE placeholder-karaktersprites (SVG)
//
// Tegner et simpelt, men genkendeligt dyr ud fra de fem egenskaber.
// Tænkt som STAND-IN for de kommende Blender/billede-renders: hver
// egenskab har en synlig, aflæselig overflade, så man kan se idéen
// bag det færdige dyr allerede nu.
//
//   kropsform  → kropssilhuet + størrelse  (slank/kraftig/langstrakt …)
//   hudtype    → grundfarve + overflademønster (pels/skael/fjer)
//   stofskifte → varm/kølig tone
//   foedevalg  → snude/mund (rovdyr-tænder / blød planteæder-mule)
//   forsvar    → kendetegn (pigge, giftpletter, camouflage, fart, mimicry)
//
// Vektor = skarpt i alle størrelser (også på 15.360 px museumsvæggen).
// Ingen asset-filer kræves. Kunst vender MOD HØJRE (habitat spejlvender selv).
// Kommentarer på dansk (projektregel).
// ============================================================
(function () {
  'use strict';

  // ---- Farver --------------------------------------------------------------
  const HUDTYPE_FARVER = {
    pels:  { r: 150, g: 98,  b: 58  },  // varm brun
    skael: { r: 86,  g: 132, b: 78  },  // grøn-oliven
    fjer:  { r: 116, g: 96,  b: 168 }   // blålilla
  };

  function klem(n) { return Math.max(0, Math.min(255, Math.round(n))); }
  function hex({ r, g, b }) {
    return '#' + [r, g, b].map(v => klem(v).toString(16).padStart(2, '0')).join('');
  }
  function juster({ r, g, b }, d) { return { r: r + d, g: g + d, b: b + d }; }

  // Returnerer en palet { krop, mork, lys, bug } ud fra hudtype + stofskifte.
  function palet(hudtype, stofskifte) {
    const base = HUDTYPE_FARVER[hudtype] || HUDTYPE_FARVER.pels;
    let r = base.r, g = base.g, b = base.b;
    if (stofskifte === 'kold') { r -= 22; g -= 6; b += 26; }   // køligere
    else                       { r += 16; g += 8; b -= 12; }   // varmere
    const krop = { r, g, b };
    return {
      krop: hex(krop),
      mork: hex(juster(krop, -42)),
      lys:  hex(juster(krop, 38)),
      bug:  hex(juster(krop, 60))
    };
  }

  // ---- Geometri pr. kropsform ----------------------------------------------
  // rx/ry = kropsellipsens halvakser, ben = benlængde, lav = krybdyr-positur.
  const FORM = {
    lille_slank:     { rx: 26, ry: 13, ben: 16, lav: false },
    stor_slank:      { rx: 31, ry: 15, ben: 18, lav: false },
    lille_kraftig:   { rx: 24, ry: 18, ben: 13, lav: false },
    stor_kraftig:    { rx: 31, ry: 22, ben: 15, lav: false },
    mega_kraftig:    { rx: 37, ry: 26, ben: 16, lav: false },
    kold_lille:      { rx: 27, ry: 11, ben: 8,  lav: true  },
    kold_langstrakt: { rx: 41, ry: 10, ben: 7,  lav: true  }
  };

  // storrelse → vist højde i px (afledes af kropsform, jf. kerneregel 8)
  const STOR_PX = { lille: 40, mellem: 50, stor: 62, mega: 78 };
  function storrelseFor(kropsform) {
    return (window.Survival && Survival.kropsformTilStorrelse)
      ? Survival.kropsformTilStorrelse(kropsform)
      : 'lille';
  }

  // ---- Hjælp: byg SVG-elementer --------------------------------------------
  const GROUND = 86;            // gulvlinje i viewBox
  const VBW = 120, VBH = 96;
  // Oblik-hint: let lodret sammentrykning omkring gulvlinjen antyder en højere
  // (mere top-down) kameravinkel. Placeholder — rigtige top-down-renders kommer fra Blender.
  const OBLIK_SQUASH = 0.85;

  // Et ben tegnet som tyk afrundet streg fra hofte til fod (fod forskudt = gang).
  function ben(hofteX, hofteY, len, sving, farve, lav) {
    const fodX = hofteX + sving + (lav ? 7 : 0);
    const fodY = hofteY + len;
    const br = lav ? 5 : 6;
    return `<line x1="${hofteX.toFixed(1)}" y1="${hofteY.toFixed(1)}" `
         + `x2="${fodX.toFixed(1)}" y2="${fodY.toFixed(1)}" `
         + `stroke="${farve}" stroke-width="${br}" stroke-linecap="round"/>`;
  }

  // ---- Hovedtegning --------------------------------------------------------
  // e = egenskaber, pose = { sving, bob, hovedNed } (animation)
  function tegnDyr(e, pose) {
    const stof = e.stofskifte || 'varm';
    const form = FORM[e.kropsform] || FORM.lille_slank;
    const hud  = e.hudtype   || 'pels';
    const foed = e.foedevalg || 'altaeder';
    const fors = e.forsvar   || 'camouflage';
    const p = palet(hud, stof);
    const sv = (pose && pose.sving)    || 0;
    const bob = (pose && pose.bob)     || 0;
    const hovedNed = (pose && pose.hovedNed) || 0;

    const cx = 54;
    const cy = GROUND - form.ben - form.ry + bob;   // kropcentrum (med gang-hop)
    const { rx, ry } = form;

    // Hoved foran-øverst til højre
    const hovedR = (foed === 'planteaeder' ? 17 : foed === 'koedaeder' ? 14 : 15)
                 + (form.rx > 33 ? 3 : 0);
    const hx = cx + rx * 0.82;
    const hy = cy - ry * 0.5 + hovedNed;

    let s = '';

    // --- Bagben (mørkere, bag kroppen) ---
    s += ben(cx - rx * 0.45, cy + ry * 0.6, form.ben, -sv, p.mork, form.lav);
    s += ben(cx + rx * 0.05, cy + ry * 0.6, form.ben, sv, p.mork, form.lav);

    // --- Hale ---
    const haleLen = (e.kropsform === 'kold_langstrakt') ? 34
                  : (foed === 'koedaeder') ? 24 : 16;
    const hax = cx - rx, hay = cy - ry * 0.1;
    s += `<path d="M ${hax} ${hay} `
       + `Q ${hax - haleLen} ${hay - 10}, ${hax - haleLen} ${hay + 6} `
       + `Q ${hax - haleLen + 4} ${hay + 2}, ${hax} ${hay + ry * 0.5} Z" `
       + `fill="${p.mork}"/>`;

    // --- Krop ---
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${p.krop}"/>`;
    // Lys bug
    s += `<ellipse cx="${cx}" cy="${cy + ry * 0.45}" rx="${rx * 0.82}" ry="${ry * 0.5}" fill="${p.bug}" opacity="0.55"/>`;

    // --- Overflademønster (hudtype) ---
    s += hudMonster(hud, cx, cy, rx, ry, p);

    // --- Forsvar-kendetegn på kroppen ---
    s += forsvarKrop(fors, cx, cy, rx, ry, p);

    // --- Forben (lysere, foran kroppen) ---
    s += ben(cx + rx * 0.35, cy + ry * 0.6, form.ben, sv, p.lys, form.lav);
    s += ben(cx + rx * 0.62, cy + ry * 0.6, form.ben, -sv, p.lys, form.lav);

    // --- Hals + hoved ---
    s += `<path d="M ${cx + rx * 0.4} ${cy - ry * 0.3} `
       + `L ${hx - hovedR * 0.4} ${hy} L ${hx} ${hy + hovedR} `
       + `L ${cx + rx * 0.4} ${cy + ry * 0.2} Z" fill="${p.krop}"/>`;
    s += `<circle cx="${hx}" cy="${hy}" r="${hovedR}" fill="${p.krop}"/>`;

    // Øre / krest (hudtype-afhængigt) — på hovedets top-bag
    s += hovedFeature(hud, hx, hy, hovedR, p);

    // --- Snude / mund (foedevalg) ---
    s += snude(foed, hx, hy, hovedR, p);

    // --- Øje (altid — giver liv og karakter) ---
    const oejeR = hovedR * 0.34;
    const ox = hx + hovedR * 0.35, oy = hy - hovedR * 0.18;
    s += `<circle cx="${ox}" cy="${oy}" r="${oejeR}" fill="#fff"/>`;
    s += `<circle cx="${ox + oejeR * 0.45}" cy="${oy}" r="${oejeR * 0.55}" fill="#1a1208"/>`;
    s += `<circle cx="${ox + oejeR * 0.7}" cy="${oy - oejeR * 0.35}" r="${oejeR * 0.22}" fill="#fff"/>`;

    return s;
  }

  // Overflademønster pr. hudtype (få, læsbare streger).
  function hudMonster(hud, cx, cy, rx, ry, p) {
    let s = '';
    if (hud === 'pels') {
      // korte pelsstrøg langs ryggen
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * rx * 0.32;
        const y = cy - ry * 0.78;
        s += `<line x1="${x}" y1="${y}" x2="${x + 2}" y2="${y - 5}" stroke="${p.mork}" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>`;
      }
    } else if (hud === 'skael') {
      // rækker af små skæl-buer
      for (let r = 0; r < 2; r++) {
        for (let i = -2; i <= 2; i++) {
          const x = cx + i * rx * 0.3 + (r ? rx * 0.15 : 0);
          const y = cy - ry * 0.3 + r * ry * 0.5;
          s += `<path d="M ${x - 4} ${y} Q ${x} ${y - 4}, ${x + 4} ${y}" fill="none" stroke="${p.mork}" stroke-width="1.4" opacity="0.55"/>`;
        }
      }
    } else { // fjer
      // små vinkel-fjer
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * rx * 0.32;
        const y = cy - ry * 0.2;
        s += `<path d="M ${x - 3} ${y} L ${x} ${y - 5} L ${x + 3} ${y}" fill="none" stroke="${p.lys}" stroke-width="1.4" opacity="0.7"/>`;
      }
    }
    return s;
  }

  // Hoved-feature pr. hudtype: øre (pels), fjerkrest (fjer), glat kam (skael).
  function hovedFeature(hud, hx, hy, hr, p) {
    if (hud === 'pels') {
      // afrundet øre øverst-bag
      return `<path d="M ${hx - hr * 0.5} ${hy - hr * 0.7} `
           + `Q ${hx - hr * 1.0} ${hy - hr * 1.6}, ${hx - hr * 0.1} ${hy - hr * 1.1} Z" fill="${p.mork}"/>`;
    }
    if (hud === 'fjer') {
      // lille fjerkrest
      let s = '';
      for (let i = 0; i < 3; i++) {
        const bx = hx - hr * 0.3 + i * hr * 0.28;
        s += `<path d="M ${bx} ${hy - hr * 0.6} L ${bx - 2} ${hy - hr * 1.5} L ${bx + 3} ${hy - hr * 0.7} Z" fill="${p.lys}"/>`;
      }
      return s;
    }
    // skael: lav takket kam
    return `<path d="M ${hx - hr * 0.5} ${hy - hr * 0.75} l 4 -6 l 4 6 l 4 -6 l 4 6 Z" fill="${p.mork}" opacity="0.8"/>`;
  }

  // Snude/mund pr. foedevalg.
  function snude(foed, hx, hy, hr, p) {
    const sx = hx + hr * 0.7;          // snudens rod
    const sy = hy + hr * 0.15;
    if (foed === 'koedaeder') {
      // spids snude + tænder
      let s = `<path d="M ${sx} ${sy - hr * 0.45} L ${sx + hr * 0.95} ${sy} L ${sx} ${sy + hr * 0.5} Z" fill="${p.lys}"/>`;
      s += `<polygon points="${sx + hr * 0.55},${sy + hr * 0.2} ${sx + hr * 0.72},${sy + hr * 0.05} ${sx + hr * 0.78},${sy + hr * 0.35}" fill="#fff"/>`;
      s += `<circle cx="${sx + hr * 0.75}" cy="${sy - hr * 0.1}" r="1.4" fill="#1a1208"/>`;
      return s;
    }
    if (foed === 'planteaeder') {
      // blød, rund mule
      let s = `<ellipse cx="${sx + hr * 0.45}" cy="${sy + hr * 0.05}" rx="${hr * 0.55}" ry="${hr * 0.5}" fill="${p.lys}"/>`;
      s += `<circle cx="${sx + hr * 0.7}" cy="${sy - hr * 0.05}" r="1.5" fill="#1a1208"/>`;
      s += `<circle cx="${sx + hr * 0.5}" cy="${sy - hr * 0.05}" r="1.5" fill="#1a1208"/>`;
      return s;
    }
    // altaeder: kort, afrundet snude
    let s = `<path d="M ${sx} ${sy - hr * 0.4} Q ${sx + hr * 0.8} ${sy}, ${sx} ${sy + hr * 0.45} Z" fill="${p.lys}"/>`;
    s += `<circle cx="${sx + hr * 0.5}" cy="${sy - hr * 0.05}" r="1.5" fill="#1a1208"/>`;
    return s;
  }

  // Forsvar-kendetegn tegnet på/omkring kroppen.
  function forsvarKrop(fors, cx, cy, rx, ry, p) {
    if (fors === 'pigge') {
      // pigge langs ryggen
      let s = '';
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * rx * 0.33;
        const y = cy - ry * 0.85;
        s += `<polygon points="${x - 4},${y} ${x},${y - 11} ${x + 4},${y}" fill="${p.mork}"/>`;
      }
      return s;
    }
    if (fors === 'gift') {
      // skarpe advarselspletter
      const pletter = [[-0.3, -0.1], [0.25, 0.15], [0.0, 0.4]];
      return pletter.map(([dx, dy]) =>
        `<circle cx="${cx + dx * rx}" cy="${cy + dy * ry}" r="${ry * 0.28}" fill="#ffcf2e" stroke="#c8411f" stroke-width="1.4"/>`
      ).join('');
    }
    if (fors === 'camouflage') {
      // uregelmæssige mørke pletter
      const pletter = [[-0.35, -0.1, 0.32], [0.2, 0.15, 0.4], [-0.05, 0.35, 0.28], [0.45, -0.2, 0.24]];
      return pletter.map(([dx, dy, r]) =>
        `<ellipse cx="${cx + dx * rx}" cy="${cy + dy * ry}" rx="${r * rx * 0.45}" ry="${r * ry * 0.6}" fill="${p.mork}" opacity="0.6"/>`
      ).join('');
    }
    if (fors === 'hastighed') {
      // fartstriber bag kroppen
      let s = '';
      for (let i = 0; i < 3; i++) {
        const y = cy - ry * 0.4 + i * ry * 0.5;
        s += `<line x1="${cx - rx - 6}" y1="${y}" x2="${cx - rx - 18}" y2="${y}" stroke="${p.lys}" stroke-width="2.2" stroke-linecap="round" opacity="${0.8 - i * 0.15}"/>`;
      }
      return s;
    }
    if (fors === 'mimicry') {
      // falsk øjeplet på flanken (bagest)
      const ex = cx - rx * 0.45, ey = cy - ry * 0.05;
      return `<circle cx="${ex}" cy="${ey}" r="${ry * 0.45}" fill="${p.lys}"/>`
           + `<circle cx="${ex}" cy="${ey}" r="${ry * 0.28}" fill="#1a1208"/>`
           + `<circle cx="${ex + 1}" cy="${ey - 1}" r="${ry * 0.1}" fill="#fff"/>`;
    }
    return '';
  }

  // Pak tegningen ind i et fuldt SVG-dokument og returnér som data-URL.
  function svgDataUrl(e, pose) {
    const inner = tegnDyr(e, pose);
    // Tryk tegningen let sammen lodret omkring gulvlinjen (oblik-hint)
    const g = `<g transform="translate(0 ${GROUND}) scale(1 ${OBLIK_SQUASH}) translate(0 ${-GROUND})">${inner}</g>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VBW} ${VBH}">${g}</svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  // ---- Offentligt API ------------------------------------------------------

  // Filnavns-uafhængig nøgle (cache + identitet).
  function hentSpriteBase(input) {
    const e = input.egenskaber || input;
    return `${e.stofskifte || 'varm'}-${e.kropsform || 'lille_slank'}-${e.hudtype || 'pels'}-${e.foedevalg || 'altaeder'}-${e.forsvar || 'camouflage'}`;
  }

  // Gang-/positur-faser pr. tilstand (genbruges på tværs af dyr → caches).
  const POSER = {
    walk: [{ sving: 0, bob: 0 }, { sving: 5, bob: -1.5 }, { sving: 0, bob: 0 }, { sving: -5, bob: -1.5 }],
    flee: [{ sving: 8, bob: -2.5 }, { sving: -8, bob: -2.5 }],
    eat:  [{ sving: 0, bob: 0, hovedNed: 6 }, { sving: 0, bob: 0, hovedNed: 9 }],
    idle: [{ sving: 0, bob: 0 }]
  };

  const _frameCache = new Map();   // spriteBase → { walk:[urls], flee:[urls], eat:[urls], idle:url }

  // Generér (og cache) alle animationsframes for et dyr som data-URLs.
  function genererFrames(input) {
    const e = input.egenskaber || input;
    const base = hentSpriteBase(input);
    if (_frameCache.has(base)) return _frameCache.get(base);
    const sæt = {
      idle: svgDataUrl(e, POSER.idle[0]),
      walk: POSER.walk.map(p => svgDataUrl(e, p)),
      flee: POSER.flee.map(p => svgDataUrl(e, p)),
      eat:  POSER.eat.map(p => svgDataUrl(e, p))
    };
    _frameCache.set(base, sæt);
    return sæt;
  }

  // Generér <img>-tag med dyrets idle-sprite (bruges af station + habitat-init).
  function genererSprite(input, opts) {
    const e = input.egenskaber || input;
    const url = genererFrames(input).idle;
    const h = (opts && opts.hoejde) || STOR_PX[storrelseFor(e.kropsform)] || 40;
    const w = Math.round(h * VBW / VBH);
    return `<img src="${url}" width="${w}" height="${h}" `
         + `style="image-rendering:auto;display:block" draggable="false" alt="">`;
  }

  // Dominerende farve til graf/label (baseret på hudtype + stofskifte).
  function hentDyrFarve(input) {
    const e = input.egenskaber || input;
    return palet(e.hudtype || 'pels', e.stofskifte || 'varm').krop;
  }

  window.Sprites = { genererSprite, genererFrames, hentDyrFarve, hentSpriteBase };
})();
