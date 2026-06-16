// ============================================================
// genererSprites.js — Pixel art sprite-generator v3 (Node.js)
// 64×64 PNG-sprites med 4-lags shading + animationsframes.
// Kør: node genererSprites.js
// ============================================================

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'assets', 'sprites');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 64, H = 64;

// ============================================================
// PALETTER — 4 lag: highlight, mid, shadow, outline
// ============================================================

const HUDTYPE_PALETTE = {
  pels: {
    highlight: [0xC8, 0x86, 0x4A],
    mid:       [0x8B, 0x5E, 0x3C],
    shadow:    [0x4A, 0x2A, 0x14],
    outline:   [0x1A, 0x0A, 0x04]
  },
  skael: {
    highlight: [0x8A, 0xBB, 0x6A],
    mid:       [0x4A, 0x7A, 0x3A],
    shadow:    [0x2A, 0x4A, 0x1A],
    outline:   [0x0A, 0x2A, 0x0A]
  },
  fjer: {
    highlight: [0x9A, 0x8A, 0xBB],
    mid:       [0x5A, 0x4A, 0x8A],
    shadow:    [0x3A, 0x2A, 0x5A],
    outline:   [0x1A, 0x0A, 0x3A]
  },
  glat: {
    highlight: [0xBB, 0xD8, 0xBB],
    mid:       [0x7A, 0xAA, 0x8A],
    shadow:    [0x4A, 0x7A, 0x5A],
    outline:   [0x2A, 0x4A, 0x3A]
  }
};

const OEJE_FARVE = {
  hojt: [0xFF, 0x88, 0x00],
  lavt: [0x44, 0x88, 0xFF]
};

const HVID = [255, 255, 255];
const SORT = [0, 0, 0];
const NAESE = [0x10, 0x08, 0x04];
const TAND = [0xF0, 0xEA, 0xD6];
const PINK = [0xC0, 0x60, 0x80];
const VIBRISSE = [0xCC, 0xCC, 0xBB];

// ============================================================
// TEGNE-PRIMITIVER
// ============================================================

function rgbStr(r, g, b) { return `rgb(${r},${g},${b})`; }

function applyNat(rgb) {
  return [Math.round(rgb[0] * 0.7), Math.round(rgb[1] * 0.7), Math.round(rgb[2] * 0.7)];
}

function getPalette(hudtype, aktivitet) {
  const p = HUDTYPE_PALETTE[hudtype];
  if (aktivitet === 'nataktiv') {
    return {
      highlight: applyNat(p.highlight), mid: applyNat(p.mid),
      shadow: applyNat(p.shadow), outline: applyNat(p.outline)
    };
  }
  return {
    highlight: [...p.highlight], mid: [...p.mid],
    shadow: [...p.shadow], outline: [...p.outline]
  };
}

function px(ctx, x, y, rgb) {
  ctx.fillStyle = rgbStr(...rgb);
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

function rect(ctx, x, y, w, h, rgb) {
  ctx.fillStyle = rgbStr(...rgb);
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function hline(ctx, x, y, len, rgb) { rect(ctx, x, y, len, 1, rgb); }
function vline(ctx, x, y, len, rgb) { rect(ctx, x, y, 1, len, rgb); }

function ellipseRaw(ctx, cx, cy, rx, ry, rgb) {
  cx = Math.round(cx); cy = Math.round(cy);
  rx = Math.round(rx); ry = Math.round(ry);
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        px(ctx, cx + dx, cy + dy, rgb);
      }
    }
  }
}

function circleRaw(ctx, cx, cy, r, rgb) { ellipseRaw(ctx, cx, cy, r, r, rgb); }

function shadedEllipse(ctx, cx, cy, rx, ry, pal) {
  ellipseRaw(ctx, cx, cy, rx + 1, ry + 1, pal.outline);
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        const t = (dy + ry) / (2 * ry);
        let color;
        if (t < 0.25) color = pal.highlight;
        else if (t < 0.65) color = pal.mid;
        else color = pal.shadow;
        px(ctx, cx + dx, cy + dy, color);
      }
    }
  }
}

function shadedCircle(ctx, cx, cy, r, pal) {
  shadedEllipse(ctx, cx, cy, r, r, pal);
}

