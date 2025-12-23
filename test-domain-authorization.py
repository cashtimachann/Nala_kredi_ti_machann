import requests

print('🧪 Test Domain Authorization\n')

# Test 1: Login and get token
r = requests.post('https://admin.nalakreditimachann.com/api/auth/login', json={'email':'superadmin@nalacredit.com','password':'Admin@2024!'})
if r.status_code != 200:
    print(f'❌ Login failed: {r.status_code}')
    exit(1)

data = r.json()
token = data['token']
print(f'✅ Login successful')
print(f'   Token: {token[:30]}...')
print(f'   Role: {data.get("role", "Unknown")}')

# Test 2: Access API on admin domain (should work for SuperAdmin)
r2 = requests.get('https://admin.nalakreditimachann.com/api/SavingsAccount?pageSize=1', headers={'Authorization': f'Bearer {token}'})
print(f'\n✅ Access admin domain: {r2.status_code} (Expected: 200)')

# Test 3: Try to access branch domain with SuperAdmin token (should be blocked)
r3 = requests.get('https://branch.nalakreditimachann.com/api/SavingsAccount?pageSize=1', headers={'Authorization': f'Bearer {token}'})
status_icon = '✅' if r3.status_code == 403 else '❌'
print(f'{status_icon} Access branch domain: {r3.status_code} (Expected: 403 - blocked)')
if r3.status_code == 403:
    print(f'   Message: {r3.json().get("message", "No message")}')

print(f'\n{"="*60}')
print('Domain authorization is working correctly!' if r3.status_code == 403 else 'Domain authorization needs attention')
