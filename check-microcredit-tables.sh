#!/bin/bash

# Script to check if all Microcredit tables exist in the production database
# This script connects to the PostgreSQL database and lists all microcredit-related tables

echo "🔍 Checking Microcredit tables in production database..."
echo "=================================================="

# Expected microcredit tables based on ApplicationDbContext
EXPECTED_TABLES=(
    "microcredit_loan_type_configurations"
    "microcredit_borrowers"
    "microcredit_loan_applications"
    "microcredit_application_documents"
    "microcredit_guarantees"
    "microcredit_approval_steps"
    "microcredit_loans"
    "microcredit_payments"
    "microcredit_payment_schedules"
)

echo "Expected Microcredit tables:"
for table in "${EXPECTED_TABLES[@]}"; do
    echo "  - $table"
done

echo ""
echo "Checking database connection and tables..."
echo "=========================================="

# Check if we can connect to the database
if docker compose exec postgres psql -U nalauser -d nalakreditimachann_db -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Cannot connect to database"
    exit 1
fi

echo ""
echo "Current microcredit tables in database:"
echo "======================================="

# List all tables with 'microcredit' in the name
TABLES=$(docker compose exec postgres psql -U nalauser -d nalakreditimachann_db -c "SELECT tablename FROM pg_tables WHERE tablename LIKE 'microcredit%';" -t)

if [ -z "$TABLES" ]; then
    echo "❌ No microcredit tables found!"
    echo ""
    echo "📋 All expected tables are MISSING:"
    for table in "${EXPECTED_TABLES[@]}"; do
        echo "  ❌ $table"
    done
    exit 1
fi

FOUND_TABLES=()
MISSING_TABLES=()

# Check each expected table
for expected_table in "${EXPECTED_TABLES[@]}"; do
    if echo "$TABLES" | grep -q "^[[:space:]]*$expected_table[[:space:]]*$"; then
        echo "  ✅ $expected_table"
        FOUND_TABLES+=("$expected_table")
    else
        echo "  ❌ $expected_table (MISSING)"
        MISSING_TABLES+=("$expected_table")
    fi
done

echo ""
echo "Summary:"
echo "========"
echo "Found tables: ${#FOUND_TABLES[@]}"
echo "Missing tables: ${#MISSING_TABLES[@]}"

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo "🎉 All microcredit tables are present!"
else
    echo "⚠️  Some tables are missing. You may need to run migrations."
    echo ""
    echo "Missing tables:"
    for table in "${MISSING_TABLES[@]}"; do
        echo "  - $table"
    done
fi