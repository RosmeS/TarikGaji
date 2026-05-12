-- Make phone_number column nullable in members table
ALTER TABLE members ALTER COLUMN phone_number DROP NOT NULL;
