// ============================================================
// broadcast.js — kommunikationslag mellem station og habitat
//
// To transporter, SAMME API (window.Broadcast.send / .lyt):
//   • Supabase Realtime Broadcast — virker PÅ TVÆRS af enheder
//     (bruges når js/config.js + supabase-js er tilgængelige)
//   • BroadcastChannel — kun samme browser/enhed (fallback til lokal dev / offline)
//
// Resten af spillet er uændret: det kalder kun Broadcast.send() og Broadcast.lyt().
// Vælg-ved-opstart: ét aktivt transportlag ad gangen → ingen dobbeltbeskeder.
// Kommentarer på dansk (projektregel).
// ============================================================
(function () {
  'use strict';

  const cfg = window.BYGDITDYR_CONFIG || {};
  const KANAL_NAVN = cfg.kanalNavn || 'bygditdyr';
  const lyttere = [];

  // Kald alle registrerede lyttere med en modtaget besked
  function udsendLokalt(data) {
    for (const cb of lyttere) {
      try { cb(data); } catch (e) { console.error('[Broadcast] lytter fejlede:', e); }
    }
  }

  let sendImpl = function () {};   // sættes af den valgte transport
  let transport = null;

  // ---- Transport A: Supabase Realtime (på tværs af enheder) ----------------
  function opsaetSupabase() {
    const klient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 20 } }
    });
    // self:false → vi modtager ikke vores egne beskeder (samme som BroadcastChannel)
    const kanal = klient.channel(KANAL_NAVN, { config: { broadcast: { self: false, ack: false } } });
    const koe = [];      // beskeder sendt før forbindelsen er klar
    let klar = false;

    kanal.on('broadcast', { event: 'besked' }, (payload) => udsendLokalt(payload.payload));

    kanal.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        klar = true;
        while (koe.length) {
          kanal.send({ type: 'broadcast', event: 'besked', payload: koe.shift() });
        }
        console.log('[Broadcast] Supabase Realtime klar — kanal:', KANAL_NAVN);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn('[Broadcast] Supabase realtime-status:', status);
      }
    });

    sendImpl = (data) => {
      if (klar) kanal.send({ type: 'broadcast', event: 'besked', payload: data });
      else koe.push(data);   // gem til forbindelsen er etableret
    };
    return kanal;
  }

  // ---- Transport B: BroadcastChannel (kun samme enhed) ---------------------
  function opsaetBroadcastChannel() {
    const bc = new BroadcastChannel(KANAL_NAVN);
    bc.addEventListener('message', (e) => udsendLokalt(e.data));
    sendImpl = (data) => bc.postMessage(data);
    console.log('[Broadcast] BroadcastChannel (kun samme enhed) — kanal:', KANAL_NAVN);
    return bc;
  }

  // ---- Vælg transport ------------------------------------------------------
  const harSupabase = cfg.supabaseUrl && cfg.supabaseAnonKey &&
    window.supabase && typeof window.supabase.createClient === 'function';

  if (harSupabase) {
    try {
      transport = opsaetSupabase();
    } catch (e) {
      console.error('[Broadcast] Supabase-opsætning fejlede — falder tilbage til BroadcastChannel:', e);
      transport = opsaetBroadcastChannel();
    }
  } else {
    transport = opsaetBroadcastChannel();
  }

  // ---- Offentligt API (uændret for resten af koden) ------------------------
  window.Broadcast = {
    send: (besked) => sendImpl(besked),
    lyt:  (callback) => lyttere.push(callback),
    kanal: transport,   // bevaret for bagudkompatibilitet (bruges ikke aktivt)
  };
})();
