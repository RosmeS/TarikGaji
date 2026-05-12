-- Make group_id column nullable in cycles table for global cycles
ALTER TABLE cycles ALTER COLUMN group_id DROP NOT NULL;
