import requests

r = requests.post('https://admin.nalakreditimachann.com/api/auth/login', json={'email':'superadmin@nalacredit.com','password':'Admin@2024!'})
token = r.json()['token']

endpoints = [
    ('MicrocreditLoanApplication (Submitted)', '/api/MicrocreditLoanApplication?page=1&pageSize=1&status=Submitted'),
    ('MicrocreditLoanApplication (Approved)', '/api/MicrocreditLoanApplication?page=1&pageSize=1&status=Approved'),
    ('MicrocreditLoan (Active)', '/api/MicrocreditLoan?status=Active&pageSize=1000'),
    ('MicrocreditLoan (Defaulted)', '/api/MicrocreditLoan?status=Defaulted&pageSize=1000'),
    ('MicrocreditLoan (Overdue)', '/api/MicrocreditLoan?status=Overdue&pageSize=1000'),
]

print('Test tout API endpoints:\n')
all_ok = True
for name, endpoint in endpoints:
    r = requests.get(f'https://admin.nalakreditimachann.com{endpoint}', headers={'Authorization': f'Bearer {token}'})
    status = '✅' if r.status_code == 200 else '❌'
    print(f'{status} {name}: {r.status_code}')
    if r.status_code != 200:
        all_ok = False
        print(f'   Error: {r.text[:100]}')

if all_ok:
    print('\n✅ Tout API yo fonksyone!')
else:
    print('\n❌ Gen kèk pwoblèm ankò')
