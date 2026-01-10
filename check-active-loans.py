import psycopg2
import sys

def check_loans():
    try:
        # Database connection
        conn = psycopg2.connect(
            dbname="nalacredit",
            user="postgres",
            password="Melissa2024",
            host="localhost",
            port="5433"
        )
        
        cur = conn.cursor()
        
        # Check total loans and status breakdown
        print("=" * 60)
        print("STATISTIQUES DES CRÉDITS")
        print("=" * 60)
        
        cur.execute("""
            SELECT 
                COUNT(*) as total_loans,
                COUNT(CASE WHEN "Status" = 0 THEN 1 END) as pending,
                COUNT(CASE WHEN "Status" = 1 THEN 1 END) as approved,
                COUNT(CASE WHEN "Status" = 2 THEN 1 END) as active,
                COUNT(CASE WHEN "Status" = 3 THEN 1 END) as completed,
                COUNT(CASE WHEN "Status" = 4 THEN 1 END) as overdue,
                COUNT(CASE WHEN "Status" = 5 THEN 1 END) as defaulted,
                COUNT(CASE WHEN "Status" = 6 THEN 1 END) as cancelled
            FROM "MicrocreditLoans";
        """)
        
        result = cur.fetchone()
        print(f"\nTotal crédits: {result[0]}")
        print(f"  - Pending (0): {result[1]}")
        print(f"  - Approved (1): {result[2]}")
        print(f"  - Active (2): {result[3]}")
        print(f"  - Completed (3): {result[4]}")
        print(f"  - Overdue (4): {result[5]}")
        print(f"  - Defaulted (5): {result[6]}")
        print(f"  - Cancelled (6): {result[7]}")
        
        # Check loans by branch
        print("\n" + "=" * 60)
        print("CRÉDITS PAR SUCCURSALE")
        print("=" * 60)
        
        cur.execute("""
            SELECT 
                b."Name" as branch_name,
                COUNT(*) as total,
                COUNT(CASE WHEN ml."Status" = 2 THEN 1 END) as active
            FROM "MicrocreditLoans" ml
            LEFT JOIN "Branches" b ON ml."BranchId" = b."Id"
            GROUP BY b."Name"
            ORDER BY total DESC;
        """)
        
        branches = cur.fetchall()
        for branch in branches:
            print(f"\n{branch[0]}: {branch[1]} total, {branch[2]} actif(s)")
        
        # Check some sample active loans
        print("\n" + "=" * 60)
        print("EXEMPLES DE CRÉDITS ACTIFS (5 premiers)")
        print("=" * 60)
        
        cur.execute("""
            SELECT 
                ml."LoanNumber",
                ml."BorrowerName",
                ml."PrincipalAmount",
                ml."Currency",
                ml."Status",
                b."Name" as branch_name
            FROM "MicrocreditLoans" ml
            LEFT JOIN "Branches" b ON ml."BranchId" = b."Id"
            WHERE ml."Status" = 2
            LIMIT 5;
        """)
        
        loans = cur.fetchall()
        if loans:
            for loan in loans:
                print(f"\n  • {loan[0]} - {loan[1]}")
                print(f"    Montant: {loan[2]} {loan[3]}")
                print(f"    Status: {loan[4]}")
                print(f"    Succursale: {loan[5]}")
        else:
            print("\n  Aucun crédit actif trouvé!")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Erreur: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_loans()