function shadedRect(ctx, x, y, w, h, pal) {
  x = Math.round(x); y = Math.round(y);
  w = Math.round(w); h = Math.round(h);
  rect(ctx, x - 1, y - 1, w + 2, h + 2, pal.outline);
  const topH = Math.max(1, Math.round(h * 0.25));
  const botH = Math.max(1, Math.round(h * 0.3));
  const midH = h - topH - botH;
  rect(ctx, x, y, w, topH, pal.highlight);
  rect(ctx, x, y + topH, w, midH, pal.mid);
  rect(ctx, x, y + topH + midH, w, botH, pal.shadow);
}

function diagLine(ctx, x0, y0, x1, y1, rgb) {
  x0=Math.round(x0); y0=Math.round(y0); x1=Math.round(x1); y1=Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    px(ctx, x0, y0, rgb);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function triangle(ctx, x0, y0, x1, y1, x2, y2, rgb) {
  let pts = [[x0, y0], [x1, y1], [x2, y2]].sort((a, b) => a[1] - b[1]);
  const [p0, p1, p2] = pts;
  const totalH = p2[1] - p0[1];
  if (totalH === 0) { hline(ctx, Math.min(p0[0], p1[0], p2[0]), p0[1], Math.abs(p2[0] - p0[0]) + 1, rgb); return; }
  for (let y = p0[1]; y <= p2[1]; y++) {
    const t = (y - p0[1]) / totalH;
    let xA = Math.round(p0[0] + (p2[0] - p0[0]) * t);
    let xB;
    if (y < p1[1]) {
      const seg = p1[1] - p0[1] || 1;
      xB = Math.round(p0[0] + (p1[0] - p0[0]) * ((y - p0[1]) / seg));
    } else {
      const seg = p2[1] - p1[1] || 1;
      xB = Math.round(p1[0] + (p2[0] - p1[0]) * ((y - p1[1]) / seg));
    }
    if (xA > xB) [xA, xB] = [xB, xA];
    hline(ctx, xA, y, xB - xA + 1, rgb);
  }
}

// ============================================================
// BEN MED KNÆLED
// ============================================================

function tegnBen(ctx, x, y, upperH, lowerH, w, pal, knaeOffset) {
  knaeOffset = knaeOffset || 0;
  rect(ctx, x - 1, y - 1, w + 2, upperH + lowerH + 2, pal.outline);
  rect(ctx, x, y, w, upperH, pal.mid);
  vline(ctx, x, y, upperH, pal.highlight);
  hline(ctx, x + knaeOffset, y + upperH, w, pal.highlight);
  rect(ctx, x + knaeOffset, y + upperH + 1, w, lowerH, pal.shadow);
  hline(ctx, x + knaeOffset, y + upperH + lowerH, w, pal.outline);
}

// ============================================================
// ØJE — 4×4 med iris, pupil, highlight
// ============================================================

function tegnOeje(ctx, x, y, stofskifte) {
  const iris = OEJE_FARVE[stofskifte];
  rect(ctx, x - 1, y - 1, 6, 6, SORT);
  rect(ctx, x, y, 4, 4, HVID);
  rect(ctx, x + 1, y, 3, 4, iris);
  rect(ctx, x + 2, y + 1, 2, 2, SORT);
  px(ctx, x + 3, y, HVID);
}

// ============================================================
// WALK-OFFSETS — 4 frames
// [bagVenstre, bagHoejre, forVenstre, forHoejre]
// ============================================================

const NO_OFF = [{dx:0,dy:0},{dx:0,dy:0},{dx:0,dy:0},{dx:0,dy:0}];

const WALK_OFFSETS = [
  // Frame 1: neutral
  NO_OFF,
  // Frame 2: forben frem, bagben tilbage
  [{dx:-2,dy:0}, {dx:-2,dy:-1}, {dx:2,dy:-2}, {dx:2,dy:0}],
  // Frame 3: neutral
  NO_OFF,
  // Frame 4: forben tilbage, bagben frem
  [{dx:2,dy:-2}, {dx:2,dy:0}, {dx:-2,dy:0}, {dx:-2,dy:-1}],
];

// ============================================================
// BASISFORMER — accept legOff (array[4]) og headDY (int)
// ============================================================

function tegnLillePlanteaeder(ctx, pal, lo, hdy) {
  lo = lo || NO_OFF; hdy = hdy || 0;

  // Krop
  shadedEllipse(ctx, 28, 38, 12, 9, pal);

  // Hoved
  shadedEllipse(ctx, 42, 30 + hdy, 7, 6, pal);

  // Ører med pink indre
  ellipseRaw(ctx, 38, 20 + hdy, 3, 6, pal.outline);
  ellipseRaw(ctx, 38, 20 + hdy, 2, 5, pal.mid);
  ellipseRaw(ctx, 38, 20 + hdy, 1, 3, PINK);
  ellipseRaw(ctx, 46, 20 + hdy, 3, 6, pal.outline);
  ellipseRaw(ctx, 46, 20 + hdy, 2, 5, pal.mid);
  ellipseRaw(ctx, 46, 20 + hdy, 1, 3, PINK);

  // Snude + næse
  rect(ctx, 48, 31 + hdy, 4, 3, pal.highlight);
  rect(ctx, 51, 31 + hdy, 2, 2, NAESE);

  // Vibrissae
  hline(ctx, 52, 30 + hdy, 5, VIBRISSE);
  hline(ctx, 53, 32 + hdy, 5, VIBRISSE);
  hline(ctx, 52, 34 + hdy, 4, VIBRISSE);
  hline(ctx, 53, 36 + hdy, 3, VIBRISSE);

  // Hale (S-kurve)
  px(ctx, 15, 36, pal.outline);
  px(ctx, 14, 35, pal.mid); px(ctx, 13, 34, pal.mid); px(ctx, 12, 33, pal.mid);
  px(ctx, 13, 32, pal.mid); px(ctx, 14, 31, pal.mid);
  px(ctx, 15, 30, pal.shadow); px(ctx, 14, 29, pal.shadow);

  // Ben
  tegnBen(ctx, 20+lo[0].dx, 46+lo[0].dy, 4, 5, 3, pal, 1);
  tegnBen(ctx, 26+lo[1].dx, 46+lo[1].dy, 4, 5, 3, pal, 1);
  tegnBen(ctx, 34+lo[2].dx, 46+lo[2].dy, 4, 5, 3, pal, -1);
  tegnBen(ctx, 38+lo[3].dx, 46+lo[3].dy, 4, 5, 3, pal, -1);

  return { oejeX: 44, oejeY: 27 + hdy };
}

function tegnMellemPlanteaeder(ctx, pal, lo, hdy) {
  lo = lo || NO_OFF; hdy = hdy || 0;

  // Krop
  shadedEllipse(ctx, 28, 30, 16, 9, pal);

  // Hals
  rect(ctx, 41, 22 + hdy, 5, 12 - hdy, pal.outline);
  rect(ctx, 42, 22 + hdy, 3, 11 - hdy, pal.mid);
  vline(ctx, 42, 22 + hdy, 6, pal.highlight);

  // Hoved
  shadedEllipse(ctx, 48, 18 + hdy, 6, 5, pal);

  // Gevir
  vline(ctx, 44, 8 + hdy, 7, pal.outline);
  px(ctx, 43, 8 + hdy, pal.outline); px(ctx, 45, 10 + hdy, pal.outline);
  vline(ctx, 52, 8 + hdy, 7, pal.outline);
  px(ctx, 53, 8 + hdy, pal.outline); px(ctx, 51, 10 + hdy, pal.outline);

  // Snude
  rect(ctx, 53, 18 + hdy, 4, 3, pal.highlight);
  rect(ctx, 56, 18 + hdy, 2, 2, NAESE);

  // Hale
  px(ctx, 11, 27, pal.mid); px(ctx, 10, 26, pal.shadow); px(ctx, 9, 25, pal.shadow);

  // Ben
  tegnBen(ctx, 15+lo[0].dx, 38+lo[0].dy, 6, 8, 2, pal, 1);
  tegnBen(ctx, 21+lo[1].dx, 38+lo[1].dy, 6, 8, 2, pal, 1);
  tegnBen(ctx, 34+lo[2].dx, 38+lo[2].dy, 6, 8, 2, pal, -1);
  tegnBen(ctx, 40+lo[3].dx, 38+lo[3].dy, 6, 8, 2, pal, -1);

  return { oejeX: 49, oejeY: 15 + hdy };
}

function tegnStorPlanteaeder(ctx, pal, lo, hdy) {
  lo = lo || NO_OFF; hdy = hdy || 0;

  // Bagkrop + forpart + pukkel
  shadedRect(ctx, 8, 22, 30, 22, pal);
  shadedRect(ctx, 30, 16, 16, 28, pal);
  shadedRect(ctx, 33, 12, 10, 6, pal);

  // Hals
  rect(ctx, 44, 20 + hdy, 5, 14 - hdy, pal.outline);
  rect(ctx, 45, 20 + hdy, 3, 13 - hdy, pal.mid);
  vline(ctx, 45, 20 + hdy, 6, pal.highlight);

  // Hoved
  shadedRect(ctx, 46, 22 + hdy, 12, 10, pal);

  // Horn
  px(ctx, 48, 18 + hdy, pal.outline); px(ctx, 47, 17 + hdy, pal.outline);
  px(ctx, 46, 16 + hdy, pal.highlight); px(ctx, 47, 15 + hdy, pal.highlight);
  px(ctx, 55, 18 + hdy, pal.outline); px(ctx, 56, 17 + hdy, pal.outline);
  px(ctx, 57, 16 + hdy, pal.highlight); px(ctx, 56, 15 + hdy, pal.highlight);

  // Snude
  rect(ctx, 57, 26 + hdy, 4, 4, pal.highlight);
  rect(ctx, 60, 27 + hdy, 2, 2, NAESE);

  // Hale med dusk
  rect(ctx, 4, 24, 5, 2, pal.shadow);
  rect(ctx, 2, 22, 3, 4, pal.mid);
  px(ctx, 1, 21, pal.shadow); px(ctx, 1, 26, pal.shadow);

  // Tykke ben med hove
  for (let i = 0; i < 4; i++) {
    const bx = [12, 21, 33, 42][i];
    tegnBen(ctx, bx+lo[i].dx, 42+lo[i].dy, 5, 7, 5, pal, 0);
    rect(ctx, bx+lo[i].dx, 54+lo[i].dy, 5, 2, pal.outline);
  }

  return { oejeX: 52, oejeY: 23 + hdy };
}

function tegnLilleKoedaeder(ctx, pal, lo, hdy) {
  lo = lo || NO_OFF; hdy = hdy || 0;

  // Lang slank krop
  shadedEllipse(ctx, 30, 38, 18, 6, pal);

  // Tynd hals
  rect(ctx, 46, 33 + hdy, 3, 7 - hdy, pal.outline);
  rect(ctx, 47, 33 + hdy, 1, 6 - hdy, pal.mid);

  // Lille rundt hoved
  shadedCircle(ctx, 51, 32 + hdy, 5, pal);

  // Spids snude + tænder
  rect(ctx, 55, 33 + hdy, 5, 2, pal.highlight);
  rect(ctx, 59, 33 + hdy, 2, 2, NAESE);
  px(ctx, 56, 35 + hdy, TAND); px(ctx, 58, 35 + hdy, TAND);

  // Ører
  triangle(ctx, 48, 26 + hdy, 49, 22 + hdy, 50, 26 + hdy, pal.mid);
  triangle(ctx, 52, 26 + hdy, 53, 22 + hdy, 54, 26 + hdy, pal.mid);
  px(ctx, 49, 24 + hdy, pal.highlight); px(ctx, 53, 24 + hdy, pal.highlight);

  // Lang hale
  diagLine(ctx, 12, 38, 7, 33, pal.mid);
  diagLine(ctx, 12, 39, 7, 34, pal.shadow);
  px(ctx, 6, 32, pal.shadow); px(ctx, 5, 31, pal.mid);

  // Ben
  tegnBen(ctx, 16+lo[0].dx, 43+lo[0].dy, 3, 4, 2, pal, 0);
  tegnBen(ctx, 22+lo[1].dx, 43+lo[1].dy, 3, 4, 2, pal, 0);
  tegnBen(ctx, 38+lo[2].dx, 43+lo[2].dy, 3, 4, 2, pal, 0);
  tegnBen(ctx, 43+lo[3].dx, 43+lo[3].dy, 3, 4, 2, pal, 0);

  return { oejeX: 52, oejeY: 29 + hdy };
}

function tegnMellemKoedaeder(ctx, pal, lo, hdy) {
  lo = lo || NO_OFF; hdy = hdy || 0;

  // Kraftig krop
  shadedEllipse(ctx, 26, 32, 16, 11, pal);

  // Hoved + kæbe
  shadedEllipse(ctx, 46, 24 + hdy, 8, 7, pal);
  rect(ctx, 52, 26 + hdy, 6, 2, pal.highlight);
  rect(ctx, 52, 28 + hdy, 6, 2, pal.shadow);
  rect(ctx, 57, 25 + hdy, 2, 2, NAESE);
  px(ctx, 53, 28 + hdy, TAND); px(ctx, 55, 28 + hdy, TAND); px(ctx, 57, 28 + hdy, TAND);

  // Spidse ører
  triangle(ctx, 41, 18 + hdy, 43, 10 + hdy, 45, 18 + hdy, pal.outline);
  triangle(ctx, 42, 18 + hdy, 43, 12 + hdy, 44, 18 + hdy, pal.mid);
  px(ctx, 43, 15 + hdy, pal.highlight);
  triangle(ctx, 49, 18 + hdy, 51, 10 + hdy, 53, 18 + hdy, pal.outline);
  triangle(ctx, 50, 18 + hdy, 51, 12 + hdy, 52, 18 + hdy, pal.mid);
  px(ctx, 51, 15 + hdy, pal.highlight);

  // Busket hale
  shadedEllipse(ctx, 6, 28, 5, 4, pal);

  // Ben
  tegnBen(ctx, 14+lo[0].dx, 40+lo[0].dy, 5, 6, 3, pal, 1);
  tegnBen(ctx, 21+lo[1].dx, 40+lo[1].dy, 5, 6, 3, pal, 1);
  tegnBen(ctx, 32+lo[2].dx, 40+lo[2].dy, 5, 6, 3, pal, -1);
  tegnBen(ctx, 39+lo[3].dx, 40+lo[3].dy, 5, 6, 3, pal, -1);

  return { oejeX: 47, oejeY: 21 + hdy };
}

function tegnStorKoedaeder(ctx, pal, lo, hdy) {
  lo = lo || NO_OFF; hdy = hdy || 0;

  // Massiv krop + skulder-highlight
  shadedEllipse(ctx, 24, 34, 18, 14, pal);
  ellipseRaw(ctx, 34, 24, 6, 3, pal.highlight);

  // Enormt hoved
  shadedCircle(ctx, 48, 24 + hdy, 10, pal);
  rect(ctx, 54, 26 + hdy, 6, 2, pal.highlight);
  rect(ctx, 54, 28 + hdy, 6, 3, pal.shadow);
  px(ctx, 55, 28 + hdy, TAND); px(ctx, 57, 28 + hdy, TAND);
  px(ctx, 59, 28 + hdy, TAND); px(ctx, 56, 30 + hdy, TAND);
  rect(ctx, 57, 25 + hdy, 3, 2, NAESE);

  // Ører
  rect(ctx, 41, 13 + hdy, 3, 5, pal.outline);
  rect(ctx, 42, 14 + hdy, 1, 3, pal.mid);
  rect(ctx, 52, 13 + hdy, 3, 5, pal.outline);
  rect(ctx, 53, 14 + hdy, 1, 3, pal.mid);

  // Kort hale
  rect(ctx, 4, 28, 4, 2, pal.shadow);
  px(ctx, 3, 27, pal.mid);

  // Tykke ben med klør
  const bx = [10, 20, 32, 42];
  for (let i = 0; i < 4; i++) {
    tegnBen(ctx, bx[i]+lo[i].dx, 44+lo[i].dy, 5, 6, 5, pal, 0);
    px(ctx, bx[i]+lo[i].dx, 55+lo[i].dy, SORT);
    px(ctx, bx[i]+lo[i].dx+2, 55+lo[i].dy, SORT);
    px(ctx, bx[i]+lo[i].dx+4, 55+lo[i].dy, SORT);
  }

  return { oejeX: 49, oejeY: 20 + hdy };
}

function tegnAlleaeder(ctx, pal, lo, hdy) {
  lo = lo || NO_OFF; hdy = hdy || 0;

  // Buttet rund krop
  shadedEllipse(ctx, 28, 34, 16, 12, pal);

  // Hoved
  shadedCircle(ctx, 46, 28 + hdy, 7, pal);

  // Bred snude
  rect(ctx, 52, 29 + hdy, 5, 3, pal.highlight);
  rect(ctx, 56, 30 + hdy, 2, 2, NAESE);

  // Ører
  ellipseRaw(ctx, 42, 20 + hdy, 2, 3, pal.outline);
  ellipseRaw(ctx, 42, 20 + hdy, 1, 2, pal.mid);
  ellipseRaw(ctx, 50, 20 + hdy, 2, 3, pal.outline);
  ellipseRaw(ctx, 50, 20 + hdy, 1, 2, pal.mid);

  // Hale
  shadedEllipse(ctx, 10, 28, 4, 3, pal);

  // Ben
  tegnBen(ctx, 16+lo[0].dx, 44+lo[0].dy, 4, 5, 3, pal, 1);
  tegnBen(ctx, 23+lo[1].dx, 44+lo[1].dy, 4, 5, 3, pal, 1);
  tegnBen(ctx, 34+lo[2].dx, 44+lo[2].dy, 4, 5, 3, pal, -1);
  tegnBen(ctx, 41+lo[3].dx, 44+lo[3].dy, 4, 5, 3, pal, -1);

  return { oejeX: 47, oejeY: 25 + hdy };
}

// Vælg basisform
function tegnBasisform(ctx, pal, kost, storrelse, lo, hdy) {
  if (kost === 'alleaeder') return tegnAlleaeder(ctx, pal, lo, hdy);
  if (kost === 'koedaeder') {
    if (storrelse === 'lille') return tegnLilleKoedaeder(ctx, pal, lo, hdy);
    if (storrelse === 'stor') return tegnStorKoedaeder(ctx, pal, lo, hdy);
    return tegnMellemKoedaeder(ctx, pal, lo, hdy);
  }
  if (storrelse === 'lille') return tegnLillePlanteaeder(ctx, pal, lo, hdy);
  if (storrelse === 'stor') return tegnStorPlanteaeder(ctx, pal, lo, hdy);
  return tegnMellemPlanteaeder(ctx, pal, lo, hdy);
}

// ============================================================
// HUDTYPE-TEKSTURER
// ============================================================

function tegnPelsTekstur(ctx, pal) {
  const streger = [
    [16,34], [18,30], [20,28], [24,26], [28,25], [32,26], [36,28], [38,30], [40,34],
    [17,40], [20,42], [24,44], [32,44], [36,42], [39,40],
    [22,24], [26,24], [30,24], [34,26]
  ];
  streger.forEach(([x, y], i) => {
    const c = i % 2 === 0 ? pal.shadow : pal.highlight;
    px(ctx, x, y, c); px(ctx, x + 1, y - 1, c);
  });
}

function tegnSkaelTekstur(ctx, pal) {
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 16 + col * 6 + (row % 2) * 3;
      const y = 28 + row * 4;
      px(ctx, x + 1, y, pal.highlight);
      px(ctx, x, y + 1, pal.mid); px(ctx, x + 2, y + 1, pal.mid);
      px(ctx, x + 1, y + 2, pal.shadow);
    }
  }
}

