-- Create a test group for development
INSERT INTO groups (id, name, color, created_at) 
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'Test Group', 
  '#3B82F6', 
  NOW()
) ON CONFLICT (id) DO NOTHING;
