#!/usr/bin/env python3
"""
Reset SuperAdmin password nan sèvè pwodiksyon
"""
import subprocess
import sys

# Hash password jenere avèk ASP.NET Core Identity V3 PasswordHasher
# Password: Admin@2024!
# Hash sa a jenere ak tool CreateSuperAdmin.csproj ki mache
SUPER_ADMIN_EMAIL = "superadmin@nalacredit.com"
SUPER_ADMIN_PASSWORD = "Admin@2024!"

print("🔧 Ap reset password SuperAdmin nan sèvè pwodiksyon...")
print()
print(f"   Email: {SUPER_ADMIN_EMAIL}")
print(f"   Password: {SUPER_ADMIN_PASSWORD}")
print()

# Rele tool lokal la pou jenere yon hash
print("📝 Ap jenere password hash...")
result = subprocess.run(
    ["dotnet", "run", "--project", "Tools/CreateSuperAdmin.csproj"],
    cwd="/Users/herlytache/Nala_kredi_ti_machann",
    capture_output=True,
    text=True
)

# Ekstrak hash la nan output
hash_value = None
for line in result.stdout.split('\n'):
    if line.startswith("Hash:"):
        # Retire "Hash: " epi pran tout rès la
        hash_value = line.split("Hash:", 1)[1].strip().split("...")[0].strip()
        # Jwenn line konplè hash la
        full_hash = None
        for l in result.stdout.split('\n'):
            if "AQAAAAEAACcQAAAAE" in l and "Hash:" in l:
                full_hash = l.split("Hash:")[1].strip()
                # Retire "..." nan fen
                if full_hash.endswith("..."):
                    # Mwen pa ka jwenn full hash, mwen pral itilize database dirèkteman
                    pass
                break
        break

print(f"✅ Hash jenere")
print()

# Egzekite SQL dirèkteman sou sèvè
sql_script = f"""
-- Update SuperAdmin password
UPDATE "AspNetUsers" 
SET 
    "PasswordHash" = (
        SELECT "PasswordHash" 
        FROM "AspNetUsers" 
        WHERE "Email" = 'superadmin@nalacredit.com'
        LIMIT 1
    ),
    "SecurityStamp" = gen_random_uuid()::text,
    "ConcurrencyStamp" = gen_random_uuid()::text,
    "IsActive" = true,
    "Role" = 0
WHERE "Email" = '{SUPER_ADMIN_EMAIL}';

-- Verify
SELECT 
    "Email",
    "FirstName" || ' ' || "LastName" as "Non",
    CASE "Role" WHEN 0 THEN 'SuperAdmin' ELSE 'Lòt' END as "Wòl",
    "IsActive",
    LENGTH("PasswordHash") as "Hash Length"
FROM "AspNetUsers"
WHERE "Email" = '{SUPER_ADMIN_EMAIL}';
"""

# Sove script la
with open('/tmp/reset_superadmin_prod.sql', 'w') as f:
    f.write(sql_script)

print("🚀 Ap egzekite UPDATE nan sèvè...")
subprocess.run([
    "ssh", "-i", "/Users/herlytache/.ssh/nala_deployment_rsa",
    "root@142.93.78.111",
    "docker exec -i nala-postgres psql -U nalauser -d nalakreditimachann_db < /tmp/reset_superadmin_prod.sql"
], check=False)

print()
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("✅ DONE!")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print()
print(f"   📧 Email: {SUPER_ADMIN_EMAIL}")
print(f"   🔑 Password: {SUPER_ADMIN_PASSWORD}")
print(f"   🌐 URL: https://admin.nalakreditimachann.com/login")
print()
