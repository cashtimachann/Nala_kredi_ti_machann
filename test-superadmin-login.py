#!/usr/bin/env python3
import requests
import json

# URL pou login
LOGIN_URL = "https://admin.nalakreditimachann.com/api/auth/login"

# Kreyansyèl superadmin
credentials = {
    "email": "superadmin@nalacredit.com",
    "password": "Admin@2024!"
}

print("🔍 Ap teste koneksyon superadmin...")
print(f"URL: {LOGIN_URL}")
print(f"Email: {credentials['email']}")

try:
    # Voye request login
    response = requests.post(LOGIN_URL, json=credentials, timeout=10)
    
    print(f"\n📊 Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ LOGIN SIKSÈ!")
        print(f"\n👤 Itilizatè: {data.get('user', {}).get('name', 'N/A')}")
        print(f"📧 Email: {data.get('user', {}).get('email', 'N/A')}")
        print(f"🔑 Wòl: {data.get('user', {}).get('role', 'N/A')}")
        print(f"🎫 Token: {data.get('token', 'N/A')[:50]}...")
    else:
        print(f"❌ LOGIN ECHWE!")
        print(f"Repons: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("❌ Pa ka konekte ak sèvè a")
except requests.exceptions.Timeout:
    print("❌ Timeout - sèvè a pa reponn")
except Exception as e:
    print(f"❌ Erè: {str(e)}")
