#!/usr/bin/env python3
"""
Script pou tcheke database pou pwoblèm branch reports
"""

import json
import sys

def analyze_database_requirements():
    """Analiz sa ki nesesè nan database pou branch reports fonksyone"""
    
    print("=" * 60)
    print("🔍 ANALIZ DATABASE POU BRANCH REPORTS")
    print("=" * 60)
    print()
    
    checks = {
        "branches": {
            "table": "Branches",
            "description": "Succursales ki egziste",
            "query": 'SELECT Id, Name, Code, IsActive FROM "Branches" ORDER BY Id;',
            "required": True
        },
        "users": {
            "table": "AspNetUsers",
            "description": "Users ak BranchId yo",
            "query": 'SELECT Id, UserName, Email, BranchId, Role FROM "AspNetUsers" WHERE BranchId IS NOT NULL;',
            "required": True
        },
        "transactions": {
            "table": "Transactions",
            "description": "Transactions pa branch",
            "query": 'SELECT BranchId, COUNT(*) as Count FROM "Transactions" GROUP BY BranchId;',
            "required": False
        },
        "credits": {
            "table": "Credits",
            "description": "Credits ak accounts",
            "query": '''
                SELECT ca.BranchId, COUNT(*) as Count 
                FROM "Credits" c
                INNER JOIN "CurrentAccounts" ca ON c.AccountId = ca.Id
                GROUP BY ca.BranchId;
            ''',
            "required": False
        },
        "credit_payments": {
            "table": "CreditPayments",
            "description": "Paiements credits",
            "query": '''
                SELECT ca.BranchId, COUNT(*) as Count 
                FROM "CreditPayments" cp
                INNER JOIN "Credits" c ON cp.CreditId = c.Id
                INNER JOIN "CurrentAccounts" ca ON c.AccountId = ca.Id
                GROUP BY ca.BranchId;
            ''',
            "required": False
        },
        "microcredit_loans": {
            "table": "MicrocreditLoans",
            "description": "Microcrédits pa branch",
            "query": 'SELECT BranchId, COUNT(*) as Count FROM "MicrocreditLoans" GROUP BY BranchId;',
            "required": False
        }
    }
    
    print("📋 QUERIES POU ROULAN NAN DATABASE:\n")
    
    for check_name, check_info in checks.items():
        required_text = "✅ REQUIRED" if check_info["required"] else "ℹ️  Optional"
        print(f"{required_text} - {check_info['description']}")
        print(f"Table: {check_info['table']}")
        print(f"Query:")
        print(f"{check_info['query']}")
        print()
    
    print("=" * 60)
    print("💡 INSTRUCTIONS")
    print("=" * 60)
    print()
    print("Pou PostgreSQL:")
    print("-" * 60)
    print('psql -U postgres -d NalaCredit -c "SELECT Id, Name FROM \\"Branches\\";"')
    print()
    
    print("Pou SQL Server:")
    print("-" * 60)
    print('sqlcmd -S localhost -d NalaCredit -Q "SELECT Id, Name FROM Branches;"')
    print()
    
    print("=" * 60)
    print("🔍 PWOBLÈM KOMEN YO")
    print("=" * 60)
    print()
    
    issues = [
        {
            "issue": "❌ Pa gen Branch nan database",
            "solution": "Kreye omwen yon branch:\n   INSERT INTO Branches (Name, Code, Address, IsActive) VALUES ('Port-au-Prince', 'PAP', 'Delmas 33', true);"
        },
        {
            "issue": "❌ User pa gen BranchId",
            "solution": "Ajoute BranchId pou user:\n   UPDATE AspNetUsers SET BranchId = 1 WHERE UserName = 'manager@example.com';"
        },
        {
            "issue": "❌ Pa gen transaction pou branch la",
            "solution": "Normal si branch la nouvo. Rapò a pral vid men API a dwe toujou retoune repons."
        },
        {
            "issue": "❌ User pa gen bon Role",
            "solution": "Asire user gen youn nan roles sa yo: Manager, BranchSupervisor, SuperAdmin, Director, Cashier"
        }
    ]
    
    for i, issue_info in enumerate(issues, 1):
        print(f"{i}. {issue_info['issue']}")
        print(f"   Solisyon: {issue_info['solution']}")
        print()
    
    print("=" * 60)
    print("📊 SAMPLE TEST DATA")
    print("=" * 60)
    print()
    print("Si ou vle teste ak done egzanp:")
    print()
    print("-- Kreye branch")
    print("INSERT INTO Branches (Name, Code, Address, IsActive, CreatedAt)")
    print("VALUES ('Port-au-Prince Centre', 'PAP-C', 'Delmas 33', true, NOW());")
    print()
    print("-- Update user pou gen branch")
    print("UPDATE AspNetUsers SET BranchId = 1 WHERE Email = 'admin@nala.com';")
    print()
    
    return True

if __name__ == "__main__":
    try:
        analyze_database_requirements()
    except Exception as e:
        print(f"❌ Erè: {e}", file=sys.stderr)
        sys.exit(1)
