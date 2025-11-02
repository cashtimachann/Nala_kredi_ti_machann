-- Script to fix corrupted customer names in SavingsCustomers table
-- This updates records where firstName or lastName is 'undefined' to proper placeholder values

-- First, identify corrupted records
SELECT "Id", "FirstName", "LastName", "CustomerCode"
FROM "SavingsCustomers"
WHERE "FirstName" = 'undefined' OR "LastName" = 'undefined' OR "FirstName" IS NULL OR "LastName" IS NULL;

-- Update corrupted first names
UPDATE "SavingsCustomers"
SET "FirstName" = 'Client'
WHERE "FirstName" = 'undefined' OR "FirstName" IS NULL;

-- Update corrupted last names
UPDATE "SavingsCustomers"
SET "LastName" = 'Inconnu'
WHERE "LastName" = 'undefined' OR "LastName" IS NULL;

-- Verify the fixes
SELECT "Id", "FirstName", "LastName", "CustomerCode"
FROM "SavingsCustomers"
WHERE "FirstName" = 'Client' OR "LastName" = 'Inconnu';