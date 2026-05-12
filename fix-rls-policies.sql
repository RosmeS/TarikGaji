-- Fix RLS policies for development - allow anonymous access
-- Run this in Supabase SQL Editor or via MCP

-- Allow anonymous users to access all tables for development
ALTER POLICY "Users can view their own groups" ON groups USING (true);
ALTER POLICY "Users can insert groups" ON groups USING (true) WITH CHECK (true);
ALTER POLICY "Users can update their own groups" ON groups USING (true) WITH CHECK (true);

ALTER POLICY "Users can view members in their groups" ON members USING (true);
ALTER POLICY "Users can insert members" ON members USING (true) WITH CHECK (true);
ALTER POLICY "Users can update members in their groups" ON members USING (true) WITH CHECK (true);

ALTER POLICY "Users can view group memberships" ON group_members USING (true);
ALTER POLICY "Users can insert group memberships" ON group_members USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete group memberships" ON group_members USING (true);

ALTER POLICY "Users can view cycles in their groups" ON cycles USING (true);
ALTER POLICY "Users can insert cycles" ON cycles USING (true) WITH CHECK (true);
ALTER POLICY "Users can update cycles" ON cycles USING (true) WITH CHECK (true);

ALTER POLICY "Users can view schedule" ON schedule USING (true);
ALTER POLICY "Users can insert schedule" ON schedule USING (true) WITH CHECK (true);
ALTER POLICY "Users can update schedule" ON schedule USING (true) WITH CHECK (true);

ALTER POLICY "Users can view payment entries" ON payment_entries USING (true);
ALTER POLICY "Users can insert payment entries" ON payment_entries USING (true) WITH CHECK (true);
ALTER POLICY "Users can update payment entries" ON payment_entries USING (true) WITH CHECK (true);
