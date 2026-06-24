// playtest.js — automatiseret "SE før du siger færdig"-løkke for Byg Dit Dyr
//
// Hvad den gør:
//   • åbner byggestation OG habitat-skærm i SAMME browser-context (så
//     BroadcastChannel virker mellem dem)
//   • spiller et flow igennem og tager screenshots undervejs
//   • optager video af hele playtesten
//   • fanger konsol-/sidefejl og måler fps (jævnhed)
//   • skriver en summary.json der mapper direkte til kvalitetsbaren i SKILL.md
//
// Opsætning (én gang):
//   npm i -D playwright && npx playwright install chromium
//
// Kør (start først en server, ELLER peg på live-URL'en):
//   python3 -m http.server 8000        # i repo-roden, i en anden terminal
//   node .claude/skills/byg-dit-dyr-craft/scripts/playtest.js
//
//   # eller mod live:
//   BDD_URL=https://jeppekaczmarek-rgb.github.io/bygditdyr/ node .../playtest.js
//
// FØRSTE GANG = en opdagelses-kørsel: åbn interactables-byg.json + screenshots
// og udfyld klik-sekvensen i "TILPAS HER"-blokken med spillets rigtige knaptekster.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BDD_URL || 'http://localhost:8000';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = process.env.BDD_OUT || path.join(__dirname, '..', 'playtest-output', STAMP);
const FLOW_SECONDS = Number(process.env.BDD_SECONDS || 25);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'video'), { recursive: true });

const log = [];
function note(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  log.push(line);
}

async function reachable(url) {
  if (typeof fetch === 'undefined') { note('⚠ fetch ikke tilgængelig (Node <18) — springer reachability-tjek over.'); return true; }
  try { const r = await fetch(url); return r.ok; } catch { return false; }
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  note(`📸 ${name}.png`);
}

// Lister klikbare elementer + synlig tekst, så du kan opdage flowet og finde selektorer.
async function dumpInteractables(page, label) {
  const items = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, [role=button], a, .knap, [onclick], canvas'));
    return els.slice(0, 80).map(el => ({
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.getAttribute('aria-label') || el.id || '').trim().slice(0, 40),
      id: el.id || null,
      cls: (el.className || '').toString().slice(0, 60),
    }));
  });
  fs.writeFileSync(path.join(OUT_DIR, `interactables-${label}.json`), JSON.stringify(items, null, 2));
  note(`🔎 ${items.length} interaktive elementer gemt (interactables-${label}.json)`);
  return items;
}

// FPS-sampler: kører i siden i N sekunder og rapporterer gennemsnit + minimum.
async function measureFps(page, seconds) {
  return page.evaluate((secs) => new Promise(resolve => {
    let frames = 0, last = performance.now(), min = Infinity;
    const start = performance.now();
    function tick(now) {
      frames++;
      const fps = 1000 / (now - last); last = now;
      if (fps < min && isFinite(fps)) min = fps;
      if (now - start < secs * 1000) requestAnimationFrame(tick);
      else resolve({ avg: Math.round(frames / ((now - start) / 1000)), min: Math.round(min) });
    }
    requestAnimationFrame(tick);
  }), seconds);
}

(async () => {
  if (!(await reachable(BASE_URL))) {
    note(`❌ Kan ikke nå ${BASE_URL}.`);
    note('   Start en server: python3 -m http.server 8000  — eller sæt BDD_URL til live-URL.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  // ÉN context = BroadcastChannel virker mellem de to skærme.
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: path.join(OUT_DIR, 'video'), size: { width: 1280, height: 720 } },
  });

  const errors = [];
  const wire = (page, tag) => {
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text()}`); });
    page.on('pageerror', e => errors.push(`[${tag}] ${e.message}`));
  };

  const builder = await context.newPage(); wire(builder, 'byg');
  const habitat = await context.newPage(); wire(habitat, 'habitat');

  note('Åbner byggestation + habitat-skærm i samme context...');
  await builder.goto(BASE_URL, { waitUntil: 'networkidle' });
  await habitat.goto(BASE_URL, { waitUntil: 'networkidle' });
  // TODO: hvis habitat-skærmen har sin egen route (fx ?skaerm=habitat), naviger dertil her.

  await screenshot(builder, '01-byg-start');
  await screenshot(habitat, '01-habitat-start');
  await dumpInteractables(builder, 'byg');

  // ───────────────────────────────────────────────────────────────────────
  // TILPAS HER: spil ét helt flow igennem (byg dyr → send til habitat).
  // getByText / getByRole er robuste mod layout-ændringer. Udfyld efter
  // opdagelses-kørslen ud fra interactables-byg.json og screenshots.
  // ───────────────────────────────────────────────────────────────────────
  /*
  for (const valg of ['Højt', 'Pels', 'Planteæder', 'Mellem', 'Dagaktiv', 'Flugt']) {
    await builder.getByText(valg, { exact: false }).first().click();
  }
  await screenshot(builder, '02-byg-valgt');
  await builder.getByRole('button', { name: /send til habitat/i }).click();
  */

  note(`Lader habitatet leve i ${FLOW_SECONDS}s og tager screenshots undervejs...`);
  const shots = 5;
  for (let i = 1; i <= shots; i++) {
    await habitat.waitForTimeout((FLOW_SECONDS * 1000) / shots);
    await screenshot(habitat, `03-habitat-t${i}`);
  }

  note('Måler fps på habitat-skærmen (jævnhed)...');
  const fps = await measureFps(habitat, 5);
  note(`🎞️ fps: gennemsnit ${fps.avg}, minimum ${fps.min}`);

  const summary = {
    url: BASE_URL,
    fps,
    konsolfejl: errors,
    screenshots: fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png')),
    huskeliste: 'Åbn screenshots + video og vurder mod kvalitetsbaren i SKILL.md.',
  };
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'log.txt'), log.join('\n'));

  await context.close(); // gemmer video
  await browser.close();

  note('');
  note('===== PLAYTEST FÆRDIG =====');
  note(`Output: ${OUT_DIR}`);
  note(`fps: gns ${fps.avg} / min ${fps.min}   konsolfejl: ${errors.length}`);
  errors.slice(0, 10).forEach(e => note('  ⚠ ' + e));
  note('Næste: åbn screenshots/video, vurder mod kvalitetsbaren, ret det svageste punkt, kør igen.');
})();
