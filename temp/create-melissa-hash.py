#!/usr/bin/env python3
"""
Kreye password hash pou Melissa Jean (Cashier)
Itilize ASP.NET Core Identity v3 password hashing
"""

import hashlib
import os
import base64

def create_aspnet_identity_hash(password):
    """
    Kreye yon password hash konpatib ak ASP.NET Core Identity V3
    Format: 0x01 || prf || iter_count || salt_size || salt || subkey
    """
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

# Kreyansyèl pou Melissa
EMAIL = "melissa.jean@gmail.com"
PASSWORD = "Jesus123!!"
FIRST_NAME = "Melissa"
LAST_NAME = "Jean"

print("🔐 Ap jenere password hash pou Melissa...")
password_hash = create_aspnet_identity_hash(PASSWORD)
print(f"✅ Hash kreye: {password_hash}")
print()
print(f"📋 Kreyansyèl:")
print(f"   Email: {EMAIL}")
print(f"   Password: {PASSWORD}")
print(f"   Hash: {password_hash}")
print()
print("🔄 Itilize hash sa a nan database Postgres la")
