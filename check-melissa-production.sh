#!/bin/bash
# Check if Melissa cashier account exists in production

echo "=== CHECKING MELISSA CASHIER IN PRODUCTION ==="
echo ""
echo "Checking database..."

# Check if user exists
docker exec nala-postgres psql -U postgres -d NalaCreditDb -c "
SELECT 
    \"Id\", 
    \"Email\", 
    \"FirstName\", 
    \"LastName\", 
    \"Role\", 
    \"IsActive\",
    \"BranchId\"
FROM \"AspNetUsers\" 
WHERE \"Email\" = 'melissa.jean@gmail.com';
"

echo ""
echo "Checking all cashier accounts..."
docker exec nala-postgres psql -U postgres -d NalaCreditDb -c "
SELECT 
    \"Email\", 
    \"FirstName\", 
    \"LastName\", 
    \"Role\", 
    \"IsActive\",
    \"BranchId\"
FROM \"AspNetUsers\" 
WHERE \"Role\" = 0 
ORDER BY \"Email\";
"
