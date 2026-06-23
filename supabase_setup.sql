-- ==========================================
-- MORANGOAI CRM DATABASE INITIALIZATION
-- Run this script in the Supabase SQL Editor.
-- ==========================================

-- 1. Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    company TEXT,
    service TEXT CHECK (service IN ('AI Agent', 'Web Development', 'App Development', 'DevOps', 'AI Automation')),
    budget TEXT,
    source TEXT DEFAULT 'Vapi Call',
    status TEXT DEFAULT 'New Lead' CHECK (status IN ('New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost')),
    vapi_call_id TEXT,
    transcript TEXT,
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_link TEXT,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_meetings_lead_id ON meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON notes(lead_id);

-- 5. Set up Row Level Security (RLS)
-- All tables deny direct anon/authenticated access.
-- The Next.js server uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 6. Insert Mock Data (Optional, uncomment if you want initial data in your database)
/*
INSERT INTO leads (id, name, phone, email, company, service, budget, source, status, vapi_call_id, transcript, recording_url)
VALUES (
    '8b7c6d5e-4a3b-2c1d-0e9f-8a7b6c5d4e3f',
    'Ahmed Khan',
    '+923001234567',
    'ahmed.khan@realestate.com',
    'Apex Realty Solutions',
    'AI Agent',
    '$1,000 - $3,000',
    'Vapi Call',
    'New Lead',
    'call_9a8b7c6d5e',
    'Agent: Thank you for calling MorangoAI. How can I help you?\nClient: Hi, I am Ahmed. I need a voice agent...',
    'https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg'
);

INSERT INTO meetings (lead_id, meeting_date, meeting_link, status)
VALUES (
    '8b7c6d5e-4a3b-2c1d-0e9f-8a7b6c5d4e3f',
    NOW() + INTERVAL '4 days',
    'https://meet.google.com/abc-defg-hij',
    'Scheduled'
);

INSERT INTO notes (lead_id, note)
VALUES (
    '8b7c6d5e-4a3b-2c1d-0e9f-8a7b6c5d4e3f',
);
*/

-- 7. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration statement to safely add column if table already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;

-- 8. Set up Row Level Security (RLS) for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 9. Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Set up Row Level Security (RLS) for system_settings table
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