function tegnFjerTekstur(ctx, pal) {
  const fjere = [
    [18,26], [24,28], [30,26], [36,28], [42,30],
    [20,32], [26,34], [32,32], [38,34]
  ];
  fjere.forEach(([x, y]) => {
    px(ctx, x + 1, y, pal.highlight); px(ctx, x + 2, y, pal.highlight);
    px(ctx, x, y + 1, pal.mid); px(ctx, x + 1, y + 1, pal.shadow);
    px(ctx, x + 2, y + 1, pal.mid); px(ctx, x + 3, y + 1, pal.mid);
  });
}

function tegnGlatTekstur(ctx, pal) {
  for (let x = 16; x <= 42; x++) px(ctx, x, 26, pal.highlight);
  for (let x = 18; x <= 40; x += 2) px(ctx, x, 28, pal.highlight);
}

function tegnHudtypeTekstur(ctx, pal, hudtype) {
  switch (hudtype) {
    case 'pels': tegnPelsTekstur(ctx, pal); break;
    case 'skael': tegnSkaelTekstur(ctx, pal); break;
    case 'fjer': tegnFjerTekstur(ctx, pal); break;
    case 'glat': tegnGlatTekstur(ctx, pal); break;
  }
}

// ============================================================
// FORSVAR-OVERLAY
// ============================================================

