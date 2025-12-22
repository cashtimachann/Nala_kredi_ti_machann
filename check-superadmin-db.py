#!/usr/bin/env python3
import requests
import json

print("🔍 Test kreyansyèl diferan yo...")
print()

# Lis kreyansyèl posib
credentials_list = [
    {"email": "superadmin@nalacredit.com", "password": "SuperAdmin123!", "desc": "Default from DbInitializer"},
    {"email": "admin@nalakreditimachann.com", "password": "Admin@2024!", "desc": "From SQL script"},
    {"email": "superadmin@nalakreditimachann.com", "password": "SuperAdmin2024!", "desc": "Alternative"},
]

LOGIN_URL = "https://admin.nalakreditimachann.com/api/auth/login"

for idx, creds in enumerate(credentials_list, 1):
    print(f"Test #{idx}: {creds['desc']}")
    print(f"  Email: {creds['email']}")
    print(f"  Password: {creds['password']}")
    
    try:
        response = requests.post(LOGIN_URL, json=creds, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ SIKSÈ! Login fonksyone!")
            print(f"  👤 Itilizatè: {data.get('user', {}).get('name', 'N/A')}")
            print(f"  🔑 Wòl: {data.get('user', {}).get('role', 'N/A')}")
            print(f"  🎫 Token: {data.get('token', 'N/A')[:30]}...")
            print()
            print("=" * 50)
            print(f"✅ ITILIZE SA YO POU KONEKTE:")
            print(f"   Email: {creds['email']}")
            print(f"   Password: {creds['password']}")
            print("=" * 50)
            break
        else:
            print(f"  ❌ Echwe - Status: {response.status_code}")
            print(f"  Mesaj: {response.text}")
    except Exception as e:
        print(f"  ❌ Erè: {str(e)}")
    
    print()
