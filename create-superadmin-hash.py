#!/usr/bin/env python3
"""
Kreye yon SuperAdmin nan database Postgres pou Nala Credit
Itilize ASP.NET Core Identity v3 password hashing
"""

import hashlib
import os
import base64
import subprocess
import json

def create_aspnet_identity_hash(password):
    """
    Kreye yon password hash konpatib ak ASP.NET Core Identity V3
    Format: 0x01 || prf || iter_count || salt_size || salt || subkey
    """
    # ASP.NET Identity V3 uses:
    # - Format marker: 0x01
    # - PRF: 0x01 (HMACSHA256) or 0x00 (HMACSHA1) or 0x02 (HMACSHA512)
    # - Iteration count: Usually 10000 (4 bytes, big endian)
    # - Salt length: 16 bytes (4 bytes header)
    # - Subkey length: 32 bytes
    
    prf_algorithm = 0x01  # HMACSHA256
    iteration_count = 10000
    salt_size = 16
    subkey_length = 32
    
    # Jenere salt
    salt = os.urandom(salt_size)
    
    # Jenere subkey (hash) using PBKDF2
    subkey = hashlib.pbkdf2_hmac(
        'sha256',  # prf algorithm
        password.encode('utf-8'),
        salt,
        iteration_count,
        subkey_length
    )
    
    # Build output: marker (1) || prf (1) || iteration (4) || salt_len (4) || salt (16) || subkey (32)
    output = bytearray()
    output.append(0x01)  # Format marker (version 3)
    output.append(prf_algorithm)  # PRF
    output.extend(iteration_count.to_bytes(4, byteorder='big'))  # Iteration count
    output.extend(salt_size.to_bytes(4, byteorder='big'))  # Salt size
    output.extend(salt)  # Salt
    output.extend(subkey)  # Subkey
    
    return base64.b64encode(bytes(output)).decode('ascii')

# Kreyansyèl
EMAIL = "superadmin@nalacredit.com"
PASSWORD = "Admin@2024!"
FIRST_NAME = "Super"
LAST_NAME = "Admin"

print("🔐 Ap jenere password hash...")
password_hash = create_aspnet_identity_hash(PASSWORD)
print(f"✅ Hash kreye: {password_hash[:50]}...")
print()

# Kreye script SQL
sql_script = f'''
-- Kreye wòl yo si yo pa egziste
INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
VALUES 
    ('superadmin-role', 'SuperAdmin', 'SUPERADMIN', gen_random_uuid()::text),
    ('admin-role', 'Admin', 'ADMIN', gen_random_uuid()::text),
    ('manager-role', 'Manager', 'MANAGER', gen_random_uuid()::text),
    ('cashier-role', 'Cashier', 'CASHIER', gen_random_uuid()::text),
    ('secretary-role', 'Secretary', 'SECRETARY', gen_random_uuid()::text),
    ('employee-role', 'Employee', 'EMPLOYEE', gen_random_uuid()::text)
ON CONFLICT ("Id") DO NOTHING;

-- Efase itilizatè sa a si li egziste
DELETE FROM "AspNetUsers" WHERE "Email" = '{EMAIL}';

-- Kreye itilizatè a
INSERT INTO "AspNetUsers" (
    "Id",
    "UserName",
    "NormalizedUserName",
    "Email",
    "NormalizedEmail",
    "EmailConfirmed",
    "PasswordHash",
    "SecurityStamp",
    "ConcurrencyStamp",
    "PhoneNumberConfirmed",
    "TwoFactorEnabled",
    "LockoutEnabled",
    "AccessFailedCount",
    "FirstName",
    "LastName",
    "Role",
    "IsActive",
    "CreatedAt"
)
VALUES (
    gen_random_uuid()::text,
    '{EMAIL}',
    '{EMAIL.upper()}',
    '{EMAIL}',
    '{EMAIL.upper()}',
    true,
    '{password_hash}',
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    false,
    false,
    true,
    0,
    '{FIRST_NAME}',
    '{LAST_NAME}',
    0,
    true,
    NOW()
);

-- Lyen ak wòl SuperAdmin
INSERT INTO "AspNetUserRoles" ("UserId", "RoleId")
SELECT u."Id", 'superadmin-role'
FROM "AspNetUsers" u
WHERE u."Email" = '{EMAIL}'
ON CONFLICT DO NOTHING;

-- Montre rezilta
SELECT 
    "Email" as "📧 Email",
    "FirstName" || ' ' || "LastName" as "👤 Non",
    CASE "Role" 
        WHEN 0 THEN '⭐ SuperAdmin'
        ELSE '❓ Lòt'
    END as "🔑 Wòl",
    CASE WHEN "IsActive" THEN '✅' ELSE '❌' END as "Aktif"
FROM "AspNetUsers"
WHERE "Email" = '{EMAIL}';
'''

# Sove script la
with open('/tmp/create_superadmin.sql', 'w') as f:
    f.write(sql_script)

print("📝 Script SQL kreye")
print()
print("🚀 Pou egzekite script sa a nan sèvè pwodiksyon:")
print()
print("ssh -i ~/.ssh/nala_deployment_rsa root@142.93.78.111 << 'ENDSSH'")
print("docker exec -i nala-postgres psql -U nalauser -d nalakreditimachann_db < /tmp/create_superadmin.sql")
print("ENDSSH")
print()
print(f"📋 Kreyansyèl pou login:")
print(f"   Email: {EMAIL}")
print(f"   Password: {PASSWORD}")
print(f"   URL: https://admin.nalakreditimachann.com/login")