function tegnForsvar(ctx, forsvar, pal) {
  switch (forsvar) {
    case 'giftig':
      circleRaw(ctx, 56, 38, 2, [0x00, 0xCC, 0x44]);
      px(ctx, 56, 41, [0x00, 0xCC, 0x44]);
      px(ctx, 56, 42, [0x00, 0xAA, 0x33]);
      px(ctx, 22, 34, [0x00, 0xCC, 0x44]);
      px(ctx, 30, 30, [0x00, 0xCC, 0x44]);
      px(ctx, 36, 36, [0x00, 0xCC, 0x44]);
      break;
    case 'pigge':
      for (let i = 0; i < 5; i++) {
        const x = 16 + i * 6;
        triangle(ctx, x, 24, x + 2, 17, x + 4, 24, pal.outline);
        px(ctx, x + 1, 20, pal.highlight); px(ctx, x + 2, 19, pal.highlight);
      }
      break;
    case 'flugt':
      diagLine(ctx, 3, 28, 9, 26, [0xBB, 0xBB, 0xBB]);
      diagLine(ctx, 2, 34, 8, 32, [0xAA, 0xAA, 0xAA]);
      diagLine(ctx, 4, 40, 10, 38, [0x99, 0x99, 0x99]);
      break;
  }
}

// ============================================================
// SPRITE-RENDERING — én canvas med valgfri animation
// ============================================================

