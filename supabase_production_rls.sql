-- ==========================================
-- PRODUCTION RLS MIGRATION
-- Run this in Supabase SQL Editor if you already applied the old public policies.
-- ==========================================

DROP POLICY IF EXISTS "Allow public select for leads" ON leads;
DROP POLICY IF EXISTS "Allow public insert for leads" ON leads;
DROP POLICY IF EXISTS "Allow public update for leads" ON leads;
DROP POLICY IF EXISTS "Allow public delete for leads" ON leads;

DROP POLICY IF EXISTS "Allow public select for meetings" ON meetings;
DROP POLICY IF EXISTS "Allow public insert for meetings" ON meetings;
DROP POLICY IF EXISTS "Allow public update for meetings" ON meetings;
DROP POLICY IF EXISTS "Allow public delete for meetings" ON meetings;

DROP POLICY IF EXISTS "Allow public select for notes" ON notes;
DROP POLICY IF EXISTS "Allow public insert for notes" ON notes;
DROP POLICY IF EXISTS "Allow public update for notes" ON notes;
DROP POLICY IF EXISTS "Allow public delete for notes" ON notes;

DROP POLICY IF EXISTS "Allow public select for users" ON users;
DROP POLICY IF EXISTS "Allow public insert for users" ON users;
DROP POLICY IF EXISTS "Allow public update for users" ON users;
DROP POLICY IF EXISTS "Allow public delete for users" ON users;

DROP POLICY IF EXISTS "Allow public select for system_settings" ON system_settings;
DROP POLICY IF EXISTS "Allow public insert for system_settings" ON system_settings;
DROP POLICY IF EXISTS "Allow public update for system_settings" ON system_settings;
DROP POLICY IF EXISTS "Allow public delete for system_settings" ON system_settings;

-- RLS remains enabled with no permissive policies.
-- The Next.js server uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
