-- Create additional test groups for multi-group assignment testing
INSERT INTO groups (id, name, color, created_at) VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Office Group', '#10B981', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Family Group', '#F59E0B', NOW())
ON CONFLICT (id) DO NOTHING;
