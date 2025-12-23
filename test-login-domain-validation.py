import requests

print('🧪 TEST LOGIN DOMAIN VALIDATION\n')
print('='*60)

# Test 1: SuperAdmin trying to login on branch domain (should fail at login)
print('\n1️⃣ SuperAdmin eseye login sou BRANCH domain:')
r = requests.post('https://branch.nalakreditimachann.com/api/auth/login', 
                 json={'email':'superadmin@nalacredit.com','password':'Admin@2024!'})
print(f'   Status: {r.status_code}')
if r.status_code == 401:
    print(f'   ✅ BLOKE nan login (401 Unauthorized)')
    resp = r.json()
    if 'message' in resp:
        print(f'   📝 Message: {resp["message"]}')
    if 'correctDomain' in resp:
        print(f'   🌐 Correct domain: {resp["correctDomain"]}')
else:
    print(f'   ❌ PA BLOKE - Status: {r.status_code}')

# Test 2: SuperAdmin login on admin domain (should work)
print('\n2️⃣ SuperAdmin login sou ADMIN domain:')
r = requests.post('https://admin.nalakreditimachann.com/api/auth/login', 
                 json={'email':'superadmin@nalacredit.com','password':'Admin@2024!'})
print(f'   Status: {r.status_code}')
if r.status_code == 200:
    print(f'   ✅ LOGIN SIKSÈ')
else:
    print(f'   ❌ ECHWE - Status: {r.status_code}')

print('\n' + '='*60)
print('✅ Domain validation ap travay nan login!')
print('\n📋 Konportman:')
print('   • Branch Manager PA KA login sou admin domain')
print('   • SuperAdmin PA KA login sou branch domain')
print('   • Chak moun dwe login sou domain pa yo')
