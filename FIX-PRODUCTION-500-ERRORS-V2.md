# Fix for Production 500 Errors (Duplicate Key in Dictionary)

## Problem
The application was returning `500 Internal Server Error` for the following endpoints:
- `GET /api/MicrocreditLoanApplication`
- `GET /api/MicrocreditLoan`

## Cause
The error was caused by `ToDictionaryAsync` throwing an exception when duplicate keys were encountered.
Specifically, the code was attempting to create a dictionary of savings accounts keyed by `CustomerId`.
If a customer had multiple savings accounts (or if the query logic somehow resulted in duplicates), `ToDictionaryAsync` would fail.

```csharp
// Old code
var savingsAccountsLookup = await _context.SavingsAccounts
    .Where(sa => borrowerIds.Contains(sa.CustomerId))
    .ToDictionaryAsync(sa => sa.CustomerId, sa => sa.AccountNumber);
```

## Solution
The code was updated to handle potential duplicates by grouping by `CustomerId` and selecting the first account number.
This was done by fetching the data first and then processing it in memory.

```csharp
// New code
var savingsAccountsList = await _context.SavingsAccounts
    .Where(sa => borrowerIds.Contains(sa.CustomerId))
    .Select(sa => new { sa.CustomerId, sa.AccountNumber })
    .ToListAsync();

var savingsAccountsLookup = savingsAccountsList
    .GroupBy(sa => sa.CustomerId)
    .ToDictionary(g => g.Key, g => g.First().AccountNumber);
```

## Files Modified
- `backend/NalaCreditAPI/Services/MicrocreditLoanApplicationService.cs`

## Verification
The project was successfully built using `dotnet build`.
The fix handles the case where a customer has multiple savings accounts by picking one (arbitrarily the first one found), preventing the crash.
