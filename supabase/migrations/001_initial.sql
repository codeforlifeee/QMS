-- QMS CRM: initial schema
-- Run this in Supabase SQL Editor to create all tables.

CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     TEXT UNIQUE,
  date            TIMESTAMPTZ DEFAULT now(),
  customer_name   TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  city            TEXT,
  travelling_month TEXT,
  planning_with   TEXT,
  pax_summary     TEXT,
  special_arrangements TEXT,
  priority_bucket TEXT DEFAULT 'Untouched Leads'
    CHECK (priority_bucket IN (
      'Untouched Leads','Call Not Connected','In Progress',
      'My Hot','Warm Lead','Rejected'
    )),
  latest_status   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID REFERENCES leads(id) ON DELETE CASCADE,
  call_date_time    TIMESTAMPTZ DEFAULT now(),
  called_by         TEXT,
  call_status       TEXT CHECK (call_status IN (
    'Call not connected','Talk in Progress',
    'Traveler will finalise and is My Hot','Warm Lead',
    'Won''t book with me/ Rejected'
  )),
  call_progress     TEXT,
  wa_status         TEXT CHECK (wa_status IN ('WA Sent','WA Not sent')),
  destination_city  TEXT,
  travel_date       DATE,
  total_adults      INTEGER DEFAULT 0,
  total_children    INTEGER DEFAULT 0,
  child_ages        TEXT[] DEFAULT '{}',
  total_nights      INTEGER DEFAULT 0,
  hotel_category    TEXT CHECK (hotel_category IN ('3 Star','4 Star','5 Star')),
  visa              TEXT CHECK (visa IN ('Yes','No')),
  flights           TEXT CHECK (flights IN ('Yes','No')),
  transfers_type    TEXT CHECK (transfers_type IN ('Private Transfers','Sharing Transfers')),
  requirements      TEXT,
  remarks           TEXT,
  budget            TEXT CHECK (budget IN ('Affordable','Medium','Premium','Luxury')),
  next_follow_up    DATE,
  wa_link           TEXT,
  quote_link        TEXT,
  lead_source       TEXT,
  priority          TEXT CHECK (priority IN ('P1','P2','P3')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotations (
  id          TEXT PRIMARY KEY,
  token       TEXT UNIQUE NOT NULL,
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  status      TEXT DEFAULT 'draft',
  reference   TEXT,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS citations (
  quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
  data         JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
  data         JSONB NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_bucket ON leads(priority_bucket);
CREATE INDEX IF NOT EXISTS idx_leads_updated ON leads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_responses_lead ON call_responses(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_responses_followup ON call_responses(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_quotations_lead ON quotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotations_token ON quotations(token);
