// ============================================================
// audio.js — Syntetiseret lyd via Web Audio API
// Ambient loops per habitat + lydeffekter til events.
// Ingen eksterne lydfiler — alt genereres i realtid.
// ============================================================

const AMBIENT_VOL = 0.15;
const EFFEKT_VOL  = 0.3;

// Tonefrekvenser (Hz)
const C3 = 130.81, G3 = 196.00;
const C4 = 261.63, E4 = 329.63, G4 = 392.00, C5 = 523.25;

(function() {
  let ctx = null;         // AudioContext (lazy init)
  let ambientNodes = [];  // Aktive ambient-noder (til oprydning)
  let ambientGain = null; // Master gain for ambient
  let aktivtAmbient = null;

  // --- AudioContext-initialisering ---
  // Må først oprettes efter brugerinteraktion (browser-policy)
  function hentCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  // Lyt på første klik/touch for at låse op
  function opsaetAutoResume() {
    const handler = () => {
      hentCtx();
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
  }
  opsaetAutoResume();

  // --- Hjælpefunktioner ---

  // Opret hvid støj som AudioBuffer
  function opretStoej(varighed) {
    const ac = hentCtx();
    const len = ac.sampleRate * varighed;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // Stop og ryd alle ambient-noder
  function rydAmbient() {
    ambientNodes.forEach(n => {
      try { n.stop(); } catch {}
      try { n.disconnect(); } catch {}
    });
    ambientNodes = [];
    if (ambientGain) {
      try { ambientGain.disconnect(); } catch {}
      ambientGain = null;
    }
  }

  // ============================================================
  // AMBIENT — SKOV
  // Tilfældige korte fugletoner (800-2000 Hz, sinusbølger)
  // ============================================================
  function startSkov() {
    const ac = hentCtx();
    ambientGain = ac.createGain();
    ambientGain.gain.value = AMBIENT_VOL;
    ambientGain.connect(ac.destination);

    // Planelæg tilfældige fugletoner i loop
    function kvidder() {
      if (!ambientGain) return;

      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';

      // Tilfældig frekvens og varighed
      const freq = 800 + Math.random() * 1200;
      const dur = 0.05 + Math.random() * 0.15;
      const nu = ac.currentTime;

      osc.frequency.setValueAtTime(freq, nu);
      // Lille glissando op
      osc.frequency.linearRampToValueAtTime(freq + Math.random() * 400, nu + dur * 0.5);
      osc.frequency.linearRampToValueAtTime(freq - 100, nu + dur);

      gain.gain.setValueAtTime(0, nu);
      gain.gain.linearRampToValueAtTime(0.3 + Math.random() * 0.2, nu + 0.02);
      gain.gain.linearRampToValueAtTime(0, nu + dur);

      osc.connect(gain);
      gain.connect(ambientGain);
      osc.start(nu);
      osc.stop(nu + dur + 0.01);

      // Næste kvidder efter 0.3-2 sek (uregelmæssig rytme)
      const ventetid = 300 + Math.random() * 1700;
      const timer = setTimeout(kvidder, ventetid);
      ambientNodes.push({ stop: () => clearTimeout(timer), disconnect: () => {} });
    }

    // Start med 2-3 forskudte stemmer
    kvidder();
    setTimeout(kvidder, 500);
    setTimeout(kvidder, 1200);
  }

  // ============================================================
  // AMBIENT — ARKTIS
  // Hvinende vind (filtreret støj) + dyb rumlen
  // ============================================================
  function startArktis() {
    const ac = hentCtx();
    ambientGain = ac.createGain();
    ambientGain.gain.value = AMBIENT_VOL;
    ambientGain.connect(ac.destination);

    // Vind: hvid støj → bandpas-filter med langsom LFO
    const vindBuf = opretStoej(4);
    const vindSrc = ac.createBufferSource();
    vindSrc.buffer = vindBuf;
    vindSrc.loop = true;

    const vindFilter = ac.createBiquadFilter();
    vindFilter.type = 'bandpass';
    vindFilter.frequency.value = 600;
    vindFilter.Q.value = 1.5;

    // LFO modulerer filterfrekvens langsomt (0.1 Hz)
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 400; // ±400 Hz modulation
    lfo.connect(lfoGain);
    lfoGain.connect(vindFilter.frequency);
    lfo.start();

    const vindGain = ac.createGain();
    vindGain.gain.value = 0.7;

    vindSrc.connect(vindFilter);
    vindFilter.connect(vindGain);
    vindGain.connect(ambientGain);
    vindSrc.start();

    // Dyb rumlen: lav frekvens oscillator
    const rumle = ac.createOscillator();
    const rumleGain = ac.createGain();
    rumle.type = 'sine';
    rumle.frequency.value = 45;
    rumleGain.gain.value = 0.25;
    rumle.connect(rumleGain);
    rumleGain.connect(ambientGain);
    rumle.start();

    ambientNodes.push(vindSrc, lfo, rumle);
  }

  // ============================================================
  // AMBIENT — ØRKEN
  // Varm vind (støj + lavpas 400 Hz) + sporadiske cikader
  // ============================================================
  function startOerken() {
    const ac = hentCtx();
    ambientGain = ac.createGain();
    ambientGain.gain.value = AMBIENT_VOL;
    ambientGain.connect(ac.destination);

    // Varm vind: hvid støj → lavpas-filter
    const vindBuf = opretStoej(4);
    const vindSrc = ac.createBufferSource();
    vindSrc.buffer = vindBuf;
    vindSrc.loop = true;

    const lpf = ac.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 400;
    lpf.Q.value = 0.7;

    const vindGain = ac.createGain();
    vindGain.gain.value = 0.6;

    vindSrc.connect(lpf);
    lpf.connect(vindGain);
    vindGain.connect(ambientGain);
    vindSrc.start();

    ambientNodes.push(vindSrc);

    // Sporadiske cikade-bursts
    function cikade() {
      if (!ambientGain) return;

      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.value = 3000 + Math.random() * 1000;

      const nu = ac.currentTime;
      const dur = 0.08 + Math.random() * 0.12;

      gain.gain.setValueAtTime(0, nu);
      gain.gain.linearRampToValueAtTime(0.15, nu + 0.01);
      gain.gain.linearRampToValueAtTime(0, nu + dur);

      osc.connect(gain);
      gain.connect(ambientGain);
      osc.start(nu);
      osc.stop(nu + dur + 0.01);

      // Næste cikade: 2-8 sek
      const ventetid = 2000 + Math.random() * 6000;
      const timer = setTimeout(cikade, ventetid);
      ambientNodes.push({ stop: () => clearTimeout(timer), disconnect: () => {} });
    }

    cikade();
  }

  // ============================================================
  // LYDEFFEKTER
  // ============================================================

  // Send dyr: opadstigende C4→G4 (0.3 sek, sinusbølge)
  function effektSendDyr() {
    const ac = hentCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const nu = ac.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(C4, nu);
    osc.frequency.linearRampToValueAtTime(G4, nu + 0.3);

    gain.gain.setValueAtTime(EFFEKT_VOL, nu);
    gain.gain.linearRampToValueAtTime(0, nu + 0.3);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(nu);
    osc.stop(nu + 0.35);
  }

  // Dyr dør: nedadstigende G3→C3 (0.5 sek, triangle)
  function effektDyrDoer() {
    const ac = hentCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const nu = ac.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(G3, nu);
    osc.frequency.linearRampToValueAtTime(C3, nu + 0.5);

    gain.gain.setValueAtTime(EFFEKT_VOL, nu);
    gain.gain.exponentialRampToValueAtTime(0.001, nu + 0.5);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(nu);
    osc.stop(nu + 0.55);
  }

  // Jagt: lav puls (80 Hz) × 3 med 0.2 sek mellemrum
  function effektJagt() {
    const ac = hentCtx();
    const nu = ac.currentTime;

    for (let i = 0; i < 3; i++) {
      const start = nu + i * 0.2;
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.type = 'sine';
      osc.frequency.value = 80;

      gain.gain.setValueAtTime(EFFEKT_VOL * 0.6, start);
      gain.gain.linearRampToValueAtTime(0, start + 0.1);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(start);
      osc.stop(start + 0.12);
    }
  }

  // Spawn: opadgående C4-E4-G4-C5 arpeggio (0.08 sek per tone, kortere og lysere end sendDyr)
  function effektSpawnDyr() {
    const ac = hentCtx();
    const nu = ac.currentTime;
    [C4, E4, G4, C5].forEach((freq, i) => {
      const start = nu + i * 0.08;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(EFFEKT_VOL * 0.65, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  }

  // Ny rekord: C4-E4-G4 arpeggio (0.15 sek per tone)
  function effektNyRekord() {
    const ac = hentCtx();
    const nu = ac.currentTime;
    const noter = [C4, E4, G4];

    noter.forEach((freq, i) => {
      const start = nu + i * 0.15;
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(EFFEKT_VOL, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  // ============================================================
  // OFFENTLIG API
  // ============================================================
  window.Audio = {
    // Start ambient loop for et habitat
    startAmbient(habitat) {
      rydAmbient();
      aktivtAmbient = habitat;
      switch (habitat) {
        case 'skov':   startSkov();   break;
        case 'arktis': startArktis(); break;
        case 'oerken': startOerken(); break;
      }
      console.log('Ambient startet:', habitat);
    },

    // Stop ambient med fade-out over 2 sek
    stopAmbient() {
      if (!ambientGain || !ctx) { rydAmbient(); return; }
      const nu = ctx.currentTime;
      ambientGain.gain.setValueAtTime(ambientGain.gain.value, nu);
      ambientGain.gain.linearRampToValueAtTime(0, nu + 2);
      setTimeout(() => {
        rydAmbient();
        aktivtAmbient = null;
      }, 2100);
    },

    sendDyr:  effektSendDyr,
    spawnDyr: effektSpawnDyr,
    dyrDoer:  effektDyrDoer,
    jagt:     effektJagt,
    nyRekord: effektNyRekord
  };
})();
