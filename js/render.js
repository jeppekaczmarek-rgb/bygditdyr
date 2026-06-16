// ============================================================
// render.js — Lag-compositing + bake-ved-spawn + procedurel animation
//
// Holdt HELT adskilt fra spil-logik (survival.js / oekonomi.js / habitat.js).
// Tre ansvar:
//   1) indlaesBilleder() — async-load af PNG/WebP-lag
//   2) bake()            — komponer lag EN gang til et offscreen-canvas
//                          (returnerer et canvas der kan bruges som
//                           drawImage-kilde ELLER som <img>.src via toDataURL)
//   3) proceduralTransform()/tegnDyr() — bevaeg det bagte sprite uden ny grafik
//
// Kommentarer paa dansk (projektregel).
// ============================================================
(function () {
  'use strict';

  // ---- 1. Billed-indlaesning ------------------------------------------------
  // kilder: { navn: "sti/til/fil.webp", ... } -> Promise<{ navn: HTMLImageElement }>
  function indlaesBilleder(kilder) {
    const navne = Object.keys(kilder);
    return Promise.all(navne.map(n => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res([n, img]);
      img.onerror = () => rej(new Error('Kunne ikke loade ' + kilder[n]));
      img.src = kilder[n];
    }))).then(par => Object.fromEntries(par));
  }

  // ---- 2. Bake-ved-spawn ----------------------------------------------------
  // Komponerer en basekrop + valgfrie lag til ET fladt sprite, EN gang.
  // lag: [{ img, blend, dx, dy, scale }]  (dx/dy/scale relativt til base)
  //   blend: fx 'multiply' (hud-tekstur) | 'source-over' (decal, standard)
  // Returnerer { canvas, bredde, hoejde } — canvas kan blittes direkte.
  function bake(baseImg, lag) {
    lag = lag || [];
    const w = baseImg.naturalWidth || baseImg.width;
    const h = baseImg.naturalHeight || baseImg.height;
    // OffscreenCanvas hvis muligt, ellers almindeligt canvas (bredere support)
    const cv = (typeof OffscreenCanvas !== 'undefined')
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const c = cv.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(baseImg, 0, 0, w, h);
    for (const l of lag) {
      c.globalCompositeOperation = l.blend || 'source-over';
      const s = l.scale || 1;
      c.drawImage(l.img, (l.dx || 0), (l.dy || 0), w * s, h * s);
    }
    c.globalCompositeOperation = 'source-over';
    return { canvas: cv, bredde: w, hoejde: h };
  }

  // Bag og returnér en data-URL (til DOM-<img> i den nuvaerende habitat-arkitektur)
  function bakeTilDataURL(baseImg, lag) {
    const { canvas } = bake(baseImg, lag);
    if (canvas.convertToBlob) {            // OffscreenCanvas
      return canvas.convertToBlob({ type: 'image/webp', quality: 0.92 })
        .then(b => URL.createObjectURL(b));
    }
    return Promise.resolve(canvas.toDataURL('image/webp', 0.92));
  }

  // ---- 3. Procedurel animation ---------------------------------------------
  // Liv uden ekstra frames: vejrtraekning (breathe), gang-hop (bob),
  // squash-and-stretch, og retnings-spejlvending. Alt drevet af tid + fart.
  //
  // dyr forventes at have: { vx, vy, animState, _fase } og evt.
  //   fartFaktor (stofskifte: hojt=hurtigere). Defaulter pænt hvis felter mangler.
  function proceduralTransform(dyr, nuMs) {
    const t = nuMs / 1000;
    // Per-individ tilstand (sat ved første kald)
    if (dyr._fase === undefined) dyr._fase = Math.random() * Math.PI * 2;
    if (dyr._lastT === undefined) dyr._lastT = t;
    if (dyr._facing === undefined) dyr._facing = (dyr.vx < 0 ? -1 : 1);
    let dtt = t - dyr._lastT; dyr._lastT = t;
    dtt = Math.max(0, Math.min(0.1, dtt));

    const vx = dyr.vx || 0, vy = dyr.vy || 0;
    const bevaeger = Math.hypot(vx, vy) > 0.05;
    const faktor = dyr.fartFaktor || 1;            // hojt stofskifte = en anelse livligere

    let dy = 0, sx = 1, sy = 1;

    // Altid: meget blød vejrtrækning (volumenbevarende, lav amplitude)
    const breathe = Math.sin(t * 1.6 * faktor + dyr._fase) * 0.010;
    sy += breathe; sx -= breathe;

    if (bevaeger && !dyr._harFrames) {
      const state = dyr.animState || 'walk';
      // gangInt (0..1) lader habitatet koble hop-takt+løft til DEN FAKTISKE fart,
      // så et dyr der accelererer/bremser ikke "løber på stedet". Default 1.
      const intens = (dyr.gangInt === undefined) ? 1 : Math.max(0, Math.min(1, dyr.gangInt));
      // Rolig, enkelt-frekvens gang — INGEN abs() (som fordoblede tempoet)
      const stride = (state === 'flee' ? 5.0 : 3.2) * faktor;
      const amp = (state === 'flee' ? 0.040 : 0.020) * intens;  // lavt løft = roligt
      const ph = t * stride + dyr._fase;
      dy = -(0.5 * (1 - Math.cos(ph))) * amp;          // glat 0..amp, ingen ryk
      const sq = Math.cos(ph) * amp * 0.4;             // mild squash i takt med hop
      sy += sq; sx -= sq;
    } else if (dyr.animState === 'eat') {
      dy = -(0.5 * (1 - Math.cos(t * 4))) * 0.014;     // lille roligt nik
    }

    // Blød spejlvending: 'facing' glider mod retningen (ingen hårdt snap).
    // Basekunsten vender mod HØJRE.
    const maalFacing = vx < -0.05 ? -1 : (vx > 0.05 ? 1 : dyr._facing);
    dyr._facing += (maalFacing - dyr._facing) * Math.min(1, 9 * dtt);

    return { dy, sx: sx * dyr._facing, sy, rot: 0, flip: dyr._facing };
  }

  // Blit et bagt sprite (canvas ELLER img) på et 2D-context.
  // Anker = FØDDERNE (bund-midte), så dyret står på jorden ved (x, y).
  // visHoejde = ønsket sprite-højde i px (styrer 'storrelse'); bredde følger ratio.
  // Vælg den aktuelle kilde: en frame fra dyr.frames[state] hvis sættet findes,
  // ellers det bagte statiske sprite. Framerate følger farten (gangInt); står
  // dyret stille, fryses på frame 0 (ingen "moonwalk på stedet").
  function vælgFrame(dyr, baked, nuMs) {
    const set = dyr.frames && dyr.frames[dyr.animState];
    if (!set || !set.length) { dyr._harFrames = false; return baked; }
    dyr._harFrames = true;
    const intens = (dyr.gangInt === undefined) ? 1 : Math.max(0, Math.min(1, dyr.gangInt));
    if (dyr._fIdx === undefined) { dyr._fIdx = 0; dyr._fAkk = 0; dyr._fLast = nuMs; }
    let dt = (nuMs - dyr._fLast) / 1000; dyr._fLast = nuMs;
    dt = Math.max(0, Math.min(0.1, dt));
    if (intens < 0.12) { dyr._fAkk = 0; dyr._fIdx = 0; return set[0]; }  // står stille
    const fps = (dyr.frameFps || 8) * intens;        // hurtigere gang = hurtigere ben
    dyr._fAkk += dt * fps;
    while (dyr._fAkk >= 1) { dyr._fAkk -= 1; dyr._fIdx = (dyr._fIdx + 1) % set.length; }
    return set[dyr._fIdx];
  }

  function tegnDyr(ctx, baked, dyr, nuMs, x, y, visHoejde) {
    const kildeObj = vælgFrame(dyr, baked, nuMs);
    const kilde = kildeObj.canvas || kildeObj;       // canvas eller img
    const bw = kildeObj.bredde || kilde.naturalWidth || kilde.width;
    const bh = kildeObj.hoejde || kilde.naturalHeight || kilde.height;
    const skala = visHoejde / bh;
    const w = bw * skala, h = bh * skala;
    const tr = proceduralTransform(dyr, nuMs);

    ctx.save();
    ctx.translate(x, y + tr.dy * h);                // fødder ved (x,y), løft ved hop
    ctx.rotate(tr.rot);
    ctx.scale(tr.sx, tr.sy);
    ctx.drawImage(kilde, -w / 2, -h, w, h);         // bund-midte-anker
    ctx.restore();
  }

  // Blød kontaktskygge under dyret — giver "finish" og grounder figuren.
  function tegnSkygge(ctx, x, y, bredde) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.32);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, bredde / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.33)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, bredde / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  window.Render = {
    indlaesBilleder, bake, bakeTilDataURL,
    proceduralTransform, tegnDyr, tegnSkygge
  };
})();
