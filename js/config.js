// ============================================================
// config.js — kørselskonfiguration (indlæses FØR broadcast.js)
//
// Styrer hvordan station og habitat taler sammen:
//   • Er Supabase udfyldt → Supabase Realtime (virker PÅ TVÆRS af enheder)
//   • Er den tom / utilgængelig → BroadcastChannel (kun samme browser/enhed)
//
// Supabase Realtime Broadcast er ren ephemeral pub/sub — den rører IKKE
// nogen database eller tabeller. Anon-nøglen er offentlig efter design.
//
// NB: endpointet er p.t. lånt fra 'Tidsregistrering'-projektet og bruger
// en isoleret kanal ('rt-bygditdyr'). Skift til et dedikeret projekt når
// spillet skal i fast museumsdrift — ret blot de tre linjer herunder.
// ============================================================
window.BYGDITDYR_CONFIG = {
  supabaseUrl: 'https://siqfosckjdbgufnewknz.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcWZvc2NramRiZ3VmbmV3a256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNzYzNDYsImV4cCI6MjA4OTg1MjM0Nn0.4azJ4WSYpBaR1YoOp-ydCN6zPUC_F6eoyijZOnA0Q8A',
  kanalNavn: 'rt-bygditdyr',
};