function renderSprite(egenskaber, legOff, headDY) {
  const { stofskifte, hudtype, kost, storrelse, aktivitet, forsvar } = egenskaber;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.antialias = 'none';
  ctx.clearRect(0, 0, W, H);

  const pal = getPalette(hudtype, aktivitet);
  const info = tegnBasisform(ctx, pal, kost, storrelse, legOff, headDY);
  tegnHudtypeTekstur(ctx, pal, hudtype);
  tegnForsvar(ctx, forsvar, pal);
  tegnOeje(ctx, info.oejeX, info.oejeY, stofskifte);

  return canvas;
}

// Flee-frame: tegn normal, scale med nearest-neighbor
function renderFleeSprite(egenskaber, frame) {
  const normal = renderSprite(egenskaber, null, 0);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const sx = frame === 0 ? 0.85 : 1.2;
  const sy = frame === 0 ? 1.15 : 0.85;
  const dw = Math.round(W * sx);
  const dh = Math.round(H * sy);
  const dx = Math.round((W - dw) / 2);
  const dy = H - dh; // forankret i bunden

  ctx.drawImage(normal, 0, 0, W, H, dx, dy, dw, dh);
  return canvas;
}

// ============================================================
// GEM SPRITE TIL DISK
// ============================================================

function gemSprite(canvas, filnavn) {
  fs.writeFileSync(path.join(OUT_DIR, filnavn), canvas.toBuffer('image/png'));
}

