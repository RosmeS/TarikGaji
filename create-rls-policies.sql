-- Create RLS policies for development - allow anonymous access
-- Run this in Supabase SQL Editor

-- Groups table policies
DROP POLICY IF EXISTS "Enable insert for anonymous" ON groups;
DROP POLICY IF EXISTS "Enable select for anonymous" ON groups;
DROP POLICY IF EXISTS "Enable update for anonymous" ON groups;

CREATE POLICY "Enable insert for anonymous" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for anonymous" ON groups FOR SELECT USING (true);
CREATE POLICY "Enable update for anonymous" ON groups FOR UPDATE USING (true);

-- Members table policies  
DROP POLICY IF EXISTS "Enable insert for anonymous" ON members;
DROP POLICY IF EXISTS "Enable select for anonymous" ON members;
DROP POLICY IF EXISTS "Enable update for anonymous" ON members;

CREATE POLICY "Enable insert for anonymous" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for anonymous" ON members FOR SELECT USING (true);
CREATE POLICY "Enable update for anonymous" ON members FOR UPDATE USING (true);

-- Group_members table policies
DROP POLICY IF EXISTS "Enable insert for anonymous" ON group_members;
DROP POLICY IF EXISTS "Enable select for anonymous" ON group_members;
DROP POLICY IF EXISTS "Enable delete for anonymous" ON group_members;

CREATE POLICY "Enable insert for anonymous" ON group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for anonymous" ON group_members FOR SELECT USING (true);
CREATE POLICY "Enable delete for anonymous" ON group_members FOR DELETE USING (true);

-- Cycles table policies
DROP POLICY IF EXISTS "Enable insert for anonymous" ON cycles;
DROP POLICY IF EXISTS "Enable select for anonymous" ON cycles;
DROP POLICY IF EXISTS "Enable update for anonymous" ON cycles;

CREATE POLICY "Enable insert for anonymous" ON cycles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for anonymous" ON cycles FOR SELECT USING (true);
CREATE POLICY "Enable update for anonymous" ON cycles FOR UPDATE USING (true);

-- Schedule table policies
DROP POLICY IF EXISTS "Enable insert for anonymous" ON schedule;
DROP POLICY IF EXISTS "Enable select for anonymous" ON schedule;
DROP POLICY IF EXISTS "Enable update for anonymous" ON schedule;

CREATE POLICY "Enable insert for anonymous" ON schedule FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for anonymous" ON schedule FOR SELECT USING (true);
CREATE POLICY "Enable update for anonymous" ON schedule FOR UPDATE USING (true);

-- Payment_entries table policies
DROP POLICY IF EXISTS "Enable insert for anonymous" ON payment_entries;
DROP POLICY IF EXISTS "Enable select for anonymous" ON payment_entries;
DROP POLICY IF EXISTS "Enable update for anonymous" ON payment_entries;

CREATE POLICY "Enable insert for anonymous" ON payment_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for anonymous" ON payment_entries FOR SELECT USING (true);
CREATE POLICY "Enable update for anonymous" ON payment_entries FOR UPDATE USING (true);
