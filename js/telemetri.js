// ============================================================
// telemetri.js — Anonym dataindsamling til gameplay-tuning
// ------------------------------------------------------------
// Formål: gøre det synligt OM de biologiske v2-mekanikker
// faktisk udløses, og OM der er nok flow (aktivitet) i habitatet.
// Ingen persondata — kun anonyme adfærdstællere og levetider.
//
// Brug:
//   - Tast 'D' for at vise/skjule live debug-overlay
//   - Tast 'E' (eller knap) eksporterer sessionen som JSON
//   - Auto-eksport forsøges når vinduet lukkes
//   - Læg JSON-filerne i mappen  telemetri/  så Claude kan analysere dem
// ============================================================

(function () {
  const VERSION = 'v3';
  const LOG_MAX = 500;          // maks. antal rå-hændelser der gemmes

  // --- Aggregeret tilstand ---
  let habitat = null;
  let sessionId = null;         // matches window.habitatSessionId fra habitat.js
  let uploadIntervalSat = false;
  let startMs = 0;
  let wallMs = 0;               // samlet simuleret vægur-tid (sek)
  let dyrTidSek = 0;            // samlet "dyre-sekunder" (til tilstands-%)
  let kaskadeSek = 0;          // tid hvor trofisk kaskade var aktiv
  let senesteLevende = 0;

  const taeller = {
    ankomst: 0, foedsel: 0, doed: 0,
    panik: 0, ambush_spring: 0, konkurrence: 0,
    fangst_draebt: 0, fangst_undslap: 0, fangst_gift: 0, fangst_pigge: 0
  };

  const tilstandSek = { HVILER: 0, FOURAGER: 0, FLUGTER: 0, JAGER: 0 };
  const doedsaarsager = {};                 // aarsag -> antal
  const levetider = [];                     // alle levetider (sek)
  const levetidPerEgenskab = {};            // egenskab -> { vaerdi -> [sek...] }
  const population = { foedevalg: {}, forsvar: {}, stofskifte: {} };
  let jagtTider = [];                        // tidsstempler (ms) for fangstforsøg
  const raaLog = [];                         // seneste hændelser (debug/eksport)

  function tael(obj, key) { obj[key] = (obj[key] || 0) + 1; }

  // ============================================================
  // Offentlig API
  // ============================================================
  const Telemetri = {

    init(h) {
      habitat = h;
      sessionId = window.habitatSessionId || crypto.randomUUID();
      startMs = performance.now();
      injicerStil();
      byggOverlay();
      // Periodisk session-upload hvert 5. minut
      if (!uploadIntervalSat) {
        uploadIntervalSat = true;
        setInterval(() => uploadSessionTilSupabase(), 300_000);
      }
      console.log('Telemetri klar (' + VERSION + ') — tast D for debug-overlay');
    },

    // Registrér en diskret hændelse
    registrer(type, data) {
      data = data || {};
      switch (type) {
        case 'ankomst':
          taeller.ankomst++;
          if (data.egenskaber) {
            const e = data.egenskaber;
            tael(population.foedevalg, e.foedevalg);
            tael(population.forsvar, e.forsvar);
            tael(population.stofskifte, e.stofskifte);
          }
          break;
        case 'foedsel':      taeller.foedsel++; break;
        case 'panik':        taeller.panik++; break;
        case 'ambush_spring': taeller.ambush_spring++; break;
        case 'konkurrence':  taeller.konkurrence++; break;
        case 'fangst':
          jagtTider.push(performance.now());
          if (data.udfald === 'draebt') taeller.fangst_draebt++;
          else if (data.udfald === 'undslap') taeller.fangst_undslap++;
          else if (data.udfald === 'gift') taeller.fangst_gift++;
          else if (data.udfald === 'pigge') taeller.fangst_pigge++;
          break;
        case 'doed':
          taeller.doed++;
          if (data.aarsag) tael(doedsaarsager, data.aarsag);
          if (typeof data.levetid === 'number') {
            levetider.push(data.levetid);
            if (data.egenskaber) {
              for (const [k, v] of Object.entries(data.egenskaber)) {
                levetidPerEgenskab[k] = levetidPerEgenskab[k] || {};
                (levetidPerEgenskab[k][v] = levetidPerEgenskab[k][v] || []).push(data.levetid);
              }
            }
          }
          break;
      }
      if (raaLog.length < LOG_MAX) {
        raaLog.push({ t: Math.round((performance.now() - startMs)), type, ...data });
      }
    },

    // Per-frame sampling (kaldes fra simulationsloopet)
    tik(dyrListe, dt, nu, kaskadeAktiv) {
      wallMs += dt;
      if (kaskadeAktiv) kaskadeSek += dt;
      let levende = 0;
      for (const d of dyrListe) {
        if (d.doedsTid) continue;
        levende++;
        if (tilstandSek[d.tilstand] !== undefined) {
          tilstandSek[d.tilstand] += dt;
          dyrTidSek += dt;
        }
      }
      senesteLevende = levende;
    },

    // Aggregeret øjebliksbillede (overlay + eksport)
    snapshot() {
      const varighed = Math.max(1, wallMs);
      const minutter = varighed / 60;
      const totalHaendelser = taeller.panik + taeller.ambush_spring + taeller.konkurrence +
        taeller.foedsel + taeller.doed + jagtForsoeg();

      const tilstandPct = {};
      for (const s of Object.keys(tilstandSek)) {
        tilstandPct[s] = dyrTidSek > 0 ? +(tilstandSek[s] / dyrTidSek * 100).toFixed(1) : 0;
      }

      return {
        meta: {
          habitat, version: VERSION,
          startISO: new Date(Date.now() - varighed * 1000).toISOString(),
          varighedSek: Math.round(varighed),
          antalLevende: senesteLevende,
          antalAnkomne: taeller.ankomst
        },
        flow: {
          tilstandPct,
          haendelserPrMin: +(totalHaendelser / minutter).toFixed(1),
          jagterPrMin: +(jagtForsoeg() / minutter).toFixed(1),
          gnsnitSekMellemJagter: gnsnitMellemJagter()
        },
        haendelser: { ...taeller },
        jagtBalance: {
          forsoeg: jagtForsoeg(),
          draebt: taeller.fangst_draebt,
          undslap: taeller.fangst_undslap,
          gift: taeller.fangst_gift,
          pigge: taeller.fangst_pigge,
          fangstRatePct: jagtForsoeg() > 0
            ? +(taeller.fangst_draebt / jagtForsoeg() * 100).toFixed(1) : 0
        },
        kaskade: { aktivPct: +(kaskadeSek / varighed * 100).toFixed(1) },
        doedsaarsager: { ...doedsaarsager },
        levetider: levetidsRapport(),
        population: {
          foedevalg: { ...population.foedevalg },
          forsvar:   { ...population.forsvar },
          stofskifte: { ...population.stofskifte }
        }
      };
    },

    // Download sessionen som JSON
    eksporter() {
      const raw = {
        wallSek: +wallMs.toFixed(2),
        dyrTidSek: +dyrTidSek.toFixed(2),
        kaskadeSek: +kaskadeSek.toFixed(2),
        tilstandSek: { ...tilstandSek },
        levetider: levetider.slice(),
        levetidPerEgenskab: JSON.parse(JSON.stringify(levetidPerEgenskab))
      };
      const data = { ...this.snapshot(), _raw: raw, raaLog: raaLog.slice() };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `telemetri-${habitat || 'session'}-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      console.log('Telemetri eksporteret:', a.download);
    },

    nulstil() {
      for (const k of Object.keys(taeller)) taeller[k] = 0;
      for (const k of Object.keys(tilstandSek)) tilstandSek[k] = 0;
      for (const k of Object.keys(doedsaarsager)) delete doedsaarsager[k];
      for (const k of Object.keys(levetidPerEgenskab)) delete levetidPerEgenskab[k];
      for (const grp of Object.values(population)) for (const k of Object.keys(grp)) delete grp[k];
      levetider.length = 0; jagtTider.length = 0; raaLog.length = 0;
      wallMs = 0; dyrTidSek = 0; kaskadeSek = 0; startMs = performance.now();
      console.log('Telemetri nulstillet');
    }
  };

  // ============================================================
  // Supabase-upload
  // ============================================================
  async function uploadSessionTilSupabase() {
    const cfg = window.BYGDITDYR_CONFIG;
    if (!cfg?.supabaseUrl || taeller.ankomst === 0) return;
    try {
      await fetch(`${cfg.supabaseUrl}/rest/v1/telemetri_sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.supabaseAnonKey,
          'Authorization': `Bearer ${cfg.supabaseAnonKey}`,
          'Prefer': 'return=minimal,resolution=merge-duplicates'
        },
        body: JSON.stringify({
          session_id: sessionId,
          habitat,
          varighed_sek: Math.round(wallMs),
          snapshot: Telemetri.snapshot()
        })
      });
    } catch (_) {}
  }

  // ============================================================
  // Hjælpere
  // ============================================================
  function jagtForsoeg() {
    return taeller.fangst_draebt + taeller.fangst_undslap + taeller.fangst_gift + taeller.fangst_pigge;
  }

  function gnsnitMellemJagter() {
    if (jagtTider.length < 2) return null;
    let sum = 0;
    for (let i = 1; i < jagtTider.length; i++) sum += jagtTider[i] - jagtTider[i - 1];
    return +(sum / (jagtTider.length - 1) / 1000).toFixed(1);
  }

  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function levetidsRapport() {
    const perEgenskab = {};
    for (const [k, vals] of Object.entries(levetidPerEgenskab)) {
      perEgenskab[k] = {};
      for (const [v, arr] of Object.entries(vals)) {
        perEgenskab[k][v] = {
          antal: arr.length,
          gnsnitSek: +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
        };
      }
    }
    return {
      antal: levetider.length,
      gnsnitSek: levetider.length
        ? +(levetider.reduce((a, b) => a + b, 0) / levetider.length).toFixed(1) : 0,
      medianSek: +median(levetider).toFixed(1),
      perEgenskab
    };
  }

  // ============================================================
  // Debug-overlay (skjult som standard)
  // ============================================================
  let overlayEl = null, synlig = false, interval = null;

  function injicerStil() {
    if (document.getElementById('telemetri-stil')) return;
    const s = document.createElement('style');
    s.id = 'telemetri-stil';
    s.textContent = `
      #telemetri-overlay {
        position: fixed; bottom: 12px; left: 12px; z-index: 9999;
        width: 320px; max-height: 70vh; overflow-y: auto; display: none;
        background: rgba(12,12,8,0.92); border: 1px solid #4a4a38; border-radius: 10px;
        padding: 0.7rem 0.8rem; color: #f0ead6; font: 11px/1.45 ui-monospace, monospace;
        backdrop-filter: blur(3px);
      }
      #telemetri-overlay.vis { display: block; }
      #telemetri-overlay h4 { font-size: 12px; color: #e8c46a; margin-bottom: 0.4rem;
        font-family: 'Playfair Display', Georgia, serif; }
      #telemetri-overlay .tg { color: #a09a82; }
      #telemetri-overlay .rk { display: flex; justify-content: space-between; gap: 0.5rem; }
      #telemetri-overlay .adv { color: #e0483a; font-weight: 700; }
      #telemetri-overlay .ok { color: #6aaa3a; }
      #telemetri-overlay hr { border: none; border-top: 1px solid #33332a; margin: 0.45rem 0; }
      #telemetri-overlay .bar { height: 6px; border-radius: 3px; background: #33332a; overflow: hidden; margin: 2px 0 5px; }
      #telemetri-overlay .bar > i { display: block; height: 100%; }
      #telemetri-overlay button {
        font: 600 11px ui-monospace, monospace; color: #f0ead6; background: #5a7247;
        border: 1px solid #4a4a38; border-radius: 6px; padding: 0.35rem 0.6rem; cursor: pointer; margin-top: 0.5rem;
      }
      #telemetri-overlay button.sek { background: transparent; color: #e8c46a; border-color: #d4a843; margin-left: 0.4rem; }
      #telemetri-hint { position: fixed; bottom: 12px; left: 12px; z-index: 9998;
        font: 10px ui-monospace, monospace; color: rgba(160,154,130,0.6); }
    `;
    document.head.appendChild(s);
  }

  function byggOverlay() {
    overlayEl = document.createElement('div');
    overlayEl.id = 'telemetri-overlay';
    document.body.appendChild(overlayEl);

    const hint = document.createElement('div');
    hint.id = 'telemetri-hint';
    hint.textContent = 'tast D = telemetri';
    document.body.appendChild(hint);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') toggle();
      else if ((e.key === 'e' || e.key === 'E') && synlig) Telemetri.eksporter();
    });

    window.addEventListener('beforeunload', () => {
      if (taeller.ankomst > 0) uploadSessionTilSupabase();
    });
  }

  function toggle() {
    synlig = !synlig;
    overlayEl.classList.toggle('vis', synlig);
    document.getElementById('telemetri-hint').style.display = synlig ? 'none' : 'block';
    if (synlig) { render(); interval = setInterval(render, 1000); }
    else { clearInterval(interval); interval = null; }
  }

  const TILSTAND_FARVE = { HVILER: '#a09a82', FOURAGER: '#6aaa3a', FLUGTER: '#e0483a', JAGER: '#e8a23a' };

  function render() {
    const s = Telemetri.snapshot();
    const f = s.flow, h = s.haendelser, j = s.jagtBalance;

    // Flag: udløses mekanikkerne? er der flow?
    const advAmbush = (h.ambush_spring === 0 && s.meta.varighedSek > 30);
    const advFlow = (f.tilstandPct.HVILER > 70);
    const advJagt = (j.forsoeg === 0 && s.meta.varighedSek > 30);

    let html = `<h4>📊 Telemetri — ${s.meta.habitat || '?'} · ${s.meta.varighedSek}s · ${s.meta.antalLevende} levende</h4>`;

    html += `<div class="tg">Tilstandsfordeling (dyre-tid)</div>`;
    for (const st of ['HVILER', 'FOURAGER', 'FLUGTER', 'JAGER']) {
      const pct = f.tilstandPct[st] || 0;
      html += `<div class="rk"><span>${st}</span><span>${pct}%</span></div>`;
      html += `<div class="bar"><i style="width:${pct}%;background:${TILSTAND_FARVE[st]}"></i></div>`;
    }

    html += `<hr><div class="tg">Mekanik-tællere</div>`;
    html += rk('Panikflugt', h.panik);
    html += rk('Ambush-spring', h.ambush_spring, advAmbush);
    html += rk('Konkurrence', h.konkurrence);
    html += rk('Fødsler', h.foedsel);
    html += rk('Kaskade aktiv', s.kaskade.aktivPct + '%');

    html += `<hr><div class="tg">Jagtbalance</div>`;
    html += rk('Forsøg', j.forsoeg, advJagt);
    html += rk('Dræbt / undslap', `${j.draebt} / ${j.undslap}`);
    html += rk('Gift / pigge afvist', `${j.gift} / ${j.pigge}`);
    html += rk('Fangstrate', j.fangstRatePct + '%');
    html += rk('Ø sek mellem jagter', f.gnsnitSekMellemJagter ?? '—');

    html += `<hr><div class="tg">Flow</div>`;
    html += rk('Hændelser/min', f.haendelserPrMin, advFlow);
    html += rk('Levetid Ø / median', `${s.levetider.gnsnitSek} / ${s.levetider.medianSek}s`);

    const dod = Object.entries(s.doedsaarsager).sort((a, b) => b[1] - a[1]);
    if (dod.length) {
      html += `<hr><div class="tg">Dødsårsager</div>`;
      for (const [a, n] of dod) html += rk(a, n);
    }

    if (advAmbush || advFlow || advJagt) {
      html += `<hr><div class="adv">⚠ ${[
        advFlow ? 'For meget hvile (lavt flow)' : '',
        advAmbush ? 'Ambush udløses aldrig' : '',
        advJagt ? 'Ingen jagter' : ''
      ].filter(Boolean).join(' · ')}</div>`;
    }

    html += `<button onclick="Telemetri.eksporter()">Eksportér JSON</button>`;
    html += `<button class="sek" onclick="Telemetri.nulstil()">Nulstil</button>`;
    overlayEl.innerHTML = html;
  }

  function rk(navn, vaerdi, advarsel) {
    const kl = advarsel ? ' class="adv"' : '';
    return `<div class="rk"><span class="tg">${navn}</span><span${kl}>${vaerdi}</span></div>`;
  }

  window.Telemetri = Telemetri;
})();