function countColors(canvas) {
  const data = canvas.getContext('2d').getImageData(0, 0, W, H).data;
  const colors = new Set();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
  }
  return colors.size;
}

function spriteBase(e) {
  return `${e.stofskifte}-${e.hudtype}-${e.kost}-${e.storrelse}-${e.aktivitet}-${e.forsvar}`;
}

// ============================================================
// GENERER ALLE FRAMES FOR ÉN KOMBINATION
// ============================================================

function genererAlleFrames(egenskaber) {
  const base = spriteBase(egenskaber);

  // Idle sprite
  const idle = renderSprite(egenskaber, null, 0);
  gemSprite(idle, `${base}.png`);

  // Walk (4 frames)
  for (let f = 0; f < 4; f++) {
    const c = renderSprite(egenskaber, WALK_OFFSETS[f], 0);
    gemSprite(c, `${base}-walk-${f + 1}.png`);
  }

  // Eat (2 frames)
  const eat1 = renderSprite(egenskaber, null, 0);
  gemSprite(eat1, `${base}-eat-1.png`);
  const eat2 = renderSprite(egenskaber, null, 4);
  gemSprite(eat2, `${base}-eat-2.png`);

  // Flee (2 frames)
  const flee1 = renderFleeSprite(egenskaber, 0);
  gemSprite(flee1, `${base}-flee-1.png`);
  const flee2 = renderFleeSprite(egenskaber, 1);
  gemSprite(flee2, `${base}-flee-2.png`);

  return { base, farver: countColors(idle) };
}

