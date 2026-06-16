// ============================================================
// sprites.js — PNG sprite integration
// Returnerer <img>-tags der peger på pre-genererede pixel art.
// ============================================================

// Farver til tidslinje-rendering
const HUDTYPE_FARVER = {
  pels:  { r: 139, g: 94, b: 60 },
  skael: { r: 90, g: 122, b: 74 },
  fjer:  { r: 107, g: 91, b: 149 },
  glat:  { r: 168, g: 197, b: 160 }
};

function beregnFarve(hudtype, aktivitet) {
  const base = HUDTYPE_FARVER[hudtype] || HUDTYPE_FARVER.glat;
  let r = base.r, g = base.g, b = base.b;
  if (aktivitet === 'nataktiv') {
    r = Math.max(0, r - 30); g = Math.max(0, g - 15); b = Math.min(255, b + 15);
  } else {
    r = Math.min(255, r + 15); g = Math.min(255, g + 10); b = Math.max(0, b - 10);
  }
  return { krop: `rgb(${r},${g},${b})` };
}

// Generer sprite-filnavn (uden extension)
function hentSpriteBase(input) {
  const e = input.egenskaber || input;
  return `${e.stofskifte || 'hojt'}-${e.hudtype || 'glat'}-${e.kost || 'alleaeder'}-${e.storrelse || 'mellem'}-${e.aktivitet || 'dagaktiv'}-${e.forsvar || 'ingen'}`;
}

// Generer IMG-tag med idle sprite
function genererSprite(input) {
  const base = hentSpriteBase(input);
  return `<img src="assets/sprites/${base}.png" style="image-rendering:pixelated;width:64px;height:64px" draggable="false" alt="">`;
}

// Hent dominerende farve til tidslinjen
function hentDyrFarve(input) {
  const raa = input.egenskaber || input;
  return beregnFarve(raa.hudtype || 'glat', raa.aktivitet || 'dagaktiv').krop;
}

window.Sprites = { genererSprite, hentDyrFarve, hentSpriteBase };
