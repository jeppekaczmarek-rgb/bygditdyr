// ============================================================
// sprites.js — PNG sprite integration
// Returnerer <img>-tags der peger på pre-genererede pixel art.
// ============================================================

// Farver til tidslinje-rendering (baseret på hudtype)
const HUDTYPE_FARVER = {
  pels:  { r: 139, g: 94,  b: 60  },
  skael: { r: 90,  g: 122, b: 74  },
  fjer:  { r: 107, g: 91,  b: 149 }
};

// Beregn farve baseret på hudtype og stofskifte
// Varmblodede: varmere tone; koldblodede: køligere tone
function beregnFarve(hudtype, stofskifte) {
  const base = HUDTYPE_FARVER[hudtype] || HUDTYPE_FARVER.pels;
  let r = base.r, g = base.g, b = base.b;
  if (stofskifte === 'varm') {
    r = Math.min(255, r + 15); g = Math.min(255, g + 10); b = Math.max(0, b - 10);
  } else {
    r = Math.max(0, r - 20); g = Math.max(0, g - 10); b = Math.min(255, b + 20);
  }
  return { krop: `rgb(${r},${g},${b})` };
}

// Generer sprite-filnavn (uden extension)
function hentSpriteBase(input) {
  const e = input.egenskaber || input;
  return `${e.stofskifte || 'varm'}-${e.kropsform || 'lille_slank'}-${e.hudtype || 'pels'}-${e.foedevalg || 'altaeder'}-${e.forsvar || 'camouflage'}`;
}

// Generer IMG-tag med idle sprite
function genererSprite(input) {
  const base = hentSpriteBase(input);
  return `<img src="assets/sprites/${base}.png" style="image-rendering:pixelated;width:32px;height:32px" draggable="false" alt="">`;
}

// Hent dominerende farve til tidslinjen
function hentDyrFarve(input) {
  const e = input.egenskaber || input;
  return beregnFarve(e.hudtype || 'pels', e.stofskifte || 'varm').krop;
}

window.Sprites = { genererSprite, hentDyrFarve, hentSpriteBase };
