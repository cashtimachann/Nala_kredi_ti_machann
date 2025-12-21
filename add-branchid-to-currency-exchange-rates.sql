-- Add BranchId column to CurrencyExchangeRates table
-- This allows branch managers to create branch-specific exchange rates

-- Drop existing uuid column if it exists
ALTER TABLE "CurrencyExchangeRates" 
DROP COLUMN IF EXISTS "BranchId";

-- Add nullable BranchId column as integer
ALTER TABLE "CurrencyExchangeRates" 
ADD COLUMN "BranchId" integer NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "IX_CurrencyExchangeRates_BranchId" 
ON "CurrencyExchangeRates" ("BranchId");

-- Add comment explaining the column
COMMENT ON COLUMN "CurrencyExchangeRates"."BranchId" IS 
'Optional: If set, this exchange rate applies to a specific branch only. If NULL, rate is global.';

-- Display results
SELECT 
    'BranchId column (integer) added to CurrencyExchangeRates table' as message,
    COUNT(*) as existing_rates_count
FROM "CurrencyExchangeRates";
