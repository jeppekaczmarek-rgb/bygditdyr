-- Migration: dyr_events — anonymiseret gameplay-statistik
-- Kør denne én gang i Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS dyr_events (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ts            timestamptz DEFAULT now()             NOT NULL,
  type          text        NOT NULL CHECK (type IN ('spawn', 'doed')),
  dyr_id        text        NOT NULL,
  habitat       text,
  egenskaber    jsonb,
  score         integer,
  levetid_sek   integer,
  doeds_aarsag  text,
  station_id    text,
  er_afkom      boolean     DEFAULT false
);

CREATE INDEX IF NOT EXISTS dyr_events_ts_idx   ON dyr_events (ts DESC);
CREATE INDEX IF NOT EXISTS dyr_events_type_idx ON dyr_events (type, ts DESC);

ALTER TABLE dyr_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert" ON dyr_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_select" ON dyr_events
  FOR SELECT TO anon USING (true);
