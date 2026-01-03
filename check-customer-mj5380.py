import psycopg2
from psycopg2 import sql

# Database connection parameters
conn_params = {
    'host': 'localhost',
    'database': 'nalakreditimachann_db',
    'user': 'postgres',
    'password': 'JCS823ch!!'
}

try:
    # Connect to database
    conn = psycopg2.connect(**conn_params)
    cursor = conn.cursor()
    
    # Check if customer MJ5380 exists
    query = '''
    SELECT "Id", "FirstName", "LastName", "Contact_PrimaryPhone", "IsActive"
    FROM "SavingsCustomers"
    WHERE "Id" = %s
    '''
    
    cursor.execute(query, ('MJ5380',))
    result = cursor.fetchone()
    
    if result:
        print(f"✓ Kliyan jwenn!")
        print(f"  ID: {result[0]}")
        print(f"  Non: {result[1]} {result[2]}")
        print(f"  Telefòn: {result[3]}")
        print(f"  Aktif: {'Wi' if result[4] else 'Non'}")
        
        # Check if customer has any accounts
        account_query = '''
        SELECT COUNT(*) as count, 
               STRING_AGG("AccountNumber", ', ') as accounts
        FROM "SavingsAccounts"
        WHERE "CustomerId" = %s
        '''
        cursor.execute(account_query, ('MJ5380',))
        account_result = cursor.fetchone()
        
        print(f"\n  Kont: {account_result[0]}")
        if account_result[1]:
            print(f"  Nimewo kont: {account_result[1]}")
    else:
        print("✗ Kliyan MJ5380 pa jwenn nan baz done a")
        
        # Check if any similar IDs exist
        similar_query = '''
        SELECT "Id", "FirstName", "LastName"
        FROM "SavingsCustomers"
        WHERE "Id" LIKE %s
        LIMIT 5
        '''
        cursor.execute(similar_query, ('MJ%',))
        similar = cursor.fetchall()
        
        if similar:
            print(f"\nKliyan ki gen ID ki sanble (ki kòmanse ak 'MJ'):")
            for row in similar:
                print(f"  - {row[0]}: {row[1]} {row[2]}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Erè: {str(e)}")