// ============================================================
// KØR
// ============================================================

const ALLE_VAERDIER = {
  stofskifte: ['hojt', 'lavt'],
  hudtype: ['pels', 'skael', 'fjer', 'glat'],
  kost: ['planteaeder', 'koedaeder', 'alleaeder'],
  storrelse: ['lille', 'mellem', 'stor'],
  aktivitet: ['dagaktiv', 'nataktiv'],
  forsvar: ['giftig', 'pigge', 'flugt', 'ingen']
};

function alleKombinationer() {
  const kombis = [];
  for (const stofskifte of ALLE_VAERDIER.stofskifte)
    for (const hudtype of ALLE_VAERDIER.hudtype)
      for (const kost of ALLE_VAERDIER.kost)
        for (const storrelse of ALLE_VAERDIER.storrelse)
          for (const aktivitet of ALLE_VAERDIER.aktivitet)
            for (const forsvar of ALLE_VAERDIER.forsvar)
              kombis.push({ stofskifte, hudtype, kost, storrelse, aktivitet, forsvar });
  return kombis;
}

console.log('=== Pixel Art Sprite Generator v3 (med animation) ===');
console.log(`Målmappe: ${OUT_DIR}\n`);

const alle = alleKombinationer();
console.log(`Totalt: ${alle.length} kombinationer × 9 frames = ${alle.length * 9} filer\n`);

// --- Fase 1: Test walk-frames med kvalitetstjek ---
console.log('--- Fase 1: Test-sprites (idle + walk) med kvalitetstjek ---');

const fase1 = alle.filter(e =>
  (e.storrelse === 'lille' || e.storrelse === 'stor') &&
  (e.hudtype === 'pels' || e.hudtype === 'skael') &&
  (e.kost === 'planteaeder' || e.kost === 'koedaeder') &&
  e.aktivitet === 'dagaktiv' &&
  e.forsvar === 'ingen'
);

let tæller = 0;
for (const e of fase1) {
  const base = spriteBase(e);

  // Idle
  const idle = renderSprite(e, null, 0);
  gemSprite(idle, `${base}.png`);
  const farver = countColors(idle);

  // Walk (4 frames)
  for (let f = 0; f < 4; f++) {
    const c = renderSprite(e, WALK_OFFSETS[f], 0);
    gemSprite(c, `${base}-walk-${f + 1}.png`);
  }

  tæller++;
  console.log(`  [${String(tæller).padStart(2)}] ${base.padEnd(52)} ${W}×${H}  ${farver} farver  +4 walk`);
}
console.log(`\nFase 1 færdig: ${fase1.length} sprites × 5 = ${fase1.length * 5} filer\n`);

// --- Fase 2: Alle kombinationer med alle frames ---
console.log('--- Fase 2: Alle sprites (idle + walk + eat + flee) ---');

const fase1Set = new Set(fase1.map(spriteBase));
tæller = fase1.length;

for (const e of alle) {
  const base = spriteBase(e);
  if (fase1Set.has(base)) {
    // Fase 1 mangler eat+flee — generer dem nu
    const eat1 = renderSprite(e, null, 0);
    gemSprite(eat1, `${base}-eat-1.png`);
    const eat2 = renderSprite(e, null, 4);
    gemSprite(eat2, `${base}-eat-2.png`);
    const flee1 = renderFleeSprite(e, 0);
    gemSprite(flee1, `${base}-flee-1.png`);
    const flee2 = renderFleeSprite(e, 1);
    gemSprite(flee2, `${base}-flee-2.png`);
  } else {
    genererAlleFrames(e);
  }
  tæller++;
  if (tæller % 50 === 0) console.log(`  [${tæller}/${alle.length}] ${base}`);
}

const totalFiler = alle.length * 9;
console.log(`\n=== Færdig! ${alle.length} sprites × 9 frames = ${totalFiler} filer ===`);
